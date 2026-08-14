// Is the generalised dilation a no-op at the shipped texel densities?
// Exactly, not statistically: for every lightmapped surface of an apartment,
// walk in from all four edges of every row and column and measure how many
// consecutive texels overlap a wall footprint -- the run length the new rule
// replaces, where the old rule always replaced exactly one.
//
//   run length 0 -> neither rule fires
//   run length 1 -> both rules do exactly the same thing
//   run length >1 and < the whole line -> the rules differ (new one is right)
//   run length == the whole line -> the rules differ (old smeared from a
//                                   spoiled texel, new leaves it alone)
//
// The onWall test below is a diagnostic transcription of bake.js's own, at
// the same resolution the runtime bakes at.
import { launch, BASE, openTour } from './lib5.mjs';

const APTS = process.argv[2] ? process.argv[2].split(',') : ['serenity', 'kings-court', 'horkyone-10'];

function RUNS(scale) {
  const T = THREE;
  const data = Builder.bakeData;
  const out = [];
  for (const s of data.surfaces) {
    if (s.outdoor) continue;
    s.mesh.updateMatrixWorld(true);
    const mw = s.mesh.matrixWorld;
    const res = s.res * scale;
    const W = Math.max(4, Math.round(s.w * res)), H = Math.max(4, Math.round(s.h * res));
    const hx = s.w / W / 2, hz = s.h / H / 2;
    const m = Math.max(hx, hz);
    const _E = new T.Vector3();
    const onWall = (i, j) => {
      _E.set(((i + 0.5) / W - 0.5) * s.w, (1 - (j + 0.5) / H - 0.5) * s.h, 0).applyMatrix4(mw);
      for (const p of data.wallPieces) {
        if (_E.x > p.x1 - m && _E.x < p.x2 + m && _E.z > p.z1 - m && _E.z < p.z2 + m) return true;
      }
      return false;
    };
    const hist = {};
    let full = 0;
    const note = (k, n) => { hist[k] = (hist[k] || 0) + 1; if (k === n) full++; };
    for (let i = 0; i < W; i++) {
      let k = 0; while (k < H && onWall(i, k)) k++; note(k, H);
      k = 0; while (k < H && onWall(i, H - 1 - k)) k++; note(k, H);
    }
    for (let j = 0; j < H; j++) {
      let k = 0; while (k < W && onWall(k, j)) k++; note(k, W);
      k = 0; while (k < W && onWall(W - 1 - k, j)) k++; note(k, W);
    }
    out.push({ px: [W, H], res, hist, wholeLine: full });
  }
  return out;
}

const browser = await launch();
for (const apt of APTS) {
  const { ctx, page } = await openTour(browser, BASE + '?apt=' + apt);
  for (const scale of [1, 3]) {
    const rows = await page.evaluate(RUNS, scale);
    const agg = {};
    let full = 0;
    for (const r of rows) {
      for (const [k, n] of Object.entries(r.hist)) agg[k] = (agg[k] || 0) + n;
      full += r.wholeLine;
    }
    const over1 = Object.entries(agg).filter(([k]) => Number(k) > 1)
                        .reduce((s, [, n]) => s + n, 0);
    console.log(JSON.stringify({ apt, resScale: scale, surfaces: rows.length,
                                 runLengthHistogram: agg, runsLongerThanOne: over1,
                                 wholeLineRuns: full }));
  }
  await ctx.close();
}
await browser.close();
