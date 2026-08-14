// Spawn-pooled sRGB luminance, exactly task 2's and task 3's measure:
// 480x300, full post chain, pixelRatio 1, pixels pooled across every spawn
// before the mean and the INTERPOLATED 5th percentile (task 3's stats(), so
// the value is a fraction like 79.2 rather than an integer bin).
//   node t5/spawnlum.mjs <label> [apt]
import fs from 'node:fs';
import path from 'node:path';
import { launch, BASE, openTour } from './lib5.mjs';

const label = process.argv[2] || 'run';
const apt = process.argv[3] || 'serenity';

function RUN() {
  const a = window.__app;
  if (!(a.post && a.post.enabled)) throw new Error('no post chain -- this measurement would be void');
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
// yaw sanity: the readback must equal the JSON degrees converted exactly once
const yawOk = await page.evaluate(async () => {
  const raw = await (await fetch('apartments/' + window.APT.meta.id + '.json?probe=1')).json();
  return raw.spawns.every((s, i) => Math.abs(window.APT.spawns[i].yaw - s.yaw * Math.PI / 180) < 1e-9);
});
const r = await page.evaluate(RUN);
const out = { label, apt, yawOk, errors, ...r,
              contrast_mean_over_p5: Math.round(r.pooled.meanL / r.pooled.p5L * 1000) / 1000 };
const file = path.join(import.meta.dirname, 'spawnlum-' + label + '.json');
fs.writeFileSync(file, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ label, yawOk, errors: errors.length, ...out.pooled,
                             contrast: out.contrast_mean_over_p5,
                             lightmaps: r.lightmaps && r.lightmaps.status,
                             issues: r.issues, bakeMs: r.bakeMs, exposure: r.exposure }));
console.log('wrote', file);
await browser.close();
