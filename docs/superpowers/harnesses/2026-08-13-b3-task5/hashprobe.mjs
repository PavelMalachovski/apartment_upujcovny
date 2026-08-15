// Proves what the manifest hash does and does not depend on: mutate one key
// at a time on a deep copy of the live config and re-hash. Excluded keys must
// leave the hash untouched; included ones must move it. A key that is
// supposed to be excluded but moves the hash fails here, and so does a key
// that is supposed to be included but does not.
import { launch, BASE, openTour } from './lib5.mjs';

const browser = await launch();
const { page } = await openTour(browser, BASE + '?apt=serenity');

const out = await page.evaluate(async () => {
  const base = await Lightmaps.hash(window.APT);
  const clone = () => JSON.parse(JSON.stringify(window.APT));
  const rows = [];
  const probe = async (label, expect, mutate) => {
    const c = clone();
    mutate(c);
    const h = await Lightmaps.hash(c);
    const moved = h !== base;
    rows.push({ label, expect, moved, ok: (expect === 'moves') === moved });
  };

  // --- must NOT move the hash (the brief's exclusions) ---
  await probe('roomLabels[0].name renamed', 'holds', (c) => { c.roomLabels[0].name = 'Renamed Room'; });
  await probe('photoSpots[0] moved 1 m', 'holds', (c) => { c.photoSpots[0].x += 1; });
  await probe('spawns[0] moved 1 m', 'holds', (c) => { c.spawns[0].x += 1; });
  await probe('areas[0].m2 changed', 'holds', (c) => { c.areas[0].m2 = 999; });
  await probe('meta.title changed', 'holds', (c) => { c.meta.title = 'Other'; });
  await probe('exposure changed', 'holds', (c) => { c.exposure = 1.05; });
  await probe('palette.wall changed', 'holds', (c) => { c.palette.wall = '#123456'; });
  await probe('start.yaw changed', 'holds', (c) => { c.start.yaw += 1; });
  await probe('key order reversed', 'holds', (c) => {
    const r = {}; for (const k of Object.keys(c).reverse()) r[k] = c[k];
    for (const k of Object.keys(c)) delete c[k];
    Object.assign(c, r);
  });

  // --- must move the hash ---
  await probe('walls[0].x2 +0.01', 'moves', (c) => { c.walls[0].x2 += 0.01; });
  await probe('an opening widened 1 cm', 'moves', (c) => {
    for (const w of c.walls) if (w.openings && w.openings.length) { w.openings[0].w += 0.01; return; }
  });
  await probe('floors.main[0].x2 +0.01', 'moves', (c) => { c.floors.main[0].x2 += 0.01; });
  await probe('mainCeil[0].z2 +0.01', 'moves', (c) => { c.mainCeil[0].z2 += 0.01; });
  await probe('furniture[0] moved 1 cm', 'moves', (c) => { c.furniture[0].x += 0.01; });
  await probe('furniture[0] rotated 1 deg', 'moves', (c) => { c.furniture[0].rot = (c.furniture[0].rot || 0) + Math.PI / 180; });
  await probe('lights[0] moved 1 cm', 'moves', (c) => { c.lights[0].x += 0.01; });
  await probe('lights: one removed', 'moves', (c) => { c.lights.pop(); });
  await probe('groundZones[0].x2 +0.01', 'moves', (c) => { c.groundZones[0].x2 += 0.01; });
  await probe('roomCenter.main moved', 'moves', (c) => { c.roomCenter.main.x += 0.5; });
  await probe('mainCeilH +0.01', 'moves', (c) => { c.mainCeilH += 0.01; });
  await probe('surroundings[0] moved', 'moves', (c) => { c.surroundings[0].x1 += 0.01; });

  return { base, rows, failed: rows.filter((r) => !r.ok) };
});

for (const r of out.rows) {
  console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + (r.moved ? 'moved ' : 'held  ') +
              ' (expected to ' + r.expect + ')  ' + r.label);
}
console.log('base hash', out.base);
console.log(out.failed.length ? 'FAILURES: ' + out.failed.length : 'all ' + out.rows.length + ' probes as specified');
await browser.close();
