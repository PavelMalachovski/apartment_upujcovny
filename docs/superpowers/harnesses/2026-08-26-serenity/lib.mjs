import { chromium } from 'playwright';

export const BASE = process.env.TOUR_BASE || 'http://localhost:8742/';
export const GPU_ARGS = ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist',
                         '--enable-unsafe-swiftshader'];

export async function launch() {
  return chromium.launch({ headless: true, args: GPU_ARGS, executablePath: '/opt/pw-browsers/chromium' });
}

export async function openTour(browser, url, viewport = { width: 1280, height: 820 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [], warns = [], logs = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console.error: ' + m.text());
    else if (m.type() === 'warning') warns.push(m.text());
    else logs.push(m.text());
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e && e.message)));
  await page.goto(url, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction(() => !!window.__bakeReady, null, { timeout: 300000 });
  await page.evaluate(() => window.__bakeReady);
  return { ctx, page, errors, warns, logs };
}
