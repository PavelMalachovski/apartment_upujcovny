// ============================================================
// Pipeline entry point: loads the apartment JSON config, starts the tour.
//
// The URL picks the apartment: ?apt=<id> (default kings-court).
// The config lives in apartments/<id>.json, photos in the folder
// from meta.photoBase. All angles in the config are in DEGREES
// (easy to edit by hand) and are converted to radians here.
// ============================================================

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// The version comes from ?v= on this module's own URL — the same value
// versions the config fetch and every classic script loaded below, otherwise
// the browser serves stale JSON and stale code from cache and edits never
// reach phones. document.currentScript is null in a module; import.meta.url
// carries the query string, so it is the equivalent.
const BUILD_V = new URL(import.meta.url).searchParams.get('v') || '';

window.THREE = THREE;
Object.assign(window, { EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, OutputPass });

// The classic scripts only declare classes and touch THREE inside functions,
// so publishing the globals first is enough — but they must load in this
// order, and they must load before initApp is called.
const CLASSIC = ['post.js', 'bake.js', 'materials.js', 'builder.js',
                 'controls.js', 'doll.js', 'validate.js', 'app.js'];

function loadClassic(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src + (BUILD_V ? '?v=' + BUILD_V : '');
    s.onload = res;
    s.onerror = () => rej(new Error('failed to load ' + src));
    document.head.appendChild(s);
  });
}

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

  try {
    for (const f of CLASSIC) await loadClassic(f);
  } catch (err) {
    goBtn.textContent = 'Could not load the tour';
    document.getElementById('overlayText').textContent = String(err.message);
    return;
  }

  window.initApp();

  // Debug capture harnesses (measure = resemblance to the real photos,
  // refshots = fixed-camera regression frames), off by default and never
  // downloaded by normal visitors. BUILD_V (captured synchronously above,
  // before any await) versions this the same way the config fetch is
  // versioned — document.currentScript is null by this point inside an
  // async IIFE.
  for (const flag of ['measure', 'refshots']) {
    if (new URLSearchParams(location.search).has(flag)) {
      const s = document.createElement('script');
      s.src = flag + '.js' + (BUILD_V ? '?v=' + BUILD_V : '');
      document.head.appendChild(s);
    }
  }
})();
