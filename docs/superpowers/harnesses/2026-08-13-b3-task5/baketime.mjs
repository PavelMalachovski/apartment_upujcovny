// window.__bakeMs over N fresh page loads, one browser, one context per load.
// With a pack this number covers the manifest fetch, the hash, the texture
// loads and the wall/furniture passes that still run -- i.e. everything
// between initApp and a lit scene, which is what it has always covered.
//   node baketime.mjs <label> [apt] [loads]
import { launch, BASE, openTour } from './lib5.mjs';

const label = process.argv[2] || 'run';
const apt = process.argv[3] || 'serenity';
const loads = Number(process.argv[4] || 3);

const browser = await launch();
const ms = [];
let state = null;
for (let i = 0; i < loads; i++) {
  const { ctx, page } = await openTour(browser, BASE + '?apt=' + apt);
  const r = await page.evaluate(() => ({ ms: window.__bakeMs, lm: window.__lightmaps }));
  ms.push(Math.round(r.ms));
  state = r.lm && r.lm.status;
  await ctx.close();
}
await browser.close();
const sorted = ms.slice().sort((a, b) => a - b);
console.log(JSON.stringify({ label, apt, lightmaps: state, loads: ms,
                             median: sorted[Math.floor(loads / 2)] }));
