#!/usr/bin/env python3
"""
f2f3_results.py — scrape the latest F2 & F3 FEATURE-race results from the official
FIA sites and write them to Supabase `race_results` (series-tagged), which the
site's trending strip reads.

The FIA F2/F3 sites are Next.js and SERVER-RENDER the results table at:
    https://www.fiaformula2.com/Results?raceid=<id>
    https://www.fiaformula3.com/Results?raceid=<id>
So a plain requests.get + HTML parse works — no browser needed.

Reuses env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Run on a weekly cron.
Requires: requests, beautifulsoup4  (pip install requests beautifulsoup4)
"""
import os, re, sys, json, datetime as dt
import requests
from bs4 import BeautifulSoup

UA = "Mozilla/5.0 (compatible; f1cardindex-radar/1.0)"

SERIES = {
    "f2": {"base": "https://www.fiaformula2.com", "label": "F2"},
    "f3": {"base": "https://www.fiaformula3.com", "label": "F3"},
}

# FIA circuit/city name (lowercased) -> your F1 race_id, so F2/F3 results tie to
# the same weekend + show the right flag in the trending strip.
CITY_TO_RACE = {
    "melbourne": "aus", "shanghai": "chn", "suzuka": "jpn", "sakhir": "bhr",
    "jeddah": "sau", "miami": "mia", "montréal": "can", "montreal": "can",
    "imola": "imo", "monaco": "mon", "barcelona": "esp", "spielberg": "aut",
    "silverstone": "gbr", "spa-francorchamps": "bel", "spa": "bel",
    "budapest": "hun", "zandvoort": "ned", "monza": "ita", "madrid": "mad",
    "baku": "aze", "lusail": "qat", "yas island": "abu", "yas marina": "abu",
    "singapore": "sgp", "austin": "usa", "mexico city": "mex", "interlagos": "bra",
}

# Your tracked F2/F3 prospects. Map by 3-letter FIA abbreviation AND by surname
# so a win by any of them can be flagged "cards heat up". Extend as your grid changes.
PROSPECT_BY_ABBR = {
    "UGO": "ugochukwu", "CAM": "camara", "MON": "montoya", "MIN": "mini",
    "FOR": "fornaroli", "DUN": "dunne", "BEG": "beganovic", "VSC": "verschoor",
    "CRA": "crawford", "MRT": "martins", "MAI": "maini", "BRO": "browning",
    "DUR": "durksen",
}
PROSPECT_BY_SURNAME = {
    "ugochukwu": "ugochukwu", "camara": "camara", "câmara": "camara",
    "montoya": "montoya", "minì": "mini", "mini": "mini", "fornaroli": "fornaroli",
    "dunne": "dunne", "beganović": "beganovic", "beganovic": "beganovic",
    "verschoor": "verschoor", "crawford": "crawford", "martins": "martins",
    "maini": "maini", "browning": "browning", "dürksen": "durksen", "durksen": "durksen",
}


def norm(s):
    return (s or "").strip()


def prospect_id(abbr, surname):
    """Map a FIA driver to your tracked prospect id, or None if not tracked."""
    if abbr and abbr.upper() in PROSPECT_BY_ABBR:
        return PROSPECT_BY_ABBR[abbr.upper()]
    key = (surname or "").strip().lower()
    return PROSPECT_BY_SURNAME.get(key)


def parse_driver_cell(text):
    """Pull name + 3-letter abbr from a FIA driver cell. Handles both the glued
    form 'N. TsolovTSOCampos Racing' and the spaced form 'N. Tsolov TSO Campos'."""
    text = re.sub(r"\s+", " ", text or "").strip()
    # the abbr is a standalone 3-uppercase token (or glued run) after the name
    m = re.search(r"^(.*?)\s*\b([A-Z]{3})\b(?:\s+|(?=[A-Z]))(.*)$", text)
    if not m:  # fallback: 3 caps glued directly onto the name (no boundary)
        m = re.search(r"^(.*?)([A-Z]{3})([A-Z].*)$", text)
    if m:
        name, abbr = m.group(1).strip(), m.group(2)
    else:
        name, abbr = text, ""
    # surname = last alphabetic token of the name (drop the "N." initial)
    toks = re.findall(r"[A-Za-zÀ-ÿ'\-]+", name)
    surname = toks[-1] if toks else name
    return name, abbr, surname


def _get(url):
    return requests.get(url, headers={"User-Agent": UA}, timeout=25).text


def _extract_city(html):
    """Find the round venue so results tie to the F1 weekend (gbr, bel, ...).
    Look in the <title> and the top of the page (not the full calendar, which
    lists every venue)."""
    m = re.search(r"<title[^>]*>([^<]+)</title>", html, re.I)
    title = m.group(1) if m else ""
    head = html[:3500]                       # round heading area, before the calendar
    for scope in (title, head):
        for city in CITY_TO_RACE:
            if re.search(r"\b" + re.escape(city) + r"\b", scope, re.I):
                return city
    return ""


def _dump(series_key, where, html):
    """Print the real page structure so a failed run reveals how to parse it."""
    print(f"  [{series_key}] ===== DIAGNOSTIC ({where}) len={len(html)} =====")
    print(f"  __NEXT_DATA__={'__NEXT_DATA__' in html}  <table>={html.count('<table')}  "
          f"'Feature'={html.count('Feature')}  raceid_hits={len(re.findall(r'raceid=', html, re.I))}")
    for marker in ["Feature Race", "raceid=", "position", '"pos"', "driverCode",
                   "lastName", "familyName", "tla"]:
        i = html.lower().find(marker.lower())
        if i >= 0:
            snip = re.sub(r"\s+", " ", html[max(0, i - 70):i + 240])
            print(f"  ~{marker}: ...{snip}...")


def find_latest_completed(series_key):
    """Return (raceid, city, feature_rows) for the newest round that has a
    populated feature race. Dumps page structure to the log if nothing parses."""
    base = SERIES[series_key]["base"]
    home = _get(base + "/")
    ids = sorted({int(x) for x in re.findall(r"[?&]raceid=(\d+)", home, re.I)}, reverse=True)
    print(f"  [{series_key}] homepage len={len(home)} raceids={ids[:15]}")
    if not ids:
        _dump(series_key, "homepage", home)
        return None
    first_html = None
    for rid in ids[:15]:                       # newest first; stop at first with results
        html = _get(f"{base}/Results?raceid={rid}")
        if first_html is None:
            first_html = html
        rows = parse_feature_html(html)
        print(f"  [{series_key}] raceid={rid} feature_rows={len(rows)}")
        if rows:
            return rid, _extract_city(html), rows
    _dump(series_key, f"raceid={ids[0]}", first_html)
    return None


def parse_feature_html(html):
    """Parse the FEATURE-race finishing order from a results page's HTML.
    Robust to the FIA layout gluing 'POS No Driver...Team' into one cell."""
    soup = BeautifulSoup(html, "html.parser")

    feature_table = None
    for h in soup.find_all(re.compile(r"h[1-6]")):
        if "feature race results" in h.get_text(strip=True).lower():
            feature_table = h.find_next("table")
            break
    if feature_table is None:      # fallback: first table on the page
        feature_table = soup.find("table")
    if feature_table is None:
        return []

    rows = []
    for tr in feature_table.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
        if not cells:
            continue
        first = cells[0].strip()
        m = re.match(r"^(\d+)\s+(\d+)\s+(.*)$", first)   # "POS NO Driver...Team" combined
        if m:
            pos, driver_cell = int(m.group(1)), m.group(3)
        elif re.match(r"^\d+$", first) and len(cells) > 1:  # POS in its own cell
            pos, driver_cell = int(first), cells[1]
        else:
            continue                                     # header / DNF / DNS row
        name, abbr, surname = parse_driver_cell(driver_cell)
        rows.append({"pos": pos, "name": name, "abbr": abbr, "surname": surname})
    return rows


def scrape_feature(series_key, raceid):
    base = SERIES[series_key]["base"]
    html = requests.get(f"{base}/Results?raceid={raceid}", headers={"User-Agent": UA}, timeout=25).text
    return parse_feature_html(html)


def build_result(series_key, city, rows):
    code = CITY_TO_RACE.get((city or "").strip().lower())
    top = []
    prospect_hit = None
    for r in rows[:6]:
        pid = prospect_id(r["abbr"], r["surname"])
        if pid and prospect_hit is None:
            prospect_hit = {"pos": r["pos"], "id": pid, "name": r["name"]}
        top.append({"pos": r["pos"], "name": r["name"], "id": pid})
    label = f'{SERIES[series_key]["label"]} Feature'
    return {
        "series": series_key,
        "raceLabel": label,
        "winner": (top[0] if top else None),
        "top": top,
        "prospect": prospect_hit,   # first tracked prospect in the top 6 (for "cards heat up")
    }, code


def upsert(race_id, results):
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")
    if not (url and key):
        print("  [supabase] env not set — skipping write"); return
    h = {"apikey": key, "Authorization": "Bearer " + key,
         "Content-Type": "application/json", "Prefer": "return=minimal"}
    base = url.rstrip("/")
    requests.delete(f"{base}/rest/v1/race_results?race_id=eq.{race_id}", headers=h, timeout=25)
    body = {"race_id": race_id, "race_date": dt.date.today().isoformat(), "results": results}
    r = requests.post(f"{base}/rest/v1/race_results", headers=h, data=json.dumps(body), timeout=25)
    print(f"  [supabase] {race_id} -> HTTP {r.status_code}")


def run():
    for sk in ("f2", "f3"):
        try:
            latest = find_latest_completed(sk)
            if not latest:
                print(f"{sk}: no completed round found"); continue
            raceid, city, rows = latest
            results, code = build_result(sk, city, rows)
            rid = f"{sk}-{code}" if code else f"{sk}-r{raceid}"
            win = results["winner"]["name"] if results["winner"] else "?"
            pr = results["prospect"]
            print(f"{sk}: {city} feature — winner {win}" +
                  (f" · prospect {pr['name']} P{pr['pos']}" if pr else ""))
            upsert(rid, results)
        except Exception as e:
            print(f"{sk}: error — {e}")


if __name__ == "__main__":
    run()
