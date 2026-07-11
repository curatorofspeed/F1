#!/usr/bin/env node
/* ============================================================================
   generate_sets_pages.js  —  builds /sets/index.html + /sets/<slug>.html for
   every set in the SETS object inside index.html. Run: node generate_sets_pages.js
   Output: ./sets/   (deploy this folder to your repo root)
   ========================================================================== */
const fs = require('fs');
const path = require('path');

/* ---------------- MONETIZATION CONFIG (edit these two, then re-run) --------
   EPN_CAMPID     — your 10-digit eBay Partner Network campaign id ('' = plain
                    eBay links, no tracking, until you paste it).
   ADSENSE_CLIENT — your AdSense publisher id 'ca-pub-XXXXXXXXXXXXXXXX'
                    ('' = no ad code emitted until AdSense approves you).      */
const EPN_CAMPID     = '5339157397';
const ADSENSE_CLIENT = '';

const ROOT = __dirname;
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const OUT = path.join(ROOT, 'sets');
const SITE = 'https://www.f1cardindex.com';

// ---- extract the SETS object literal (string-aware brace matching) ----------
function extractObject(src, marker){
  const i = src.indexOf(marker);
  if(i < 0) throw new Error('SETS not found');
  const start = src.indexOf('{', i);
  let depth = 0, inStr = false, q = '', esc = false;
  for(let k = start; k < src.length; k++){
    const c = src[k];
    if(inStr){ if(esc) esc = false; else if(c === '\\') esc = true; else if(c === q) inStr = false; continue; }
    if(c === '"' || c === "'" || c === '`'){ inStr = true; q = c; continue; }
    if(c === '{') depth++;
    else if(c === '}'){ depth--; if(depth === 0) return src.slice(start, k + 1); }
  }
  throw new Error('unbalanced braces in SETS');
}
const SETS = eval('(' + extractObject(html, 'const SETS =') + ')');
const slugs = Object.keys(SETS);
console.log('Found', slugs.length, 'sets:', slugs.join(', '));

// ---- helpers ----------------------------------------------------------------
const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function ebayShop(q){
  let u = 'https://www.ebay.com/sch/i.html?_nkw=' + encodeURIComponent(q);
  if (EPN_CAMPID) u += '&mkevt=1&mkcid=1&mkrid=711-53200-19255-0&campid='
    + encodeURIComponent(EPN_CAMPID) + '&toolid=10001';
  return u;
}
const AD_HEAD = ADSENSE_CLIENT
  ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></scr`+`ipt>`
  : '';
function adSlot(){
  if (!ADSENSE_CLIENT) return '';
  return `<ins class="adsbygoogle" style="display:block;margin:26px 0" data-ad-client="${ADSENSE_CLIENT}" data-ad-format="auto" data-full-width-responsive="true"></ins>`
    + `<scr`+`ipt>(adsbygoogle=window.adsbygoogle||[]).push({});</scr`+`ipt>`;
}

const CSS = `
:root{--bg:#0c0d0e;--panel:#15171a;--panel2:#1b1e22;--line:#2a2e33;--txt:#eef1f3;--muted:#828c93;--gold:#d9b878;--teal:#c4cdd2;--rc:#39e08a}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--txt);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;line-height:1.55;-webkit-font-smoothing:antialiased}
.wrap{max-width:900px;margin:0 auto;padding:22px 18px 80px}
a{color:var(--teal);text-decoration:none}a:hover{text-decoration:underline}
.back{display:inline-block;color:var(--muted);font-size:13px;margin-bottom:18px}
.eyebrow{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);font-weight:700}
h1{font-size:clamp(24px,5vw,34px);font-weight:800;letter-spacing:-.01em;line-height:1.12;margin:8px 0 8px}
.meta{color:var(--muted);font-size:14px;margin:0 0 18px}
.meta b{color:var(--txt);font-weight:600}
.blurb{font-size:15px;color:#cfd6db;margin:0 0 8px}
.config{font-size:13px;color:var(--muted);margin:0 0 26px}
h2{font-size:17px;margin:30px 0 12px;display:flex;align-items:center;gap:8px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line)}
th{background:var(--panel2);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600}
tr:last-child td{border-bottom:none}
tbody tr:hover{background:rgba(255,255,255,.02)}
.num{font-family:ui-monospace,Menlo,Consolas,monospace;color:var(--muted);width:52px}
.rc{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.05em;color:#062;background:var(--rc);border-radius:4px;padding:1px 5px;margin-left:7px;vertical-align:1px}
.pr{font-family:ui-monospace,Menlo,Consolas,monospace;color:var(--gold);white-space:nowrap}
.odds{color:var(--muted);font-size:13px}
ul.plain{list-style:none;padding:0;margin:0}
ul.plain li{padding:9px 14px;border-bottom:1px solid var(--line);font-size:14px}
ul.plain li:last-child{border-bottom:none}
ul.plain li .d{color:var(--muted);font-size:13px}
.chips{display:flex;flex-wrap:wrap;gap:7px;margin:2px 0 0}
.chip{font-size:12.5px;background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:4px 11px;color:#cfd6db}
.key{background:linear-gradient(120deg,var(--panel),var(--panel2));border:1px solid var(--line);border-left:3px solid var(--gold);border-radius:10px;padding:14px 16px;margin:0}
.key li{margin:0 0 4px}
.shop{font-size:12px;white-space:nowrap;color:var(--gold);font-weight:600}
.shop:hover{text-decoration:underline}
.cta{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(120deg,var(--panel),var(--panel2));border:1px solid var(--line);border-left:3px solid var(--gold);border-radius:10px;padding:10px 16px;margin:0 0 8px;font-size:14px;font-weight:700;color:var(--txt)}
.cta:hover{border-color:var(--gold);text-decoration:none}
.foot{margin-top:40px;padding-top:18px;border-top:1px solid var(--line);color:var(--muted);font-size:12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-top:8px}
.setcard{display:block;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px;transition:border-color .14s}
.setcard:hover{border-color:var(--gold);text-decoration:none}
.setcard .yr{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:var(--gold);letter-spacing:.08em}
.setcard .nm{font-size:16px;font-weight:700;color:var(--txt);margin:6px 0 4px;line-height:1.25}
.setcard .sm{font-size:12.5px;color:var(--muted)}
`;

function shell(title, desc, canonical, body){
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
${AD_HEAD}
<style>${CSS}</style></head><body><div class="wrap">${body}</div></body></html>`;
}

// ---- per-set checklist page -------------------------------------------------
function setPage(slug, s){
  const canonical = `${SITE}/sets/${slug}`;
  const title = `${s.name} Checklist — Base Set, Parallels & Autos | F1 Card Index`;
  const desc = `Full ${s.name} checklist: ${s.baseSize}-card base set, ${s.parallels ? s.parallels.length : 0} parallels with print runs and odds, autographs, inserts and key rookie cards.`;

  const base = (s.baseDrivers || []).map(r =>
    `<tr><td class="num">#${esc(r[0])}</td><td>${esc(r[1])}${r[3] === 'RC' ? '<span class="rc">RC</span>' : ''}</td><td class="odds">${esc(r[2] || '')}</td></tr>`
  ).join('');

  const par = (s.parallels || []).map(p =>
    `<tr><td>${esc(p[0])}</td><td class="pr">${p[1] != null ? '/' + p[1] : '—'}</td><td class="odds">${esc(p[2] || '')}</td><td><a class="shop" href="${ebayShop(s.name + ' ' + p[0])}" target="_blank" rel="noopener sponsored">Shop ↗</a></td></tr>`
  ).join('');

  const autos = (s.autos || []).map(a => `<li><b>${esc(a[0])}</b><div class="d">${esc(a[1] || '')}</div></li>`).join('');
  const inserts = (s.inserts || []).map(i => `<li>${esc(i[0])}${i[1] ? ' <span class="d">· ' + esc(i[1]) + '</span>' : ''}</li>`).join('');
  const subs = (s.subsets || []).map(x => `<span class="chip">${esc(x)}</span>`).join('');
  const keys = (s.keyCards || []).map(k => `<li>${esc(k)}</li>`).join('');

  const body = `
<a class="back" href="/sets">← All checklists</a>
<div class="eyebrow">◆ ${esc(s.brand)} · ${esc(s.line)}</div>
<h1>${esc(s.name)}</h1>
<p class="meta"><b>${esc(s.year)}</b> · ${esc(s.tier)}${s.released ? ' · Released ' + esc(s.released) : ''}${s.baseSize ? ' · ' + esc(s.baseSize) + '-card base' : ''}</p>
<a class="cta" href="${ebayShop(s.name)}" target="_blank" rel="noopener sponsored">\uD83D\uDED2 Shop ${esc(s.name)} on eBay \u2197</a>
${s.blurb ? `<p class="blurb">${esc(s.blurb)}</p>` : ''}
${s.config ? `<p class="config">${esc(s.config)}</p>` : ''}

${keys ? `<h2>⭐ Key Cards</h2><ul class="key plain">${keys}</ul>` : ''}

${par ? `<h2>🌈 Parallel Ladder</h2><div class="panel"><table><thead><tr><th>Parallel</th><th># / Run</th><th>Odds / Note</th><th></th></tr></thead><tbody>${par}</tbody></table></div>${adSlot()}` : ''}

${base ? `<h2>📋 Base Set — Drivers</h2>${s.baseNote ? `<p class="config">${esc(s.baseNote)}</p>` : ''}<div class="panel"><table><thead><tr><th>#</th><th>Driver</th><th>Team</th></tr></thead><tbody>${base}</tbody></table></div>` : ''}
${subs ? `<div class="chips" style="margin-top:12px">${subs}</div>` : ''}

${autos ? `<h2>✍️ Autographs</h2><div class="panel"><ul class="plain">${autos}</ul></div>` : ''}
${inserts ? `<h2>🎴 Inserts</h2><div class="panel"><ul class="plain">${inserts}</ul></div>` : ''}

<div class="foot">Checklist data compiled by <a href="/">The F1 Card Index</a>. Print runs and odds per Topps release info; verify before purchase. Some links are eBay affiliate links — we may earn a commission at no extra cost to you.</div>`;
  return shell(title, desc, canonical, body);
}

// ---- /sets index page -------------------------------------------------------
function indexPage(){
  const canonical = `${SITE}/sets`;
  const lineRank = { 'Formula 1': 0, 'Sapphire Edition': 1 };
  const order = slugs.slice().sort((a, b) =>
    SETS[b].year - SETS[a].year
    || (lineRank[SETS[a].line] ?? 2) - (lineRank[SETS[b].line] ?? 2)
    || (SETS[a].brand > SETS[b].brand ? 1 : -1));
  const cards = order.map(slug => {
    const s = SETS[slug];
    return `<a class="setcard" href="/sets/${slug}">
      <span class="yr">${esc(s.year)} · ${esc(s.tier)}</span>
      <span class="nm">${esc(s.name.replace(s.year + ' ', ''))}</span>
      <span class="sm">${s.baseSize ? esc(s.baseSize) + '-card base · ' : ''}${(s.parallels || []).length} parallels</span></a>`;
  }).join('');
  const body = `
<a class="back" href="/">← F1 Card Index</a>
<div class="eyebrow">◆ Set Checklists</div>
<h1>F1 Trading Card Set Checklists</h1>
<p class="meta">Base sets, full parallel ladders with print runs, inserts &amp; autographs — Topps Chrome, Sapphire &amp; Dynasty.</p>
<div class="grid">${cards}</div>
<div class="foot">Compiled by <a href="/">The F1 Card Index</a>.</div>`;
  return shell('F1 Trading Card Set Checklists — Topps Chrome, Sapphire, Dynasty', 'Complete F1 card set checklists: base sets, parallel ladders with print runs and odds, autographs and inserts for Topps Chrome, Sapphire and Dynasty.', canonical, body);
}

// ---- write ------------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), indexPage());
let n = 1;
for(const slug of slugs){
  fs.writeFileSync(path.join(OUT, slug + '.html'), setPage(slug, SETS[slug]));
  n++;
}
console.log('Wrote sets/index.html + ' + slugs.length + ' checklist pages to ./sets/');
