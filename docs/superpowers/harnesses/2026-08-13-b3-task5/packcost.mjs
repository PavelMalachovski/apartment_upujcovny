// Where does the extra load time with a pack actually go? Reads the page's
// own Resource Timing entries for /lightmaps/ and reports each request's
// wall time, so the fetch cost can be separated from decode/upload and from
// the rest of Baker.run.
import { launch, BASE, openTour } from './lib5.mjs';

const browser = await launch();
const { page } = await openTour(browser, BASE + '?apt=serenity');
const r = await page.evaluate(() => {
  const es = performance.getEntriesByType('resource').filter((e) => e.name.includes('/lightmaps/'));
  const rows = es.map((e) => ({
    name: e.name.split('/').pop().split('?')[0],
    ms: Math.round(e.duration * 10) / 10,
    ttfb: Math.round((e.responseStart - e.startTime) * 10) / 10,
    bytes: e.transferSize
  }));
  return {
    bakeMs: Math.round(window.__bakeMs),
    n: rows.length,
    sumMs: Math.round(rows.reduce((s, x) => s + x.ms, 0)),
    wallMs: Math.round(Math.max(...es.map((e) => e.responseEnd)) - Math.min(...es.map((e) => e.startTime))),
    rows
  };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
