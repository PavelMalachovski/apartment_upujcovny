// window.__bakeMs, BASE side and HEAD side, all three apartments, in one run,
// written to JSON so the reading can be re-derived rather than transcribed.
//
// Task 7 quotes ONE bake-time claim from this file and refuses two.  On
// kings-court the two sides' raw loads are disjoint in every batch, so ~3x is
// supportable.  On serenity and horkyone-10 they are not: the first load of a
// batch pays cold shader compile and JIT, the host is not a controlled
// environment, and the committed batches disagree with each other by up to 3x
// on the same figure.  Run it again and compare `batches` before quoting
// anything.
//
// Both committed batches are IDLE-machine batches, taken about five minutes
// apart.  Loaded-machine runs were taken earlier in the session, disagreed in
// sign with these, and are deliberately NOT committed -- they were ad-hoc
// invocations of task 5's baketime.mjs, not this script, so they cannot be
// re-derived and are not cited as evidence anywhere.
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
prev.reading = 'Read this per apartment, not as one verdict. KINGS-COURT: a '
  + 'claim IS supportable -- its raw loads are disjoint between the two sides '
  + 'in every batch here (BASE 3006-5548 ms against HEAD 8031-23431 ms), about '
  + '3x. SERENITY and HORKYONE-10: no claim. Their ranges overlap and the '
  + 'batches disagree with each other by up to 3x on the same figure '
  + '(serenity HEAD warmMedian 1077 then 3163, no code change between), '
  + 'because the first load of a batch pays cold shader compile and JIT and '
  + 'the host is not a controlled environment. Compare batches[i].rows against '
  + 'batches[j].rows for the same apt/side before quoting anything.';
fs.writeFileSync(file, JSON.stringify(prev, null, 2));
console.log('wrote', file, '-- batches now:', prev.batches.length);
