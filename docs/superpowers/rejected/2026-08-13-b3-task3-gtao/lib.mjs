import { chromium } from 'playwright';

export const BASE = 'http://localhost:8742/';

// Headless Chromium's default GPU is SwiftShader, which post.js's capable()
// rejects -- without these flags the whole run silently measures with no post
// chain at all. Task 2 lost a baseline to exactly that.
export const GPU_ARGS = [
  '--use-angle=d3d11',
  '--enable-gpu',
  '--ignore-gpu-blocklist'
];

export async function launch() {
  return chromium.launch({ headless: true, args: GPU_ARGS });
}

export function attachConsole(page, sink) {
  page.on('console', (m) => {
    if (m.type() === 'error') sink.push('console.error: ' + m.text());
  });
  page.on('pageerror', (e) => sink.push('pageerror: ' + String(e && e.message)));
}

export async function openTour(browser, url, viewport = { width: 1280, height: 820 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  attachConsole(page, errors);
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => !!window.__bakeReady, null, { timeout: 120000 });
  await page.evaluate(() => window.__bakeReady, null);
  return { ctx, page, errors };
}
