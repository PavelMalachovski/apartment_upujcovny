import { chromium } from 'playwright';
import fs from 'fs';
const [apt, port, x, z, yaw, out, w, h] = process.argv.slice(2);
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
await page.goto(`http://localhost:${port}/?apt=${apt}`, { waitUntil:'load', timeout: 900000 });
await page.waitForFunction(() => !!window.__bakeReady, null, { timeout: 900000 });
await page.evaluate(() => window.__bakeReady);
const png = await page.evaluate(([x,z,yaw,w,h]) => {
  const a = window.__app, c = a.controls;
  c.enabled = true; c.pos.x = +x; c.pos.z = +z; c.ground = 0; c.yaw = +yaw * Math.PI/180; c.pitch = 0; c.update(0.001);
  a.renderer.setPixelRatio(1); a.renderer.setSize(+w, +h, false);
  a.camera.aspect = +w / +h; a.camera.fov = 72; a.camera.updateProjectionMatrix();
  if (a.post && a.post.enabled) { a.post.setSize(+w, +h); a.post.render(0); }
  else a.renderer.render(a.scene, a.camera);
  const cv = document.createElement('canvas'); cv.width = +w; cv.height = +h;
  cv.getContext('2d').drawImage(a.renderer.domElement, 0, 0, +w, +h);
  return cv.toDataURL('image/png');
}, [x,z,yaw,w||'900',h||'600']);
fs.writeFileSync(out, Buffer.from(png.split(',')[1],'base64'));
console.log('wrote', out);
await browser.close();
