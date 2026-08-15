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
import { MeshBVH } from 'three-mesh-bvh';

// Tells index.html's failure watchdog that the module graph resolved and this
// entry is executing. Must be the first statement of the module body, and it
// only runs if every import above succeeded — that is the whole signal. See
// the comment block above the module tag in index.html for why an `onerror`
// attribute alone does not cover the importmap-unsupported case.
window.__tourEntryRan = true;

// The version comes from ?v= on this module's own URL — the same value
// versions the config fetch and every classic script loaded below, otherwise
// the browser serves stale JSON and stale code from cache and edits never
// reach phones. document.currentScript is null in a module; import.meta.url
// carries the query string, so it is the equivalent.
const BUILD_V = new URL(import.meta.url).searchParams.get('v') || '';

window.THREE = THREE;
// r128 had no colour-management system at all: a hex like 0xffe4c0 passed
// straight through as the linear RGB triplet, unconverted, for every
// material and light Color in the app. r155+ defaults
// ColorManagement.enabled = true, which makes Color's hex/style
// constructors assume sRGB and auto-decode to linear before use -- a
// conversion that never ran under r128. Must be set before any classic
// script (materials.js, builder.js) constructs a single Color. Textures are
// a separate mechanism and are unaffected (they default to NoColorSpace
// regardless -- see materials.js's canvasTex()); this is scoped to Color
// only. Measured, not assumed: this was the single largest contributor to
// the r128<->r185 gap of everything task 6 found -- see
// docs/superpowers/metrics/r128-reference.md.
THREE.ColorManagement.enabled = false;
Object.assign(window, { EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, OutputPass, MeshBVH });

// The classic scripts only declare classes and touch THREE inside functions,
// so publishing the globals first is enough — but they must load in this
// order, and they must load before initApp is called.
const CLASSIC = ['post.js', 'sampler.js', 'bake.js', 'materials.js',
                 'builder.js', 'controls.js', 'doll.js', 'validate.js', 'app.js'];

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

  // Per-photograph field of view. The capture camera's fov was fixed at 72
  // vertical while only the aspect changed, so 16:9 photographs were scored
  // against a 104.5-degree horizontal render and portrait ones against 55.
  // meta.photoFovLong is the angle across the frame's LONG edge, one value
  // per apartment because one camera shot the set; per-spot vfov overrides.
  const DEG = Math.PI / 180;
  window.__spotFov = function (spot, aspect) {
    if (spot && typeof spot.vfov === 'number' && spot.vfov > 0) return spot.vfov;
    const long = cfg.meta && cfg.meta.photoFovLong;
    if (!(typeof long === 'number' && long > 0 && long < 179)) return 72;
    // landscape: long edge is horizontal, so convert to vertical through the
    // aspect. portrait: the long edge IS vertical, use it directly.
    if (aspect >= 1) {
      return 2 * Math.atan(Math.tan(long * DEG / 2) / aspect) / DEG;
    }
    return long;
  };

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
  // refshots = fixed-camera regression frames, compare = render-vs-photo
  // divider view), off by default and never downloaded by normal visitors.
  // BUILD_V (captured synchronously above, before any await) versions this
  // the same way the config fetch is versioned — document.currentScript is
  // null by this point inside an async IIFE.
  for (const flag of ['measure', 'refshots', 'compare']) {
    if (new URLSearchParams(location.search).has(flag)) {
      const s = document.createElement('script');
      s.src = flag + '.js' + (BUILD_V ? '?v=' + BUILD_V : '');
      document.head.appendChild(s);
    }
  }
})();
