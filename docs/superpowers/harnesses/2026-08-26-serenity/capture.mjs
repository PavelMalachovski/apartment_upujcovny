import { chromium } from 'playwright';
const APT = process.argv[2] || 'serenity';
const EXTRA = process.argv[3] || '';   // e.g. '&fov=legacy'
const browser = await chromium.launch({ headless: true,
  args: ['--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'],
  executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: {width:1280,height:820}, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.addInitScript(() => {
  const patch = (proto) => { if (!proto) return; const orig = proto.getParameter;
    proto.getParameter = function (p) {
      if (p === 0x9246) return 'ANGLE (NVIDIA, GeForce RTX 3060, OpenGL 4.6)';
      if (p === 0x9245) return 'NVIDIA Corporation';
      return orig.call(this, p); }; };
  patch(window.WebGLRenderingContext && WebGLRenderingContext.prototype);
  patch(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
});
const errors = [];
page.on('pageerror', e => errors.push(String(e && e.message)));
page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
const url = `http://localhost:8742/?apt=${APT}&measure=1${EXTRA}`;
await page.goto(url, { waitUntil:'load', timeout: 600000 });
await page.waitForFunction(() => !!window.__bakeReady, null, { timeout: 600000 });
await page.evaluate(() => window.__bakeReady);
const info = await page.evaluate(() => ({ post: !!(window.__app.post && window.__app.post.enabled),
  issues: window.__issues.length, bakeMs: Math.round(window.__bakeMs) }));
console.log('loaded', url, JSON.stringify(info));
const res = await page.evaluate(() => window.__measure());
console.log('captured', res.length, 'spots');
if (errors.length) console.log('ERRORS', errors.slice(0,5));
await browser.close();
