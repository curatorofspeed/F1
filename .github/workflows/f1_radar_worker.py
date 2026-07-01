#!/usr/bin/env python3
"""
F1 Radar — auction-house sale ingestion for f1cardindex.com
============================================================
Pattern mirrors Auction Radar (radar_worker.py): adapter -> normalize -> Supabase.
Runs on a GitHub Actions cron. Writes to a `f1_sales` table with status='pending'
so a human approves top-of-board sales before they go public.

WHAT'S FULLY BUILT & TESTED HERE (run `python f1_radar_worker.py --selftest`):
  - The card-title PARSER (driver / year / set / parallel / serial / grade / RC / cert)
  - The CLEANING rules (lot & non-card exclusion, currency -> USD)
  - The DEDUP rule (same physical card -> keep highest sale)
  - Normalization into the canonical sale schema

THE GOLDIN FETCH (now self-discovering — devtools optional):
  - _search_render() renders the page with Playwright and SNIFFS the JSON the
    page fetches from Goldin's own backend, then normalizes it (handles
    Algolia-style hits, GraphQL edges/node, and varied field names). It does
    NOT need the API endpoint or fragile DOM selectors. A DOM scrape of /item/
    links is the fallback if no JSON is seen.
  - The only thing to verify live is the SEARCH URL pattern (_search_urls):
    run once with Playwright installed + --dry-run and check the output. If it's
    empty, tweak _search_urls to match how goldin.co forms a search.
  - Optional fast path: set _SEARCH_API to hit the backend directly (skip the browser).
  - Item pages also expose title/grade/image via og: meta over plain HTTP
    (confirmed) — fetch_item_meta uses that without a browser.
"""
from __future__ import annotations
import os, re, sys, json, time, html, argparse, datetime as dt
from dataclasses import dataclass, field, asdict
from typing import Optional

try:
    import requests
except ImportError:
    requests = None

UA = "f1cardindex-radar/1.0 (+https://f1cardindex.com; contact: hello@f1cardindex.com)"

# ----------------------------------------------------------------------------
# WATCHLIST — drivers we track. `aliases` widen the search + title matching.
# Keep ids identical to state.drivers ids in index.html so boards line up.
# ----------------------------------------------------------------------------
DRIVERS = [
    {"id": "verstappen",  "name": "Max Verstappen",          "aliases": ["verstappen"]},
    {"id": "hamilton",    "name": "Lewis Hamilton",          "aliases": ["hamilton"]},
    {"id": "leclerc",     "name": "Charles Leclerc",         "aliases": ["leclerc"]},
    {"id": "norris",      "name": "Lando Norris",            "aliases": ["norris"]},
    {"id": "antonelli",   "name": "Andrea Kimi Antonelli",   "aliases": ["antonelli", "kimi antonelli"]},
    {"id": "piastri",     "name": "Oscar Piastri",           "aliases": ["piastri"]},
    {"id": "russell",     "name": "George Russell",          "aliases": ["russell"]},
    {"id": "alonso",      "name": "Fernando Alonso",         "aliases": ["alonso"]},
    {"id": "sainz",       "name": "Carlos Sainz",            "aliases": ["sainz"]},
    {"id": "hadjar",      "name": "Isack Hadjar",            "aliases": ["hadjar"]},
    {"id": "bearman",     "name": "Oliver Bearman",          "aliases": ["bearman"]},
    {"id": "bortoleto",   "name": "Gabriel Bortoleto",       "aliases": ["bortoleto"]},
    # extend to the full grid...
]
ALIAS_TO_DRIVER = {a.lower(): d for d in DRIVERS for a in d["aliases"]}

# Currency -> approx USD (kept here so conversions are auditable; tune as needed)
FX_USD = {"USD": 1.0, "AUD": 0.65, "GBP": 1.27, "EUR": 1.10, "CAD": 0.73}

# Lots / non-cards we never want on a single-card board
LOT_PAT = re.compile(r"\b(lot of|lot:|complete set|\(\s*\d+\s*cards?\s*\)|\b\d+\s*card lot)\b", re.I)
NONCARD_PAT = re.compile(r"\b(ticket|program|magazine|poster|display case|toploader|one-?touch|supplies)\b", re.I)

GRADE_PATS = [
    (re.compile(r"\bPSA\s*(?:GEM\s*MT\s*)?10\b", re.I), "PSA 10"),
    (re.compile(r"\bPSA\s*9\b", re.I), "PSA 9"),
    (re.compile(r"\bPSA\s*8\b", re.I), "PSA 8"),
    (re.compile(r"\bPSA\s*(?:AUTH|authentic)\b", re.I), "PSA Auth"),
    (re.compile(r"\bBGS\s*9\.5\b", re.I), "BGS 9.5"),
    (re.compile(r"\bBGS\s*9\b", re.I), "BGS 9"),
    (re.compile(r"\bBGS\s*8\.5\b", re.I), "BGS 8.5"),
    (re.compile(r"\bSGC\s*10\b", re.I), "SGC 10"),
    (re.compile(r"\bSGC\s*9\.5\b", re.I), "SGC 9.5"),
    (re.compile(r"\bCGC\s*(?:AUTH|authentic)\b", re.I), "CGC Auth"),
]
SET_PATS = [
    (re.compile(r"\bsapphire\b", re.I), "Chrome Sapphire"),
    (re.compile(r"\bdynasty\b", re.I), "Dynasty"),
    (re.compile(r"\beccellenza\b", re.I), "Eccellenza"),
    (re.compile(r"\btopps\s+chrome\b", re.I), "Topps Chrome"),
    (re.compile(r"\bchrome\b", re.I), "Chrome"),
]
PARALLEL_PATS = [
    (re.compile(r"\bsuperfractor\b", re.I), "SuperFractor"),
    (re.compile(r"\bpadparadscha\b", re.I), "Padparadscha"),
    (re.compile(r"\b(red|gold|blue|green|purple|orange|black|pink)\s+refractor\b", re.I), None),  # color refractor
    (re.compile(r"\brefractor\b", re.I), "Refractor"),
    (re.compile(r"\b(red|gold|blue|green|purple|orange|black|pink)\b", re.I), None),  # bare color
]
SERIAL_PAT = re.compile(r"#?\s*(\d{1,3})\s*/\s*(\d{1,4})\b")
ONE_OF_ONE_PAT = re.compile(r"\b1\s*/\s*1\b")
YEAR_PAT = re.compile(r"\b(19|20)\d{2}\b")
CERT_PAT = re.compile(r"\b(?:cert|certification)?\s*#?\s*(\d{8,9})\b")  # PSA certs are 8-9 digits


@dataclass
class Sale:
    source: str
    source_item_id: str
    url: str
    title: str
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    year: Optional[int] = None
    set_name: Optional[str] = None
    parallel: Optional[str] = None
    serial: Optional[str] = None
    is_one_of_one: bool = False
    is_rookie: bool = False
    grade: str = "Raw"
    cert: Optional[str] = None
    price_usd: Optional[float] = None
    price_original: Optional[float] = None
    currency: str = "USD"
    sale_type: Optional[str] = None      # auction | best_offer | buy_now
    sale_date: Optional[str] = None      # YYYY-MM-DD
    bids: Optional[int] = None
    image_url: Optional[str] = None
    status: str = "pending"              # pending | approved | rejected
    flags: list = field(default_factory=list)   # human-review hints
    ingested_at: str = field(default_factory=lambda: dt.datetime.now(dt.timezone.utc).isoformat())


# ----------------------------------------------------------------------------
# PARSER — the part that turns messy titles into structured cards.
# ----------------------------------------------------------------------------
def parse_title(title: str) -> dict:
    t = html.unescape(title or "")
    out: dict = {"flags": []}

    # driver
    low = t.lower()
    for alias, d in ALIAS_TO_DRIVER.items():
        if alias in low:
            out["driver_id"] = d["id"]; out["driver_name"] = d["name"]; break

    # year
    ym = YEAR_PAT.search(t)
    if ym: out["year"] = int(ym.group(0))

    # set
    for pat, name in SET_PATS:
        if pat.search(t): out["set_name"] = name; break

    # grade
    out["grade"] = "Raw"
    for pat, g in GRADE_PATS:
        if pat.search(t): out["grade"] = g; break

    # serial / 1-of-1
    if ONE_OF_ONE_PAT.search(t):
        out["is_one_of_one"] = True; out["serial"] = "1/1"
    sm = SERIAL_PAT.search(t)
    if sm:
        num, den = int(sm.group(1)), int(sm.group(2))
        out["serial"] = f"{num}/{den}"
        if num == 1 and den == 1: out["is_one_of_one"] = True

    # parallel (skip color words that are actually the serial context)
    for pat, name in PARALLEL_PATS:
        m = pat.search(t)
        if m:
            out["parallel"] = name or m.group(0).title()
            break

    # rookie
    if re.search(r"\b(rookie|\brc\b)\b", t, re.I): out["is_rookie"] = True

    # cert
    cm = CERT_PAT.search(t)
    if cm: out["cert"] = cm.group(1)

    # review flags
    if not out.get("driver_id"): out["flags"].append("no_driver_match")
    if not out.get("year"): out["flags"].append("no_year")
    return out


# ----------------------------------------------------------------------------
# CLEANING — encode the judgment calls (exclusions, currency).
# ----------------------------------------------------------------------------
def is_excluded(title: str) -> Optional[str]:
    if not title: return None
    if LOT_PAT.search(title): return "lot"
    if NONCARD_PAT.search(title): return "non_card"
    return None

def to_usd(price: float, currency: str) -> Optional[float]:
    if price is None: return None
    rate = FX_USD.get((currency or "USD").upper())
    if rate is None: return None
    return round(price * rate)


def build_sale(source: str, source_item_id: str, url: str, title: str,
               price: float, currency: str = "USD", sale_date: str = None,
               sale_type: str = None, bids: int = None, image_url: str = None) -> Optional[Sale]:
    if not title: return None          # nothing to parse/match on
    excl = is_excluded(title)
    parsed = parse_title(title)
    s = Sale(source=source, source_item_id=source_item_id, url=url, title=title,
             price_original=price, currency=(currency or "USD").upper(),
             price_usd=to_usd(price, currency), sale_date=sale_date,
             sale_type=sale_type, bids=bids, image_url=image_url,
             **{k: v for k, v in parsed.items() if k != "flags"})
    s.flags = parsed.get("flags", [])
    if excl:
        s.status = "rejected"; s.flags.append(f"excluded:{excl}")
    # auto-flag big sales for human eyes before they hit the public board
    if s.price_usd and s.price_usd >= 25000 and s.status == "pending":
        s.flags.append("high_value_review")
    if s.currency != "USD":
        s.flags.append(f"fx:{s.currency}->USD")
    return s


# ----------------------------------------------------------------------------
# DEDUP — same physical card seen twice -> keep the higher sale.
# Identity key: cert if present, else (driver,set,parallel,serial,grade).
# ----------------------------------------------------------------------------
def dedup(sales: list[Sale]) -> list[Sale]:
    best: dict = {}
    for s in sales:
        if s.cert:
            key = ("cert", s.cert)
        else:
            key = (s.driver_id, (s.set_name or "").lower(), (s.parallel or "").lower(),
                   s.serial or "", s.grade)
        cur = best.get(key)
        if cur is None or (s.price_usd or 0) > (cur.price_usd or 0):
            if cur is not None:
                s.flags = list(set(s.flags + ["deduped_keep_higher"]))
            best[key] = s
    return list(best.values())


# ----------------------------------------------------------------------------
# ADAPTERS
# ----------------------------------------------------------------------------
class Adapter:
    source = "base"
    base = ""
    def robots_ok(self, path: str, ignore_robots: bool = False) -> bool:
        if ignore_robots: return True
        try:
            from urllib import robotparser
            rp = robotparser.RobotFileParser(); rp.set_url(self.base + "/robots.txt"); rp.read()
            return rp.can_fetch(UA, self.base + path)
        except Exception:
            return True  # fail-open with our own polite rate limiting
    def search(self, driver: dict) -> list[Sale]:
        raise NotImplementedError


class GoldinAdapter(Adapter):
    source = "goldin"
    base = "https://goldin.co"

    # Confirmed live (captured from goldin.co): keyword search is a JSON POST,
    # no auth header. Lots come back under data["searchalgolia"]["lots"].
    LOTS_API = "https://d1wu47wucybvr3.cloudfront.net/api/lots_v2"
    IMG_BASE = "https://d2tt46f3mh26nl.cloudfront.net/public/Lots"

    def fetch_item_meta(self, url: str) -> dict:
        """Plain-HTTP og: meta extraction — CONFIRMED to work (title/grade/image)."""
        r = requests.get(url, headers={"User-Agent": UA}, timeout=20)
        h = r.text
        def og(p):
            m = re.search(r'<meta[^>]+property=["\']og:%s["\'][^>]+content=["\']([^"\']+)' % p, h, re.I)
            return html.unescape(m.group(1)) if m else None
        return {"title": og("title"), "image_url": og("image"), "url": url}

    def search(self, driver: dict) -> list[Sale]:
        """Direct call to Goldin's confirmed lots_v2 search — no browser needed.
        Body format captured live: JSON POST, keyword search, no auth header."""
        body = {"search": {"queryType": "Featured", "keyword": driver["aliases"][0],
                           "size": 80, "from": 0, "hasAnalyticsConsent": False}}
        try:
            r = requests.post(self.LOTS_API, json=body, timeout=25,
                              headers={"User-Agent": UA, "Content-Type": "application/json",
                                       "Origin": self.base, "Referer": self.base + "/"})
            data = r.json()
        except Exception as e:
            print(f"  [goldin] api error: {str(e)[:80]} — trying render fallback")
            return self._render_fallback(driver)
        lots = ((data or {}).get("searchalgolia") or {}).get("lots") or []
        sales = []
        for lot in lots:
            it = self._lot_to_item(lot)
            if not it:
                continue
            s = build_sale(self.source, it["id"], it["url"], it["title"], price=it["price"],
                           currency="USD", sale_date=it["sale_date"], sale_type=it["sale_type"],
                           bids=it["bids"], image_url=it["image_url"])
            if not s or s.driver_id != driver["id"]:
                continue
            if it["live"]:
                s.flags.append("live_auction")        # current bid, NOT final — don't approve as a comp
            if it["premium"]:
                s.flags.append(f"buyer_premium:{it['premium']}")
            sales.append(s)
        return sales

    def _lot_to_item(self, lot: dict) -> Optional[dict]:
        """Map a Goldin lots_v2 lot -> our normalized item dict."""
        title, slug = lot.get("title"), lot.get("meta_slug")
        if not (title and slug):
            return None
        try:
            price = float(lot["current_price"]) if lot.get("current_price") is not None else None
        except Exception:
            price = None
        status = (lot.get("status") or "").lower()
        lid, pimg = lot.get("lot_id"), lot.get("primary_image_name")
        return {
            "id": slug, "url": f"{self.base}/item/{slug}", "title": title, "price": price,
            "sale_date": (lot.get("end_timestamp") or "")[:10] or None,
            "sale_type": "buy_now" if lot.get("auction_type") == "Fixed_Price" else "auction",
            "bids": (int(lot["number_of_bids"]) if lot.get("number_of_bids") else None),
            "image_url": (f"{self.IMG_BASE}/{lid}/{pimg}@1x" if (lid and pimg) else None),
            "live": status in ("live", "open", "active", ""),
            "premium": lot.get("buyer_premium"),
        }

    def _render_fallback(self, driver: dict) -> list[Sale]:
        """Playwright render path — only used if the direct API call fails."""
        out = []
        for it in self._search_render(driver["aliases"][0]):
            s = build_sale(self.source, it["id"], it["url"], it.get("title"),
                           price=it.get("price"), currency=it.get("currency", "USD"),
                           sale_date=it.get("sale_date"), sale_type=it.get("sale_type"),
                           bids=it.get("bids"), image_url=it.get("image_url"))
            if s and s.driver_id == driver["id"]:
                out.append(s)
        return out

    def _search_urls(self, q: str):
        """Candidate result URLs to try (Goldin's marketplace lives at /buy).
        First that yields lots wins. --diagnose shows which one actually works."""
        from urllib.parse import quote
        qq = quote(q)
        return [f"{self.base}/buy?query={qq}",
                f"{self.base}/search?query={qq}",
                f"{self.base}/buy?search={qq}",
                f"{self.base}/search?q={qq}",
                f"{self.base}/buy?q={qq}",
                f"{self.base}/marketplace?query={qq}"]

    def _search_render(self, q: str) -> list[dict]:
        """Render Goldin with Playwright and SNIFF the JSON its own page fetches from
        the backend — robust to not knowing the exact API shape. DOM scrape of /item/
        links is the fallback. `pip install playwright && playwright install chromium`."""
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            print("  [goldin] Playwright not installed and _SEARCH_API unset — skipping.", file=sys.stderr)
            return []
        out = []
        with sync_playwright() as p:
            br = p.chromium.launch()
            pg = br.new_page(user_agent=UA)
            captured = []
            def on_response(resp):
                if "application/json" in (resp.headers or {}).get("content-type", ""):
                    try: captured.append(resp.json())
                    except Exception: pass
            pg.on("response", on_response)
            for url in self._search_urls(q):
                captured.clear()
                try:
                    pg.goto(url, wait_until="domcontentloaded", timeout=40000)
                    pg.wait_for_timeout(6000)   # Goldin never goes networkidle; fixed wait for its API calls
                except Exception:
                    continue
                # 1) preferred: parse the backend JSON the page already fetched
                for blob in captured:
                    lots = find_lot_array(blob)
                    if lots:
                        out = [x for x in (normalize_goldin_lot(self.base, l) for l in lots) if x]
                        if out: break
                if out: break
                # 2) fallback: scrape rendered /item/ links from the DOM
                dom = self._scrape_dom(pg)
                if dom: out = dom; break
            br.close()
        return out

    def _scrape_dom(self, pg) -> list[dict]:
        seen, rows = set(), []
        for a in pg.query_selector_all("a[href*='/item/']"):
            href = a.get_attribute("href") or ""
            if "/item/" not in href: continue
            url = href if href.startswith("http") else self.base + href
            if url in seen: continue
            seen.add(url)
            txt = (a.inner_text() or "").strip()
            pm = re.search(r"\$([\d,]+)", txt)
            img = a.query_selector("img")
            rows.append({"id": url.rstrip("/").split("/")[-1], "url": url,
                         "title": txt.split("\n")[0] if txt else None,
                         "price": float(pm.group(1).replace(",", "")) if pm else None,
                         "currency": "USD", "sale_date": None, "sale_type": None,
                         "bids": None, "image_url": (img.get_attribute("src") if img else None)})
        return rows


# --- Goldin JSON sniffing (robust to unknown backend shape) -----------------
_TITLE_KEYS = ("title", "name", "lottitle", "itemtitle", "lotname")
_PRICE_KEYS = ("soldprice", "finalprice", "saleprice", "hammerprice", "winningbid",
               "currentbid", "highbid", "currentprice", "price", "amount")
_ID_KEYS    = ("slug", "objectid", "id", "lotid", "itemid", "_id")
_DATE_KEYS  = ("soldat", "closedat", "enddate", "endtime", "saledate", "closedon")
_IMG_KEYS   = ("image", "imageurl", "imageurls", "images", "thumbnail", "thumb", "primaryimage")
_BID_KEYS   = ("bidcount", "bids", "numbids", "totalbids")

def _lc(d): return {str(k).lower(): v for k, v in d.items()} if isinstance(d, dict) else {}
def _first(d, keys):
    for k in keys:
        if k in d and d[k] not in (None, "", []): return d[k]
    return None
def is_lot_like(d) -> bool:
    if not isinstance(d, dict): return False
    dl = _lc(d)
    return _first(dl, _TITLE_KEYS) is not None and (
        _first(dl, _PRICE_KEYS) is not None or _first(dl, _BID_KEYS) is not None
        or "/item/" in str(_first(dl, _ID_KEYS) or ""))
def find_lot_array(blob, _depth=0):
    """Recursively locate the first array of lot-like dicts inside arbitrary JSON."""
    if _depth > 8: return []
    if isinstance(blob, list):
        sample = [x for x in blob[:5] if isinstance(x, dict)]
        if sample and sum(1 for x in sample if is_lot_like(x)) >= max(1, len(sample) // 2):
            return [x for x in blob if isinstance(x, dict)]
        for x in blob:
            got = find_lot_array(x, _depth + 1)
            if got: return got
        return []
    if isinstance(blob, dict):
        for k in ("hits", "results", "items", "lots", "data", "edges", "records", "documents"):
            if k in blob:
                got = find_lot_array(blob[k], _depth + 1)
                if got: return got
        for v in blob.values():
            got = find_lot_array(v, _depth + 1)
            if got: return got
    return []
def _money(v):
    if v is None: return None
    if isinstance(v, (int, float)): return float(v)
    m = re.search(r"[\d,.]+", str(v))
    return float(m.group(0).replace(",", "")) if m else None
def normalize_goldin_lot(base, lot):
    d = _lc(lot)
    if isinstance(d.get("node"), dict): d = _lc(d["node"])   # GraphQL edges -> node
    slug, title = _first(d, _ID_KEYS), _first(d, _TITLE_KEYS)
    if not (slug and title): return None
    img = _first(d, _IMG_KEYS)
    if isinstance(img, list): img = img[0] if img else None
    if isinstance(img, dict): img = img.get("url") or img.get("src")
    date = _first(d, _DATE_KEYS)
    slug_s = str(slug)
    return {"id": slug_s,
            "url": slug_s if slug_s.startswith("http") else f"{base}/item/{slug_s}",
            "title": title, "price": _money(_first(d, _PRICE_KEYS)),
            "currency": (d.get("currency") or "USD"),
            "sale_date": (str(date)[:10] if date else None), "sale_type": "auction",
            "bids": _first(d, _BID_KEYS), "image_url": img}


ADAPTERS = [GoldinAdapter()]   # FanaticsAdapter() next, same shape


# ----------------------------------------------------------------------------
# SUPABASE WRITE
# ----------------------------------------------------------------------------
def upsert(sales: list[Sale]):
    url = os.environ.get("SUPABASE_URL"); key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not (url and key):
        print("  [supabase] SUPABASE_URL / SUPABASE_SERVICE_KEY not set — skipping write.")
        return
    endpoint = f"{url}/rest/v1/f1_sales?on_conflict=source,source_item_id"
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json",
               "Prefer": "resolution=merge-duplicates,return=minimal"}
    payload = [asdict(s) for s in sales]
    r = requests.post(endpoint, headers=headers, data=json.dumps(payload), timeout=30)
    print(f"  [supabase] upsert {len(payload)} rows -> HTTP {r.status_code}")
    if r.status_code >= 300: print("   ", r.text[:400])


def run(dry: bool, ignore_robots: bool):
    all_sales: list[Sale] = []
    for ad in ADAPTERS:
        if not ad.robots_ok("/", ignore_robots):
            print(f"  [{ad.source}] robots.txt disallows — set --ignore-robots only if you have permission.")
            continue
        for d in DRIVERS:
            try:
                got = ad.search(d)
                print(f"  [{ad.source}] {d['id']}: {len(got)} sales")
                all_sales.extend(got); time.sleep(1.5)   # polite
            except Exception as e:
                print(f"  [{ad.source}] {d['id']} ERROR: {e}", file=sys.stderr)
    clean = dedup([s for s in all_sales if s.status != "rejected"])
    print(f"\nTotal: {len(all_sales)} raw -> {len(clean)} after dedup")
    if dry:
        for s in sorted(clean, key=lambda x: -(x.price_usd or 0))[:15]:
            print(f"  ${s.price_usd or 0:>8,.0f}  {s.driver_id or '?':12} {s.grade:7} {s.title[:48]}")
    else:
        upsert(clean)


# ----------------------------------------------------------------------------
# SELFTEST — proves parser/cleaning/dedup without any network.
# ----------------------------------------------------------------------------
def selftest():
    cases = [
        ("2025 Topps Chrome F1 Sapphire Edition Red #8 Kimi Antonelli Rookie Card (#3/5) - PSA GEM MT 10 - Pop 2",
         79300, "USD", dict(driver_id="antonelli", set_name="Chrome Sapphire", serial="3/5", grade="PSA 10", is_rookie=True)),
        ("2020 Topps Chrome F1 Superfractor #1 Lewis Hamilton 1/1 PSA NM 7",
         900000, "USD", dict(driver_id="hamilton", parallel="SuperFractor", serial="1/1", is_one_of_one=True)),
        ("2025 Dynasty F1 Racing Glove Jumbo Patch Auto #AFJPV-AAN Antonelli 1/1",
         201910, "USD", dict(driver_id="antonelli", set_name="Dynasty", is_one_of_one=True)),
        ("Lot of 25 Formula 1 base cards Verstappen Norris",  500, "USD", "EXCLUDED"),
        ("2024 F1 Ocon Racing Glove Relic AUD listing", 1500, "AUD", dict(driver_id="ocon" if "ocon" in ALIAS_TO_DRIVER else None)),
    ]
    ok = True
    print("SELFTEST — parser / cleaning / currency\n" + "-"*60)
    built = []
    for i, (title, price, cur, expect) in enumerate(cases, 1):
        s = build_sale("test", f"t{i}", "http://x/"+str(i), title, price, cur,
                       sale_date="2026-06-25", sale_type="auction")
        built.append(s)
        if expect == "EXCLUDED":
            passed = s.status == "rejected"
            print(f"{'PASS' if passed else 'FAIL'}  [{i}] excluded lot -> status={s.status}")
            ok &= passed; continue
        checks = []
        for k, v in expect.items():
            got = getattr(s, k)
            checks.append((k, got, v, got == v))
        usd = s.price_usd
        allpass = all(c[3] for c in checks)
        ok &= allpass
        print(f"{'PASS' if allpass else 'FAIL'}  [{i}] {s.driver_id or '?':10} ${usd:>8,} {s.grade:7} ser={s.serial}")
        for k, got, want, p in checks:
            if not p: print(f"        - {k}: got {got!r} want {want!r}")
    # currency check
    aud = next(s for s in built if s.currency == "AUD")
    cexp = round(1500*FX_USD['AUD'])
    cpass = aud.price_usd == cexp
    ok &= cpass
    print(f"{'PASS' if cpass else 'FAIL'}  [fx] AUD 1500 -> ${aud.price_usd} (want ${cexp})")
    # dedup check: same cert, two prices -> keep higher
    a = build_sale("test","d1","u1","2025 Chrome Sapphire Red #8 Antonelli RC 3/5 PSA 10 cert 160002312", 60000)
    b = build_sale("test","d2","u2","2025 Chrome Sapphire Red #8 Antonelli RC 3/5 PSA 10 cert 160002312", 79300)
    dd = dedup([a, b])
    dpass = len(dd) == 1 and dd[0].price_usd == 79300
    ok &= dpass
    print(f"{'PASS' if dpass else 'FAIL'}  [dedup] same cert kept higher -> {len(dd)} row @ ${dd[0].price_usd:,}")
    # Goldin JSON sniffing: nested backend payload -> lots -> normalized dicts
    mock = {"results": [{"hits": [
        {"objectID": "x1", "slug": "antonelli-sapphire",
         "title": "2025 Topps Chrome F1 Sapphire Red #8 Kimi Antonelli RC (#3/5) - PSA GEM MT 10",
         "soldPrice": 79300, "endDate": "2026-06-25T20:27:24Z", "bidCount": 50,
         "image": "https://cdn/x/a.jpg", "currency": "USD"},
        {"objectID": "x2",
         "name": "2020 Topps Chrome F1 Superfractor #1 Lewis Hamilton 1/1 PSA 7",
         "currentBid": 900000, "soldAt": "2022-04-30", "images": ["https://cdn/x/h.jpg"]},
        {"junk": "not a lot"},
    ]}]}
    lots = find_lot_array(mock)
    g1 = len(lots) == 3  # the array is returned whole; non-lots dropped at normalize
    norm = [normalize_goldin_lot("https://goldin.co", l) for l in lots]
    norm = [n for n in norm if n]
    g2 = len(norm) == 2
    a = next((n for n in norm if "antonelli" in n["url"]), {})
    g3 = (a.get("price") == 79300.0 and a.get("sale_date") == "2026-06-25"
          and a.get("url") == "https://goldin.co/item/antonelli-sapphire"
          and a.get("image_url") == "https://cdn/x/a.jpg" and a.get("bids") == 50)
    h = next((n for n in norm if n["id"] == "x2"), {})
    g4 = (h.get("price") == 900000.0 and h.get("image_url") == "https://cdn/x/h.jpg"
          and h.get("url") == "https://goldin.co/item/x2")
    for label, cond in [("find_lot_array finds nested hits", g1),
                        ("normalize drops non-lots", g2),
                        ("antonelli lot fields", g3),
                        ("hamilton lot (name/currentBid/images[])", g4)]:
        ok &= cond
        print(f"{'PASS' if cond else 'FAIL'}  [goldin] {label}")
    # Map the REAL captured Goldin lot through _lot_to_item + build_sale
    real_lot = {"auction_type": "Weekly", "buyer_premium": 22.0, "current_price": 275.0,
                "end_timestamp": "2026-07-03T02:00:00Z",
                "lot_id": "202606-2222-0355-1ae3725c-94de-452c-ad7b-8277644099ae",
                "meta_slug": "2025-topps-chrome-helmet-collection-hc-1-kimi-antonelli-rookie-card-psgek50",
                "number_of_bids": 22.0, "primary_image_name": "5eccec1c-8d20-4188-9c5c-6966978423d0",
                "status": "Live",
                "title": "2025 Topps Chrome Helmet Collection #HC-1 Kimi Antonelli Rookie Card - PSA GEM MT 10"}
    it = GoldinAdapter()._lot_to_item(real_lot)
    l1 = (it and it["price"] == 275.0 and it["live"] is True and it["bids"] == 22
          and it["url"].endswith("/item/2025-topps-chrome-helmet-collection-hc-1-kimi-antonelli-rookie-card-psgek50")
          and it["sale_date"] == "2026-07-03"
          and it["image_url"] == "https://d2tt46f3mh26nl.cloudfront.net/public/Lots/202606-2222-0355-1ae3725c-94de-452c-ad7b-8277644099ae/5eccec1c-8d20-4188-9c5c-6966978423d0@1x")
    s = build_sale("goldin", it["id"], it["url"], it["title"], price=it["price"],
                   sale_date=it["sale_date"], sale_type=it["sale_type"], bids=it["bids"])
    l2 = (s and s.driver_id == "antonelli" and s.is_rookie and s.set_name == "Topps Chrome"
          and s.price_usd == 275)
    for label, cond in [("_lot_to_item maps fields", bool(l1)),
                        ("build_sale matches driver/RC/set", bool(l2))]:
        ok &= cond
        print(f"{'PASS' if cond else 'FAIL'}  [goldin] {label}")
    print("-"*60)
    print("ALL PASS" if ok else "FAILURES ABOVE")
    return 0 if ok else 1


def diagnose():
    """v3: capture the /api/lots REQUEST (method/url/body/headers) and a FULL lot
    object, so we can call Goldin's search API directly. Also drives the on-page
    search box to trigger a real filtered query."""
    ad = GoldinAdapter(); q = "antonelli"
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Playwright not installed"); return 1
    reqs, lot_samples = [], []
    def on_request(req):
        if "/api/lots" in req.url:
            hk = {k: v[:60] for k, v in (req.headers or {}).items()
                  if k.lower() in ("authorization", "x-api-key", "apikey", "content-type",
                                   "x-algolia-api-key", "x-algolia-application-id")}
            reqs.append((req.method, req.url, (req.post_data or "")[:700], hk))
    def on_response(resp):
        if "/api/lots" in resp.url:
            try:
                blob = resp.json()
                sa = blob.get("searchalgolia") if isinstance(blob, dict) else None
                lots = (sa.get("lots") if isinstance(sa, dict) else None) or find_lot_array(blob)
                if lots: lot_samples.append(lots[0])
            except Exception: pass
    print("DIAGNOSE v3 — /api/lots request + full lot object\n" + "="*70)
    with sync_playwright() as p:
        br = p.chromium.launch()
        pg = br.new_page(user_agent=UA)
        pg.on("request", on_request); pg.on("response", on_response)
        try:
            pg.goto(f"{ad.base}/buy", wait_until="domcontentloaded", timeout=40000)
            pg.wait_for_timeout(6000)
        except Exception as e:
            print("  goto error:", str(e)[:100])
        print("\n-- attempting on-page search for 'antonelli' --")
        typed = False
        for sel in ["input[type='search']", "input[placeholder*='Search' i]",
                    "input[name*='search' i]", "[role='searchbox']", "input[type='text']"]:
            try:
                el = pg.query_selector(sel)
                if el:
                    el.click(); el.fill(q); pg.keyboard.press("Enter")
                    pg.wait_for_timeout(6000); typed = True
                    print(f"   typed into: {sel}"); break
            except Exception:
                continue
        if not typed:
            print("   no search box matched — showing the default request format instead")
        br.close()
    print(f"\n=== /api/lots REQUESTS ({len(reqs)}) ===")
    for m, u, body, hk in reqs[:8]:
        print(f"  {m} {u[:170]}")
        if body: print(f"      body: {body}")
        if hk:   print(f"      headers: {hk}")
    print(f"\n=== FULL sample lot ({len(lot_samples)} seen) ===")
    if lot_samples:
        for k, v in lot_samples[-1].items():
            print(f"  {k}: {str(v)[:90]}")
    print("\n" + "="*70 + "\nPaste this back — I'll wire a direct requests call to the search API.")
    return 0




if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="fetch + print, no DB write")
    ap.add_argument("--ignore-robots", action="store_true", help="only if you have permission")
    ap.add_argument("--selftest", action="store_true", help="validate parser/cleaning/dedup offline")
    ap.add_argument("--diagnose", action="store_true", help="render Goldin once and report what it returns")
    a = ap.parse_args()
    if a.selftest: sys.exit(selftest())
    if a.diagnose: sys.exit(diagnose())
    run(dry=a.dry_run, ignore_robots=a.ignore_robots)
