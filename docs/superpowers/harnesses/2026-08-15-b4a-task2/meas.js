// Phase B plan 4a task 2 — the browser-side instruments, preserved verbatim.
//
// This repo has no npm install, so task 5's node+playwright launchers
// (docs/superpowers/harnesses/2026-08-13-b3-task5/lib5.mjs) could not run:
// `node -e "require.resolve('playwright')"` fails and `npm ls playwright`
// reports empty. Every reading in sweep.json was taken by pasting one of the
// functions below into a page driven by the Playwright MCP server, which
// launched Chromium on a real GPU — ANGLE / Intel UHD 630 / D3D11, NOT
// SwiftShader — so post.js's capable() accepted it and every function's
// first act, asserting `a.post.enabled`, passed rather than voiding the run.
//
// Paste order per page load: navigate, then ONE function. Each awaits
// window.__bakeReady itself.
//
//   MEAS()    spawn-pooled luminance + wall-vertex census + draw calls,
//             and (on a ?measure=1&fov=legacy page) the delta-E capture.
//   SHOTS()   one 900x560 frame per spawn, POSTed to tools/serve.py's save
//             endpoint under tools/shots/b4a-task2/<tag>/.
//   VERIFY()  __facesLvl's probe inlined, plus selfTest / __issues /
//             __ambSampled / draw calls.
//
// serve.py must be running UNSANDBOXED. Sandboxed it answers the save POST
// with 200 and writes nothing, so a capture reports success having produced
// no file — probe the file on disk before trusting any capture.

// ---------------------------------------------------------------- MEAS
// On a plain ?apt=<id> page this returns the spawn-pooled block only. On a
// ?apt=<id>&measure=1&fov=legacy page it ALSO runs window.__measure(), whose
// frames tools/delta_e.py and this directory's contrast.py then score.
// Both forms were run at SEG 0.45 to show they agree (87.9 vs 88.3 pooled p5,
// inside the +-0.9 noise floor) — see sweep.json plainPageControl.
async function MEAS() {
  await window.__bakeReady;
  const a = window.__app, c = a.controls;
  if (!(a.post && a.post.enabled)) throw new Error('no post chain');
  const ver = (document.querySelector('script[type=module]').getAttribute('src') || '').split('v=')[1];

  // Wall-vertex census. This is the direct proof that a sampled build is not
  // the unsampled one: under sampled=false NO wall vertex is a true zero.
  let wallVerts = 0, zeroV = 0, sumC = 0;
  a.scene.traverse(function (o) {
    if (o.isMesh && o.userData && (o.userData.doll === 'walls1' || o.userData.doll === 'walls2')) {
      const col = o.geometry.attributes.color;
      wallVerts += o.geometry.attributes.position.count;
      for (let i = 0; i < col.count; i++) {
        const s = col.getX(i) + col.getY(i) + col.getZ(i);
        sumC += s / 3;
        if (s < 1e-6) zeroV++;
      }
    }
  });

  // Draw calls, CLAUDE.md's recipe: through the post chain, autoReset off and
  // reset by hand, at APT.start.
  const s0 = window.APT.start;
  c.enabled = true;
  c.pos.x = s0.x; c.pos.z = s0.z; c.ground = s0.g || 0; c.yaw = s0.yaw; c.pitch = 0;
  c.update(0.001);
  a.renderer.info.autoReset = false;
  a.renderer.info.reset();
  a.post.render(0);
  const calls = a.renderer.info.render.calls;
  a.renderer.info.autoReset = true;

  // Spawn-pooled sRGB luminance — task 2's and task 3's measure unchanged:
  // 480x300, pixelRatio 1, full post chain, pixels pooled across every spawn
  // before the mean and the INTERPOLATED 5th percentile.
  const W = 480, H = 300;
  const pr = a.renderer.getPixelRatio();
  a.renderer.setPixelRatio(1);
  a.renderer.setSize(W, H, false);
  a.camera.aspect = W / H; a.camera.updateProjectionMatrix();
  a.composer.setSize(W, H);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const hist = new Float64Array(256), per = [];
  function stats(h) {
    let n = 0, sum = 0, dark = 0;
    for (let v = 0; v < 256; v++) { n += h[v]; sum += v * h[v]; if (v < 16) dark += h[v]; }
    const t = 0.05 * n;
    let acc = 0, p5 = 0;
    for (let v = 0; v < 256; v++) {
      const prev = acc; acc += h[v];
      if (acc >= t) { p5 = h[v] ? v - 0.5 + (t - prev) / h[v] : v; break; }
    }
    return { meanL: Math.round(sum / n * 10) / 10, p5L: Math.round(p5 * 10) / 10,
             pctPixelsBelowLuma16: Math.round(dark / n * 1000) / 10 };
  }
  for (const s of window.APT.spawns) {
    c.pos.x = s.x; c.pos.z = s.z; c.ground = s.g || 0; c.yaw = s.yaw; c.pitch = 0;
    c.update(0.001);
    a.post.render(0);
    ctx.drawImage(a.renderer.domElement, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    const loc = new Float64Array(256);
    for (let i = 0; i < d.length; i += 4) {
      const y = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
      hist[y]++; loc[y]++;
    }
    per.push(Object.assign({ spawn: s.name }, stats(loc)));
  }
  a.renderer.setPixelRatio(pr);

  const shots = (typeof window.__measure === 'function') ? await window.__measure() : null;
  return {
    apt: window.APT.meta.id, v: ver,
    fov: new URLSearchParams(location.search).get('fov'),
    ambSampled: window.__ambSampled, issues: window.__issues,
    bakeMs: Math.round(window.__bakeMs), calls,
    wallVerts, wallZeroVerts: zeroV,
    pctWallVertsTrueZero: Math.round(zeroV / wallVerts * 1000) / 10,
    wallMeanVertexColour: Math.round(sumC / wallVerts * 10000) / 10000,
    pooled: stats(hist), per,
    captured: shots && shots.length
  };
}

// --------------------------------------------------------------- SHOTS
// Tag comes from ?shot=<tag>. Photo-spot markers are hidden per frame, the
// same way measure.js hides them, so a capture does not photograph them.
async function SHOTS() {
  await window.__bakeReady;
  const a = window.__app, c = a.controls;
  if (!(a.post && a.post.enabled)) throw new Error('no post chain');
  const tag = new URLSearchParams(location.search).get('shot');
  const W = 900, H = 560;
  const pr = a.renderer.getPixelRatio();
  a.renderer.setPixelRatio(1);
  a.renderer.setSize(W, H, false);
  a.camera.aspect = W / H; a.camera.updateProjectionMatrix();
  a.composer.setSize(W, H);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  c.enabled = true;
  const poses = window.APT.spawns.map((s, i) => ({
    n: 'spawn' + i + '-' + s.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase(),
    x: s.x, z: s.z, g: s.g || 0, yaw: s.yaw, pitch: 0
  }));
  // Two pitched views at the first spawn: the wall/ceiling and wall/floor
  // junctions are where defect 2's one-quad reveals actually show.
  const s0 = window.APT.spawns[0];
  poses.push({ n: 'entrance-lookdown', x: s0.x, z: s0.z, g: 0, yaw: s0.yaw, pitch: -0.45 });
  poses.push({ n: 'entrance-lookup', x: s0.x, z: s0.z, g: 0, yaw: s0.yaw, pitch: 0.45 });
  let saved = 0;
  for (const p of poses) {
    c.pos.x = p.x; c.pos.z = p.z; c.ground = p.g; c.yaw = p.yaw; c.pitch = p.pitch;
    c.update(0.001);
    const hid = [];
    a.scene.traverse((o) => { if (o.isPoints && o.visible) { o.visible = false; hid.push(o); } });
    a.post.render(0);
    ctx.drawImage(a.renderer.domElement, 0, 0, W, H);
    for (const o of hid) o.visible = true;
    const r = await fetch('/save/b4a-task2/' + tag + '/' + p.n + '.jpg',
                          { method: 'POST', body: cv.toDataURL('image/jpeg', 0.9) });
    if (r.status === 200) saved++;
  }
  a.renderer.setPixelRatio(pr);
  return { tag, saved };
}

// -------------------------------------------------------------- VERIFY
// __facesLvl's probe from docs/superpowers/harnesses/2026-08-15-b4a-task1,
// inlined so it can be pasted in one call, and reduced to the two numbers the
// assertion is actually made on: how many walls show ONLY their near face,
// and whether ANY wall shows a far face. far == 0 is the half that detects a
// winding regression. Do NOT substitute __faces(): it probes at world y and
// cannot reach a lvl:"upper" wall at all.
async function VERIFY() {
  await window.__bakeReady;
  const a = window.__app, T = window.THREE, c = a.controls;
  if (!(a.post && a.post.enabled)) throw new Error('no post chain');
  const rc = new T.Raycaster();
  rc.camera = a.camera;                       // required, or sprites throw
  const TH = 0.07;                            // half of WALL_TH 0.14
  const isWall = (o) => o.userData && (o.userData.doll === 'walls1' || o.userData.doll === 'walls2');
  const walls = window.APT.walls || [];
  const totals = { near: 0, far: 0, none: 0 };
  let wallsNearOnly = 0, wallsWithFar = 0;
  walls.forEach(function (w) {
    const alongX = Math.abs(w.z2 - w.z1) < 1e-6;
    const px = alongX ? 0 : 1, pz = alongX ? 1 : 0;
    const baseY = w.lvl === 'main' ? (window.APT.mainFloorY || 0) : (window.APT.upperFloorY || 0);
    let n = 0, f = 0, z = 0;
    for (const t of [0.15, 0.35, 0.5, 0.65, 0.85]) {
      const cx = w.x1 + (w.x2 - w.x1) * t, cz = w.z1 + (w.z2 - w.z1) * t;
      for (const dy of [0.4, 1.5, 2.2]) {
        if (dy > w.h - 0.1) continue;
        for (const s of [1, -1]) {
          rc.set(new T.Vector3(cx + px * s, baseY + dy, cz + pz * s),
                 new T.Vector3(-px * s, 0, -pz * s));
          const h = rc.intersectObjects(a.scene.children, true)
                      .find((h) => h.object.visible && isWall(h.object));
          if (!h) { z++; continue; }
          const onLine = Math.abs(alongX ? h.point.z - cz : h.point.x - cx) < TH + 0.005;
          if (!onLine) { z++; continue; }
          if (Math.abs(h.distance - (1 - TH)) < 0.02) n++;
          else if (Math.abs(h.distance - (1 + TH)) < 0.02) f++;
          else z++;
        }
      }
    }
    totals.near += n; totals.far += f; totals.none += z;
    if (n > 0 && f === 0) wallsNearOnly++;
    if (f > 0) wallsWithFar++;
  });
  const s0 = window.APT.start;
  c.enabled = true;
  c.pos.x = s0.x; c.pos.z = s0.z; c.ground = s0.g || 0; c.yaw = s0.yaw; c.pitch = 0;
  c.update(0.001);
  a.renderer.info.autoReset = false;
  a.renderer.info.reset();
  a.post.render(0);
  const calls = a.renderer.info.render.calls;
  a.renderer.info.autoReset = true;
  return {
    apt: window.APT.meta.id,
    v: (document.querySelector('script[type=module]').getAttribute('src') || '').split('v=')[1],
    facesLvl: totals, wallCount: walls.length, wallsNearOnly, wallsWithFar,
    selfTest: Sampler.selfTest(), ambSampled: window.__ambSampled,
    issues: window.__issues, calls, viewport: [window.innerWidth, window.innerHeight]
  };
}
