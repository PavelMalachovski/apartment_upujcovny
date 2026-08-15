// Task 6 blind A/B capture: six fixed poses on serenity, rendered through
// the full post chain, one PNG per pose. Run once with the offline lightmap
// pack on disk and once with it moved aside; pair.py randomises which side
// of each composite is which.
//
//   node capture.mjs <tag> <expected lightmaps status>
//     e.g. node capture.mjs packon  ok
//          node capture.mjs packoff missing
//
// Needs `python tools/serve.py` from the repo root and `playwright`
// resolvable (this repo has no npm install of its own -- see the README).
// Reuses task 5's lib5.mjs for the GPU flags: without
// --use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist headless Chromium
// runs SwiftShader, post.js's capable() rejects it, and the capture
// silently has no post chain.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HERE = import.meta.dirname;
const ROOT = path.resolve(HERE, '..', '..', '..', '..');
const { launch, BASE, openTour } = await import(
  pathToFileURL(path.join(ROOT, 'docs', 'superpowers', 'harnesses',
                          '2026-08-13-b3-task5', 'lib5.mjs')).href);

const tag = process.argv[2];
const expect = process.argv[3];
if (!tag || !expect) throw new Error('usage: node capture.mjs <tag> <expected-status>');

const OUT = path.join(HERE, 'frames', tag);
fs.mkdirSync(OUT, { recursive: true });

// Six poses, fixed BEFORE any frame was looked at and identical on both
// sides. Weighted toward where the pack can act at all: it lightmaps
// floors, ceilings and attic slopes only, gathers at 0.65 m, and task 5
// measured its one genuine fill signature at the Entrance. The outdoor
// Pool Terrace spawn is deliberately EXCLUDED -- it bakes with no gather,
// so including it would pad the set with a pair that cannot differ. This
// stacks the test in favour of visibility, which is the right way to
// stack it when a null result is the expected outcome.
const POSES = [
  { id: 1, name: 'entrance-spawn',      x: 3.6,  z: 0.8,  g: 0, yaw: 180, pitch: 0 },
  { id: 2, name: 'entrance-floor-down', x: 3.6,  z: 0.8,  g: 0, yaw: 180, pitch: -0.5 },
  { id: 3, name: 'bathroom-spawn',      x: 2.25, z: 0.9,  g: 0, yaw: 90,  pitch: 0 },
  { id: 4, name: 'bedroom-spawn',       x: 2.35, z: 3.2,  g: 0, yaw: 205, pitch: 0 },
  { id: 5, name: 'living-room-spawn',   x: 4.35, z: 4.95, g: 0, yaw: 180, pitch: 0 },
  { id: 6, name: 'kitchen-hall-spot5',  x: 4.7,  z: 2.55, g: 0, yaw: 12,  pitch: 0 }
];

const browser = await launch();
const { page, errors } = await openTour(browser, BASE + '?apt=serenity');
const r = await page.evaluate((poses) => {
  const a = window.__app, c = a.controls;
  if (!(a.post && a.post.enabled)) throw new Error('no post chain -- capture is void');
  const W = 900, H = 560;
  a.renderer.setPixelRatio(1);
  a.renderer.setSize(W, H, false);
  a.camera.aspect = W / H;
  a.camera.updateProjectionMatrix();
  a.post.setSize(W, H);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const out = [];
  c.enabled = true;
  for (const p of poses) {
    c.pos.x = p.x; c.pos.z = p.z; c.ground = p.g;
    c.yaw = p.yaw * Math.PI / 180; c.pitch = p.pitch;
    c.update(0.001);
    a.post.render(0);
    ctx.drawImage(a.renderer.domElement, 0, 0, W, H);
    out.push({ id: p.id, name: p.name, png: cv.toDataURL('image/png') });
  }
  return { out, lightmaps: window.__lightmaps, issues: window.__issues,
           ambSampled: window.__ambSampled, exposure: a.renderer.toneMappingExposure };
}, POSES);
await browser.close();

if (r.lightmaps.status !== expect) {
  throw new Error('expected lightmaps status "' + expect + '", got "' + r.lightmaps.status + '"');
}
for (const s of r.out) fs.writeFileSync(path.join(OUT, 'pose' + s.id + '.png'),
                                        Buffer.from(s.png.split(',')[1], 'base64'));
console.log(JSON.stringify({ tag, wrote: r.out.length, dir: OUT, lightmaps: r.lightmaps,
                             issues: r.issues, ambSampled: r.ambSampled,
                             exposure: r.exposure, errors }));
