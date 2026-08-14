// ============================================================
// Scene init, render loop, minimap, current-room label
// ============================================================

// Capture a cube panorama of the apartment itself and turn it into a
// PMREM environment. Reflections then show this flat's real window
// instead of a stock studio, which is what resemblance needs.
//
// Two ordering constraints, both load-bearing:
//   - run AFTER the light bake, or the panorama records unlit surfaces;
//   - run while scene.environment is still null, or reflections feed
//     back on themselves.
function captureEnvironment(renderer, scene, point) {
  // Tone mapping is applied per-fragment for every toneMapped material
  // (the default), including during these six CubeCamera face renders.
  // Left enabled, the captured environment would store display-referred,
  // ACES-compressed values that then get tone-mapped a SECOND time when
  // the scene is actually drawn — losing highlight energy relative to the
  // real room, and worse, making the capture itself move every time the
  // exposure changes: fitting exposure against a moving target. Suspended
  // for the duration of the capture only, restored in `finally` so it
  // survives the exception path below.
  const prevToneMapping = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;
  try {
    const target = new THREE.WebGLCubeRenderTarget(256, {
      format: THREE.RGBAFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter
    });
    const cam = new THREE.CubeCamera(0.1, 60, target);
    cam.position.set(point.x, point.y, point.z);
    scene.environment = null;
    cam.update(renderer, scene);

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileCubemapShader();
    const env = pmrem.fromCubemap(target.texture).texture;
    pmrem.dispose();
    target.dispose();

    scene.environment = env;
    return env;
  } catch (e) {
    console.warn('[env] capture failed, materials stay unreflective:', e);
    // CubeCamera.update() and PMREMGenerator still restore the renderer's
    // previous render target only on the normal exit path — re-verified in
    // the vendored r185 copy, not carried over from the r128 comment this
    // replaces. `CubeCamera.update()` (three.core.js) reads
    // `renderer.getRenderTarget()` into a local, renders the six faces, and
    // restores at the very end with no try/finally around any of it;
    // `PMREMGenerator._fromTexture()` (three.module.js) does the same,
    // stashing `_oldTarget` and only putting it back in `_cleanup()`, which
    // is the last statement of the normal path. So an exception partway
    // through (context loss, a WebGL error) still leaves the renderer bound
    // to an offscreen cube face, and every frame after this one would
    // render into it instead of the canvas: a black screen, exactly what
    // this handler exists to prevent. Restore defensively, in its own
    // try/catch, so a failure in the restore itself can never mask the
    // warning above or re-throw past it.
    try { renderer.setRenderTarget(null); } catch (e2) { /* nothing more we can do */ }
    return null;
  } finally {
    renderer.toneMapping = prevToneMapping;
  }
}

window.initApp = function () {
  const canvas = document.getElementById('view');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // Fitted per-apartment against its own photographs (task 7); apartments
  // with no photographs flagged for comparison keep this same 1.05 they
  // always had, via the default. A plain `!== undefined` guard would let
  // `null`, `0` or a stringified `"0.33"` straight through to
  // toneMappingExposure and produce a black or near-black render with no
  // warning -- exactly the failure mode this project's config-degrades-
  // with-a-warning rule exists to prevent (see Materials.color()'s hex
  // validation in materials.js for the same shape of guard). Require a
  // finite positive number or fall back, same as every other config key.
  const rawExposure = APT.exposure;
  let exposure = 1.05;
  if (typeof rawExposure === 'number' && isFinite(rawExposure) && rawExposure > 0) {
    exposure = rawExposure;
  } else if (rawExposure !== undefined) {
    console.warn('[app] APT.exposure must be a positive number, got', JSON.stringify(rawExposure), '-- falling back to 1.05');
  }
  renderer.toneMappingExposure = exposure;

  const scene = new THREE.Scene();
  // Known accepted r128->r185 difference, not compensated for: r128 never
  // tone-mapped or sRGB-encoded a plain Color background/fog clear (the
  // per-material path skipped it for a bare clear colour); r185's single
  // final-resolve OutputPass processes the whole composited buffer
  // uniformly, background included, so the same 0xbcd5e8 now reads
  // differently once rendered. A numeric compensation (inverting the ACES
  // chain per-apartment exposure) was built and measured in task 6 -- it
  // cost 76 lines, coupled the result to toneMappingExposure (which plan 2
  // re-fits from scratch), and was worth -0.04 dE2000 against the
  // resemblance metric that actually matters (17.26 with it, 17.22
  // without) -- nothing, slightly the wrong way. Removed. Left as a
  // recorded, accepted difference; see docs/superpowers/metrics/
  // r128-reference.md for the measurement.
  scene.background = new THREE.Color(0xbcd5e8);
  scene.fog = new THREE.Fog(0xbcd5e8, 40, 90);

  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 120);

  const colliders = Builder.build(scene);
  window.__issues = Validate.run(colliders);   // automatic layout check
  Builder.mergeStatic(scene);
  const controls = new WalkControls(camera, canvas, colliders);
  // cap pixel density on touch devices for FPS
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, controls.isTouch ? 1.6 : 2));
  // Built before the first resize() call below: resize() closes over `post`
  // and runs immediately, so declaring it any later would read a
  // temporal-dead-zone `const` and throw.
  const post = Post.create(renderer, scene, camera);
  resize();

  // Light baking: async, with progress on the overlay
  const goBtn = document.getElementById('goBtn');
  const goText = goBtn.textContent;
  goBtn.textContent = 'Baking light… 0%';
  goBtn.style.opacity = '0.6';
  const doll = new DollMode(scene, camera, controls, canvas);
  // Bake timing, always on: window.__bakeMs is set the moment Baker.run's
  // own promise settles, independent of whatever else this .then() chain
  // goes on to do (env capture, etc.) below. Living inside this function
  // rather than an external debug recipe means it survives this function
  // being restructured, and it can be read by anyone verifying a bake-time
  // claim without editing source first.
  const __bakeT0 = performance.now();
  const __bakerRun = Baker.run(scene, Builder.bakeData, (p) => {
    goBtn.textContent = 'Baking light… ' + Math.round(p * 100) + '%';
  });
  __bakerRun.then(() => { window.__bakeMs = performance.now() - __bakeT0; });
  window.__bakeReady = __bakerRun.then(() => {
    // Capture point precedence: APT.env.capture (per axis) > APT.roomCenter.main
    // > APT.start. kings-court has no roomCenter, so without the start
    // fallback its capture point would default to the world origin — outside
    // the flat and most likely inside a wall. APT.start is by definition a
    // valid standing position inside every apartment, so it is the safer
    // fallback than a literal { x: 0, z: 0 }.
    const fallback = (APT.roomCenter && APT.roomCenter.main) || APT.start || { x: 0, z: 0 };
    const ec = (APT.env && APT.env.capture) || {};
    // buildLights (builder.js) always adds AmbientLight + HemisphereLight
    // tagged `envFallback` — the fill scene.environment is meant to
    // replace. Detach them BEFORE capturing, not after: captureEnvironment
    // renders the scene through a CubeCamera, so any light still in the
    // scene graph during those six faces gets baked permanently into the
    // resulting PMREM texture. Removing them only on success (the previous
    // ordering) still lit every surface in the panorama itself, silently
    // brightening the one environment the whole session then reflects
    // from. Re-attach them only if the capture actually failed, so
    // materials stay fully lit (just unreflective) on that path, per spec.
    const fallbackLights = scene.children.filter((c) => c.userData.envFallback);
    for (const light of fallbackLights) scene.remove(light);
    const env = captureEnvironment(renderer, scene, {
      x: ec.x !== undefined ? ec.x : fallback.x,
      y: ec.y !== undefined ? ec.y : 1.6,
      z: ec.z !== undefined ? ec.z : fallback.z
    });
    if (!env) {
      for (const light of fallbackLights) scene.add(light);
    }
    goBtn.textContent = goText;
    goBtn.style.opacity = '1';
    doll.classify();
  });

  // ---------- Dollhouse mode ----------
  document.getElementById('dollBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!doll.on) doll.enter();
  });
  document.getElementById('dollExit').addEventListener('click', (e) => {
    e.stopPropagation();
    doll.exit(true);
  });
  document.getElementById('dollLvl1').addEventListener('click', (e) => { e.stopPropagation(); doll.setLevel('1'); });
  document.getElementById('dollLvl2').addEventListener('click', (e) => { e.stopPropagation(); doll.setLevel('2'); });
  document.getElementById('dollLvlAll').addEventListener('click', (e) => { e.stopPropagation(); doll.setLevel('all'); });
  // single-level flats have nothing to cut away — hide the level switch
  const singleLevel = !(APT.floors.upper && APT.floors.upper.length);
  if (singleLevel) {
    document.getElementById('dollLvl1').style.display = 'none';
    document.getElementById('dollLvl2').style.display = 'none';
    document.getElementById('dollLvlAll').style.display = 'none';
  }
  document.getElementById('dollMeasure').addEventListener('click', (e) => {
    e.stopPropagation();
    doll.setMeasure(!doll.measure);
  });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && doll.on) doll.exit(false);
  });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (post) post.setSize(w, h);
  }
  window.addEventListener('resize', resize);
  resize();

  document.getElementById('overlay').addEventListener('click', () => controls.lock());

  // ---------- Rooms menu: teleport points ----------
  const roomsBtn = document.getElementById('roomsBtn');
  const roomsPanel = document.getElementById('roomsPanel');
  let lastLvl = null;
  const oneLvlMenu = APT.spawns.every(s => s.g === APT.spawns[0].g);
  for (const s of APT.spawns) {
    const lvl = s.g === 0 ? 'Ground floor' : 'Upper floor & terrace';
    if (!oneLvlMenu && lvl !== lastLvl) {
      const hdr = document.createElement('div');
      hdr.className = 'lvl';
      hdr.textContent = lvl;
      roomsPanel.appendChild(hdr);
      lastLvl = lvl;
    }
    const b = document.createElement('button');
    b.textContent = s.name;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (doll.on) doll.exit(false);
      controls.pos.x = s.x; controls.pos.z = s.z;
      controls.yaw = s.yaw; controls.pitch = 0;
      controls.ground = s.g;
      roomsPanel.style.display = 'none';
    });
    roomsPanel.appendChild(b);
  }
  roomsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    roomsPanel.style.display = roomsPanel.style.display === 'block' ? 'none' : 'block';
  });

  // First visit only: pulse the two controls people otherwise walk past.
  // The animation stops itself after four beats, or on the first click.
  const dollBtn = document.getElementById('dollBtn');
  const hintSeen = (() => { try { return localStorage.getItem('tourHintSeen'); } catch (e) { return '1'; } })();
  if (!hintSeen) {
    document.getElementById('overlay').addEventListener('click', () => {
      setTimeout(() => [roomsBtn, dollBtn].forEach(b => b.classList.add('attn')), 500);
      try { localStorage.setItem('tourHintSeen', '1'); } catch (e) { /* private mode */ }
    }, { once: true });
    for (const b of [roomsBtn, dollBtn]) {
      b.addEventListener('click', () => [roomsBtn, dollBtn].forEach(x => x.classList.remove('attn')), { once: true });
    }
  }
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') roomsPanel.style.display = 'none';
  });
  const aptIntro = (APT.meta && APT.meta.description)
    ? APT.meta.description
    : 'A two-level apartment with a roof terrace, rebuilt from photos and the floor plan';
  if (controls.isTouch) {
    document.getElementById('overlayText').innerHTML =
      aptIntro + '.<br>' +
      'Left half of the screen — walk joystick, right half — look around.<br>' +
      'Buttons top left: <b>☰ Rooms</b> — teleport, <b>⌂ Dollhouse</b> — top view.<br>' +
      '📷 markers in rooms show the photographs.';
    document.getElementById('goBtn').textContent = 'Tap to enter';
  } else {
    document.getElementById('overlayText').innerHTML =
      aptIntro + '.<br>' +
      'WASD / arrows — walk, hold the mouse and drag — look around.<br>' +
      'Buttons top left: <b>☰ Rooms</b> — teleport, <b>⌂ Dollhouse</b> — top view.<br>' +
      '📷 markers in rooms show the photographs.';
  }

  // ---------- Photo spots: markers + viewer ----------
  const photoBtn = document.getElementById('photoBtn');
  const photoView = document.getElementById('photoView');
  // Crisp vector camera icon (256px + mipmaps)
  const camTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(22,24,28,0.88)';
    g.beginPath(); g.arc(128, 128, 118, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#e8e2d5'; g.lineWidth = 10;
    g.beginPath(); g.arc(128, 128, 118, 0, Math.PI * 2); g.stroke();
    // camera body
    g.fillStyle = '#f2efe8';
    g.beginPath(); g.roundRect(58, 96, 140, 92, 16); g.fill();
    // viewfinder bump
    g.beginPath(); g.roundRect(98, 74, 60, 30, 10); g.fill();
    // lens
    g.fillStyle = '#16181c';
    g.beginPath(); g.arc(128, 142, 34, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#f2efe8'; g.lineWidth = 8;
    g.beginPath(); g.arc(128, 142, 20, 0, Math.PI * 2); g.stroke();
    // flash
    g.fillStyle = '#16181c';
    g.beginPath(); g.arc(180, 112, 8, 0, Math.PI * 2); g.fill();
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  })();
  // One Points object per level instead of one Sprite per spot: sprites
  // do not batch, so 14 markers cost 14 draw calls. Splitting by level
  // also lets the dollhouse cutaway hide the upper markers.
  for (const lvl of [1, 2]) {
    const list = APT.photoSpots.filter(s => (s.g < 1.5 ? 1 : 2) === lvl);
    if (!list.length) continue;
    const pos = new Float32Array(list.length * 3);
    list.forEach((s, i) => {
      pos[i * 3] = s.x; pos[i * 3 + 1] = s.g + 1.9; pos[i * 3 + 2] = s.z;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      map: camTex, size: 0.28, sizeAttenuation: true,
      transparent: true, alphaTest: 0.4, depthTest: true
    }));
    pts.userData.mergeLvl = lvl;      // picked up by DollMode.classify
    scene.add(pts);
  }
  let nearSpot = null;
  function checkPhotoSpot() {
    if (doll.on) { photoBtn.style.display = 'none'; nearSpot = null; return; }
    let best = null, bd = 1.6;
    for (const s of APT.photoSpots) {
      if (Math.abs(s.g - controls.ground) > 0.6) continue;
      const d = Math.hypot(s.x - controls.pos.x, s.z - controls.pos.z);
      if (d < bd) { bd = d; best = s; }
    }
    nearSpot = best;
    photoBtn.style.display = best ? 'block' : 'none';
    if (best) photoBtn.textContent = '📷 Photo: ' + best.name;
  }
  // ---------- Photo viewer: gallery over the 3D view ----------
  // Once a photo is open it becomes a browsable gallery of every spot in
  // the flat: arrows, ← →, or a swipe. Neighbours are preloaded so the
  // next photo appears instantly instead of flashing white.
  const photoBase = (APT.meta && APT.meta.photoBase) || 'photos/';
  const photoOpen = () => photoView.style.display === 'flex';
  const preloaded = new Set();
  let photoIdx = -1;

  // ---------- Render-vs-photograph compare control ----------
  // Only spots BOTH flagged for comparison AND whose render is confirmed to
  // show the same subject as the photograph -- serenity has 9 of 11 compare
  // spots where it does not (a punched window rendered where the photo
  // shows a sliding door, a bedroom rendered where the photo is the
  // bathroom, and so on -- see each spot's poseNote), kings-court 6 of 14.
  // Showing a visitor a side-by-side of two different rooms would be worse
  // than showing nothing: the same contamination CLAUDE.md's palette note
  // already rejected once for the metric, now for a human instead of a
  // scorer. Absent poseVerified means verified -- the same default the
  // Python scorers use (tools/delta_e.py etc.) -- so an apartment nobody
  // has classified still shows the control on every compare spot.
  const photoCompareBtn = document.getElementById('photoCompare');
  const compareEligible = (s) => !!s && s.compare === true && s.poseVerified !== false;

  // compare.js is deliberately not in main.js's CLASSIC list -- most
  // visitors never open a compare-eligible spot, so it only loads the first
  // time one actually clicks the control. Cache-busted with this page's own
  // ?v=, read off the module tag directly, so an edit to compare.js is
  // never served stale (CLAUDE.md rule 3) without main.js having to know
  // this on-demand path exists at all.
  let comparePromise = null;
  function ensureCompareLoaded() {
    if (window.__compare) return Promise.resolve();
    if (comparePromise) return comparePromise;
    comparePromise = new Promise((resolve, reject) => {
      const tag = document.querySelector('script[src*="main.js"]');
      const v = tag ? new URL(tag.src).searchParams.get('v') : '';
      const el = document.createElement('script');
      el.src = 'compare.js' + (v ? '?v=' + v : '');
      el.onload = resolve;
      el.onerror = () => { comparePromise = null; reject(new Error('failed to load compare.js')); };
      document.head.appendChild(el);
    });
    return comparePromise;
  }

  function preloadAround(i) {
    for (const d of [-1, 1]) {
      const s = APT.photoSpots[(i + d + APT.photoSpots.length) % APT.photoSpots.length];
      if (!s || preloaded.has(s.file)) continue;
      preloaded.add(s.file);
      new Image().src = photoBase + s.file;
    }
  }
  function showPhoto(i) {
    photoIdx = (i + APT.photoSpots.length) % APT.photoSpots.length;
    const s = APT.photoSpots[photoIdx];
    document.getElementById('photoImg').src = photoBase + s.file;
    document.getElementById('photoCap').textContent =
      s.name + ' — ' + (s.vis ? 'visualization' : 'real photo') + ' · ' + (photoIdx + 1) + ' / ' + APT.photoSpots.length;
    photoCompareBtn.style.display = compareEligible(s) ? 'block' : 'none';
    preloadAround(photoIdx);
  }
  function openPhoto(s) {
    photoView.style.display = 'flex';
    // freeze walking: arrow keys belong to the gallery while it is open
    controls.enabled = false;
    controls.keys = {};
    showPhoto(APT.photoSpots.indexOf(s));
  }
  function closePhoto() {
    photoView.style.display = 'none';
    if (!doll.on) controls.enabled = true;
  }
  const stepPhoto = (d) => showPhoto(photoIdx + d);

  // swipe left/right on touch; the trailing click must not close the viewer
  let swipeX = null, swiped = false;
  photoView.addEventListener('touchstart', (e) => {
    swipeX = e.changedTouches[0].clientX; swiped = false;
  }, { passive: true });
  photoView.addEventListener('touchend', (e) => {
    if (swipeX === null) return;
    const dx = e.changedTouches[0].clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) < 45) return;
    swiped = true;
    stepPhoto(dx < 0 ? 1 : -1);
  }, { passive: true });

  photoBtn.addEventListener('click', (e) => { e.stopPropagation(); if (nearSpot) openPhoto(nearSpot); });
  photoView.addEventListener('click', () => {               // backdrop closes
    if (swiped) { swiped = false; return; }
    closePhoto();
  });
  document.getElementById('photoImg').addEventListener('click', (e) => e.stopPropagation());
  document.getElementById('photoClose').addEventListener('click', (e) => { e.stopPropagation(); closePhoto(); });
  document.getElementById('photoPrev').addEventListener('click', (e) => { e.stopPropagation(); stepPhoto(-1); });
  document.getElementById('photoNext').addEventListener('click', (e) => { e.stopPropagation(); stepPhoto(1); });
  photoCompareBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const s = APT.photoSpots[photoIdx];
    if (!compareEligible(s)) return;
    ensureCompareLoaded()
      .then(() => window.__compare(s.file))
      .catch((err) => console.warn('[compare] could not open the comparison:', err.message));
  });

  // F — nearby photo (when the cursor is busy and the button is hard to hit)
  document.addEventListener('keydown', (e) => {
    if (photoOpen()) {
      if (e.code === 'ArrowLeft') stepPhoto(-1);
      else if (e.code === 'ArrowRight') stepPhoto(1);
      else if (e.code === 'Escape') closePhoto();
      return;
    }
    if (e.code === 'KeyF' && nearSpot) openPhoto(nearSpot);
    if (e.code === 'KeyM') { if (doll.on) doll.exit(false); else doll.enter(); }
  });

  // ---------- Minimap ----------
  const mapC = document.getElementById('minimap');
  const mg = mapC.getContext('2d');
  // bounds: meta.map override, else the kings-court numbers (legacy default)
  const MAP = (APT.meta && APT.meta.map) || { x1: -5.4, z1: -2.6, x2: 24.4, z2: 7.2 };
  // The front door, taken from whichever opening is flagged as the entrance.
  const entrance = (() => {
    for (const w of APT.walls) {
      for (const o of w.openings || []) {
        if (!o.entrance) continue;
        const dx = w.x2 - w.x1, dz = w.z2 - w.z1;
        const len = Math.hypot(dx, dz) || 1;
        const t = o.at + o.w / 2;
        return { x: w.x1 + dx / len * t, z: w.z1 + dz / len * t };
      }
    }
    return null;
  })();
  function mapPt(x, z) {
    const sx = mapC.width / (MAP.x2 - MAP.x1);
    const sz = mapC.height / (MAP.z2 - MAP.z1);
    const s = Math.min(sx, sz);
    return [ (x - MAP.x1) * s, (z - MAP.z1) * s ];
  }
  function drawMap() {
    const upper = controls.ground >= 1.5;
    mg.clearRect(0, 0, mapC.width, mapC.height);
    mg.fillStyle = 'rgba(20,22,26,0.78)';
    mg.fillRect(0, 0, mapC.width, mapC.height);
    // floors: a street-level terrace belongs to the main view
    const lowTerrace = (APT.terraceY !== undefined && APT.terraceY < 1.5);
    const lists = upper
      ? [...(APT.floors.upper || []), ...(lowTerrace ? [] : APT.floors.terrace || [])]
      : [...APT.floors.main, ...(lowTerrace ? APT.floors.terrace || [] : [])];
    mg.fillStyle = upper ? 'rgba(190,175,150,0.25)' : 'rgba(190,175,150,0.25)';
    for (const f of lists) {
      const [a, b] = mapPt(f.x1, f.z1), [c, d] = mapPt(f.x2, f.z2);
      mg.fillRect(a, b, c - a, d - b);
    }
    // walls
    mg.strokeStyle = '#e8e2d5';
    mg.lineWidth = 1.6;
    for (const w of APT.walls) {
      const isUp = w.lvl === 'upper';
      if (isUp !== upper) continue;
      const [a, b] = mapPt(w.x1, w.z1), [c, d] = mapPt(w.x2, w.z2);
      mg.beginPath(); mg.moveTo(a, b); mg.lineTo(c, d); mg.stroke();
    }
    // stairs
    if (APT.stairs) {
      mg.strokeStyle = 'rgba(232,226,213,0.5)';
      const s = APT.stairs;
      for (let i = 0; i <= 8; i++) {
        const x = s.x1 + (s.x2 - s.x1) * i / 8;
        const [a, b] = mapPt(x, s.z1), [c, d] = mapPt(x, s.z2);
        mg.beginPath(); mg.moveTo(a, b); mg.lineTo(c, d); mg.stroke();
      }
    }
    // front door: the anchor everyone orients from on the ground floor
    if (entrance && !upper) {
      const [ex, ey] = mapPt(entrance.x, entrance.z);
      mg.fillStyle = '#8fd0a0';
      mg.beginPath(); mg.arc(ex, ey, 3.5, 0, Math.PI * 2); mg.fill();
      mg.font = '9px system-ui';
      mg.textAlign = 'right';
      mg.fillText('entry', ex - 6, ey + 3);
      mg.textAlign = 'left';
    }
    // player
    const [px, py] = mapPt(controls.pos.x, controls.pos.z);
    mg.fillStyle = '#ffb454';
    mg.beginPath();
    mg.arc(px, py, 4, 0, Math.PI * 2);
    mg.fill();
    const a2 = controls.yaw;
    mg.strokeStyle = '#ffb454';
    mg.lineWidth = 2;
    mg.beginPath();
    mg.moveTo(px, py);
    mg.lineTo(px - Math.sin(a2) * 10, py - Math.cos(a2) * 10);
    mg.stroke();
    // north arrow — the plan is drawn with north up
    const nx = mapC.width - 17, ny = 17;
    mg.fillStyle = 'rgba(20,22,26,0.72)';
    mg.beginPath(); mg.arc(nx, ny, 13, 0, Math.PI * 2); mg.fill();
    mg.fillStyle = '#e8e2d5';
    mg.beginPath();
    mg.moveTo(nx, ny - 9); mg.lineTo(nx - 4.5, ny + 3); mg.lineTo(nx, ny + 0.5); mg.lineTo(nx + 4.5, ny + 3);
    mg.closePath(); mg.fill();
    mg.font = '8px system-ui';
    mg.textAlign = 'center';
    mg.fillText('N', nx, ny + 10);
    mg.textAlign = 'left';

    // floor caption
    mg.fillStyle = '#fff';
    mg.font = '11px system-ui';
    const capt = singleLevel
      ? ((APT.meta && APT.meta.levelLabel) || 'Floor plan')
      : (upper ? 'Upper floor · terrace' : 'Ground floor');
    mg.fillText(capt, 8, mapC.height - 8);
  }

  // ---------- Current-room label ----------
  const roomEl = document.getElementById('room');
  function roomName() {
    const g = controls.ground;
    for (const r of APT.roomLabels) {
      const okLvl = (r.y === -1)
        ? (g > 0.2 && g < 2.9)
        : (Math.abs((r.y) - g) < 0.6);
      if (!okLvl) continue;
      if (controls.pos.x >= r.x1 && controls.pos.x <= r.x2 && controls.pos.z >= r.z1 && controls.pos.z <= r.z2) return r.name;
    }
    return '';
  }

  window.__app = { scene, camera, renderer, controls, doll, drawMap, roomName,
                   composer: post ? post.composer : null, post };

  let last = performance.now();
  let frame = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    controls.update(dt);
    doll.update();
    if (post && post.enabled) post.render(now * 0.001);
    else renderer.render(scene, camera);
    if ((frame++ & 3) === 0) {
      drawMap();
      checkPhotoSpot();
      roomEl.textContent = doll.on
        ? (doll.measure ? 'Measure · click the floor twice for a distance' : 'Dollhouse · click the floor to walk there')
        : roomName();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
};
