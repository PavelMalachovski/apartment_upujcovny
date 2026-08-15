// Task 7 step 4 -- look at the tours.
//
// Per apartment: one frame per spawns[] entry through the full post chain,
// plus the top-down floor cutaway rendered RAW (CLAUDE.md's recipe -- the
// vignette darkens exactly the corners hard rule 2b exists to inspect).
// This is task 5's frames.mjs with the output directory made an argument, so
// nothing lands inside a preserved harness folder.
//
// Then, on an apartment that has compare-flagged photo spots, it opens the
// render-vs-photograph divider (?compare=1 -> window.__compare(file)) on every
// one of them and screenshots the pane.  That view is the only instrument here
// that can see "correct colour in the wrong place", which is the defect class
// CIEDE2000 is blind to by construction -- a number can improve for a reason
// that looks wrong on screen, and this step is what catches it.
//
//   node look.mjs <apt> <out-dir>
import fs from 'node:fs';
import path from 'node:path';
import { launch, BASE, openTour } from '../2026-08-13-b3-task5/lib5.mjs';

const apt = process.argv[2] || 'serenity';
const outDir = process.argv[3];
if (!outDir) throw new Error('usage: node look.mjs <apt> <out-dir>');
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
  const b = new THREE.Box3().setFromObject(a.scene);
  const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
  a.doll.enter(); a.doll.setLevel('1'); a.doll.on = false;
  a.camera.position.set(cx, 30, cz + 0.01);
  a.camera.up.set(0, 0, -1);
  a.camera.lookAt(cx, 0, cz);
  a.renderer.render(a.scene, a.camera);
  ctx.drawImage(a.renderer.domElement, 0, 0, W, H);
  out.push({ name: 'top', png: cv.toDataURL('image/png') });
  return { out, issues: window.__issues, ambSampled: window.__ambSampled,
           exposure: a.renderer.toneMappingExposure };
}

const browser = await launch();
const { page, ctx, errors } = await openTour(browser, BASE + '?apt=' + apt);
const r = await page.evaluate(SHOTS);
for (const s of r.out) {
  fs.writeFileSync(path.join(outDir, s.name + '.png'), Buffer.from(s.png.split(',')[1], 'base64'));
}
console.log(JSON.stringify({ apt, frames: r.out.length, issues: r.issues,
                             ambSampled: r.ambSampled, exposure: r.exposure, errors }));
await ctx.close();

// ---- the render-vs-photograph divider, one screenshot per compare spot ----
// FRAMES_ONLY=1 stops here: used for the BASE (c2bb0bd) side of the visual
// A/B, where only the walked frames are wanted.
if (process.env.FRAMES_ONLY) { await browser.close(); process.exit(0); }
const cmp = await openTour(browser, BASE + '?apt=' + apt + '&compare=1',
                           { width: 1100, height: 700 });
await cmp.page.waitForFunction(() => typeof window.__compare === 'function', null, { timeout: 120000 });
const spots = await cmp.page.evaluate(() =>
  window.APT.photoSpots.filter((s) => s.compare)
    .map((s) => ({ file: s.file, name: s.name || '', poseVerified: s.poseVerified !== false })));
const paneRows = [];
for (const s of spots) {
  await cmp.page.evaluate((f) => window.__compare(f), s.file);
  // assert the pane really laid out: a zero-width photo box means the
  // divider is sliding over nothing and the screenshot proves nothing
  const geo = await cmp.page.evaluate(() => {
    const root = document.getElementById('cmpRoot');
    if (!root || root.style.display === 'none') return null;
    const p = root.querySelector('#cmpPhoto').getBoundingClientRect();
    const c = root.querySelector('#cmpRender').getBoundingClientRect();
    return { photo: [Math.round(p.width), Math.round(p.height)],
             render: [Math.round(c.width), Math.round(c.height)],
             clip: root.querySelector('#cmpPhoto').style.clipPath,
             label: (root.querySelector('#cmpLabel') || {}).textContent || '' };
  });
  const png = path.join(outDir, 'cmp_' + s.file.replace('.webp', '') + '.png');
  await cmp.page.screenshot({ path: png });
  paneRows.push({ ...s, ...geo });
}
console.log(JSON.stringify({ apt, comparePanes: paneRows.length,
                             laidOut: paneRows.filter((p) => p.photo && p.photo[0] > 0).length,
                             rows: paneRows, errors: cmp.errors }));
fs.writeFileSync(path.join(outDir, 'panes.json'), JSON.stringify(paneRows, null, 2));
await browser.close();
