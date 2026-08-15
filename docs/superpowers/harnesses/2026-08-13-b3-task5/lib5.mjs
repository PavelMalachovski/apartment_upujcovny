// Launcher for task 5's harnesses. Same GPU flags and same wait-for-bake
// handshake as docs/superpowers/rejected/2026-08-13-b3-task3-gtao/lib.mjs --
// headless Chromium's default GPU is SwiftShader, which post.js's capable()
// rejects, and without these flags a run silently measures with no post chain.
import { chromium } from 'playwright';

export const BASE = process.env.TOUR_BASE || 'http://localhost:8742/';
export const GPU_ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];

export async function launch() {
  return chromium.launch({ headless: true, args: GPU_ARGS });
}

export async function openTour(browser, url, viewport = { width: 1280, height: 820 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  const warns = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console.error: ' + m.text());
    if (m.type() === 'warning') warns.push(m.text());
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e && e.message)));
  await page.goto(url, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction(() => !!window.__bakeReady, null, { timeout: 300000 });
  await page.evaluate(() => window.__bakeReady);
  return { ctx, page, errors, warns };
}
