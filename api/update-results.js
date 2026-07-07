// =============================================================================
//  api/update-results.js  —  auto-pulls the latest F1 race classification from
//  the free Jolpica-F1 API (Ergast successor) and writes it to Supabase
//  race_results, which your site already reads. No index.html change needed.
//
//  Reuses existing Vercel env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET.
//  Trigger: GitHub Actions (Mondays) or manually. Idempotent — safe to re-run.
// =============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET  = process.env.CRON_SECRET;

// Ergast/Jolpica circuitId -> your site's 3-letter race_id.
// (If a race doesn't auto-update, its circuitId isn't here — add it and redeploy.)
const CIRCUIT_TO_RACE = {
  albert_park:'aus', shanghai:'chn', suzuka:'jpn', bahrain:'bhr', jeddah:'sau',
  miami:'mia', imola:'imo', villeneuve:'can', monaco:'mon', catalunya:'esp',
  red_bull_ring:'aut', silverstone:'gbr', spa:'bel', hungaroring:'hun',
  zandvoort:'ned', monza:'ita', madring:'mad', madrid:'mad', baku:'aze',
  marina_bay:'sgp', americas:'usa', rodriguez:'mex', interlagos:'bra',
  vegas:'lvg', losail:'qat', yas_marina:'abu',
};

// Ergast driverId -> your driver_id, only for cases the family-name rule misses.
const DRIVER_OVERRIDE = {
  // e.g. some_ergast_id: 'your_site_id'
};
// Your driver IDs are lowercased family names; normalize accents & punctuation.
function toDriverId(driver){
  if(!driver) return '';
  if(DRIVER_OVERRIDE[driver.driverId]) return DRIVER_OVERRIDE[driver.driverId];
  return String(driver.familyName || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')  // strip accents (Hülkenberg->Hulkenberg)
    .toLowerCase().replace(/[^a-z]/g,'');             // -> hulkenberg / perez / verstappen
}

async function sb(path, opts){
  const r = await fetch(`${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/${path}`, {
    ...opts,
    headers:{ apikey:SERVICE_KEY, Authorization:'Bearer '+SERVICE_KEY,
      'Content-Type':'application/json', ...((opts && opts.headers) || {}) },
  });
  if(!r.ok && r.status !== 404) throw new Error(`Supabase ${path} -> ${r.status} ${await r.text()}`);
  return r;
}

module.exports = async (req, res) => {
  if(!CRON_SECRET || req.headers.authorization !== 'Bearer ' + CRON_SECRET){
    res.status(401).json({ error:'unauthorized' }); return;
  }
  if(!SUPABASE_URL || !SERVICE_KEY){
    res.status(500).json({ error:'missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' }); return;
  }

  try{
    // latest completed race of the current season
    const jr = await fetch('https://api.jolpi.ca/ergast/f1/current/last/results/?limit=40',
      { headers:{ accept:'application/json' } });
    if(!jr.ok) throw new Error('jolpica ' + jr.status);
    const data = await jr.json();
    const race = data?.MRData?.RaceTable?.Races?.[0];
    if(!race || !(race.Results || []).length){
      res.status(200).json({ skipped:'no race data yet' }); return;
    }

    const circuitId = race.Circuit && race.Circuit.circuitId;
    const raceId = CIRCUIT_TO_RACE[circuitId];
    if(!raceId){
      res.status(200).json({ skipped:'unmapped circuit', circuitId, raceName: race.raceName }); return;
    }

    // build {pos:{driverId:place}, dnf:[driverId]} — numeric positionText = classified place
    const pos = {}, dnf = [];
    (race.Results || []).forEach(r => {
      const id = toDriverId(r.Driver);
      if(!id) return;
      if(/^\d+$/.test(String(r.positionText || ''))) pos[id] = Number(r.positionText);
      else dnf.push(id);
    });

    const raceLabel = String(race.raceName || '').replace(/Grand Prix/i, 'GP').trim();
    const results = { raceLabel, pos, dnf };

    // upsert: clear any existing row for this race, then insert the fresh result
    await sb(`race_results?race_id=eq.${encodeURIComponent(raceId)}`, { method:'DELETE' });
    await sb('race_results', { method:'POST', headers:{ Prefer:'return=minimal' },
      body: JSON.stringify({ race_id: raceId, race_date: race.date, results }) });

    const winner = Object.keys(pos).find(k => pos[k] === 1);
    res.status(200).json({ ok:true, raceId, raceLabel, date: race.date,
      finishers: Object.keys(pos).length, dnf: dnf.length, winner });
  }catch(err){
    res.status(500).json({ error: String(err && err.message || err) });
  }
};
