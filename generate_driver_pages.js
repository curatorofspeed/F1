#!/usr/bin/env node
/* ============================================================================
   F1 Card Index — static driver-page generator
   ----------------------------------------------------------------------------
   Reads the seed data inside index.html and emits one crawlable, indexable
   HTML page per driver at drivers/<id>.html (served as /drivers/<id> via
   Vercel cleanUrls), plus:
     • regenerated sitemap.xml (base pages + driver pages)
     • refreshed "Driver price guides" footer nav inside index.html
       (between the DRIVER-PAGES-NAV-START/END markers)

   Usage:   node tools/generate_driver_pages.js
   Options: FANATICS_IMPACT="https://fanaticscollect.pxf.io/c/x/y/z" node ...
            (wraps Fanatics Collect links once your Impact account is live)

   Run this again any time seed data changes, then commit drivers/ + sitemap
   + index.html together.
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const OUT_DIR = path.join(ROOT, 'drivers');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const SITE = 'https://f1cardindex.com';
const MIN_TOP10 = 5;              // skip thin boards (F2/F3 prospects)
const EPN_CAMPID = '5339157397';  // eBay Partner Network
const FANATICS_IMPACT = process.env.FANATICS_IMPACT || ''; // Impact click URL prefix, optional
const TODAY = new Date().toISOString().slice(0, 10);

/* ---------- extract seed data from index.html ---------- */
function loadDrivers(html) {
  const start = html.indexOf('function seedData(){');
  if (start < 0) throw new Error('seedData() not found in index.html');
  let depth = 0, end = -1;
  for (let j = html.indexOf('{', start); j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (depth === 0) { end = j + 1; break; } }
  }
  const src = html.slice(start, end);
  // stubs for globals seedData touches in the browser
  const sandbox = `
    let state={};
    const uid=(()=>{let n=0;return ()=>'s'+(++n);})();
    const defaultPromos=()=>[]; const SEED_VERSION='gen'; const RACES=[];
    const save=()=>{}; const localStorage={setItem(){},getItem(){return null},removeItem(){}};
    const console={log(){},warn(){},error(){}};
    ${src};
    seedData();
    state.drivers;`;
  return eval(sandbox); // eslint-disable-line no-eval
}

/* ---------- helpers ---------- */
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const money = n => n == null ? '—' : '$' + Math.round(Number(n)).toLocaleString('en-US');
const fmtDate = d => {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt)) return esc(d);
  return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};
function wrapUrl(u) {
  if (!u) return null;
  if (/ebay\./i.test(u)) {
    if (/[?&]campid=/.test(u)) return u;
    const sep = u.includes('?') ? '&' : '?';
    return u + sep + 'mkevt=1&mkcid=1&mkrid=711-53200-19255-0&campid=' + EPN_CAMPID + '&toolid=10001';
  }
  if (/fanaticscollect\.com/i.test(u) && FANATICS_IMPACT) {
    const glue = /[?&]u?=$|=$/.test(FANATICS_IMPACT) ? '' : (FANATICS_IMPACT.includes('?') ? '&u=' : '?u=');
    return FANATICS_IMPACT + glue + encodeURIComponent(u);
  }
  return u; // Goldin & others: no program, pass through clean
}

/* ---------- page template ---------- */
const STYLE = `:root{--bg:#0c0d0e;--panel:#15171a;--panel2:#1b1e22;--line:#2a2e33;--teal:#c4cdd2;--teal-dim:#4a5258;--gold:#d9b878;--txt:#eef1f3;--muted:#828c93}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--txt);font-family:'Sora',system-ui,-apple-system,sans-serif;line-height:1.72;-webkit-font-smoothing:antialiased}
a{color:var(--gold);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:820px;margin:0 auto;padding:0 20px}
header.site{border-bottom:1px solid var(--line);background:rgba(12,13,14,.86);backdrop-filter:blur(8px);position:sticky;top:0;z-index:10}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;height:58px}
.brand{font-family:'Saira Condensed',sans-serif;font-weight:800;font-size:21px;letter-spacing:1px;text-transform:uppercase;color:var(--txt);display:flex;align-items:center;gap:9px}
.brand:hover{text-decoration:none}
.brand .chk{font-size:16px}
.back{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
.back:hover{color:var(--teal);text-decoration:none}
main{padding:40px 0 6px}
.tag{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:1.4px;color:var(--gold);border:1px solid var(--line);border-radius:20px;padding:3px 12px;margin-bottom:18px}
h1{font-family:'Saira Condensed',sans-serif;font-weight:800;font-size:42px;line-height:1.04;letter-spacing:.5px;text-transform:uppercase;margin:0 0 8px}
.lede{color:var(--muted);font-size:15.5px;margin:0 0 28px;max-width:66ch}
h2{font-family:'Saira Condensed',sans-serif;font-weight:700;font-size:25px;letter-spacing:.5px;text-transform:uppercase;margin:36px 0 11px;color:var(--txt)}
p,li{font-size:15.5px;color:#d6dde1}
strong{color:var(--txt);font-weight:600}
.box{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:17px 20px;margin:22px 0}
.box p:first-child{margin-top:0}.box p:last-child{margin-bottom:0}
.record{display:flex;gap:18px;align-items:center}
.record img{width:96px;height:auto;border-radius:8px;border:1px solid var(--line);flex:0 0 auto}
.record .r-price{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:22px;color:var(--gold)}
.record .r-card{font-size:14.5px;color:var(--txt)}
.record .r-meta{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-top:3px}
table{width:100%;border-collapse:collapse;margin:14px 0 6px;font-size:14px}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-family:'JetBrains Mono',monospace;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;color:var(--muted)}
td.pr{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--gold);white-space:nowrap}
td.rk{font-family:'JetBrains Mono',monospace;color:var(--muted);width:26px}
td.dt{white-space:nowrap;color:var(--muted);font-size:12.5px}
.tbl-note{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted)}
.btn{display:inline-block;background:var(--gold);color:#0c0d0e;font-weight:600;font-size:14px;padding:10px 20px;border-radius:9px;margin:6px 0}
.btn:hover{text-decoration:none;filter:brightness(1.06)}
.xlinks{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 4px}
.xlinks a{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted);border:1px solid var(--line);border-radius:18px;padding:4px 12px}
.xlinks a:hover{color:var(--teal);text-decoration:none;border-color:var(--teal-dim)}
footer.site{border-top:1px solid var(--line);margin-top:48px;padding:28px 0 44px}
footer.site .links{display:flex;flex-wrap:wrap;gap:8px 16px;margin-bottom:18px}
footer.site .links a{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px}
footer.site .links a:hover{color:var(--teal);text-decoration:none}
footer.site .fine{font-size:12.5px;color:var(--muted);line-height:1.62}
@media(max-width:560px){h1{font-size:33px}main{padding:30px 0 6px}.record{flex-direction:row}.record img{width:72px}td.dt{display:none}th.dt{display:none}}`;

const CHECKLIST_CSS = `
h3.cl-set{font-size:15px;margin:26px 0 8px;font-weight:700}
h3.cl-set a{color:var(--gold)}
table.cl td,table.cl th{padding:7px 12px;font-size:13.5px}
table.cl .rc{display:inline-block;font-size:9.5px;font-weight:800;letter-spacing:.05em;color:#062;background:#39e08a;border-radius:4px;padding:1px 5px;margin-left:6px;vertical-align:1px}
table.cl td a{color:var(--gold);font-weight:600;font-size:12.5px}
`;

const FOOT_LINKS = `<a href="/">Market Home</a>
<a href="/f1-card-price-guide">Price Guide</a>
<a href="/topps-chrome-f1-guide">Topps Chrome Guide</a>
<a href="/f1-card-market-report">Market Report</a>
<a href="/about">About</a>
<a href="/methodology">Methodology</a>
<a href="/contact">Contact</a>
<a href="/privacy-policy">Privacy Policy</a>
<a href="/terms">Terms</a>
<a href="/disclaimer">Disclaimer</a>`;

const ADSENSE_SNIPPET = '<!-- ADSENSE <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-REPLACE" crossorigin="anonymous"></script> ADSENSE -->';

function lastName(n) { return n.split(' ').slice(-1)[0]; }

function sourcesSentence(top10) {
  const counts = {};
  top10.forEach(t => { if (t.source) counts[t.source] = (counts[t.source] || 0) + 1; });
  const parts = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([s, c]) => `${s} (${c})`);
  return parts.join(', ');
}

/* ---------- card checklist section ---------- */
// map a card's {set, year} to its /sets/ page slug (only sets that have pages)
function setSlug(set, year) {
  const s = String(set || '').toLowerCase();
  if (/sapphire/.test(s))            return `${year}-topps-chrome-sapphire-f1`;
  if (/dynasty/.test(s))             return `${year}-topps-dynasty-f1`;
  if (/logofractor/.test(s))         return `${year}-topps-chrome-logofractor-f1`;
  if (/chrome/.test(s))              return `${year}-topps-chrome-f1`;
  return null;
}
function ebaySearch(q) {
  let u = 'https://www.ebay.com/sch/i.html?_nkw=' + encodeURIComponent(q);
  if (EPN_CAMPID) u += '&mkevt=1&mkcid=1&mkrid=711-53200-19255-0&campid='
    + encodeURIComponent(EPN_CAMPID) + '&toolid=10001';
  return u;
}
function checklistSection(d) {
  const cards = (d.cards || []).filter(c => c && c.set && c.parallel);
  if (!cards.length) return { html: '', count: 0 };
  // group by "year set", newest first; dedupe grade variants of the same parallel
  const groups = {};
  cards.forEach(c => {
    const key = `${c.year} ${c.set}`;
    (groups[key] = groups[key] || { year: c.year, set: c.set, seen: new Set(), rows: [] });
    const g = groups[key];
    if (g.seen.has(c.parallel)) return;
    g.seen.add(c.parallel);
    g.rows.push(c);
  });
  const keys = Object.keys(groups).sort((x, y) => groups[y].year - groups[x].year || x.localeCompare(y));
  let count = 0;
  const blocks = keys.map(k => {
    const g = groups[k];
    const slug = setSlug(g.set, g.year);
    const head = slug
      ? `<a href="/sets/${slug}">${esc(k)}</a>`
      : esc(k);
    const rows = g.rows.map(c => {
      count++;
      const clean = String(c.parallel).replace(/^#\d+\s*/, '');       // "#8 Gold Refractor" -> "Gold Refractor"
      const q = `${lastName(d.name)} ${g.year} ${g.set} ${clean}`.replace(/\s+/g, ' ');
      return `<tr><td>${esc(c.parallel)}${c.rc ? ' <span class="rc">RC</span>' : ''}</td>` +
        `<td class="pr">${c.print != null ? '/' + c.print : '—'}</td>` +
        `<td class="dt"><a href="${ebaySearch(q)}" target="_blank" rel="noopener sponsored">Shop &nearr;</a></td></tr>`;
    }).join('\n');
    return `<h3 class="cl-set">${head}</h3>
<table class="cl">
<thead><tr><th>Card</th><th># / Run</th><th></th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`;
  }).join('\n');
  const html = `
<h2>${esc(d.name)} Card Checklist</h2>
<p class="tbl-note">Base cards and the parallel rainbow by set · print runs where numbered · shop links are eBay affiliate links</p>
${blocks}`;
  return { html, count };
}

function pageHtml(d, allDrivers) {
  const top10 = (d.top10 || []).slice().sort((a, b) => (b.price || 0) - (a.price || 0)).slice(0, 10);
  const checklist = checklistSection(d);
  const top = top10[0];
  const low = top10[top10.length - 1];
  const years = top10.map(t => (t.date || '').slice(0, 4)).filter(Boolean).sort();
  const yrSpan = years.length ? (years[0] === years[years.length - 1] ? years[0] : `${years[0]}–${years[years.length - 1]}`) : '';
  const ln = lastName(d.name);

  const title = `${d.name} F1 Card Prices — Top Sales & Record (${TODAY.slice(0, 4)}) | F1 Card Index`;
  const desc = `${d.name} Formula 1 trading card prices: the top ${top10.length} verified sales on record` +
    (top ? `, led by a ${money(top.price)} ${top.card}` : '') +
    `. Topps Chrome, Dynasty & Sapphire comps, updated from live market data.`;
  const canonical = `${SITE}/drivers/${d.id}`;

  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'F1 Card Index', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Driver Price Guides', item: SITE + '/#driversBox' },
      { '@type': 'ListItem', position: 3, name: d.name, item: canonical }
    ]
  };
  const itemList = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: `${d.name} — Top ${top10.length} F1 Card Sales`,
    numberOfItems: top10.length,
    itemListElement: top10.map((t, i) => ({
      '@type': 'ListItem', position: i + 1,
      name: `${t.card}${t.grade && t.grade !== 'Raw' ? ' (' + t.grade + ')' : ''} — ${money(t.price)}`
    }))
  };

  const rows = top10.map((t, i) => {
    const href = wrapUrl(t.url);
    const link = href
      ? `<a href="${esc(href)}" target="_blank" rel="noopener sponsored">${esc(t.card)}</a>`
      : esc(t.card);
    return `<tr><td class="rk">${i + 1}</td><td>${link}</td><td>${esc(t.grade || 'Raw')}</td><td class="pr">${money(t.price)}</td><td class="dt">${fmtDate(t.date)}</td><td class="dt">${esc(t.source || '')}</td></tr>`;
  }).join('\n');

  const recordBox = d.record ? `
<div class="box record">
${top && top.img ? `<img src="${top.img}" alt="${esc(d.name)} record F1 card" loading="lazy" width="96">` : ''}
<div>
<div class="r-price">${esc(d.record.price || (top ? money(top.price) : ''))}</div>
<div class="r-card">${esc(d.record.txt || '')}</div>
<div class="r-meta">${esc(d.record.date || '')}${d.record.src ? ' · ' + esc(d.record.src) : ''}</div>
</div>
</div>` : '';

  const others = allDrivers.filter(x => x.id !== d.id)
    .map(x => `<a href="/drivers/${x.id}">${esc(lastName(x.name))}</a>`).join('\n');

  const contextP = top ? `<p>The board above covers verified public sales from ${esc(sourcesSentence(top10))}` +
    (yrSpan ? `, spanning ${yrSpan}` : '') +
    `. The top entry — <strong>${esc(top.card)}${top.grade && top.grade !== 'Raw' ? ' (' + esc(top.grade) + ')' : ''}</strong> — sold for <strong>${money(top.price)}</strong>` +
    (low && low !== top ? `, while the tenth spot currently sits at ${money(low.price)}` : '') +
    `. Boards update as new auction results are verified; the <a href="/#${d.id}">live board</a> always has the latest.</p>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${ADSENSE_SNIPPET}
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="F1 Card Index">
<meta property="og:title" content="${esc(d.name)} F1 Card Prices — Top Sales & Record">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(d.name)} F1 Card Prices — Top Sales & Record">
<meta name="twitter:description" content="${esc(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@600;700;800&family=Sora:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
<script type="application/ld+json">${JSON.stringify(itemList)}</script>
<style>${STYLE}${CHECKLIST_CSS}</style>
</head>
<body>
<header class="site"><div class="wrap">
<a class="brand" href="/"><span class="chk">&#127937;</span> F1 Card Index</a>
<a class="back" href="/#${d.id}">Live ${esc(ln)} board &rarr;</a>
</div></header>
<main><div class="wrap">
<span class="tag">Driver Price Guide</span>
<h1>${esc(d.name)} F1 Card Prices</h1>
<p class="lede">${esc(d.name)}${d.team ? ' (' + esc(d.team) + (d.number ? ' · #' + d.number : '') + ')' : ''} — the top verified Formula 1 trading-card sales on record, from Topps Chrome and Sapphire parallels to high-end Dynasty autographs and patches.</p>

${recordBox}

<h2>Top ${top10.length} Verified Sales</h2>
<p class="tbl-note">Ranked by price · auction-house results and marketplace sold data · some links are affiliate links</p>
<table>
<thead><tr><th>#</th><th>Card</th><th>Grade</th><th>Price</th><th class="dt">Date</th><th class="dt">Source</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>

${contextP}

<p><a class="btn" href="/#${d.id}">Open the live ${esc(ln)} board &rarr;</a></p>

${checklist.html}

<h2>More Driver Price Guides</h2>
<div class="xlinks">
${others}
</div>

</div></main>
<footer class="site"><div class="wrap">
<nav class="links" aria-label="Site pages">
${FOOT_LINKS}
</nav>
<div class="fine">F1 Card Index is an independent market tracker and is not affiliated with, endorsed by, or sponsored by Formula 1, the FIA, any Formula 1 team or driver, Topps, Fanatics, eBay, PSA, or any other referenced brand. All trademarks are the property of their respective owners. Information is provided for general and educational purposes only and is not financial or investment advice. Some outbound links are affiliate links. &copy; <span id="yr">2026</span> F1 Card Index.</div>
</div></footer>
<script>var y=document.getElementById('yr');if(y)y.textContent=new Date().getFullYear();</script>
</body>
</html>
`;
}

/* ---------- sitemap ---------- */
const BASE_URLS = [
  ['/', '1.0'], ['/about', '0.5'], ['/contact', '0.5'], ['/privacy-policy', '0.5'],
  ['/terms', '0.5'], ['/disclaimer', '0.5'], ['/methodology', '0.5'],
  ['/f1-card-price-guide', '0.8'], ['/topps-chrome-f1-guide', '0.8'],
  ['/kimi-antonelli-rookie-card-guide', '0.8'], ['/f1-card-market-report', '0.8'],
];
function sitemapXml(driverIds) {
  const rows = BASE_URLS.map(([p, pr]) =>
    `  <url><loc>${SITE}${p}</loc><lastmod>${TODAY}</lastmod><priority>${pr}</priority></url>`);
  driverIds.forEach(id => rows.push(
    `  <url><loc>${SITE}/drivers/${id}</loc><lastmod>${TODAY}</lastmod><priority>0.8</priority></url>`));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}

/* ---------- main ---------- */
(function main() {
  const html = fs.readFileSync(INDEX, 'utf8');
  const drivers = loadDrivers(html)
    .filter(d => (d.top10 || []).length >= MIN_TOP10);
  if (!drivers.length) throw new Error('no drivers with boards found');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  drivers.forEach(d => {
    const out = pageHtml(d, drivers);
    fs.writeFileSync(path.join(OUT_DIR, d.id + '.html'), out);
    console.log(`  drivers/${d.id}.html  (${(out.length / 1024).toFixed(0)} KB, top10: ${d.top10.length})`);
  });

  // sitemap.xml is owned by generate_sitemap.js (full site: drivers + sets + pages).
  // Run `node generate_sitemap.js` after this tool instead of writing a partial one here.
  console.log(`  sitemap.xml  (${BASE_URLS.length + drivers.length} URLs)`);

  // refresh footer nav in index.html between markers
  const navLinks = drivers.map(d =>
    `      <a href="/drivers/${d.id}">${esc(lastName(d.name))} cards</a>`).join('\n');
  const navBlock = `<!-- DRIVER-PAGES-NAV-START (maintained by tools/generate_driver_pages.js — do not edit by hand) -->\n    <nav class="foot-links" aria-label="Driver price guides">\n${navLinks}\n    </nav>\n    <!-- DRIVER-PAGES-NAV-END -->`;
  const re = /<!-- DRIVER-PAGES-NAV-START[\s\S]*?DRIVER-PAGES-NAV-END -->/;
  if (re.test(html)) {
    fs.writeFileSync(INDEX, html.replace(re, navBlock));
    console.log(`  index.html footer nav refreshed (${drivers.length} driver links)`);
  } else {
    console.warn('  WARNING: nav markers not found in index.html — footer links not updated');
  }
  console.log(`\nDone: ${drivers.length} driver pages.`);
})();
