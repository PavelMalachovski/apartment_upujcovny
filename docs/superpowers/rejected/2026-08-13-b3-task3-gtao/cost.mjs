// Draw calls and frame time through the post chain, GTAO off vs on, in one
// page load so nothing but the pass differs. CLAUDE.md's recipe: info.autoReset
// off, reset by hand, render through post, read, restore.
import { launch, BASE } from './lib.mjs';

const APTS = process.argv[2] ? process.argv[2].split(',') : ['kings-court', 'serenity', 'horkyone-10'];
const SPAWN = Number(process.argv[3] || 0);

function MEASURE(opts) {
  const a = window.__app, c = a.controls;
  const gtao = a.composer.passes.find((p) => p.constructor.name === 'GTAOPass');
  gtao.enabled = opts.gtao;
  const s = window.APT.spawns[opts.spawn];
  c.enabled = true;
  c.pos.x = s.x; c.pos.z = s.z; c.ground = s.g || 0;
  c.yaw = s.yaw; c.pitch = 0; c.update(0.001);
  const post = !!(a.post && a.post.enabled);
  if (!post) throw new Error('no post chain -- measurement is void');
  a.renderer.info.autoReset = false;
  a.renderer.info.reset();
  a.post.render(0);
  const calls = a.renderer.info.render.calls;
  a.renderer.info.autoReset = true;
  const gl = a.renderer.getContext();
  for (let i = 0; i < 40; i++) a.post.render(i * 0.016);
  gl.finish();
  const runs = [];
  for (let r = 0; r < 3; r++) {
    const t0 = performance.now();
    for (let i = 0; i < 60; i++) a.post.render(i * 0.016);
    gl.finish();
    runs.push((performance.now() - t0) / 60);
  }
  runs.sort((x, y) => x - y);
  return { spawn: s.name, calls, ms: Math.round(runs[1] * 1000) / 1000,
           msRange: [Math.round(runs[0] * 100) / 100, Math.round(runs[2] * 100) / 100],
           size: [a.renderer.domElement.width, a.renderer.domElement.height] };
}

const browser = await launch();
for (const apt of APTS) {
  for (const [profile, viewport, dsf, mobile] of [
    ['desktop', { width: 1280, height: 820 }, 1, false],
    ['mobile', { width: 390, height: 844 }, 2, true]
  ]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: dsf, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage();
    await page.goto(BASE + '?apt=' + apt, { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => !!window.__bakeReady, null, { timeout: 180000 });
    await page.evaluate(() => window.__bakeReady);
    const off = await page.evaluate(MEASURE, { gtao: false, spawn: SPAWN });
    const on = await page.evaluate(MEASURE, { gtao: true, spawn: SPAWN });
    const dpr = await page.evaluate(() => window.__app.renderer.getPixelRatio());
    console.log(JSON.stringify({ apt, profile, dpr, spawn: off.spawn, buffer: on.size,
      callsOff: off.calls, callsOn: on.calls, dCalls: on.calls - off.calls,
      msOff: off.ms, msOn: on.ms, msOffRange: off.msRange, msOnRange: on.msRange }));
    await ctx.close();
  }
}
await browser.close();
