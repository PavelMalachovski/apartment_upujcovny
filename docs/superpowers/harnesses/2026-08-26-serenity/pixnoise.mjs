import { chromium } from 'playwright';
import fs from 'fs';
const APT = process.argv[2], N = Number(process.argv[3] || 3);
const browser = await chromium.launch({ headless: true,
  args: ['--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'],
  executablePath: '/opt/pw-browsers/chromium' });
async function shoot(port, tag) {
  const ctx = await browser.newContext({ viewport: {width:1280,height:820}, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const patch = (p) => { if(!p) return; const o=p.getParameter;
      p.getParameter=function(x){ if(x===0x9246) return 'ANGLE (NVIDIA, GeForce RTX 3060, OpenGL 4.6)';
        if(x===0x9245) return 'NVIDIA Corporation'; return o.call(this,x); }; };
    patch(window.WebGLRenderingContext && WebGLRenderingContext.prototype);
    patch(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
  });
  await page.goto(`http://localhost:${port}/?apt=${APT}`, { waitUntil:'load', timeout: 900000 });
  await page.waitForFunction(() => !!window.__bakeReady, null, { timeout: 900000 });
  await page.evaluate(() => window.__bakeReady);
  const png = await page.evaluate(() => {
    const a = window.__app, c = a.controls, s = APT.start;
    c.enabled = true; c.pos.x = s.x; c.pos.z = s.z; c.ground = 0; c.yaw = s.yaw; c.pitch = 0; c.update(0.001);
    a.renderer.setPixelRatio(1); a.renderer.setSize(1024, 640, false);
    a.camera.aspect = 1024/640; a.camera.updateProjectionMatrix();
    if (a.post && a.post.enabled) { a.post.setSize(1024,640); a.post.render(0); }
    else a.renderer.render(a.scene, a.camera);
    const cv = document.createElement('canvas'); cv.width=1024; cv.height=640;
    cv.getContext('2d').drawImage(a.renderer.domElement, 0, 0, 1024, 640);
    return cv.toDataURL('image/png');
  });
  fs.writeFileSync(`.work/px-${APT}-${tag}.png`, Buffer.from(png.split(',')[1],'base64'));
  await ctx.close();
}
for (let i=0;i<N;i++) { await shoot(8743, `B${i}`); await shoot(8742, `H${i}`); }
console.log('captured', N, 'pairs for', APT);
await browser.close();
