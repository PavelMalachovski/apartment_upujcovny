// kings-court's own geometry is not deterministic across loads (F.books sizes
// its spines with Math.random, among others), so a whole-scene hash cannot be
// an equality test there. The multiset of per-mesh (type, vertex count, index
// count) is deterministic -- randomness in this project varies positions and
// sizes, never topology -- so that is what BASE and HEAD are compared on.
import { chromium } from 'playwright';
const APT = process.argv[2];
const browser = await chromium.launch({ headless: true,
  args: ['--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'],
  executablePath: '/opt/pw-browsers/chromium' });
async function topo(port) {
  const ctx = await browser.newContext({ viewport: {width:1024,height:640} });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${port}/?apt=${APT}`, { waitUntil:'load', timeout: 900000 });
  await page.waitForFunction(() => !!window.__bakeReady, null, { timeout: 900000 });
  await page.evaluate(() => window.__bakeReady);
  const r = await page.evaluate(() => {
    const rows = [];
    window.__app.scene.traverse(o => {
      const g = o.geometry, p = g && g.attributes && g.attributes.position;
      if (!p) return;
      rows.push(`${o.type}|${o.material && o.material.type}|${p.count}|${g.index ? g.index.count : 0}`);
    });
    rows.sort();
    return rows;
  });
  await ctx.close();
  return r;
}
const a = await topo(8743), b = await topo(8742);
const key = (x) => JSON.stringify(x);
let same = key(a) === key(b);
console.log(APT, 'BASE meshes', a.length, 'HEAD meshes', b.length, '->', same ? 'TOPOLOGY IDENTICAL' : 'DIFFERS');
if (!same) {
  const ca = {}, cb = {};
  for (const r of a) ca[r] = (ca[r] || 0) + 1;
  for (const r of b) cb[r] = (cb[r] || 0) + 1;
  for (const k of new Set([...Object.keys(ca), ...Object.keys(cb)]))
    if ((ca[k] || 0) !== (cb[k] || 0)) console.log('  ', k, 'BASE', ca[k] || 0, 'HEAD', cb[k] || 0);
}
await browser.close();
