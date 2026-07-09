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
    """'N. TsolovTSOCampos Racing' -> (name='N. Tsolov', abbr='TSO', surname='Tsolov')."""
    text = re.sub(r"\s+", " ", text or "").strip()
    m = re.search(r"^(.*?)([A-Z]{3})([A-Z].*)$", text)  # name | 3-letter abbr | team
    if m:
        name = m.group(1).strip()
        abbr = m.group(2)
    else:
        name, abbr = text, ""
    surname = name.split(".")[-1].strip() if "." in name else name.strip()
    return name, abbr, surname


def find_latest_completed(series_key):
    """Fetch homepage -> a results page -> read the calendar -> pick the newest
    round whose date is on/before today. Returns (raceid, city, date) or None."""
    base = SERIES[series_key]["base"]
    home = requests.get(base + "/", headers={"User-Agent": UA}, timeout=25).text
    m = re.search(r"/Results\?raceid=(\d+)", home)
    if not m:
        return None
    seed = m.group(1)
    page = requests.get(f"{base}/Results?raceid={seed}", headers={"User-Agent": UA}, timeout=25).text

    # calendar entries look like: >Silverstone Silverstone 03-05 Jul<  (a=/Results?raceid=NNNN)
    rounds = []
    for a in re.finditer(r'/Results\?raceid=(\d+)"[^>]*>([^<]*?)(\d{1,2})-(\d{1,2})\s+([A-Za-z]{3,4})', page):
        rid, city = a.group(1), a.group(2)
        day2, mon = int(a.group(4)), a.group(5)[:3]
        months = {"Jan":1,"Feb":2,"Mar":3,"Apr":4,"May":5,"Jun":6,"Jul":7,
                  "Aug":8,"Sep":9,"Oct":10,"Nov":11,"Dec":12}
        mnum = months.get(mon.title())
        if not mnum:
            continue
        year = dt.date.today().year
        try:
            end = dt.date(year, mnum, day2)
        except ValueError:
            continue
        city_clean = re.sub(r"([a-z])([A-Z])", r"\1 \2", city).strip().split("  ")[0].strip()
        rounds.append((rid, city_clean, end))

    today = dt.date.today()
    done = [r for r in rounds if r[2] <= today]
    if not done:
        return None
    done.sort(key=lambda r: r[2])
    return done[-1]


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
            raceid, city, end = latest
            rows = scrape_feature(sk, raceid)
            if not rows:
                print(f"{sk}: {city} — no feature rows parsed (check HTML structure)"); continue
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
