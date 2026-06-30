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

WHAT NEEDS YOUR LIVE ACCESS (clearly marked TODO in GoldinAdapter.search):
  - Goldin is a JS SPA; the search/results data comes from a backend API.
    Discover it once via browser devtools (Network tab -> filter XHR while
    searching "Antonelli") and paste the endpoint into _SEARCH_API below,
    OR use the Playwright render fallback (works without finding the API).
  - Item pages DO expose title/grade/image via og: meta over plain HTTP
    (confirmed), so fetch_item works without a browser; only the live
    price/bids/date need the API or a render.
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

    # TODO(owner): discover the real search endpoint once (devtools -> Network ->
    # XHR while searching). Goldin is a Next.js SPA; the results JSON comes from a
    # backend call (commonly an Algolia or internal /api search). Paste it here.
    _SEARCH_API = ""   # e.g. "https://<host>/api/search?q={q}&status=sold&sort=date_desc"

    def fetch_item_meta(self, url: str) -> dict:
        """Plain-HTTP og: meta extraction — CONFIRMED to work (title/grade/image)."""
        r = requests.get(url, headers={"User-Agent": UA}, timeout=20)
        h = r.text
        def og(p):
            m = re.search(r'<meta[^>]+property=["\']og:%s["\'][^>]+content=["\']([^"\']+)' % p, h, re.I)
            return html.unescape(m.group(1)) if m else None
        return {"title": og("title"), "image_url": og("image"), "url": url}

    def search(self, driver: dict) -> list[Sale]:
        q = driver["aliases"][0]
        rows = self._search_api(q) if self._SEARCH_API else self._search_render(q)
        sales = []
        for it in rows:
            s = build_sale(self.source, it["id"], it["url"], it["title"],
                           price=it.get("price"), currency=it.get("currency", "USD"),
                           sale_date=it.get("sale_date"), sale_type=it.get("sale_type"),
                           bids=it.get("bids"), image_url=it.get("image_url"))
            if s and s.driver_id == driver["id"]:
                sales.append(s)
        return sales

    def _search_api(self, q: str) -> list[dict]:
        """Primary path once _SEARCH_API is known. Map their JSON -> our dict."""
        url = self._SEARCH_API.format(q=requests.utils.quote(q))
        r = requests.get(url, headers={"User-Agent": UA, "Accept": "application/json"}, timeout=25)
        data = r.json()
        items = data.get("hits") or data.get("results") or data.get("items") or []
        out = []
        for it in items:
            # field names are placeholders — align to the real payload you find:
            out.append({
                "id": str(it.get("objectID") or it.get("id") or it.get("slug")),
                "url": self.base + "/item/" + str(it.get("slug") or it.get("id")),
                "title": it.get("title") or it.get("name"),
                "price": it.get("soldPrice") or it.get("currentBid") or it.get("price"),
                "currency": it.get("currency", "USD"),
                "sale_date": (it.get("soldAt") or it.get("endDate") or "")[:10] or None,
                "sale_type": "auction",
                "bids": it.get("bidCount") or it.get("bids"),
                "image_url": it.get("image") or it.get("imageUrl"),
            })
        return out

    def _search_render(self, q: str) -> list[dict]:
        """Fallback for the SPA: render search results with Playwright.
        Works without knowing the API. `pip install playwright && playwright install chromium`."""
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            print("  [goldin] Playwright not installed and _SEARCH_API unset — skipping.", file=sys.stderr)
            return []
        results = []
        with sync_playwright() as p:
            br = p.chromium.launch()
            pg = br.new_page(user_agent=UA)
            # TODO(owner): confirm the sold-results URL pattern + card/grid selectors
            pg.goto(f"{self.base}/search?query={q}", wait_until="networkidle", timeout=45000)
            cards = pg.query_selector_all("[data-testid='lot-card'], a[href*='/item/']")
            for c in cards:
                href = c.get_attribute("href") or ""
                if "/item/" not in href: continue
                results.append({
                    "id": href.rstrip("/").split("/")[-1],
                    "url": href if href.startswith("http") else self.base + href,
                    "title": (c.inner_text() or "").strip().split("\n")[0],
                    "price": None, "sale_date": None, "image_url": None,
                })
            br.close()
        return results


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
    print("-"*60)
    print("ALL PASS" if ok else "FAILURES ABOVE")
    return 0 if ok else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="fetch + print, no DB write")
    ap.add_argument("--ignore-robots", action="store_true", help="only if you have permission")
    ap.add_argument("--selftest", action="store_true", help="validate parser/cleaning/dedup offline")
    a = ap.parse_args()
    if a.selftest: sys.exit(selftest())
    run(dry=a.dry_run, ignore_robots=a.ignore_robots)
