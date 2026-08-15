// Spawn-pooled sRGB luminance with ONE controlled variable changed: the
// renderer's tone-mapping exposure, overridden at runtime.
//
// Why this exists.  Plan 3's endpoints are c2bb0bd and 736a867, and TWO things
// moved between them that both act on the darkest 5%: task 2's sampled ambient
// (which lowers it) and task 4's exposure re-fit (which raises it).  Measuring
// only the endpoints answers "what does a visitor see now" but cannot say
// which change did what -- and on serenity the two happen to cancel.  Running
// the AFTER tree at the BEFORE tree's exposure isolates task 2's geometric
// contribution at constant exposure.
//
// The override is a runtime assignment to renderer.toneMappingExposure only.
// Nothing in tour/ is edited and no apartment's `exposure` key is touched --
// task 4 fitted those and is closed.  app.js sets exposure exactly once, at
// init (app.js:90), so the assignment sticks for every frame after it.
//
// The measurement body below is spawnlum.mjs's RUN(), copied verbatim except
// for the two marked lines that apply and report the override.  Keeping it a
// copy rather than a shared import is deliberate: spawnlum.mjs is a preserved
// task 5 artifact and the numbers it produced must stay reproducible from it
// unchanged.  `python check_run_identical.py` asserts the two bodies match.
//
//   node spawnlum_exp.mjs <label> <apt> <exposure>
import fs from 'node:fs';
import path from 'node:path';
import { launch, BASE, openTour } from '../2026-08-13-b3-task5/lib5.mjs';

const label = process.argv[2] || 'run';
const apt = process.argv[3] || 'serenity';
const expOverride = Number(process.argv[4]);
if (!Number.isFinite(expOverride) || expOverride <= 0) {
  throw new Error('usage: node spawnlum_exp.mjs <label> <apt> <exposure>');
}

function RUN(expOverride) {
  const a = window.__app;
  if (!(a.post && a.post.enabled)) throw new Error('no post chain -- this measurement would be void');
  window.__t7ExposureBefore = a.renderer.toneMappingExposure; // ADDED
  a.renderer.toneMappingExposure = expOverride;               // ADDED
  const W = 480, H = 300;
  const prevRatio = a.renderer.getPixelRatio();
  a.renderer.setPixelRatio(1);
  a.renderer.setSize(W, H, false);
  a.camera.aspect = W / H;
  a.camera.updateProjectionMatrix();
  a.composer.setSize(W, H);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const hist = new Float64Array(256);
  const per = [];
  const c = a.controls;
  c.enabled = true;
  for (const s of window.APT.spawns) {
    c.pos.x = s.x; c.pos.z = s.z; c.ground = s.g || 0;
    c.yaw = s.yaw; c.pitch = 0; c.update(0.001);
    a.post.render(0);
    ctx.drawImage(a.renderer.domElement, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    const local = new Float64Array(256);
    for (let i = 0; i < d.length; i += 4) {
      const y = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
      hist[y]++; local[y]++;
    }
    per.push({ spawn: s.name, ...stats(local) });
  }
  a.renderer.setPixelRatio(prevRatio);
  function stats(h) {
    let n = 0, sum = 0, dark = 0;
    for (let v = 0; v < 256; v++) { n += h[v]; sum += v * h[v]; if (v < 16) dark += h[v]; }
    const target = 0.05 * n;
    let acc = 0, p5 = 0;
    for (let v = 0; v < 256; v++) {
      const prev = acc; acc += h[v];
      if (acc >= target) { p5 = h[v] ? v - 0.5 + (target - prev) / h[v] : v; break; }
    }
    return { meanL: Math.round(sum / n * 10) / 10, p5L: Math.round(p5 * 10) / 10,
             pctPixelsBelowLuma16: Math.round(dark / n * 1000) / 10 };
  }
  return { pooled: stats(hist), per,
           lightmaps: window.__lightmaps, ambSampled: window.__ambSampled,
           issues: window.__issues, bakeMs: Math.round(window.__bakeMs),
           exposure: a.renderer.toneMappingExposure };
}

const browser = await launch();
const { page, errors } = await openTour(browser, BASE + '?apt=' + apt);
const yawOk = await page.evaluate(async () => {
  const raw = await (await fetch('apartments/' + window.APT.meta.id + '.json?probe=1')).json();
  return raw.spawns.every((s, i) => Math.abs(window.APT.spawns[i].yaw - s.yaw * Math.PI / 180) < 1e-9);
});
const r = await page.evaluate(RUN, expOverride);
// read outside RUN so RUN's body stays byte-identical to task 5's
const exposureBefore = await page.evaluate(() => window.__t7ExposureBefore);
const out = { label, apt, yawOk, errors, exposureOverride: expOverride, exposureBefore, ...r,
              contrast_mean_over_p5: Math.round(r.pooled.meanL / r.pooled.p5L * 1000) / 1000 };
const file = path.join(import.meta.dirname, 'spawnlum-' + label + '.json');
fs.writeFileSync(file, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ label, yawOk, errors: errors.length, ...out.pooled,
                             contrast: out.contrast_mean_over_p5,
                             ambSampled: r.ambSampled, issues: r.issues,
                             exposureBefore, exposure: r.exposure }));
console.log('wrote', file);
await browser.close();
