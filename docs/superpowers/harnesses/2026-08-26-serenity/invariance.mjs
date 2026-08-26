// BASE (port 8743, pre-change tree) vs HEAD (port 8742) rendered from the
// SAME camera in one browser session, so the comparison is not confounded by
// machine or driver differences. kings-court and horkyone-10 name none of the
// new opt-in constructors or keys, so any pixel difference beyond the scene's
// own load-to-load noise would be a regression in shared code.
import { chromium } from 'playwright';
import fs from 'fs';
const APT = process.argv[2];
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
  const info = await page.evaluate(() => {
    const a = window.__app, c = a.controls, s = APT.start;
    c.enabled = true; c.pos.x = s.x; c.pos.z = s.z; c.ground = 0; c.yaw = s.yaw; c.pitch = 0;
    c.update(0.001);
    a.renderer.setPixelRatio(1); a.renderer.setSize(1024, 640, false);
    a.camera.aspect = 1024/640; a.camera.updateProjectionMatrix();
    a.renderer.info.autoReset = false; a.renderer.info.reset();
    if (a.post && a.post.enabled) { a.post.setSize(1024,640); a.post.render(0); }
    else a.renderer.render(a.scene, a.camera);
    const calls = a.renderer.info.render.calls; a.renderer.info.autoReset = true;
    let lights = 0; a.scene.traverse(o => { if (o.isPointLight) lights++; });
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 640;
    cv.getContext('2d').drawImage(a.renderer.domElement, 0, 0, 1024, 640);
    return { png: cv.toDataURL('image/png'), calls, lights,
             issues: window.__issues.length, bakeMs: Math.round(window.__bakeMs) };
  });
  fs.writeFileSync(`.work/inv-${APT}-${tag}.png`, Buffer.from(info.png.split(',')[1], 'base64'));
  delete info.png;
  await ctx.close();
  return info;
}
// two loads of BASE first: that pair is the scene's own noise floor
const b1 = await shoot(8743, 'BASE1');
const b2 = await shoot(8743, 'BASE2');
const h1 = await shoot(8742, 'HEAD');
console.log(JSON.stringify({ apt: APT, BASE1: b1, BASE2: b2, HEAD: h1 }, null, 1));
await browser.close();
