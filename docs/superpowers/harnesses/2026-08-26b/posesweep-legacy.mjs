// Render one photo spot from a list of candidate poses, at that photograph's
// own aspect and fov, straight to disk. No scoring: the poses are judged by
// looking at them beside the photograph, which is the only method this
// repository accepts for camera work.
import { chromium } from 'playwright';
import fs from 'fs';
const FILE = process.argv[2];                       // e.g. 1.webp
const CANDS = JSON.parse(process.argv[3]);          // [[x,z,yawDeg,pitchDeg,tag], ...]
const browser = await chromium.launch({ headless: true,
  args: ['--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'],
  executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: {width:1280,height:820}, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.addInitScript(() => {
  const patch = (p) => { if(!p) return; const o=p.getParameter;
    p.getParameter=function(v){ if(v===0x9246) return 'ANGLE (NVIDIA, GeForce RTX 3060, OpenGL 4.6)';
      if(v===0x9245) return 'NVIDIA Corporation'; return o.call(this,v); }; };
  patch(window.WebGLRenderingContext && WebGLRenderingContext.prototype);
  patch(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
});
await page.goto('http://localhost:8742/?apt=serenity&measure=1', { waitUntil:'load', timeout: 900000 });
await page.waitForFunction(() => !!window.__bakeReady, null, { timeout: 900000 });
await page.evaluate(() => window.__bakeReady);
for (const [x, z, yaw, pitch, tag] of CANDS) {
  const png = await page.evaluate(async ([file, x, z, yaw, pitch]) => {
    const a = window.__app, c = a.controls;
    const spot = APT.photoSpots.find(s => s.file === file);
    const img = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej;
      i.src = APT.meta.photoBase + file;
    });
    const W = 1024, H = Math.round(W * img.naturalHeight / img.naturalWidth);
    const hidden = []; a.scene.traverse(o => { if (o.isPoints && o.visible) { o.visible = false; hidden.push(o); } });
    c.enabled = true; c.pos.x = x; c.pos.z = z; c.ground = spot.g || 0;
    c.yaw = yaw * Math.PI / 180; c.pitch = -pitch * Math.PI / 180;
    c.update(0.001);
    a.renderer.setPixelRatio(1); a.renderer.setSize(W, H, false);
    a.camera.aspect = W / H;
    a.camera.fov = 72;   // legacy gate camera
    a.camera.updateProjectionMatrix();
    if (a.composer) { a.composer.setSize(W, H); a.composer.render(); }
    else a.renderer.render(a.scene, a.camera);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    cv.getContext('2d').drawImage(a.renderer.domElement, 0, 0, W, H);
    for (const o of hidden) o.visible = true;
    return cv.toDataURL('image/jpeg', 0.92);
  }, [FILE, x, z, yaw, pitch]);
  fs.writeFileSync(`.work/pose-${FILE.replace('.webp','')}-${tag}.jpg`, Buffer.from(png.split(',')[1],'base64'));
  console.log('wrote', tag, x, z, yaw, pitch);
}
await browser.close();
