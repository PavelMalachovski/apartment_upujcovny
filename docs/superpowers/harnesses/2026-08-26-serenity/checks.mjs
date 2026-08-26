import { chromium } from 'playwright';
import fs from 'fs';
const browser = await chromium.launch({ headless: true,
  args: ['--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'],
  executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: {width:1280,height:820}, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.addInitScript(() => {
  const patch = (p) => { if(!p) return; const o=p.getParameter;
    p.getParameter=function(x){ if(x===0x9246) return 'ANGLE (NVIDIA, GeForce RTX 3060, OpenGL 4.6)';
      if(x===0x9245) return 'NVIDIA Corporation'; return o.call(this,x); }; };
  patch(window.WebGLRenderingContext && WebGLRenderingContext.prototype);
  patch(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
});
await page.goto('http://localhost:8742/?apt=serenity&check=1', { waitUntil:'load', timeout: 900000 });
await page.waitForFunction(() => !!window.__bakeReady, null, { timeout: 900000 });
await page.evaluate(() => window.__bakeReady);

const res = await page.evaluate(() => {
  const a = window.__app, c = a.controls;
  const out = { issues: window.__issues, bakeMs: Math.round(window.__bakeMs),
                ambSampled: window.__ambSampled, post: !!(a.post && a.post.enabled) };

  // draw calls at serenity's own start position (CLAUDE.md recipe)
  const s = APT.start;
  c.enabled = true; c.pos.x = s.x; c.pos.z = s.z; c.ground = 0; c.yaw = s.yaw; c.pitch = 0; c.update(0.001);
  a.renderer.info.autoReset = false; a.renderer.info.reset();
  if (a.post && a.post.enabled) a.post.render(0); else a.renderer.render(a.scene, a.camera);
  out.drawCalls = a.renderer.info.render.calls;
  a.renderer.info.autoReset = true;
  let pl = 0; a.scene.traverse(o => { if (o.isPointLight) pl++; });
  out.pointLights = pl;

  // hard rule 2a: walk each documented route and report where it ends
  const walk = (name, x, z, g, yawDeg, steps) => {
    c.enabled = true; c.pos.x = x; c.pos.z = z; c.ground = g;
    c.yaw = yawDeg * Math.PI / 180; c.pitch = 0;
    c.keys = { KeyW: true };
    for (let i = 0; i < steps; i++) c.update(0.033);
    c.keys = {};
    return { name, from: [x, z], to: [+c.pos.x.toFixed(2), +c.pos.z.toFixed(2)], ground: c.ground };
  };
  out.walks = [
    walk('entrance -> living (south)', 4.45, 0.95, 0, 180, 150),
    walk('living -> terrace (south)', 4.10, 4.20, 0, 180, 150),
    walk('terrace -> deck edge (south)', 4.10, 5.60, -0.05, 180, 120),
    walk('hall -> bedroom (west)', 4.00, 2.10, 0, 90, 150),
    walk('bedroom -> window (south)', 2.40, 3.00, 0, 180, 150),
    walk('hall -> bathroom (west)', 3.60, 1.05, 0, 90, 150),
    walk('bedroom -> bathroom (north)', 2.00, 2.40, 0, 0, 150),
  ];
  return out;
});
console.log(JSON.stringify(res, null, 1));

// hard rule 2b: top-down cutaway, raw render (no post -- vignette hides corners)
const shot = await page.evaluate(() => {
  const a = window.__app;
  a.doll.enter(); a.doll.setLevel('1'); a.doll.on = false;
  a.renderer.setPixelRatio(1); a.renderer.setSize(1100, 1100, false);
  a.camera.aspect = 1; a.camera.fov = 45;
  a.camera.position.set(2.9, 24, 3.4);
  a.camera.up.set(0, 0, -1);
  a.camera.lookAt(2.9, 0, 3.4);
  a.camera.updateProjectionMatrix();
  a.renderer.render(a.scene, a.camera);
  const cv = document.createElement('canvas'); cv.width = 1100; cv.height = 1100;
  cv.getContext('2d').drawImage(a.renderer.domElement, 0, 0, 1100, 1100);
  return cv.toDataURL('image/png');
});
fs.writeFileSync('.work/topdown.png', Buffer.from(shot.split(',')[1], 'base64'));
console.log('top-down written');
await browser.close();
