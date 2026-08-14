// Visual check (hard rule 1): one frame per spawn through the post chain,
// plus the top-down floor cutaway rendered RAW (CLAUDE.md's recipe -- the
// vignette darkens exactly the corners that shot exists to inspect).
//   node frames.mjs <tag> [apt]
import fs from 'node:fs';
import path from 'node:path';
import { launch, BASE, openTour } from './lib5.mjs';

const tag = process.argv[2] || 'frames';
const apt = process.argv[3] || 'serenity';
const outDir = path.join(import.meta.dirname, 'frames', tag);
fs.mkdirSync(outDir, { recursive: true });

function SHOTS() {
  const a = window.__app, c = a.controls;
  const W = 900, H = 560;
  a.renderer.setPixelRatio(1);
  a.renderer.setSize(W, H, false);
  a.camera.aspect = W / H;
  a.camera.updateProjectionMatrix();
  a.composer.setSize(W, H);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const out = [];
  c.enabled = true;
  window.APT.spawns.forEach((s, i) => {
    c.pos.x = s.x; c.pos.z = s.z; c.ground = s.g || 0;
    c.yaw = s.yaw; c.pitch = 0; c.update(0.001);
    a.post.render(0);
    ctx.drawImage(a.renderer.domElement, 0, 0, W, H);
    out.push({ name: String(i).padStart(2, '0') + '_' + s.name.replace(/[^a-z0-9]+/gi, '-'),
               png: cv.toDataURL('image/png') });
  });
  // top-down, raw render, floor cutaway
  const b = new THREE.Box3().setFromObject(a.scene);
  const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
  a.doll.enter(); a.doll.setLevel('1'); a.doll.on = false;
  a.camera.position.set(cx, 30, cz + 0.01);
  a.camera.up.set(0, 0, -1);
  a.camera.lookAt(cx, 0, cz);
  a.renderer.render(a.scene, a.camera);
  ctx.drawImage(a.renderer.domElement, 0, 0, W, H);
  out.push({ name: 'top', png: cv.toDataURL('image/png') });
  return { out, lightmaps: window.__lightmaps, issues: window.__issues };
}

const browser = await launch();
const { page, errors } = await openTour(browser, BASE + '?apt=' + apt);
const r = await page.evaluate(SHOTS);
for (const s of r.out) {
  fs.writeFileSync(path.join(outDir, s.name + '.png'), Buffer.from(s.png.split(',')[1], 'base64'));
}
console.log(JSON.stringify({ tag, apt, wrote: r.out.length, dir: outDir,
                             lightmaps: r.lightmaps, issues: r.issues, errors }));
await browser.close();
