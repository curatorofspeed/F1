// =============================================================================
//  api/unsubscribe.js  —  one-click + link unsubscribe for The F1 Card Index
// -----------------------------------------------------------------------------
//  GET  /api/unsubscribe?token=...  → the "Unsubscribe" link in the email body;
//                                     flips the subscriber and shows a page.
//  POST /api/unsubscribe?token=...  → Gmail/Yahoo one-click (List-Unsubscribe-Post);
//                                     flips the subscriber and returns 200.
//
//  Uses the Supabase service_role key (server-only) to update the row, since the
//  public anon role has no access to the subscribers table.
//
//  Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL
// =============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL     = (process.env.SITE_URL || 'https://f1cardindex.com').replace(/\/+$/, '');

function page(title, msg){
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#f3efe6;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
<div style="max-width:460px;margin:12vh auto;background:#fff;border:1px solid #e6ded0;border-radius:14px;padding:32px;text-align:center;">
  <div style="font:800 11px/1 sans-serif;letter-spacing:.22em;text-transform:uppercase;color:#9a6b1f;">◆ The Weekly Index</div>
  <h1 style="font-size:22px;color:#1a1712;margin:14px 0 8px;">${title}</h1>
  <p style="color:#6b6250;font-size:15px;line-height:1.6;margin:0 0 20px;">${msg}</p>
  <a href="${SITE_URL}" style="display:inline-block;background:#9a6b1f;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border-radius:8px;">Back to f1cardindex.com</a>
</div></body></html>`;
}

async function unsubscribe(token){
  if(!token) return { ok:false, reason:'missing token' };
  const r = await fetch(
    `${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/subscribers?unsub_token=eq.${encodeURIComponent(token)}`,
    { method:'PATCH',
      headers:{ apikey:SERVICE_KEY, Authorization:'Bearer '+SERVICE_KEY,
        'Content-Type':'application/json', Prefer:'return=representation' },
      body: JSON.stringify({ unsubscribed_at: new Date().toISOString() }) });
  if(!r.ok) return { ok:false, reason:`db ${r.status}` };
  const rows = await r.json();
  return { ok: Array.isArray(rows) && rows.length > 0, reason: rows.length ? '' : 'token not found' };
}

module.exports = async (req, res) => {
  const token = (req.query && req.query.token) ? String(req.query.token) : '';

  // One-click POST from the mail client — must return 2xx, no body needed.
  if(req.method === 'POST'){
    try{ await unsubscribe(token); }catch(e){}
    res.status(200).json({ ok:true }); return;
  }

  // Link click (GET) — show a friendly page.
  if(!SUPABASE_URL || !SERVICE_KEY){
    res.status(500).send(page('Something went wrong', 'The unsubscribe service is misconfigured. Email us and we\'ll remove you manually.')); return;
  }
  try{
    const out = await unsubscribe(token);
    if(out.ok){
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.status(200).send(page('You\'re unsubscribed', 'You won\'t get the weekly email anymore. Changed your mind? You can always sign up again on the site.'));
    }else{
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.status(200).send(page('Link expired or invalid', 'We couldn\'t match that unsubscribe link. If you\'re still getting emails, reply to one and we\'ll remove you.'));
    }
  }catch(err){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.status(500).send(page('Something went wrong', 'Please try again in a moment, or reply to any email to be removed.'));
  }
};
