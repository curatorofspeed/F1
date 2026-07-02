// =============================================================================
//  api/send-newsletter.js  —  The F1 Card Index · Weekly (fully automated)
// -----------------------------------------------------------------------------
//  Triggered every Friday (Vercel Cron or GitHub Actions). Reads the week's
//  data straight from your Supabase tables, renders the email, and sends it to
//  every active subscriber through Resend — one message per recipient, each
//  with its own one-click unsubscribe link.
//
//  Zero npm dependencies: uses global fetch (Vercel Node 18+). No build step.
//
//  Required Vercel env vars (see SETUP.md):
//    SUPABASE_URL                 https://xvpvvzvmozusfvyebvyq.supabase.co
//    SUPABASE_SERVICE_ROLE_KEY    service_role key — SECRET, server-only
//    RESEND_API_KEY               re_...
//    FROM_EMAIL                   "The F1 Card Index <weekly@f1cardindex.com>"
//    SITE_URL                     https://f1cardindex.com
//    CRON_SECRET                  a long random string (guards this endpoint)
//
//  Manual test (sends ONLY to you, ignores the list & the once-per-week lock):
//    curl -X POST "https://f1cardindex.com/api/send-newsletter?test=you@gmail.com" \
//         -H "Authorization: Bearer <CRON_SECRET>"
// =============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY   = process.env.RESEND_API_KEY;
const FROM_EMAIL   = process.env.FROM_EMAIL || 'The F1 Card Index <weekly@f1cardindex.com>';
const SITE_URL     = (process.env.SITE_URL || 'https://f1cardindex.com').replace(/\/+$/, '');
const CRON_SECRET  = process.env.CRON_SECRET;

// How far back a sale counts as "this week".
const WINDOW_DAYS = 7;
// How far back to look for a card's "previous" sale when computing movers.
const MOVERS_LOOKBACK_DAYS = 90;

// driver_id → display name. Unknown ids are prettified from the slug, so this
// only needs the ones where the slug isn't obvious. Edit freely.
const DRIVER_NAMES = {
  verstappen:'Max Verstappen', norris:'Lando Norris', piastri:'Oscar Piastri',
  russell:'George Russell', leclerc:'Charles Leclerc', hamilton:'Lewis Hamilton',
  alonso:'Fernando Alonso', sainz:'Carlos Sainz', antonelli:'Kimi Antonelli',
  hadjar:'Isack Hadjar', lawson:'Liam Lawson', lindblad:'Arvid Lindblad',
  gasly:'Pierre Gasly', tsunoda:'Yuki Tsunoda', albon:'Alex Albon',
  hulkenberg:'Nico Hülkenberg', ocon:'Esteban Ocon', stroll:'Lance Stroll',
  bearman:'Oliver Bearman', colapinto:'Franco Colapinto', bortoleto:'Gabriel Bortoleto',
};

// OPTIONAL race-week banner. Leave empty to skip. Fill with the season dates you
// want to flag (YYYY-MM-DD = race day). If a race falls within the next 7 days,
// a "Race week" banner appears at the top. (Left empty on purpose — paste in the
// real 2026 calendar when you want it; I didn't want to ship guessed dates.)
const RACE_CALENDAR = [
  // { name: 'British Grand Prix', date: '2026-07-05' },
];

// ---- small helpers ----------------------------------------------------------
const brand = { bg:'#f3efe6', card:'#ffffff', ink:'#1a1712', dim:'#6b6250',
                line:'#e6ded0', accent:'#9a6b1f', accentSoft:'#f6edda' };

function esc(s){ return String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function money(n){ const v = Math.round(Number(n)||0);
  return '$' + v.toLocaleString('en-US'); }

function driverName(id){ if(!id) return '';
  if(DRIVER_NAMES[id]) return DRIVER_NAMES[id];
  return String(id).replace(/[-_]+/g,' ').replace(/\b\w/g, c => c.toUpperCase()); }

function cardName(r){
  const bits = [r.year, r.set_name, r.parallel].filter(Boolean).join(' ');
  let nm = (bits || r.title || '').trim();
  if(r.serial) nm += ' · ' + r.serial;
  return nm || (r.title || 'Sale'); }

function prettySource(s){ if(!s) return '';
  return String(s).charAt(0).toUpperCase() + String(s).slice(1); }

function daysSince(dateStr){ if(!dateStr) return Infinity;
  const t = Date.parse(dateStr); if(Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / 86400000; }

function fmtSaleDate(d){ if(!d) return '';
  const dt = new Date(d + (d.length <= 10 ? 'T00:00:00Z' : ''));
  return dt.toLocaleDateString('en-US', { month:'short', day:'numeric', timeZone:'UTC' }); }

function fmtEndsIn(ends){ if(!ends) return '';
  const ms = Date.parse(ends) - Date.now(); if(Number.isNaN(ms)) return '';
  if(ms <= 0) return 'ending now';
  const h = Math.floor(ms/3600000), d = Math.floor(h/24);
  if(d >= 1) return `ends in ${d}d`; if(h >= 1) return `ends in ${h}h`;
  return 'ends soon'; }

// ISO week key like "2026-W27", for the once-per-week send lock.
function isoWeekKey(date){ const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day);
  const yStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const wk = Math.ceil((((d - yStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(wk).padStart(2,'0')}`; }

// ---- Supabase (service role) ------------------------------------------------
async function sb(path, opts = {}){
  const r = await fetch(`${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY,
      'Content-Type': 'application/json', ...(opts.headers||{}) },
  });
  if(!r.ok) throw new Error(`Supabase ${path} → ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

// ---- build the three content sections --------------------------------------
async function buildSections(){
  const lookback = new Date(Date.now() - MOVERS_LOOKBACK_DAYS*86400000).toISOString().slice(0,10);
  const arr = a => Array.isArray(a) ? a : [];
  const [recent, top, live, history] = await Promise.all([
    sb('driver_recent?select=*').catch(() => []),
    sb('driver_top10?select=*').catch(() => []),
    sb('live_auctions?select=*').catch(() => []),
    // dedicated history table — may not exist yet; falls back to the feeds above
    sb(`card_sales?select=*&sale_date=gte.${lookback}&order=sale_date.desc`).catch(() => []),
  ]);

  // One deduped pool from every sales source. The dedup key INCLUDES sale_date,
  // so genuine repeat sales of the same card (what movers needs) are kept — only
  // exact duplicate rows across sources collapse.
  const raw = [...arr(history), ...arr(recent), ...arr(top)];
  const poolSeen = new Set();
  const pool = [];
  raw.forEach(r => {
    if(!r || !(Number(r.price_usd) > 0) || !r.driver_id) return;
    const k = [r.driver_id, cardName(r).toLowerCase(), Math.round(r.price_usd), r.sale_date||''].join('|');
    if(poolSeen.has(k)) return; poolSeen.add(k); pool.push(r);
  });

  // (A) TOP SALES THIS WEEK — highest-priced sales in the window, deduped
  const seen = new Set();
  const topSales = pool
    .filter(r => daysSince(r.sale_date) <= WINDOW_DAYS)
    .sort((a,b) => Number(b.price_usd) - Number(a.price_usd))
    .filter(r => { const k = r.driver_id + '|' + cardName(r).toLowerCase() + '|' + Math.round(r.price_usd);
      if(seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 6);

  // (B) MOVERS — group same-card sales across time; % change on the newest sale
  // (which must fall in the window). Backed by full history from card_sales.
  const groups = {};
  pool.forEach(r => { if(!r.sale_date) return;
    const key = [r.driver_id, r.year, r.set_name, r.parallel, r.grade].join('|');
    (groups[key] = groups[key] || []).push(r); });
  const movers = [];
  Object.values(groups).forEach(list => {
    if(list.length < 2) return;
    list.sort((a,b) => Date.parse(b.sale_date) - Date.parse(a.sale_date));
    const cur = list[0], prev = list[1];
    if(daysSince(cur.sale_date) > WINDOW_DAYS) return;      // newest sale must be this week
    const a = Number(cur.price_usd), b = Number(prev.price_usd);
    if(!(a > 0) || !(b > 0) || a === b) return;
    movers.push({ card: cardName(cur), driver: cur.driver_id,
      from: b, to: a, pct: ((a - b) / b) * 100,
      grade: cur.grade || '', url: cur.url || '' });
  });
  movers.sort((x,y) => Math.abs(y.pct) - Math.abs(x.pct));
  const topMovers = movers.slice(0, 5);

  // (C) ON THE BLOCK — Goldin live auctions, highest current bid first
  const auctions = arr(live)
    .filter(a => a && Number(a.current_bid) >= 0)
    .sort((a,b) => Number(b.current_bid||0) - Number(a.current_bid||0))
    .slice(0, 5);

  // OPTIONAL race-week banner
  let raceBanner = null;
  for(const rc of RACE_CALENDAR){ const dd = daysSince(rc.date);
    if(dd <= 0 && dd > -WINDOW_DAYS){ raceBanner = rc; break; } }

  return { topSales, topMovers, auctions, raceBanner,
           hasContent: topSales.length > 0 || auctions.length > 0 || topMovers.length > 0 };
}

// ---- render the email HTML (per recipient, so the unsub link is unique) -----
function renderEmail(sections, unsubUrl){
  const { topSales, topMovers, auctions, raceBanner } = sections;
  const wk = new Date().toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });

  const row = (inner) => `<tr><td style="padding:0 24px;">${inner}</td></tr>`;
  const secH = (emoji, title) =>
    `<div style="font:700 13px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${brand.accent};margin:28px 0 12px;">${emoji} ${esc(title)}</div>`;

  const moversHtml = topMovers.length ? secH('📈','Biggest movers') + topMovers.map(m => {
    const up = m.pct >= 0; const arrow = up ? '▲' : '▼'; const col = up ? '#2f7d4f' : '#b23b3b';
    return `<div style="padding:10px 0;border-bottom:1px solid ${brand.line};">
      <div style="font:600 15px/1.35 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${brand.ink};">${esc(m.card)}</div>
      <div style="font:400 13px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${brand.dim};margin-top:2px;">
        ${esc(driverName(m.driver))}${m.grade ? ' · ' + esc(m.grade) : ''}
        &nbsp;·&nbsp; ${money(m.from)} → ${money(m.to)}
        &nbsp;<span style="color:${col};font-weight:700;">${arrow} ${Math.abs(m.pct).toFixed(0)}%</span>
      </div></div>`; }).join('') : '';

  const salesHtml = topSales.length ? secH('💰','Top sales this week') + topSales.map(s => {
    const nm = cardName(s);
    return `<div style="padding:10px 0;border-bottom:1px solid ${brand.line};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:top;">
          <div style="font:600 15px/1.35 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${brand.ink};">${esc(nm)}</div>
          <div style="font:400 13px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${brand.dim};margin-top:2px;">
            ${esc(driverName(s.driver_id))}${s.grade ? ' · ' + esc(s.grade) : ''}${s.source ? ' · ' + esc(prettySource(s.source)) : ''} · ${esc(fmtSaleDate(s.sale_date))}</div>
        </td>
        <td style="vertical-align:top;text-align:right;white-space:nowrap;padding-left:12px;">
          <div style="font:700 16px/1.2 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${brand.ink};">${money(s.price_usd)}</div>
        </td>
      </tr></table></div>`; }).join('') : '';

  const auctionsHtml = auctions.length ? secH('🔨','On the block — live on Goldin') + auctions.map(a => {
    const nm = a.title || cardName(a);
    return `<a href="${esc(a.url || SITE_URL)}" style="text-decoration:none;color:inherit;display:block;padding:10px 0;border-bottom:1px solid ${brand.line};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:top;">
          <div style="font:600 15px/1.35 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${brand.ink};">${esc(nm)}</div>
          <div style="font:400 13px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${brand.dim};margin-top:2px;">
            ${esc(driverName(a.driver_id))}${a.bids != null ? ' · ' + a.bids + ' bids' : ''}${a.ends_on ? ' · ' + esc(fmtEndsIn(a.ends_on)) : ''}</div>
        </td>
        <td style="vertical-align:top;text-align:right;white-space:nowrap;padding-left:12px;">
          <div style="font:400 11px/1.2 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${brand.dim};">current bid</div>
          <div style="font:700 16px/1.2 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${brand.accent};">${money(a.current_bid)}</div>
        </td>
      </tr></table></a>`; }).join('') + `
    <div style="margin-top:14px;"><a href="${esc(SITE_URL)}" style="display:inline-block;background:${brand.accent};color:#fff;font:700 14px -apple-system,Segoe UI,Helvetica,Arial,sans-serif;text-decoration:none;padding:11px 20px;border-radius:8px;">Browse all live auctions →</a></div>` : '';

  const bannerHtml = raceBanner ?
    `<div style="background:${brand.accentSoft};border:1px solid ${brand.line};border-radius:10px;padding:12px 16px;margin:0 0 8px;font:600 14px -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${brand.ink};">🏁 Race week: ${esc(raceBanner.name)} — watch for movers around the paddock.</div>` : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:${brand.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">This week in F1 cards: top sales, biggest movers, and what's live on Goldin.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.bg};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${brand.card};border:1px solid ${brand.line};border-radius:14px;overflow:hidden;">
  <tr><td style="padding:24px 24px 4px;">
    <div style="font:800 11px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:${brand.accent};">◆ The Weekly Index</div>
    <div style="font:800 24px/1.2 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${brand.ink};margin-top:8px;">The F1 card market — ${esc(wk)}</div>
    <div style="font:400 14px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${brand.dim};margin-top:6px;">Record sales, biggest movers, and what's live right now.</div>
  </td></tr>
  ${bannerHtml ? row(bannerHtml) : ''}
  ${row(moversHtml + salesHtml + auctionsHtml)}
  <tr><td style="padding:24px;border-top:1px solid ${brand.line};margin-top:20px;">
    <div style="font:400 12px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${brand.dim};">
      You're getting this because you subscribed at <a href="${esc(SITE_URL)}" style="color:${brand.accent};">f1cardindex.com</a>.<br>
      Prices are actual recorded sales; not investment advice.<br>
      <a href="${esc(unsubUrl)}" style="color:${brand.dim};text-decoration:underline;">Unsubscribe</a>
    </div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ---- send via Resend Batch API (<=100 per call) -----------------------------
async function sendBatch(emails){
  const r = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(emails),
  });
  const text = await r.text();
  if(!r.ok) throw new Error(`Resend batch → ${r.status} ${text}`);
  return text;
}

function chunk(arr, n){ const out = []; for(let i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n)); return out; }

// ---- handler ----------------------------------------------------------------
module.exports = async (req, res) => {
  // auth: Vercel Cron and GitHub Actions both send this header
  if(!CRON_SECRET || req.headers.authorization !== 'Bearer ' + CRON_SECRET){
    res.status(401).json({ error: 'unauthorized' }); return;
  }
  if(!SUPABASE_URL || !SERVICE_KEY || !RESEND_KEY){
    res.status(500).json({ error: 'missing env (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / RESEND_API_KEY)' }); return;
  }

  const testTo = (req.query && req.query.test) ? String(req.query.test) : null;
  const weekKey = isoWeekKey(new Date());
  const subject = `The F1 Card Index — this week's sales & movers`;

  try{
    // once-per-week lock (skipped in test mode)
    if(!testTo){
      const existing = await sb(`newsletter_sends?week_key=eq.${encodeURIComponent(weekKey)}&select=week_key`);
      if(Array.isArray(existing) && existing.length){
        res.status(200).json({ skipped: 'already sent this week', weekKey }); return;
      }
    }

    const sections = await buildSections();
    if(!sections.hasContent && !testTo){
      res.status(200).json({ skipped: 'no content this week', weekKey }); return;
    }

    // recipients
    let recipients;
    if(testTo){
      recipients = [{ email: testTo, unsub_token: 'test-token' }];
    }else{
      recipients = await sb('subscribers?select=email,unsub_token&unsubscribed_at=is.null');
      recipients = (Array.isArray(recipients) ? recipients : []).filter(r => r && r.email);
      if(!recipients.length){ res.status(200).json({ skipped: 'no active subscribers', weekKey }); return; }
    }

    // build one Resend payload per recipient (unique unsub link + one-click header)
    const emails = recipients.map(r => {
      const unsubUrl = `${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(r.unsub_token)}`;
      return {
        from: FROM_EMAIL,
        to: [r.email],
        subject,
        html: renderEmail(sections, unsubUrl),
        headers: {
          'List-Unsubscribe': `<${unsubUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      };
    });

    let sent = 0;
    for(const batch of chunk(emails, 100)){ await sendBatch(batch); sent += batch.length; }

    // log the send (idempotency + history) — skip in test mode
    if(!testTo){
      await sb('newsletter_sends', { method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ week_key: weekKey, recipients: sent, subject, status: 'sent' }) });
    }

    res.status(200).json({ ok: true, weekKey, sent, test: !!testTo,
      sections: { movers: sections.topMovers.length, sales: sections.topSales.length, auctions: sections.auctions.length } });
  }catch(err){
    res.status(500).json({ error: String(err && err.message || err), weekKey });
  }
};
