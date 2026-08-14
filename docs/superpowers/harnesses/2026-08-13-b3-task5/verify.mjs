// The commit checklist for all three apartments, in one run:
//   Sampler.selfTest(), window.__issues, window.__ambSampled, the lightmap
//   pack's reported state, console errors, and draw calls through the post
//   chain on both the desktop and the mobile profile (CLAUDE.md's recipe:
//   info.autoReset off, reset by hand, post.render(0), read, restore).
// Draw calls are taken at CLAUDE.md's own spot for serenity (APT.start) and
// at spawns[0] otherwise, so the serenity number is comparable to the 69 the
// file records.
import { launch, BASE } from './lib5.mjs';

const APTS = process.argv[2] ? process.argv[2].split(',') : ['serenity', 'kings-court', 'horkyone-10'];

function CHECK() {
  const a = window.__app, c = a.controls;
  if (!(a.post && a.post.enabled)) throw new Error('no post chain -- measurement is void');
  const s = window.APT.start;
  c.enabled = true;
  c.pos.x = s.x; c.pos.z = s.z; c.ground = s.g || 0;
  c.yaw = s.yaw; c.pitch = 0; c.update(0.001);
  a.renderer.info.autoReset = false;
  a.renderer.info.reset();
  a.post.render(0);
  const calls = a.renderer.info.render.calls;
  a.renderer.info.autoReset = true;
  return {
    calls,
    dpr: a.renderer.getPixelRatio(),
    buffer: [a.renderer.domElement.width, a.renderer.domElement.height],
    selfTest: Sampler.selfTest(),
    issues: window.__issues,
    ambSampled: window.__ambSampled,
    lightmaps: window.__lightmaps,
    bakeMs: Math.round(window.__bakeMs),
    exposure: a.renderer.toneMappingExposure
  };
}

const browser = await launch();
let bad = 0;
for (const apt of APTS) {
  for (const [profile, viewport, dsf, mobile] of [
    ['desktop', { width: 1280, height: 820 }, 1, false],
    ['mobile', { width: 390, height: 844 }, 2, true]
  ]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: dsf, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage();
    const errors = [];
    const logs = [];
    // hard rule 3: the pack must be fetched with the page's own ?v=, or an
    // edited lightmap is served stale forever
    const packUrls = [];
    page.on('request', (rq) => { if (rq.url().includes('/lightmaps/')) packUrls.push(rq.url()); });
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
      if (m.text().startsWith('[sampler] selfTest')) logs.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e && e.message)));
    await page.goto(BASE + '?apt=' + apt + '&check=1', { waitUntil: 'load', timeout: 300000 });
    await page.waitForFunction(() => !!window.__bakeReady, null, { timeout: 300000 });
    await page.evaluate(() => window.__bakeReady);
    const r = await page.evaluate(CHECK);
    const budget = profile === 'mobile' ? 250 : 400;
    const ok = r.selfTest && r.ambSampled && r.issues.length === 0 &&
               errors.length === 0 && r.calls <= budget;
    if (!ok) bad++;
    const versioned = packUrls.length === 0 || packUrls.every((u) => /[?&]v=\d+/.test(u));
    console.log((ok && versioned ? 'PASS  ' : 'FAIL  ') +
      JSON.stringify({ apt, profile, ...r, budget, errors,
                       packRequests: packUrls.length, allVersioned: versioned,
                       sampleUrl: packUrls[0] || null }));
    for (const l of logs) console.log('      ' + l);
    await ctx.close();
  }
}
await browser.close();
console.log(bad ? bad + ' FAILING ROWS' : 'all rows pass');
