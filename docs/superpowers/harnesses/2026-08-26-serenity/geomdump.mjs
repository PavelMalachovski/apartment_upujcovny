// Deterministic structural fingerprint of a built scene. Every procedural
// texture in this project draws with Math.random(), so a pixel comparison of
// two loads never repeats -- geometry does. If BASE and HEAD agree here, any
// pixel difference between them is that texture noise and nothing else.
import { chromium } from 'playwright';
const APT = process.argv[2], PORT = process.argv[3];
const browser = await chromium.launch({ headless: true,
  args: ['--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'],
  executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: {width:1024,height:640}, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(`http://localhost:${PORT}/?apt=${APT}`, { waitUntil:'load', timeout: 900000 });
await page.waitForFunction(() => !!window.__bakeReady, null, { timeout: 900000 });
await page.evaluate(() => window.__bakeReady);
const out = await page.evaluate(() => {
  const a = window.__app;
  const rows = [];
  a.scene.traverse(o => {
    if (!o.isMesh && !o.isPoints) return;
    const g = o.geometry;
    const p = g && g.attributes && g.attributes.position;
    if (!p) return;
    g.computeBoundingBox();
    const bb = g.boundingBox;
    o.updateWorldMatrix(true, false);
    const w = o.matrixWorld.elements.map(v => Math.round(v * 1e4) / 1e4).join(',');
    rows.push([o.type, p.count, g.index ? g.index.count : 0,
      [bb.min.x, bb.min.y, bb.min.z, bb.max.x, bb.max.y, bb.max.z]
        .map(v => Math.round(v * 1e4) / 1e4).join(','), w].join('|'));
  });
  rows.sort();
  // cheap stable hash of the sorted rows
  let h1 = 0x811c9dc5;
  const s = rows.join('\n');
  for (let i = 0; i < s.length; i++) { h1 ^= s.charCodeAt(i); h1 = Math.imul(h1, 0x01000193) >>> 0; }
  let verts = 0; for (const r of rows) verts += Number(r.split('|')[1]);
  return { meshes: rows.length, verts, hash: h1.toString(16), sample: rows.length };
});
console.log(APT, PORT, JSON.stringify(out));
await browser.close();
