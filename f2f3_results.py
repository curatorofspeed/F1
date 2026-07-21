#!/usr/bin/env python3
"""
f2f3_results.py — pull the latest F2 & F3 FEATURE-race results and write them to
Supabase `race_results` (series-tagged), which the site's trending strip reads.

SOURCE: Motorsport Week (motorsportweek.com). The FIA F2/F3 sites moved to a
client-side app + RSC payloads (mid-2026) and no longer server-render results,
so HTML scraping them is dead. MSW publishes a clean results table within hours
of every round, at a stable URL, in a consistent WordPress structure.

STRATEGY (self-correcting, no date/slug guessing):
  1. Fetch the MSW Formula 2 / Formula 3 category feed.
  2. Find the newest "<Series> <Year> <GP> - Feature Race Results" article.
  3. Fetch it, parse the finishing-order table.
  4. Map GP -> your F1 race_id, tag prospects, upsert (delete+insert, stamps updated_at).

Reuses env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Weekly cron.
Requires: requests, beautifulsoup4  (pip install requests beautifulsoup4)
"""
import os, re, sys, json, datetime as dt
import requests
from bs4 import BeautifulSoup

UA = "Mozilla/5.0 (compatible; f1cardindex-radar/1.0)"

SERIES = {
    "f2": {"feed": "https://www.motorsportweek.com/series/single-seater/formula-2/",
           "slug": "formula-2", "label": "F2"},
    "f3": {"feed": "https://www.motorsportweek.com/series/single-seater/formula-3/",
           "slug": "formula-3", "label": "F3"},
}

# MSW GP name (in the article title/slug) -> your F1 race_id, so F2/F3 results tie
# to the same weekend + show the right flag. Keyed on the nationality adjective MSW
# uses ("British GP", "Belgian GP", ...). Extend as the season adds rounds.
GP_TO_RACE = {
    "australian": "aus", "chinese": "chn", "japanese": "jpn", "bahrain": "bhr",
    "saudi arabian": "sau", "saudi": "sau", "miami": "mia", "canadian": "can",
    "emilia romagna": "imo", "imola": "imo", "monaco": "mon", "spanish": "esp",
    "austrian": "aut", "british": "gbr", "belgian": "bel", "hungarian": "hun",
    "dutch": "ned", "italian": "ita", "madrid": "mad", "azerbaijan": "aze",
    "qatar": "qat", "abu dhabi": "abu", "singapore": "sgp", "united states": "usa",
    "mexican": "mex", "mexico city": "mex", "brazilian": "bra", "são paulo": "bra",
    "sao paulo": "bra", "las vegas": "lva",
}

# Your tracked F2/F3 prospects, matched by surname (MSW prints full "First Last").
# Value = your prospect id used on the site. Extend as your grid changes.
PROSPECT_BY_SURNAME = {
    "ugochukwu": "ugochukwu", "camara": "camara", "câmara": "camara",
    "montoya": "montoya", "minì": "mini", "mini": "mini", "fornaroli": "fornaroli",
    "dunne": "dunne", "beganović": "beganovic", "beganovic": "beganovic",
    "verschoor": "verschoor", "crawford": "crawford", "martins": "martins",
    "maini": "maini", "browning": "browning", "dürksen": "durksen", "durksen": "durksen",
    "villagomez": "villagomez", "villagómez": "villagomez", "tsolov": "tsolov",
    "bortoleto": "bortoleto", "leon": "leon", "león": "leon", "bilinski": "bilinski",
    "stenshorne": "stenshorne", "goethe": "goethe", "inthraphuvasak": "inthraphuvasak",
    "rivera": "rivera", "yamakoshi": "yamakoshi", "slater": "slater",
    "strømsted": "stromsted", "stromsted": "stromsted", "taponen": "taponen",
    "badoer": "badoer", "clerot": "clerot", "nakamura": "nakamura",
}


def norm(s):
    return re.sub(r"\s+", " ", (s or "")).strip()


def strip_accents_lower(s):
    import unicodedata
    s = unicodedata.normalize("NFKD", s or "")
    return "".join(c for c in s if not unicodedata.combining(c)).lower().strip()


def prospect_id(full_name):
    """Map an MSW 'First Last' name to your tracked prospect id, or None."""
    parts = norm(full_name).split()
    if not parts:
        return None
    # try the last token, then last two (handles 'Van Hoepen', 'Le Clerc')
    for key in (parts[-1], " ".join(parts[-2:]) if len(parts) >= 2 else parts[-1]):
        k = key.lower()
        if k in PROSPECT_BY_SURNAME:
            return PROSPECT_BY_SURNAME[k]
        ka = strip_accents_lower(key)
        if ka in PROSPECT_BY_SURNAME:
            return PROSPECT_BY_SURNAME[ka]
    return None


def race_code_from_title(title):
    """'Formula 2 2026 British GP - Feature Race Results' -> ('british','gbr')."""
    m = re.search(r"\b20\d{2}\s+(.*?)\s+GP\b", title, re.I)
    if not m:
        m = re.search(r"\b20\d{2}\s+(.*?)\s+Grand Prix\b", title, re.I)
    gp = norm(m.group(1)).lower() if m else ""
    return gp, GP_TO_RACE.get(gp)


def find_latest_feature_article(series_key):
    """Fetch the MSW category feed and return (url, title, date) of the newest
    '<Series> <Year> <GP> - Feature Race Results' post, or None."""
    cfg = SERIES[series_key]
    html = requests.get(cfg["feed"], headers={"User-Agent": UA}, timeout=25).text
    soup = BeautifulSoup(html, "html.parser")

    label = cfg["label"]
    # MSW article URLs look like /YYYY/MM/DD/formula-2-2026-british-gp-feature-race-results/
    pat_url = re.compile(
        r"/(20\d{2})/(\d{2})/(\d{2})/" + re.escape(cfg["slug"]) +
        r"-20\d{2}-[a-z-]*?-feature-race-results/?$", re.I)

    best = None  # (date, url, title)
    for a in soup.find_all("a", href=True):
        href = a["href"]
        m = pat_url.search(href)
        if not m:
            continue
        title = norm(a.get_text()) or href
        # confirm it's a feature-results post (not sprint/quali) via the URL, already matched
        try:
            d = dt.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            continue
        if best is None or d > best[0]:
            best = (d, href, title)
    if not best:
        return None
    d, url, title = best
    if url.startswith("/"):
        url = "https://www.motorsportweek.com" + url
    return url, title, d


def parse_results_table(html):
    """Parse the finishing order from an MSW results article.
    Table header is: Position | Driver | Team | Gap  (Gap holds 'DNF' for retirements)."""
    soup = BeautifulSoup(html, "html.parser")
    # Prefer the title so we can label + map the round
    page_title = norm((soup.find("title").get_text() if soup.find("title") else "")) \
                 or norm((soup.find("h1").get_text() if soup.find("h1") else ""))

    target = None
    for table in soup.find_all("table"):
        head = norm(table.get_text(" ")).lower()
        if "position" in head and "driver" in head:
            target = table
            break
    if target is None:
        return page_title, []

    rows = []
    for tr in target.find_all("tr"):
        cells = [norm(td.get_text(" ")) for td in tr.find_all(["td", "th"])]
        if len(cells) < 2:
            continue
        pos_raw = cells[0].rstrip(".").strip()
        if not re.match(r"^\d+$", pos_raw):        # header / junk row
            continue
        pos = int(pos_raw)
        name = cells[1]
        team = cells[2] if len(cells) > 2 else ""
        gap = cells[3] if len(cells) > 3 else ""
        dnf = "dnf" in gap.lower() or "dns" in gap.lower() or "ret" in gap.lower()
        rows.append({"pos": pos, "name": name, "team": team, "dnf": dnf})
    rows.sort(key=lambda r: r["pos"])
    return page_title, rows


def build_result(series_key, gp_name, code, rows):
    top = []
    prospect_hit = None
    for r in rows[:6]:
        pid = prospect_id(r["name"])
        if pid and prospect_hit is None and not r["dnf"]:
            prospect_hit = {"pos": r["pos"], "id": pid, "name": r["name"]}
        top.append({"pos": r["pos"], "name": r["name"], "id": pid})
    return {
        "series": series_key,
        "raceLabel": f'{SERIES[series_key]["label"]} Feature',
        "gp": gp_name,
        "winner": (top[0] if top else None),
        "top": top,
        "prospect": prospect_hit,
    }


def upsert(race_id, results, race_date):
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")
    if not (url and key):
        print("  [supabase] env not set — skipping write"); return
    h = {"apikey": key, "Authorization": "Bearer " + key,
         "Content-Type": "application/json", "Prefer": "return=minimal"}
    base = url.rstrip("/")
    requests.delete(f"{base}/rest/v1/race_results?race_id=eq.{race_id}", headers=h, timeout=25)
    body = {"race_id": race_id, "race_date": race_date.isoformat(), "results": results}
    r = requests.post(f"{base}/rest/v1/race_results", headers=h, data=json.dumps(body), timeout=25)
    print(f"  [supabase] {race_id} -> HTTP {r.status_code}")


def run():
    for sk in ("f2", "f3"):
        try:
            found = find_latest_feature_article(sk)
            if not found:
                print(f"{sk}: no feature-results article found in MSW feed"); continue
            url, feed_title, race_date = found
            html = requests.get(url, headers={"User-Agent": UA}, timeout=25).text
            page_title, rows = parse_results_table(html)
            title = page_title or feed_title
            gp_name, code = race_code_from_title(title)
            if not rows:
                print(f"{sk}: '{title}' — no result rows parsed (check table structure)"); continue

            rid = f"{sk}-{code}" if code else f"{sk}-{re.sub(r'[^a-z0-9]+','-',gp_name) or 'unknown'}"
            results = build_result(sk, gp_name, code, rows)
            win = results["winner"]["name"] if results["winner"] else "?"
            pr = results["prospect"]
            print(f"{sk}: {gp_name or '?'} GP feature — winner {win} ({len(rows)} classified)" +
                  (f" · prospect {pr['name']} P{pr['pos']}" if pr else "") +
                  (f"  [no race_id map for '{gp_name}']" if not code else ""))
            upsert(rid, results, race_date)
        except Exception as e:
            print(f"{sk}: error — {e}")


if __name__ == "__main__":
    run()
