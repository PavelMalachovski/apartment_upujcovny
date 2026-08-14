// ============================================================
// Offline lightmap pack: the loader and its staleness guard.
//
// bake.js computes floor/ceiling/attic-slope lightmaps in the browser at
// page load. tools/bake_lightmaps.mjs can compute the same maps offline at
// far higher quality and write them to tour/lightmaps/<apt>/. This file is
// what lets the runtime use those files INSTEAD of baking, and — much more
// importantly — what stops it using them once they no longer describe the
// apartment.
//
// Stale light must never ship silently. A pack whose hash does not match the
// live config is rejected outright and the runtime bake runs, and the
// mismatch is reported twice: console.warn, and an entry pushed into
// window.__issues so `?check=1` shows it and every harness in this repo that
// asserts an empty __issues list fails on it. There is no "close enough".
//
// window.__lightmaps reports what happened, readable the same way
// window.__ambSampled is:
//   { status: 'off' | 'missing' | 'stale' | 'nohash' | 'ok' | 'partial',
//     dir, hash, want, loaded, total }
// ============================================================

const Lightmaps = (() => {
  // Same ?v= as every other classic script: main.js appends it when it
  // injects this tag, so reading it back off our own src versions the
  // manifest and the images with the one number that versions everything
  // else (hard rule 3). document.currentScript is valid here because this is
  // a classic script and this IIFE runs during parse.
  const V = (() => {
    const s = document.currentScript;
    if (!s || !s.src) return '';
    try { return new URL(s.src).searchParams.get('v') || ''; } catch (e) { return ''; }
  })();
  const qv = () => (V ? '?v=' + V : '');

  // ---------- the hash input ----------
  // ONLY the geometry that light is computed from. Everything a bake cannot
  // possibly depend on is excluded, so renaming a room, moving a photo spot
  // or re-fitting `exposure` does not invalidate a pack that is still
  // perfectly correct.
  //
  // Included, and why each one moves light:
  //   walls (openings live inside them) — the occluders, and the openings
  //     light travels through; floors / mainCeil / attic / stairs /
  //     terraceSteps / rails / surroundings — every other solid the bake
  //     traces against, indoors and out; furniture — position AND rotation,
  //     both of which change what a hemisphere ray hits; lights — the lamps;
  //     groundZones — the walkable-level map, listed by the task brief;
  //     roomCenter — builder.js orients each window's normal by it
  //     (builder.js:297,374), so it decides which way daylight enters;
  //     mainFloorY / upperFloorY / terraceY / mainCeilH — the level heights
  //     every one of the above is placed against.
  //
  // Excluded, and why none of them can change a lightmap:
  //   photoSpots, spawns, areas, roomLabels, start — camera and UI, never
  //     read by builder.js's bake data or by bake.js; meta — titles, photo
  //     paths; palette and exposure — albedo and tone mapping, applied at
  //     render time on top of the lightmap, never inside it; quality.aoRays
  //     — reaches furniture vertices only (see CLAUDE.md), which are not
  //     lightmapped; env — the reflection capture point; lightmaps — this
  //     feature's own switch, which would otherwise make every pack stale
  //     the moment it was turned on.
  const GEOMETRY_KEYS = [
    'walls', 'floors', 'mainCeil', 'attic', 'stairs', 'terraceSteps', 'rails',
    'surroundings', 'furniture', 'lights', 'groundZones', 'roomCenter',
    'mainFloorY', 'upperFloorY', 'terraceY', 'mainCeilH'
  ];

  function project(cfg) {
    const out = {};
    for (const k of GEOMETRY_KEYS) if (cfg && cfg[k] !== undefined) out[k] = cfg[k];
    return out;
  }

  // Canonical JSON: object keys sorted, so a config re-saved with its keys in
  // a different order still hashes the same. Numbers go through
  // JSON.stringify, whose output for a Number is fixed by the ECMAScript
  // spec, so this is deterministic across engines and runs.
  function canon(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    const keys = Object.keys(v).filter((k) => v[k] !== undefined).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  }

  // Exposed so a check can see exactly what went in — diff two inputs to
  // prove an excluded key does not move the hash, without hashing anything.
  function hashInput(cfg) { return canon(project(cfg)); }

  // SHA-256 over that string. crypto.subtle needs a secure context, which
  // covers both places this actually runs (https in production, localhost in
  // development). Anywhere else the guard cannot be evaluated at all, and an
  // unverifiable pack is treated exactly like a stale one: warn and bake.
  async function hash(cfg) {
    if (!(window.crypto && window.crypto.subtle)) return null;
    const bytes = new TextEncoder().encode(hashInput(cfg));
    const buf = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // ---------- loading ----------
  function reject(state, status, message) {
    state.status = status;
    console.warn('[lightmaps] ' + message + ' — falling back to the runtime bake');
    if (Array.isArray(window.__issues)) window.__issues.push('lightmaps: ' + message);
    return null;
  }

  function loadTexture(url) {
    return new Promise((res, rej) => {
      new THREE.TextureLoader().load(url, res, undefined, () => rej(new Error('cannot load ' + url)));
    });
  }

  // Returns a pack, or null when the runtime should bake. Never throws.
  async function load(cfg) {
    const state = { status: 'off', dir: null, hash: null, want: null, loaded: 0, total: 0 };
    window.__lightmaps = state;
    if (!cfg || !cfg.lightmaps) return null;               // no pack claimed: silent, not a fault
    const id = (cfg.meta && cfg.meta.id) ||
               new URLSearchParams(location.search).get('apt') || '';
    if (!id) return reject(state, 'missing', 'no apartment id to find a pack under');
    const dir = 'lightmaps/' + id.replace(/[^a-z0-9-]/gi, '') + '/';
    state.dir = dir;

    let man;
    try {
      const r = await fetch(dir + 'manifest.json' + qv(), { cache: 'no-cache' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      man = await r.json();
    } catch (e) {
      return reject(state, 'missing', 'no readable manifest at ' + dir + ' (' + e.message + ')');
    }

    const want = await hash(cfg);
    state.hash = man && man.hash;
    state.want = want;
    if (!want) {
      return reject(state, 'nohash', 'crypto.subtle is unavailable, so the pack cannot be verified');
    }
    if (!man || man.hash !== want) {
      return reject(state, 'stale', 'manifest hash ' + String(man && man.hash).slice(0, 12) +
        '… does not match this config\'s ' + want.slice(0, 12) + '…, the pack is stale');
    }

    const entries = Array.isArray(man.surfaces) ? man.surfaces : [];
    state.total = entries.length;
    const byIndex = new Map();
    // In parallel, not one after another: this sits directly in front of the
    // start overlay's progress bar, and ten sequential round-trips would add
    // ten latencies to every page load for no reason. One image failing does
    // not fail the rest -- that surface bakes at runtime instead.
    await Promise.all(entries.map((e) =>
      loadTexture(dir + e.file + qv())
        .then((tex) => { byIndex.set(e.i, { entry: e, tex }); })
        .catch((err) => {
          console.warn('[lightmaps] ' + err.message + ' — that surface will be baked at runtime');
        })));
    state.loaded = byIndex.size;
    state.status = byIndex.size === entries.length ? 'ok' : 'partial';
    if (state.status === 'partial' && Array.isArray(window.__issues)) {
      window.__issues.push('lightmaps: only ' + byIndex.size + ' of ' + entries.length +
        ' images loaded, the rest were baked at runtime');
    }
    return { hash: want, byIndex, baker: man.baker || null };
  }

  // ---------- applying ----------
  // Second, independent guard. The manifest hash proves the CONFIG has not
  // moved; it says nothing about builder.js, which is what turns that config
  // into surfaces. A builder edit that reorders or reshapes the surface list
  // would silently hand plate 3's lightmap to plate 4. So every entry also
  // carries the plate's own size and world position, and a texture is only
  // used on a plate that still matches it.
  const EPS = 1e-6;
  function textureFor(pack, index, surf) {
    if (!pack) return null;
    const hit = pack.byIndex.get(index);
    if (!hit) return null;
    const e = hit.entry;
    surf.mesh.updateMatrixWorld(true);
    const p = surf.mesh.position;
    const ok = Math.abs(e.w - surf.w) < EPS && Math.abs(e.h - surf.h) < EPS &&
               Math.abs(e.pos[0] - p.x) < EPS && Math.abs(e.pos[1] - p.y) < EPS &&
               Math.abs(e.pos[2] - p.z) < EPS &&
               e.outdoor === !!surf.outdoor;
    if (!ok) {
      const msg = 'surface ' + index + ' no longer matches its baked plate (' +
        e.w + 'x' + e.h + ' at ' + e.pos.join(',') + ' vs ' + surf.w + 'x' + surf.h +
        ' at ' + [p.x, p.y, p.z].join(',') + ')';
      console.warn('[lightmaps] ' + msg + ' — baking it at runtime');
      if (Array.isArray(window.__issues)) window.__issues.push('lightmaps: ' + msg);
      return null;
    }
    // NoColorSpace, deliberately and explicitly: a lightmap holds light, not
    // colour. The runtime CanvasTexture it replaces is NoColorSpace by
    // default and its bytes are read raw by the lightmap shader chunk;
    // "correcting" this to SRGBColorSpace would decode them a second time
    // and darken every baked surface.
    hit.tex.colorSpace = THREE.NoColorSpace;
    return hit.tex;
  }

  return { hashInput, hash, load, textureFor, GEOMETRY_KEYS };
})();
