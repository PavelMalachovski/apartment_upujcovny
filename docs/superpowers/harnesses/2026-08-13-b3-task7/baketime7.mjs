// window.__bakeMs, BASE side and HEAD side, all three apartments, in one run,
// written to JSON so the reading can be re-derived rather than transcribed.
//
// Task 7 quotes NO bake-time claim, and this file is the evidence for why: on
// this hardware the within-side spread (first load pays cold shader compile and
// JIT, and the machine is running two servers plus the harness) is larger than
// any between-side difference, and two batches taken an hour apart disagree in
// sign.  Run it twice and compare `batches` if you want to see that for
// yourself.
//
//   node baketime7.mjs <loads> <baseUrl> <headUrl>
import fs from 'node:fs';
import path from 'node:path';
import { launch, openTour } from '../2026-08-13-b3-task5/lib5.mjs';

const loads = Number(process.argv[2] || 4);
const sides = { BASE: process.argv[3] || 'http://localhost:8743/',
                HEAD: process.argv[4] || 'http://localhost:8742/' };
const APTS = ['serenity', 'kings-court', 'horkyone-10'];

const browser = await launch();
const rows = [];
for (const apt of APTS) {
  for (const [side, url] of Object.entries(sides)) {
    const ms = [];
    let exposure = null, ambSampled = null;
    for (let i = 0; i < loads; i++) {
      const { ctx, page } = await openTour(browser, url + '?apt=' + apt);
      const r = await page.evaluate(() => ({ ms: window.__bakeMs,
                                             amb: window.__ambSampled,
                                             exp: window.__app.renderer.toneMappingExposure }));
      ms.push(Math.round(r.ms));
      ambSampled = r.amb; exposure = r.exp;
      await ctx.close();
    }
    const sorted = ms.slice().sort((a, b) => a - b);
    const warm = ms.slice(1);                       // drop the cold first load
    const warmSorted = warm.slice().sort((a, b) => a - b);
    rows.push({ apt, side, url, ambSampled, exposure, loads: ms,
                median: sorted[Math.floor(ms.length / 2)],
                warmMedian: warmSorted[Math.floor(warm.length / 2)],
                min: sorted[0], max: sorted[sorted.length - 1] });
    console.log(JSON.stringify(rows[rows.length - 1]));
  }
}
await browser.close();
const file = path.join(import.meta.dirname, 'baketime-t7.json');
const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { batches: [] };
prev.batches.push({ takenAt: new Date().toISOString(), loadsPerSide: loads, rows });
prev.reading = 'No bake-time claim is supportable from this data: within one '
  + 'side the spread reaches 3-5x (cold first load, and a machine running two '
  + 'servers plus the harness), and batches disagree in sign. Compare '
  + 'batches[i].rows against batches[j].rows for the same apt/side.';
fs.writeFileSync(file, JSON.stringify(prev, null, 2));
console.log('wrote', file, '-- batches now:', prev.batches.length);
