// Dumps what a hand-made manifest needs: the config hash, the surface list,
// and the state the loader reported.
import { launch, BASE, openTour } from './lib5.mjs';

const apt = process.argv[2] || 'serenity';
const browser = await launch();
const { page, errors, warns } = await openTour(browser, BASE + '?apt=' + apt + '&check=1');

const out = await page.evaluate(async () => {
  const surfaces = Builder.bakeData.surfaces.map((s, i) => {
    s.mesh.updateMatrixWorld(true);
    const p = s.mesh.position;
    return {
      i, w: s.w, h: s.h, res: s.res, lvl: s.lvl, outdoor: !!s.outdoor,
      pos: [p.x, p.y, p.z],
      px: [Math.max(4, Math.round(s.w * s.res)), Math.max(4, Math.round(s.h * s.res))],
      lightMapClass: s.mesh.material.lightMap ? s.mesh.material.lightMap.constructor.name : null
    };
  });
  return {
    hash: await Lightmaps.hash(window.APT),
    hashInputLen: Lightmaps.hashInput(window.APT).length,
    lightmaps: window.__lightmaps,
    issues: window.__issues,
    ambSampled: window.__ambSampled,
    bakeMs: Math.round(window.__bakeMs),
    surfaces
  };
});
console.log(JSON.stringify({ ...out, errors, warns }, null, 2));
await browser.close();
