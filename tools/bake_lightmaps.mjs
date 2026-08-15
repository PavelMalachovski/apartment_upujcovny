// ============================================================
// Offline lightmap baker.
//
//   python tools/serve.py                       # in another shell
//   node tools/bake_lightmaps.mjs --apt serenity
//
// Writes tour/lightmaps/<apt>/s000.webp … and manifest.json.
//
// THIS TOOL CANNOT RUN AS THE TREE STANDS, and it refuses to start rather
// than half-run. It was written against tour/lightmaps.js, the runtime
// loader that read those files back and owned the manifest's staleness
// hash. That loader was REMOVED at 736a867 when the serenity pilot was
// reverted (it failed its exit criterion — see CLAUDE.md's `lightmaps`
// row), so `Lightmaps` no longer exists in the page and the hash call near
// the bottom of this file is a ReferenceError. The precondition in the
// driver below says so and stops before anything is written; restore the
// loader first, per the same row's checkout recipe.
//
// When the loader IS present, it loads the pack at runtime instead of
// baking, but only while the manifest's hash still matches the apartment's
// geometry — see that file for the guard.
//
// Requires playwright (`npm i playwright`, or NODE_PATH pointing at an install
// that has it) and a Chromium with a real GPU: the flags below are not
// optional. Headless Chromium defaults to SwiftShader, which post.js's
// capable() rejects, and a run without them silently measures and bakes with
// no post chain at all. A prior task in this phase lost a whole baseline to
// exactly that; the same three flags are in
// docs/superpowers/rejected/2026-08-13-b3-task3-gtao/lib.mjs.
//
// WHY PLAYWRIGHT AND NOT NODE. The scene is built by the shipping builder.js,
// in the shipping browser, from the shipping config — this tool never
// constructs geometry. It drives the page, and then calls back into the
// page's own Baker.bakeSurface() with a different radiance function. So the
// texel→world mapping, the edge dilation, the byte encoding, the direct lamp
// / window / sun terms and the occluder set are all literally the runtime's,
// not a reimplementation that can drift from it.
//
// WHAT IS ACTUALLY DIFFERENT OFFLINE, at the shipped settings: the indoor
// ambient, computed by the path integrator below instead of bake.js's
// single-bounce escaped-ray fraction. That is all. The texel grid, the edge
// dilation, the byte encoding and every direct lamp / window / sun term are
// the runtime's own — deliberately, so the difference between a runtime bake
// and a pack is attributable to exactly one thing.
//
// THE INTEGRATOR, and the one thing it must not do. bake.js models indoor
// light as a constant AMB_RGB — "everything arriving from beyond the near
// field" — scaled by the fraction of a 0.65 m hemisphere that escapes. A ray
// that hits something inside 0.65 m contributes nothing at all, which is why
// a crevice bakes to black. The integrator here keeps that near-field /
// far-field split exactly, including AMB_DIST, and only replaces "contributes
// nothing" with "contributes what actually bounces off that surface":
// albedo × (the near-field ambient at the hit point + the lamp, window and
// sun light landing on it), recursively, to a fixed bounce count.
//
// Holding AMB_DIST is the load-bearing decision. Widen the gather to
// room scale and every ray in an open room hits a wall or the ceiling instead
// of escaping, so the whole room dims by whatever the bounce series has lost
// at the truncation depth — a global brightness shift, on top of an
// `exposure` that is fitted per apartment and is not this tool's to move.
// At 0.65 m an open floor texel still escapes on nearly every ray and comes
// out at AMB_RGB, unchanged; only the crevices move. With bounces = 0 the
// integrator reduces exactly to bake.js's own estimator, which is the
// property that makes "same normalization" checkable rather than asserted.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = 'http://localhost:8742/';
const GPU_ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];
const ROOT = path.resolve(import.meta.dirname, '..');

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : dflt;
};

const APT = arg('apt', 'serenity');
const CFG = {
  // Chosen for quality and bake time, before any luminance or resemblance
  // number was looked at, and not revisited afterwards.
  rays: Number(arg('rays', 2048)),        // primary paths per texel (runtime: 16 rays, no paths)
  bounces: Number(arg('bounces', 2)),     // reflection events counted along a path
  albedo: Number(arg('albedo', 0.6)),     // see the note in the report: one constant, no per-triangle material
  // Texels per metre over the config's own `res`, and it defaults to 1 for a
  // measured reason. Raising it is blocked by bake.js's edge dilation, which
  // replaces exactly ONE boundary ring and takes the replacement from the
  // immediate neighbour. Once a texel is finer than the 0.14 m wall is thick,
  // 2-3 texels land inside that wall, the rule copies one spoiled texel over
  // another, and serenity's ceilings come back with a hard black band --
  // measured at 13/255 against an interior of 185 in a bake at 3. The obvious
  // generalisation (walk in to the first clean texel) was written and
  // reverted: at the SHIPPED densities the spoiled run is already longer than
  // one texel on hundreds of edge scans per apartment, so it changes every
  // runtime bake too. Fixing this properly is a distance-based dilation and
  // is its own change with its own before/after -- see task-5-report.md §6.
  resScale: Number(arg('res-scale', 1)),
  quality: Number(arg('quality', 1))      // canvas WebP quality
};
const DRY = argv.includes('--dry');       // self-check + one surface, write nothing

// ---------- in-page: the integrator ----------
// Installed once, then called per surface. Everything it needs comes from the
// page: Baker (lightAt, bakeSurface, ambientMeshes, AMB_RGB, AMB_DIST),
// Sampler (rayFirst, tangentBasis, cosineDir), Builder.bakeData, THREE.
function INSTALL(cfg) {
  const T = THREE;
  const AMB = Baker.AMB_RGB;
  const MAXD = Baker.AMB_DIST;
  const ZERO = [0, 0, 0];

  // One scratch triple per path depth. Recursion is the whole point here, so
  // module-shared scratch would be overwritten by the deeper call before the
  // shallower one had finished with it.
  const lv = [];
  const level = (d) => (lv[d] || (lv[d] = { T1: new T.Vector3(), T2: new T.Vector3(), dir: new T.Vector3() }));

  function makeIntegrator(handle, data, opts) {
    const RHO = opts.albedo;
    // The near-field radius. Defaults to bake.js's own AMB_DIST, which is
    // what keeps an open texel at exactly AMB_RGB; it is an option only so
    // the self-check below can put its analytic geometry out of reach of it.
    const REACH = opts.maxDist === undefined ? MAXD : opts.maxDist;

    // Radiance arriving at P from ONE sampled direction in the hemisphere
    // about N. Escaping the near field returns the far-field constant; a hit
    // returns what that surface reflects back.
    function trace(P, N, depth, occ, basis) {
      const s = basis || level(depth);
      if (!basis) Sampler.tangentBasis(N, s.T1, s.T2);
      Sampler.cosineDir(N, s.T1, s.T2, s.dir);
      const hit = Sampler.rayFirst(P, s.dir, REACH, handle);
      // Escaping is not a reflection, so it is answered before the budget:
      // the far-field constant comes back at any bounce count, which is what
      // makes bounces = 0 reduce exactly to bake.js's own estimator
      // (AMB_RGB x escaped fraction) rather than to zero.
      if (!hit) return AMB;
      // `bounces` counts albedo multiplications along the path. depth is how
      // many have already happened, so at depth >= bounces this hit has no
      // budget left and the path is absorbed.
      if (depth >= opts.bounces) return ZERO;
      const inner = trace(hit.point, hit.normal, depth + 1, occ);
      const lit = Baker.lightAt(hit.point, hit.normal, occ, data, false, true, () => inner);
      return [lit[0] * RHO, lit[1] * RHO, lit[2] * RHO];
    }

    // Mean over opts.rays independent paths. Cosine-weighted sampling makes
    // the plain mean the estimator: the cos/pi in the pdf cancels the cos in
    // the integrand, so no per-sample weight appears here.
    function ambient(P, N, occ) {
      const b0 = level(0);
      Sampler.tangentBasis(N, b0.T1, b0.T2);
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < opts.rays; i++) {
        const c = trace(P, N, 0, occ, b0);
        r += c[0]; g += c[1]; b += c[2];
      }
      return [r / opts.rays, g / opts.rays, b / opts.rays];
    }
    return { ambient, trace };
  }

  // ---- analytic self-check, run before anything is baked ----
  // Geometry with no lamps, no windows and no occluders, so lightAt() returns
  // exactly whatever ambient it is handed and every number below is an exact
  // product of AMB_RGB and the albedo — derived, not fitted, and each one
  // fails for a specific, nameable bug.
  //
  //   P = origin, normal +y.  A huge horizontal plane 0.1 m above it (the
  //   "ceiling"), and a second one 0.2 m above (the "sky blocker").
  //
  //   bounces = 0 -> exactly 0. Every primary ray hits the ceiling and there
  //     is no albedo budget to reflect it with. A non-zero answer means an
  //     escape is being counted where a ray hit something, or the budget is
  //     off by one.
  //   bounces = 1 -> exactly albedo * AMB_RGB. One reflection off the
  //     ceiling, whose own hemisphere leaves DOWNWARD, hits nothing, and
  //     returns the far-field constant. This is the case that fails if
  //     rayFirst's normal is not turned back toward the incoming ray: an
  //     unflipped ceiling normal sends that ray upward into the blocker
  //     instead, and the answer collapses to 0.
  //   normal -y, any bounce count -> exactly AMB_RGB. Nothing below the
  //     sample; every ray escapes; the far field is returned unscaled. Fails
  //     if escapes are being attenuated by the albedo.
  //
  // There is deliberately no exact case for the SECOND albedo factor. It
  // would need geometry where every ray hits at legs 1 and 2 and no ray hits
  // at leg 3, and that cannot be built: "every ray hits" requires a surface
  // that closes the hemisphere, and since rayFirst hands back a normal facing
  // where the ray came from, leg 3 leaves back into the same enclosure and
  // hits again. Any two huge parallel planes trap a path forever. Depth 2
  // runs the identical guard and the identical multiplication as depth 1 --
  // one code path, not two -- and the reduction reading below covers the
  // recursion end to end against an independent estimator.
  //
  // maxDist is raised to HUGE here, and that is not a convenience. Written
  // first with the shipped 0.65 m the first two cases FAILED, at 0.0078 and
  // 0.2419 against 0 and 0.24: a ray leaving P at grazing incidence reaches
  // a plane 0.1 m above it only after 0.1/lz metres, which exceeds 0.65 m
  // for lz < 0.1538, and cosine weighting puts P(lz < 0.1538) = 0.1538^2 =
  // 2.37% of rays there. 5 of 256 escaped, and 0.9805*0.24 + 0.0195*0.40 =
  // 0.2421 accounts for the second number to three decimals. The integrator
  // was right and the test's geometry was wrong -- the same shape of mistake
  // sampler.js's own case group 1 records against its first floor+wall
  // arrangement. With the near field out of reach the geometry means what
  // the derivation says it means: P(escape) drops to 1e-12.
  function selfCheck(opts) {
    const HUGE = 1e5;
    const stub = { lights: [], windows: [], occluders: [], wallPieces: [], surfaces: [] };
    const ceiling = new T.Mesh(new T.PlaneGeometry(HUGE, HUGE).rotateX(-Math.PI / 2).translate(0, 0.1, 0));
    const blocker = new T.Mesh(new T.PlaneGeometry(HUGE, HUGE).rotateX(-Math.PI / 2).translate(0, 0.2, 0));
    const h = Sampler.build([ceiling, blocker]);
    const P = new T.Vector3(0, 0, 0);
    const up = new T.Vector3(0, 1, 0), down = new T.Vector3(0, -1, 0);
    const at = (rays, bounces, N) =>
      makeIntegrator(h, stub, { albedo: opts.albedo, rays, bounces, maxDist: HUGE }).ambient(P, N, []);
    const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
    const none = at(256, 0, up);
    const one = at(256, 1, up);
    const open = at(256, 2, down);
    const scaled = AMB.map((v) => v * opts.albedo);
    const cases = [
      ['with no bounce budget a closed hemisphere returns nothing', near(none, [0, 0, 0]), none],
      ['one bounce returns albedo x the far-field constant', near(one, scaled), one],
      ['a hemisphere that escapes returns the far-field constant unscaled', near(open, AMB), open]
    ];
    h.geometry.dispose();
    return cases;
  }

  const data = Builder.bakeData;
  const meshes = Baker.ambientMeshes(window.__app.scene, data);
  const handle = Sampler.build(meshes);
  const integ = makeIntegrator(handle, data, cfg);

  window.__off = {
    handle, data, integ, cfg,
    selfCheck: () => selfCheck(cfg),

    // Diagnostic, printed once per run: with bounces = 0 the integrator must
    // reduce to bake.js's own ambient, AMB_RGB * (escaped fraction). Both
    // sides are Monte Carlo, so this is a consistency reading, not a gate.
    reduction: (rays) => {
      const s = data.surfaces.find((x) => !x.outdoor);
      s.mesh.updateMatrixWorld(true);
      const N = new T.Vector3(0, 0, 1).transformDirection(s.mesh.matrixWorld);
      const P = new T.Vector3(0, 0, 0).applyMatrix4(s.mesh.matrixWorld).addScaledVector(N, 0.03);
      const zero = makeIntegrator(handle, data, { albedo: cfg.albedo, rays, bounces: 0 }).ambient(P, N, []);
      const vis = Sampler.visibility(P, N, rays, Baker.AMB_DIST, handle);
      return { integratorB0: zero[0] / AMB[0], samplerVisibility: vis, rays };
    },

    bake: (i, quality) => {
      const surf = data.surfaces[i];
      const t0 = performance.now();
      // Both branches go through Baker.lightAt, so the lamp, window and sun
      // terms are the runtime's own, unmodified, and only the ambient is
      // substituted. Returning the integrator's output directly instead
      // would drop every direct term from the lightmap -- which is exactly
      // what the first version of this line did, and what the spawn-pooled
      // luminance caught: mean 138.6 -> 128.0 on a change that cannot
      // physically darken anything.
      //
      // Outdoor surfaces take the sky/sun model with no hemisphere gather at
      // all, exactly as the runtime bakes them. They still get the finer
      // texel grid, so the only offline difference on the terrace is
      // resolution.
      const shade = surf.outdoor
        ? (P, N, occ, outdoor) => Baker.lightAt(P, N, occ, data, outdoor, true)
        : (P, N, occ, outdoor) => Baker.lightAt(P, N, occ, data, outdoor, true,
                                                (p, n) => integ.ambient(p, n, occ));
      const canvas = Baker.bakeSurface(surf, data, { resScale: cfg.resScale, shade });
      const ms = performance.now() - t0;
      surf.mesh.updateMatrixWorld(true);
      const p = surf.mesh.position;
      return {
        i, ms, url: canvas.toDataURL('image/webp', quality),
        px: [canvas.width, canvas.height],
        w: surf.w, h: surf.h, res: surf.res, lvl: surf.lvl, outdoor: !!surf.outdoor,
        pos: [p.x, p.y, p.z],
        // Kept for the round-trip check below: what was written, before any
        // encoder touched it.
        raw: Array.from(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data)
      };
    },

    // Decode what we are about to ship and compare it with the canvas it came
    // from. A lossy encoder here would quietly re-grade every lightmap.
    roundTrip: (url, raw, w, h) => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0);
        const d = c.getContext('2d').getImageData(0, 0, w, h).data;
        let max = 0, sum = 0, n = 0;
        for (let k = 0; k < d.length; k++) {
          if (k % 4 === 3) continue;            // alpha is a constant 255 both sides
          const e = Math.abs(d[k] - raw[k]);
          if (e > max) max = e;
          sum += e; n++;
        }
        res({ max, mean: sum / n });
      };
      img.onerror = () => rej(new Error('cannot decode the encoded lightmap'));
      img.src = url;
    })
  };
  return { surfaces: data.surfaces.length, ambSampled: window.__ambSampled };
}

// ---------- driver ----------
const browser = await chromium.launch({ headless: true, args: GPU_ARGS });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.setDefaultTimeout(0);
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e && e.message)));

await page.goto(BASE + '?apt=' + APT, { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => !!window.__bakeReady, null, { timeout: 300000 });
await page.evaluate(() => window.__bakeReady);

const samplerOk = await page.evaluate(() => Sampler.selfTest());
if (!samplerOk) { await browser.close(); throw new Error('Sampler.selfTest() failed — refusing to bake'); }

// PRECONDITION, and its POSITION is the whole point of it: it is the last
// thing this driver does before it starts producing output, and it sits
// ABOVE the fs.mkdirSync at `const OUT = …` and every fs.writeFileSync
// below it. The manifest hash near the bottom of this file comes from
// Lightmaps.hash(), and tour/lightmaps.js — the only definition of that
// class — was removed at 736a867. Without this check the run bakes every
// surface, WRITES ALL OF THEM into tour/lightmaps/<apt>/ (inside the Vercel
// deploy root), and only then throws a ReferenceError on the hash, leaving
// orphaned assets no page will ever load and no manifest to identify them
// by. `--dry` is not a safeguard against that: it guards the writes but
// still reaches the hash call, so it fails in the same place for the same
// reason. Failing here instead costs one page load and touches no disk.
const hasLoader = await page.evaluate(() => typeof Lightmaps !== 'undefined');
if (!hasLoader) {
  await browser.close();
  throw new Error(
    'tour/lightmaps.js is not in the page, so Lightmaps.hash() — which stamps the ' +
    'manifest — cannot run, and a pack without its manifest is unusable. The loader ' +
    'was removed at 736a867 when the serenity lightmap pilot was reverted. To restore ' +
    'it: `git checkout 6a607fa -- tour/lightmaps.js`, re-add "lightmaps.js" to the ' +
    'CLASSIC array in tour/main.js, bump ?v= in tour/index.html, then re-run this tool. ' +
    'See CLAUDE.md\'s `lightmaps` config-key row for the full recipe and for the guard ' +
    'gaps that restoration re-opens. Refusing to bake — nothing was written.'
  );
}

const setup = await page.evaluate(INSTALL, CFG);
console.log('setup', JSON.stringify({ apt: APT, ...setup, cfg: CFG }));

const checks = await page.evaluate(() => window.__off.selfCheck());
for (const [name, ok, got] of checks) console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  ' + JSON.stringify(got));
if (checks.some((c) => !c[1])) { await browser.close(); throw new Error('integrator self-check failed — refusing to bake'); }
console.log('reduction (bounces=0 vs sampler visibility)',
  JSON.stringify(await page.evaluate(() => window.__off.reduction(4096))));

const OUT = path.join(ROOT, 'tour', 'lightmaps', APT);
if (!DRY) fs.mkdirSync(OUT, { recursive: true });

const entries = [];
let bytes = 0, totalMs = 0, worstMax = 0, worstMean = 0;
const n = DRY ? 1 : setup.surfaces;
for (let i = 0; i < n; i++) {
  const r = await page.evaluate(([idx, q]) => window.__off.bake(idx, q), [i, CFG.quality]);
  const rt = await page.evaluate(([url, raw, w, h]) => window.__off.roundTrip(url, raw, w, h),
                                 [r.url, r.raw, r.px[0], r.px[1]]);
  const buf = Buffer.from(r.url.split(',')[1], 'base64');
  const file = 's' + String(i).padStart(3, '0') + '.webp';
  if (!DRY) fs.writeFileSync(path.join(OUT, file), buf);
  bytes += buf.length;
  totalMs += r.ms;
  worstMax = Math.max(worstMax, rt.max);
  worstMean = Math.max(worstMean, rt.mean);
  entries.push({ i, file, w: r.w, h: r.h, res: r.res, lvl: r.lvl, outdoor: r.outdoor, pos: r.pos, px: r.px });
  console.log(`s${String(i).padStart(3, '0')}  ${r.px[0]}x${r.px[1]}  ${(r.ms / 1000).toFixed(1)}s  ` +
              `${(buf.length / 1024).toFixed(1)} KB  round-trip max ${rt.max} mean ${rt.mean.toFixed(3)}`);
}

// The hash comes from the PAGE, not from a second implementation here: the
// loader's Lightmaps.hash is the only thing that decides whether a pack is
// stale, so it is also the only thing that decides what to stamp on one.
//
// THIS is the line the `hasLoader` precondition above exists to guard. By
// the time control reaches it the loop has already written every surface to
// disk, so a ReferenceError here is a destructive failure, not a clean one.
// Do not move the precondition below this point, and do not delete it
// without first restoring tour/lightmaps.js.
const hash = await page.evaluate(() => Lightmaps.hash(window.APT));

const manifest = {
  apt: APT,
  hash,
  hashAlgo: 'sha256',
  hashInput: 'canonical JSON of the geometry keys in Lightmaps.GEOMETRY_KEYS',
  generated: new Date().toISOString(),
  baker: { ...CFG, maxDist: await page.evaluate(() => Baker.AMB_DIST), tool: 'tools/bake_lightmaps.mjs' },
  surfaces: entries
};
if (!DRY) fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(JSON.stringify({
  apt: APT, hash, surfaces: entries.length,
  bakeSeconds: Math.round(totalMs / 100) / 10,
  totalKB: Math.round(bytes / 1024),
  roundTripWorstMax: worstMax, roundTripWorstMean: Math.round(worstMean * 1000) / 1000,
  errors
}));
await browser.close();
