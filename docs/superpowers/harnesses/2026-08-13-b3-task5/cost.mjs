// What the pack actually replaces, measured inside ONE page load so machine
// drift between loads cannot flip the sign:
//   texelLoopMs  -- re-running Baker.bakeSurface() at the runtime's own
//                   settings for every lightmapped surface, i.e. exactly the
//                   work a loaded pack skips
//   packFetchMs  -- the wall time of the /lightmaps/ requests this load made
//   bakeMs       -- window.__bakeMs, the whole of Baker.run
import { launch, BASE, openTour } from './lib5.mjs';

const browser = await launch();
const { page } = await openTour(browser, BASE + '?apt=serenity');
const r = await page.evaluate(() => {
  const data = Builder.bakeData;
  const t0 = performance.now();
  for (const s of data.surfaces) Baker.bakeSurface(s, data);
  const texelLoopMs = performance.now() - t0;
  const es = performance.getEntriesByType('resource').filter((e) => e.name.includes('/lightmaps/'));
  const packFetchMs = es.length
    ? Math.max(...es.map((e) => e.responseEnd)) - Math.min(...es.map((e) => e.startTime))
    : 0;
  return {
    surfaces: data.surfaces.length,
    texelLoopMs: Math.round(texelLoopMs),
    packRequests: es.length,
    packFetchMs: Math.round(packFetchMs),
    bakeMs: Math.round(window.__bakeMs),
    lightmaps: window.__lightmaps.status
  };
});
console.log(JSON.stringify(r));
await browser.close();
