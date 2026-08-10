// ============================================================
// Pipeline entry point: loads the apartment JSON config, starts the tour.
//
// The URL picks the apartment: ?apt=<id> (default kings-court).
// The config lives in apartments/<id>.json, photos in the folder
// from meta.photoBase. All angles in the config are in DEGREES
// (easy to edit by hand) and are converted to radians here.
// ============================================================

// The version comes from ?v= on this file's own <script> tag — the same
// value versions the config URL, otherwise the browser serves stale JSON
// from cache and geometry edits never reach phones.
const BUILD_V = (function () {
  try { return new URL(document.currentScript.src).searchParams.get('v') || ''; }
  catch (e) { return ''; }
})();

(async function () {
  const goBtn = document.getElementById('goBtn');
  const params = new URLSearchParams(location.search);
  const id = (params.get('apt') || 'kings-court').replace(/[^a-z0-9-]/gi, '');

  let cfg;
  try {
    const url = 'apartments/' + id + '.json' + (BUILD_V ? '?v=' + BUILD_V : '');
    const resp = await fetch(url, { cache: 'no-cache' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    cfg = await resp.json();
  } catch (err) {
    goBtn.textContent = 'Could not load apartment "' + id + '"';
    document.getElementById('overlayText').innerHTML =
      'Check that <b>apartments/' + id + '.json</b> exists.<br>' +
      'Local runs need a web server: <code>python -m http.server</code><br>' +
      '(fetch does not work over file://).';
    return;
  }

  // degrees -> radians
  const rad = (d) => d * Math.PI / 180;
  cfg.start.yaw = rad(cfg.start.yaw);
  for (const f of cfg.furniture) if (f.rot !== undefined) f.rot = rad(f.rot);
  for (const s of cfg.spawns) s.yaw = rad(s.yaw);
  for (const p of cfg.photoSpots || []) p.yaw = rad(p.yaw);

  window.APT = cfg;

  if (cfg.meta) {
    if (cfg.meta.title) {
      document.title = cfg.meta.title + ' · 3D Tour';
      document.querySelector('#overlay h1').textContent = cfg.meta.title;
    }
  }

  window.initApp();
})();
