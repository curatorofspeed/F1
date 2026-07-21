#!/usr/bin/env python3
"""Throwaway diagnostic — prints what the FIA F2/F3 pages actually return so the
real find_latest_completed rewrite can be written against ground truth, not a guess.
Run once, paste the output, then delete this file."""
import re, requests

UA = "Mozilla/5.0 (compatible; f1cardindex-radar/1.0)"
SITES = {"f2": "https://www.fiaformula2.com", "f3": "https://www.fiaformula3.com"}

for sk, base in SITES.items():
    print(f"\n========== {sk} ==========")
    try:
        home = requests.get(base + "/", headers={"User-Agent": UA}, timeout=25).text
        m = re.search(r"/Results\?raceid=(\d+)", home)
        seed = m.group(1) if m else None
        print("seed raceid:", seed)
        if not seed:
            print("HOME first 1200:\n", home[:1200]); continue
        page = requests.get(f"{base}/Results?raceid={seed}", headers={"User-Agent": UA}, timeout=25).text
        print("TITLE:", (re.search(r"<title>(.*?)</title>", page, re.S) or [None, "(none)"])[1][:200])
        print("OG:", (re.search(r'og:title"\s+content="(.*?)"', page) or [None, "(none)"])[1][:200])
        print("RESULT-FOR:", (re.search(r"Result for Round.*?\d{4}", page) or [None, "(none)"])[1][:200])
        print("PAGE first 1800:\n", page[:1800])
    except Exception as e:
        print("error:", e)