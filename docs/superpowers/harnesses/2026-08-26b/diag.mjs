import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true,
  args: ['--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'],
  executablePath: '/opt/pw-browsers/chromium' });
for (const apt of ['serenity','kings-court','horkyone-10']) {
  const ctx = await browser.newContext({ viewport: {width:1280,height:820} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await page.goto(`http://localhost:8742/?apt=${apt}&check=1`, { waitUntil:'load', timeout: 900000 });
  await page.waitForFunction(() => !!window.__bakeReady, null, { timeout: 900000 });
  await page.evaluate(() => window.__bakeReady);
  const r = await page.evaluate(() => window.__issues);
  console.log(apt.padEnd(13), JSON.stringify(r));
  if (errs.length) console.log('  errors:', errs.slice(0,3));
  await ctx.close();
}
await browser.close();
