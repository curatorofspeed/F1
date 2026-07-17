#!/usr/bin/env node
/* ============================================================================
   F1 Card Index — set / checklist page generator
   Emits one SEO page per set at sets/<slug>.html (served /sets/<slug>),
   plus a sets/index.html hub, and appends set URLs to sitemap.xml.
   Reads the SETS const from index.html.  Usage: node tools/generate_set_pages.js
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const OUT = path.join(ROOT, 'sets');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const SITE = 'https://f1cardindex.com';
const TODAY = new Date().toISOString().slice(0, 10);

function loadSets(html) {
  const m = html.match(/const SETS\s*=\s*(\{[\s\S]*?\n\};)/);
  if (!m) throw new Error('SETS not found in index.html');
  return eval('(' + m[1].replace(/;$/, '') + ')'); // eslint-disable-line no-eval
}
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const run = n => n == null ? '' : (n === 1 ? '1/1' : '/' + n);

const ADSENSE = '<!-- ADSENSE <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-REPLACE" crossorigin="anonymous"></script> ADSENSE -->';
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@600;700;800&family=Sora:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">';
const STYLE = `:root{--bg:#0c0d0e;--panel:#15171a;--panel2:#1b1e22;--line:#2a2e33;--teal:#c4cdd2;--gold:#d9b878;--txt:#eef1f3;--muted:#828c93;--up:#39e08a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font-family:'Sora',system-ui,sans-serif;line-height:1.7}
a{color:var(--gold);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:820px;margin:0 auto;padding:0 20px}
header.site{border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(12,13,14,.86);backdrop-filter:blur(8px);z-index:10}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;height:56px}
.brand{font-family:'Saira Condensed',sans-serif;font-weight:800;font-size:20px;letter-spacing:1px;text-transform:uppercase;color:var(--txt)}.brand .r{color:#ED1C24}
.back{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
main{padding:36px 0 8px}
.tag{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:1.4px;color:var(--gold);border:1px solid var(--line);border-radius:20px;padding:3px 12px;margin-bottom:16px}
h1{font-family:'Saira Condensed',sans-serif;font-weight:800;font-size:40px;line-height:1.04;text-transform:uppercase;margin:0 0 10px}
.lede{color:#d6dde1;font-size:15.5px;margin:0 0 20px;max-width:70ch}
.facts{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 22px}
.fact{background:var(--panel);border:1px solid var(--line);border-radius:9px;padding:8px 13px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted)}
.fact b{color:var(--txt);font-weight:700}
h2{font-family:'Saira Condensed',sans-serif;font-weight:700;font-size:24px;text-transform:uppercase;letter-spacing:.5px;margin:32px 0 10px}
p,li{font-size:15px;color:#d6dde1}
.chips{display:flex;flex-wrap:wrap;gap:7px;margin:6px 0 4px}
.chip{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted);background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:5px 12px}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:14px}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-family:'JetBrains Mono',monospace;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;color:var(--muted)}
td.rk{font-family:'JetBrains Mono',monospace;color:var(--muted);width:34px}
td.pr{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--gold);white-space:nowrap;text-align:right}
.rc{color:var(--up);font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;border:1px solid var(--up);border-radius:4px;padding:0 4px;margin-left:6px}
.note{color:var(--muted);font-size:13px;font-style:italic}
.xlinks{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
.xlinks a{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted);border:1px solid var(--line);border-radius:18px;padding:5px 12px}
.cta{display:inline-block;background:var(--gold);color:#0c0d0e;font-weight:700;padding:11px 22px;border-radius:9px;margin:8px 0}
.cta:hover{text-decoration:none;filter:brightness(1.05)}
footer.site{border-top:1px solid var(--line);margin-top:40px;padding:24px 0 44px;font-size:12.5px;color:var(--muted);line-height:1.6}
@media(max-width:560px){h1{font-size:31px}}`;

function foot() {
  return `<footer class="site"><div class="wrap">
Checklist data compiled from manufacturer and public sources for reference. F1 Card Index is an independent market tracker, not affiliated with Formula 1, the FIA, any team, driver, Topps, Fanatics, or eBay. Trademarks belong to their owners. Some links are affiliate links. Not financial advice.
</div></footer>`;
}

function setPage(slug, s, allSlugs) {
  const title = `${s.name} Checklist — Parallels, Print Runs & Base Set | F1 Card Index`;
  const desc = `Complete ${s.name} checklist: ${s.baseSize ? s.baseSize + '-card base set, ' : ''}the full parallel rainbow with print runs, inserts, and autographs. ${s.keyCards && s.keyCards.length ? 'Key cards: ' + s.keyCards.slice(0, 2).join(', ') + '.' : ''}`;
  const canonical = `${SITE}/sets/${slug}`;
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'F1 Card Index', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Sets & Checklists', item: SITE + '/sets' },
      { '@type': 'ListItem', position: 3, name: s.name, item: canonical }
    ]
  };

  const factbits = [
    s.baseSize ? `<span class="fact">Base set <b>${s.baseSize} cards</b></span>` : '',
    `<span class="fact">Released <b>${esc(s.released)}</b></span>`,
    `<span class="fact">Brand <b>${esc(s.brand)}</b></span>`,
    `<span class="fact">Tier <b>${esc(s.tier)}</b></span>`
  ].join('');

  const parRows = s.parallels.map(p => `<tr><td>${esc(p[0])}</td><td class="pr">${run(p[1]) || '—'}</td><td class="note">${esc(p[2] || '')}</td></tr>`).join('');
  const driverRows = s.baseDrivers.length ? s.baseDrivers.map(d =>
    `<tr><td class="rk">${d[0]}</td><td>${esc(d[1])}${d[3] === 'RC' ? '<span class="rc">RC</span>' : ''}</td><td class="note">${esc(d[2] || '')}</td></tr>`).join('') : '';
  const insertChips = s.inserts.map(i => `<span class="chip">${esc(i[0])}${i[1] ? ' · ' + esc(i[1]) : ''}</span>`).join('');
  const autoRows = s.autos.map(a => `<tr><td>${esc(a[0])}</td><td class="note">${esc(a[1])}</td></tr>`).join('');
  const others = allSlugs.filter(x => x !== slug).map(x => `<a href="/sets/${x}">${esc(x.replace(/-/g, ' ').replace('topps', 'Topps'))}</a>`).join('');

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
${ADSENSE}
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article"><meta property="og:site_name" content="F1 Card Index">
<meta property="og:title" content="${esc(s.name)} Checklist"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}"><meta name="twitter:card" content="summary">
${FONTS}
<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
<style>${STYLE}</style></head>
<body>
<header class="site"><div class="wrap"><a class="brand" href="/">F1 <span class="r">Card Index</span></a><a class="back" href="/sets">&larr; All checklists</a></div></header>
<main><div class="wrap">
<span class="tag">${esc(s.year)} · ${esc(s.line)}</span>
<h1>${esc(s.name)} Checklist</h1>
<p class="lede">${esc(s.blurb)}</p>
<div class="facts">${factbits}</div>

<h2>Set structure</h2>
<p>${esc(s.baseNote)}</p>
${s.subsets && s.subsets.length ? `<div class="chips">${s.subsets.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''}
<p class="note">${esc(s.config)}</p>

<h2>Parallels &amp; print runs</h2>
<table><thead><tr><th>Parallel</th><th style="text-align:right">Print run</th><th>Odds / notes</th></tr></thead><tbody>${parRows}</tbody></table>

${driverRows ? `<h2>Base checklist — drivers</h2>
<table><thead><tr><th>#</th><th>Driver</th><th>Team</th></tr></thead><tbody>${driverRows}</tbody></table>
${s.baseSize ? `<p class="note">Showing the driver portion; the full ${s.baseSize}-card base also includes ${esc((s.subsets || []).slice(3).join(', ') || 'additional subsets')}.</p>` : ''}` : ''}

${autoRows ? `<h2>Autographs</h2>
<table><tbody>${autoRows}</tbody></table>` : ''}

${insertChips ? `<h2>Inserts</h2><div class="chips">${insertChips}</div>` : ''}

${s.keyCards && s.keyCards.length ? `<h2>Key cards to watch</h2>
<div class="chips">${s.keyCards.map(k => `<span class="chip">${esc(k)}</span>`).join('')}</div>` : ''}

<h2>Track the market</h2>
<p>See live and recent sale prices for these drivers on the <a href="/">F1 Card Index</a> — record sales, recent comps, and what's moving on race weekends.</p>
<a class="cta" href="/">Open the live market →</a>

<h2>Other checklists</h2>
<div class="xlinks">${others}</div>
</div></main>
${foot()}
</body></html>`;
}

function hubPage(sets, slugs) {
  const cards = slugs.map(slug => {
    const s = sets[slug];
    return `<a class="setcard" href="/sets/${slug}">
      <span class="sc-yr">${s.year} · ${esc(s.tier)}</span>
      <span class="sc-nm">${esc(s.name)}</span>
      <span class="sc-meta">${s.baseSize ? s.baseSize + '-card base · ' : ''}${s.parallels.length} parallels</span>
    </a>`;
  }).join('');
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
${ADSENSE}
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>F1 Card Set Checklists — Topps Chrome, Sapphire & Dynasty | F1 Card Index</title>
<meta name="description" content="Complete checklists for Topps Formula 1 card sets: Chrome, Chrome Sapphire, and Dynasty. Base sets, full parallel ladders with print runs, inserts, and autographs.">
<link rel="canonical" href="${SITE}/sets">
${FONTS}
<style>${STYLE}
.setgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin:18px 0}
.setcard{display:flex;flex-direction:column;gap:5px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 17px;transition:.15s}
.setcard:hover{text-decoration:none;border-color:var(--gold);transform:translateY(-2px)}
.sc-yr{font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--gold)}
.sc-nm{font-family:'Saira Condensed',sans-serif;font-weight:700;font-size:19px;text-transform:uppercase;color:var(--txt);line-height:1.1}
.sc-meta{font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--muted)}</style></head>
<body>
<header class="site"><div class="wrap"><a class="brand" href="/">F1 <span class="r">Card Index</span></a><a class="back" href="/">&larr; Market home</a></div></header>
<main><div class="wrap">
<span class="tag">Sets &amp; Checklists</span>
<h1>F1 Card Set Checklists</h1>
<p class="lede">Complete checklists for Topps Formula 1 releases — base sets, the full parallel ladder with print runs, inserts, and autographs. Chrome, Sapphire, and ultra high-end Dynasty.</p>
<div class="setgrid">${cards}</div>
</div></main>
${foot()}
</body></html>`;
}

/* ---------- main ---------- */
(function main() {
  const html = fs.readFileSync(INDEX, 'utf8');
  const sets = loadSets(html);
  const lineRank = { 'Formula 1': 0, 'Sapphire Edition': 1 };
  const slugs = Object.keys(sets).sort((a, b) => sets[b].year - sets[a].year
    || (lineRank[sets[a].line] ?? 2) - (lineRank[sets[b].line] ?? 2)
    || (sets[a].brand > sets[b].brand ? 1 : -1));
  fs.mkdirSync(OUT, { recursive: true });
  slugs.forEach(slug => {
    const out = setPage(slug, sets[slug], slugs);
    fs.writeFileSync(path.join(OUT, slug + '.html'), out);
    console.log(`  sets/${slug}.html (${(out.length / 1024).toFixed(0)} KB)`);
  });
  fs.writeFileSync(path.join(OUT, 'index.html'), hubPage(sets, slugs));
  console.log(`  sets/index.html (hub)`);

  // append set URLs to sitemap if not present
  let sm = fs.readFileSync(SITEMAP, 'utf8');
  const urls = [`${SITE}/sets`].concat(slugs.map(s => `${SITE}/sets/${s}`));
  let added = 0;
  const rows = urls.filter(u => !sm.includes('<loc>' + u + '</loc>'))
    .map(u => `  <url><loc>${u}</loc><lastmod>${TODAY}</lastmod><priority>0.7</priority></url>`);
  if (rows.length) {
    sm = sm.replace('</urlset>', rows.join('\n') + '\n</urlset>');
    fs.writeFileSync(SITEMAP, sm);
    added = rows.length;
  }
  console.log(`  sitemap.xml: +${added} set URLs`);
  console.log(`\nDone: ${slugs.length} set pages + hub.`);
})();
