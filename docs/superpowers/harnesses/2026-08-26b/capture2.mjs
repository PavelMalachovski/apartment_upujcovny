import { chromium } from 'playwright';
const APT = process.argv[2], PORT = process.argv[3] || '8742', EXTRA = process.argv[4] || '';
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
const errs=[]; page.on('pageerror', e=>errs.push(e.message));
await page.goto(`http://localhost:${PORT}/?apt=${APT}&measure=1${EXTRA}`, { waitUntil:'load', timeout: 1800000 });
await page.waitForFunction(() => !!window.__bakeReady, null, { timeout: 1800000 });
await page.evaluate(() => window.__bakeReady);
const info = await page.evaluate(() => ({ post: !!(window.__app.post && window.__app.post.enabled),
  issues: window.__issues.length, bakeMs: Math.round(window.__bakeMs) }));
const res = await page.evaluate(() => window.__measure());
console.log(APT, 'port', PORT, JSON.stringify(info), 'captured', res.length);
if (errs.length) console.log('ERRORS', errs.slice(0,3));
await browser.close();
