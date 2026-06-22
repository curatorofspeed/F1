#!/usr/bin/env python3
"""F1 Card Index — SEO page generator.
Single source of truth for all driver landing pages. Edit DRIVERS, run:
    python3 build_seo.py
Outputs <id>.html for each driver + sitemap.xml + robots.txt at repo root.
Set CAMPID once your eBay Partner Network Campaign ID is approved and every
page's eBay links become affiliate links on the next run.
"""
import json, html
from urllib.parse import quote

SITE  = "https://f1cardindex.com"
CAMPID = "5339157397"   # <-- paste your eBay EPN Campaign ID here, then re-run
DISCORD = "https://discord.gg/DX2mrhtqY8"

# id: name, team, num, color, blurb, record(card,price,date,src) or None, sales[...]
DRIVERS = {
 "antonelli": dict(name="Andrea Kimi Antonelli", team="Mercedes", num="12", color="#00D2BE",
   blurb="Mercedes' teenage phenomenon and the most valuable rookie name in modern Formula 1. Antonelli's 2024-2025 Topps Chrome and Dynasty rookie cards command the highest prices of any current young driver, headlined by a six-figure race-worn glove patch auto.",
   record=("2025 Topps Dynasty F1 Race-Worn Glove Patch Auto RC 1/1","$201,910","Apr 2026","Goldin"),
   sales=[("2025 Topps Dynasty F1 Race-Worn Glove Patch Auto RC 1/1","$201,910","Apr 2026","Goldin"),
          ("2025 Topps Dynasty F1 Patch Auto /5","$28,060","May 2026","eBay"),
          ("2024 Topps Chrome F1 Base Auto","$1,104","May 2026","eBay")]),
 "hamilton": dict(name="Lewis Hamilton", team="Ferrari", num="44", color="#ED1C24",
   blurb="Seven-time World Champion, now racing in Ferrari red. Hamilton owns the most valuable Formula 1 trading card ever sold - a 2020 Topps Chrome SuperFractor 1/1 - and his rookie-era Chrome cards remain the blue-chip anchor of the entire F1 hobby.",
   record=("2020 Topps Chrome F1 SuperFractor Auto 1/1","~$1,000,000","Dec 2024","Auction"),
   sales=[("2020 Topps Chrome F1 SuperFractor Auto 1/1","~$1,000,000","Dec 2024","Auction")]),
 "verstappen": dict(name="Max Verstappen", team="Red Bull", num="1", color="#3671C6",
   blurb="Four-time World Champion and one of the most heavily collected drivers in the sport. Verstappen's 2020 Topps Chrome rookie autograph SuperFractor is a half-million-dollar grail, and his patch and parallel cards stay in constant demand.",
   record=("2020 Topps Chrome F1 Autographs SuperFractor RC 1/1","$534,000","2023","Auction"),
   sales=[("2020 Topps Chrome F1 Autographs SuperFractor RC 1/1","$534,000","2023","Auction"),
          ("2025 Topps Dynasty F1 Signed Race-Used Patch /5","$17,893","Mar 2026","Goldin")]),
 "leclerc": dict(name="Charles Leclerc", team="Ferrari", num="16", color="#ED1C24",
   blurb="Ferrari's long-time leader and a perennial pole-position threat. Leclerc's 2020 Topps Chrome rookie SuperFractor is a six-figure grail, and his Ferrari-era autographs and refractors trade actively across the hobby.",
   record=("2020 Topps Chrome F1 SuperFractor #4 RC 1/1","$264,000","2023","Auction"),
   sales=[("2020 Topps Chrome F1 SuperFractor #4 RC 1/1","$264,000","2023","Auction")]),
 "hadjar": dict(name="Isack Hadjar", team="Red Bull", num="6", color="#3671C6",
   blurb="Red Bull's breakout rookie, promoted to the senior team after a standout debut campaign. Hadjar's 2025 Dynasty and Topps Chrome rookie cards have surged, led by a five-figure patch auto 1/1 - one of the hottest current rookie markets.",
   record=("2025 Topps Dynasty F1 Signed Patch RC 1/1","$12,932","Mar 2026","Goldin"),
   sales=[("2025 Topps Dynasty F1 Signed Patch RC 1/1","$12,932","Mar 2026","Goldin")]),
 "senna": dict(name="Ayrton Senna", team="Legend", num="", color="#e6b65c",
   blurb="Three-time World Champion and the most revered name in Formula 1 history. Senna's vintage 1984 Panini Toleman rookie sticker is a cornerstone of the hobby, and demand for his early cardboard has only intensified over time.",
   record=("1984 Panini Toleman Rookie Sticker (PSA 7)","$39,600","Apr 2023","Goldin"),
   sales=[("1984 Panini Toleman Rookie Sticker (PSA 7)","$39,600","Apr 2023","Goldin")]),
 "norris": dict(name="Lando Norris", team="McLaren", num="4", color="#FF8000",
   blurb="McLaren's star and a championship contender with one of the largest fanbases in F1. Norris's 2020 Topps Chrome rookie and 2023 autograph cards are among the most actively traded modern F1 cards.",
   record=None,
   sales=[("2023 Topps Chrome F1 SuperFractor Auto (PSA 6)","$4,575","Apr 2026","Card Ladder")]),
 "schumacher": dict(name="Michael Schumacher", team="Legend", num="", color="#e6b65c",
   blurb="Seven-time World Champion and co-holder of the all-time title record. Schumacher's vintage Grid and Futera cards, along with modern Topps legend inserts and relics, keep him a perennial blue-chip of motorsport collecting.",
   record=None,
   sales=[("1992 Grid Formula 1 Rookie (PSA 10)","~$2,600","2024","eBay")]),
 "piastri": dict(name="Oscar Piastri", team="McLaren", num="81", color="#FF8000",
   blurb="McLaren's title-contending star. Piastri's 2023 Topps Chrome rookie cards and Futuro parallels are among the most-watched in the modern F1 market as his results climb toward the front.",
   record=None,
   sales=[("2023 Topps Chrome F1 Futuro Red /5 (PSA 7)","$5,351","2024","eBay")]),
 "russell": dict(name="George Russell", team="Mercedes", num="63", color="#00D2BE",
   blurb="Mercedes' team leader and a Grand Prix winner who consistently runs at the front. Russell's early Topps Chrome Formula 1 cards are a quietly accumulating long-term hold as his career trends upward.",
   record=None, sales=[]),
 "alonso": dict(name="Fernando Alonso", team="Aston Martin", num="14", color="#229971",
   blurb="Two-time World Champion and one of the most experienced and decorated drivers on the grid. Alonso's cards carry genuine legend-tier appeal, spanning his early career through his current Aston Martin run.",
   record=None, sales=[]),
 "sainz": dict(name="Carlos Sainz", team="Williams", num="55", color="#00A3E0",
   blurb="A Grand Prix winner now leading Williams, with a loyal global following. Sainz's Topps Chrome Formula 1 cards see steady collector interest across his Ferrari and Williams eras.",
   record=None, sales=[]),
 "bortoleto": dict(name="Gabriel Bortoleto", team="Audi", num="5", color="#009A3E",
   blurb="Audi's rookie and a reigning Formula 2 champion-pedigree talent, one of the most hyped young prospects entering F1. Bortoleto's rookie cards are an early speculative play on a rising star.",
   record=None, sales=[]),
 "bearman": dict(name="Oliver Bearman", team="Haas", num="87", color="#B6BABD",
   blurb="Haas's young British driver and a Ferrari Academy product who impressed on his Formula 1 debut. Bearman's Futuro and rookie cards draw steady spec interest as his F1 career takes shape.",
   record=None, sales=[]),
}
ORDER = list(DRIVERS.keys())

def ebay(name, sold):
    q = quote("Topps Chrome Formula 1 " + name)
    u = "https://www.ebay.com/sch/i.html?_nkw="+q+("&LH_Sold=1&LH_Complete=1&_sop=13" if sold else "&LH_Auction=1&_sop=1")
    if CAMPID:
        u += "&mkevt=1&mkcid=1&mkrid=711-53200-19255-0&campid="+CAMPID+"&toolid=10001"
    return u

GEO_SCRIPT = '''<script>
(function(){
  var M={US:['com','711-53200-19255-0'],GB:['co.uk','710-53481-19255-0'],AU:['com.au','705-53470-19255-0'],CA:['ca','706-53473-19255-0'],DE:['de','707-53477-19255-0'],FR:['fr','709-53476-19255-0'],IT:['it','724-53478-19255-0'],ES:['es','1185-53479-19255-0'],NL:['nl','1346-53482-19255-0'],AT:['at','5221-53469-19255-0'],BE:['be','1553-53471-19255-0'],CH:['ch','5222-53480-19255-0'],IE:['ie','5282-53468-19255-0'],PL:['pl','4908-226936-19255-0']};
  var mkt=M.US;
  try{
    var langs=(navigator.languages&&navigator.languages.length)?navigator.languages:[navigator.language||'en-US'];
    var found=null;
    for(var i=0;i<langs.length;i++){var m=/[-_]([A-Za-z]{2})(?:[-_]|$)/.exec(langs[i]||'');if(m){var cc=m[1].toUpperCase();if(M[cc]){found=M[cc];break;}}}
    if(!found){var b=((navigator.language||'en').split(/[-_]/)[0]||'en').toLowerCase();var bl={de:'DE',fr:'FR',it:'IT',es:'ES',nl:'NL',pl:'PL'};if(bl[b]&&M[bl[b]])found=M[bl[b]];}
    if(found)mkt=found;
  }catch(e){}
  if(mkt[0]==='com')return;
  var links=document.querySelectorAll('a[href*="ebay.com/sch"]');
  for(var j=0;j<links.length;j++){var h=links[j].getAttribute('href');h=h.replace('//www.ebay.com/','//www.ebay.'+mkt[0]+'/').replace('mkrid=711-53200-19255-0','mkrid='+mkt[1]);links[j].setAttribute('href',h);}
})();
</script>'''

def page(did, d):
    e = html.escape
    name = d["name"]
    desc = f"{name} Formula 1 trading card market: live Topps Chrome auctions ending soon, recent sold prices, and record sales. Track {name}'s {d['team']} cards on the F1 Card Index."
    canon = f"{SITE}/{did}"
    rec = d["record"]
    rec_html = ""
    if rec:
        rec_html = f'<div class="record"><div class="lab">Auction Record</div><div class="rec-price">{e(rec[1])}</div><div class="rec-card">{e(rec[0])}</div><div class="rec-meta">{e(rec[2])} &middot; {e(rec[3])}</div></div>'
    if d["sales"]:
        rows = "".join(f'<tr><td class="sc">{e(c)}</td><td class="sp">{e(p)}</td><td class="sd">{e(dt)} &middot; {e(src)}</td></tr>' for (c,p,dt,src) in d["sales"])
        sales_html = f'<h2>Notable Sales</h2><table><tbody>{rows}</tbody></table>'
    else:
        sales_html = f'<h2>Notable Sales</h2><p class="none">No public record sale on file yet &mdash; track {e(name)}\'s live market above. Sales surface here as they\'re verified.</p>'
    others = "".join(f'<a href="/{o}">{e(DRIVERS[o]["name"])}</a>' for o in ORDER if o != did)
    meta_line = f"{e(d['team'])}" + (f" &middot; #{e(d['num'])}" if d['num'] else "") + " &middot; Topps Chrome &amp; Dynasty Formula 1"
    ld = {"@context":"https://schema.org","@type":"CollectionPage","name":f"{name} F1 Cards","url":canon,
          "description":desc,"about":{"@type":"Person","name":name,"jobTitle":"Formula 1 Driver","affiliation":d["team"]}}
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(name)} F1 Cards &mdash; Topps Chrome Prices, Records &amp; Live Market | F1 Card Index</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{canon}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="F1 Card Index">
<meta property="og:title" content="{e(name)} F1 Cards &mdash; Prices, Records &amp; Live Market">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{canon}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{json.dumps(ld)}</script>
<style>
  :root{{--bg:#0a0d0c;--panel:#111614;--line:#1e2724;--txt:#e7ece9;--muted:#8a968f;--teal:#00d2be;--gold:#e6b65c;--accent:{d['color']}}}
  *{{box-sizing:border-box}}
  body{{margin:0;background:var(--bg);color:var(--txt);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.55}}
  .wrap{{max-width:860px;margin:0 auto;padding:26px 18px 60px}}
  .top{{font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted)}}
  .top a{{color:var(--teal);text-decoration:none}}
  h1{{font-size:34px;margin:10px 0 4px;line-height:1.05}}
  .accent{{color:var(--accent)}}
  .meta{{color:var(--muted);font-size:14px;margin-bottom:18px}}
  .blurb{{font-size:16px;color:#cdd6d1;margin:0 0 22px}}
  .record{{background:linear-gradient(100deg,rgba(230,182,92,.12),var(--panel));border:1px solid #4a3d1c;border-radius:14px;padding:16px 18px;margin-bottom:24px}}
  .record .lab{{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--gold)}}
  .rec-price{{font-size:30px;font-weight:800;color:var(--gold);line-height:1.1}}
  .rec-card{{font-size:14px;margin-top:2px}}
  .rec-meta{{font-size:12px;color:var(--muted);font-family:ui-monospace,monospace}}
  h2{{font-size:13px;letter-spacing:1.5px;text-transform:uppercase;border-bottom:1px solid var(--line);padding-bottom:8px;margin:30px 0 14px}}
  table{{width:100%;border-collapse:collapse;font-size:14px}}
  td{{padding:10px 6px;border-bottom:1px solid var(--line);vertical-align:top}}
  .sp{{font-family:ui-monospace,monospace;font-weight:700;color:var(--gold);white-space:nowrap;text-align:right}}
  .sd{{color:var(--muted);font-size:12px;white-space:nowrap;text-align:right}}
  .none{{color:var(--muted);font-size:14px}}
  .cta{{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}}
  .btn{{flex:1;min-width:150px;text-align:center;text-decoration:none;padding:14px;border-radius:12px;font-weight:700;font-size:15px}}
  .btn-p{{background:var(--teal);color:#06110f}}
  .btn-g{{background:transparent;border:1px solid var(--line);color:var(--txt)}}
  .open{{display:block;text-align:center;background:var(--accent);color:#06110f;font-weight:800;text-decoration:none;padding:16px;border-radius:12px;margin:26px 0;font-size:16px}}
  .discord{{display:block;text-align:center;border:1px solid rgba(88,101,242,.5);color:#9aa6ff;font-weight:700;text-decoration:none;padding:13px;border-radius:12px;margin:0 0 26px;font-size:14px}}
  .discord:hover{{background:rgba(88,101,242,.12);border-color:#5865F2}}
  .others{{display:flex;gap:8px 16px;flex-wrap:wrap;margin-top:10px}}
  .others a{{color:var(--teal);text-decoration:none;font-size:14px}}
  footer{{margin-top:40px;color:var(--muted);font-size:12px;border-top:1px solid var(--line);padding-top:16px}}
</style>
</head>
<body>
<div class="wrap">
  <div class="top"><a href="/">&larr; F1 Card Index</a> / Drivers / {e(name)}</div>
  <h1>{e(name)} <span class="accent">F1 Cards</span></h1>
  <div class="meta">{meta_line}</div>
  <p class="blurb">{e(d['blurb'])}</p>
  {rec_html}
  <h2>Live Market &mdash; {e(name)}</h2>
  <p style="color:var(--muted);font-size:13px;margin-top:0">Opens current eBay results for {e(name)} Topps Chrome F1 cards.</p>
  <div class="cta">
    <a class="btn btn-p" href="{ebay(name,False)}" rel="nofollow sponsored" target="_blank">Auctions ending soon &#8599;</a>
    <a class="btn btn-g" href="{ebay(name,True)}" rel="nofollow sponsored" target="_blank">Recently sold &#8599;</a>
  </div>
  {sales_html}
  <a class="open" href="/#{did}">Open {e(name)}'s full live market on F1 Card Index &rarr;</a>
  <a class="discord" href="{DISCORD}" target="_blank" rel="noopener">Join the F1 Card Index community on Discord &#8599;</a>
  <h2>All Drivers</h2>
  <div class="others">{others}</div>
  <footer>
    Notable sales are dated, sourced auction results &mdash; not live quotes. Current prices update live via the eBay links above.
    Some links are affiliate links; we may earn a commission at no extra cost to you. Card values are speculative.
    Logos and driver names are referenced for identification only. &copy; F1 Card Index.
  </footer>
</div>
{GEO_SCRIPT}
</body>
</html>'''

import os
out = "/mnt/user-data/outputs"
for did, d in DRIVERS.items():
    open(os.path.join(out, f"{did}.html"), "w").write(page(did, d))
urls = [SITE+"/"] + [f"{SITE}/{d}" for d in ORDER]
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
sm += "".join(f"  <url><loc>{u}</loc></url>\n" for u in urls) + "</urlset>\n"
open(os.path.join(out,"sitemap.xml"),"w").write(sm)
open(os.path.join(out,"robots.txt"),"w").write("User-agent: *\nAllow: /\nSitemap: "+SITE+"/sitemap.xml\n")
print(f"Generated {len(DRIVERS)} driver pages + sitemap.xml + robots.txt")
print("Pages:", ", ".join(ORDER))
