// Resemblance/luminance capture: opens ?apt=<apt>&measure=1&fov=legacy, waits
// for the bake, asserts the post chain is live and that the lightmap pack is
// in the state the caller expects, then runs window.__measure() and moves the
// frames into tools/shots/<label>/.
//   node shots.mjs <label> <expected lightmaps status> [apt]
import fs from 'node:fs';
import path from 'node:path';
import { launch, BASE, openTour } from './lib5.mjs';

const label = process.argv[2];
const expect = process.argv[3];              // 'off' | 'missing' | 'ok' | 'any'
const apt = process.argv[4] || 'serenity';
if (!label || !expect) throw new Error('usage: node shots.mjs <label> <expected-status> [apt]');

const SHOTS = path.resolve(import.meta.dirname, '..', '..', '..', '..', 'tools', 'shots');
const dest = path.join(SHOTS, label);
fs.rmSync(dest, { recursive: true, force: true });
for (const f of fs.readdirSync(SHOTS)) {
  if (f.startsWith('render_' + apt + '_')) fs.rmSync(path.join(SHOTS, f));   // no stale frames
}

const browser = await launch();
const { page, errors } = await openTour(browser, BASE + '?apt=' + apt + '&measure=1&fov=legacy');
await page.waitForFunction(() => typeof window.__measure === 'function', null, { timeout: 120000 });
const state = await page.evaluate(() => {
  const a = window.__app;
  if (!(a.post && a.post.enabled)) throw new Error('no post chain -- capture is void');
  return {
    lightmaps: window.__lightmaps, issues: window.__issues, ambSampled: window.__ambSampled,
    exposure: a.renderer.toneMappingExposure,
    legacyFov: new URLSearchParams(location.search).get('fov'),
    v: (document.querySelector('script[type=module]').getAttribute('src') || '').split('v=')[1]
  };
});
if (expect !== 'any' && state.lightmaps.status !== expect) {
  throw new Error('expected lightmaps status "' + expect + '", got "' + state.lightmaps.status + '"');
}
const shots = await page.evaluate(() => window.__measure());
await browser.close();

fs.mkdirSync(dest, { recursive: true });
let moved = 0;
for (const f of fs.readdirSync(SHOTS)) {
  if (f.startsWith('render_' + apt + '_') && f.endsWith('.jpg')) {
    // copy, not move: tools/luminance.py reads tools/shots/<label>/ while
    // tools/delta_e.py reads tools/shots/ itself, so both need a copy and
    // the next capture clears the root ones anyway.
    fs.copyFileSync(path.join(SHOTS, f), path.join(dest, f));
    moved++;
  }
}
console.log(JSON.stringify({ label, apt, captured: shots.length, moved, ...state, errors }));
if (moved !== shots.length) throw new Error('capture/disk mismatch: ' + shots.length + ' reported, ' + moved + ' on disk');
