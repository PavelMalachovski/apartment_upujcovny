// Task 7 step 1 -- the structural gate, all three apartments, both budgets.
//
// Per apartment x {desktop, mobile}:  window.__issues, window.__ambSampled,
// Sampler.selfTest(), console errors/pageerrors, bake ms, exposure, and draw
// calls through the post chain (CLAUDE.md's recipe: info.autoReset off, reset
// by hand, post.render(0), read, restore) at BOTH established spots --
// APT.start (CLAUDE.md's own "serenity entrance: 69") and spawns[0] (plan 3
// task 3's cost table).  The naive a.renderer.render() figure is taken too,
// because CLAUDE.md's 144 kings-court number and the r128 baseline were both
// measured that way and the two must never be confused.
//
// Desktop pass only, once per apartment:
//   * sky-leak raycast straight up from every spawns[] entry, WITH PHOTO-SPOT
//     MARKERS HIDDEN -- an unhidden THREE.Points marker sits ~0.3 m above a
//     spawn and returns a false hit before the ray reaches the ceiling
//     (plan 2 task 9 caught exactly that in its own first draft).
//   * the standing walk-simulation routes.  kings-court's two are regression
//     routes with recorded end coordinates in
//     docs/superpowers/metrics/r128-reference.md ("Task 7" block); serenity
//     and horkyone-10 have no precedent route, so they walk from APT.start /
//     spawns[0] as sanity runs.
//
// Yaw trap: window.APT.*.yaw is ALREADY radians -- main.js converts the JSON
// degrees on load.  Only the route constants below are degrees, and they are
// converted exactly once, at the point of use.
//
//   node structural.mjs [apt,apt,...]
import fs from 'node:fs';
import path from 'node:path';
import { launch, BASE } from '../2026-08-13-b3-task5/lib5.mjs';

const APTS = process.argv[2] ? process.argv[2].split(',')
                             : ['serenity', 'kings-court', 'horkyone-10'];

// Regression routes: [label, x, z, ground, yawDegrees, ticks, dt, precedent]
const ROUTES = {
  'kings-court': [
    ['Entry hall westbound', 22.6, 5, 0, 90, 180, 0.033, 'x 13.14, ground 0'],
    ['Upper hall westbound', 13.6, 0.9, 3.1, 90, 180, 0.033, 'x 4.44, ground 3.1']
  ],
  serenity: [
    ['Start southbound', 3.6, 0.75, 0, 178, 180, 0.033, 'x 3.24, z 2.13 (plan 2 task 9)']
  ],
  'horkyone-10': [
    ['Living room northbound', 7.75, 5.85, 0, 0, 180, 0.033, 'x 7.75, z 1.26 (plan 2 task 9)']
  ]
};

function CHECK(spotName) {
  const a = window.__app, c = a.controls;
  if (!(a.post && a.post.enabled)) throw new Error('no post chain -- measurement is void');
  c.enabled = true;
  function at(p) {
    c.pos.x = p.x; c.pos.z = p.z; c.ground = p.g || 0;
    c.yaw = p.yaw; c.pitch = 0; c.update(0.001);
    a.renderer.info.autoReset = false;
    a.renderer.info.reset();
    a.renderer.render(a.scene, a.camera);
    const naive = a.renderer.info.render.calls;
    a.renderer.info.reset();
    a.post.render(0);
    const chain = a.renderer.info.render.calls;
    a.renderer.info.autoReset = true;
    return { naive, chain };
  }
  return {
    callsStart: at(window.APT.start),
    callsSpawn0: at(window.APT.spawns[0]),
    spawn0: window.APT.spawns[0].name,
    dpr: a.renderer.getPixelRatio(),
    buffer: [a.renderer.domElement.width, a.renderer.domElement.height],
    selfTest: Sampler.selfTest(),
    issues: window.__issues,
    ambSampled: window.__ambSampled,
    bakeMs: Math.round(window.__bakeMs),
    exposure: a.renderer.toneMappingExposure,
    spotName
  };
}

// Straight up from every spawn, photo-spot markers hidden first.
function SKY() {
  const a = window.__app;
  const hidden = [];
  a.scene.traverse((o) => { if (o.isPoints && o.visible) { o.visible = false; hidden.push(o); } });
  const rc = new THREE.Raycaster();
  rc.camera = a.camera;                       // required, or sprites throw
  const out = [];
  try {
    for (const s of window.APT.spawns) {
      const y = (s.g || 0) + 1.6;             // eye height
      rc.set(new THREE.Vector3(s.x, y, s.z), new THREE.Vector3(0, 1, 0));
      const hits = rc.intersectObjects(a.scene.children, true)
                     .filter((h) => h.object.type !== 'Points');
      out.push(hits.length
        ? { spawn: s.name, hit: hits[0].object.type, dist: Math.round(hits[0].distance * 100) / 100 }
        : { spawn: s.name, hit: 'NOTHING ABOVE', dist: null });
    }
  } finally { for (const o of hidden) o.visible = true; }
  return out;
}

function WALK(routes) {
  const c = window.__app.controls;
  const out = [];
  for (const [label, x, z, g, yawDeg, ticks, dt, precedent] of routes) {
    c.enabled = true;
    c.pos.x = x; c.pos.z = z; c.ground = g;
    c.yaw = yawDeg * Math.PI / 180;           // routes are degrees, converted ONCE
    c.pitch = 0;
    c.keys = { KeyW: true };
    for (let i = 0; i < ticks; i++) c.update(dt);
    c.keys = {};
    out.push({ route: label, from: [x, z, g], precedent,
               to: [Math.round(c.pos.x * 100) / 100, Math.round(c.pos.z * 100) / 100, c.ground],
               moved: Math.round(Math.hypot(c.pos.x - x, c.pos.z - z) * 100) / 100,
               finite: Number.isFinite(c.pos.x) && Number.isFinite(c.pos.z) });
  }
  return out;
}

const browser = await launch();
const rows = [];
let bad = 0;
for (const apt of APTS) {
  for (const [profile, viewport, dsf, mobile] of [
    ['desktop', { width: 1280, height: 820 }, 1, false],
    ['mobile', { width: 390, height: 844 }, 2, true]
  ]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: dsf,
                                           isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage();
    const errors = [], warns = [], logs = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
      if (m.type() === 'warning') warns.push(m.text());
      if (m.text().startsWith('[sampler] selfTest')) logs.push(m.text());
    });
    page.on('pageerror', (e) => errors.push('pageerror: ' + String(e && e.message)));
    await page.goto(BASE + '?apt=' + apt + '&check=1', { waitUntil: 'load', timeout: 300000 });
    await page.waitForFunction(() => !!window.__bakeReady, null, { timeout: 300000 });
    await page.evaluate(() => window.__bakeReady);
    const r = await page.evaluate(CHECK, profile);
    const budget = profile === 'mobile' ? 250 : 400;
    if (profile === 'desktop') {
      r.sky = await page.evaluate(SKY);
      r.walk = await page.evaluate(WALK, ROUTES[apt] || []);
    }
    const ok = r.selfTest && r.ambSampled === true && r.issues.length === 0 &&
               errors.length === 0 &&
               r.callsStart.chain <= budget && r.callsSpawn0.chain <= budget;
    if (!ok) bad++;
    rows.push({ apt, profile, budget, ok, errors, warns, selfTestLog: logs, ...r });
    console.log((ok ? 'PASS  ' : 'FAIL  ') + JSON.stringify({
      apt, profile, budget, callsStart: r.callsStart, callsSpawn0: r.callsSpawn0,
      dpr: r.dpr, buffer: r.buffer, selfTest: r.selfTest, ambSampled: r.ambSampled,
      issues: r.issues, bakeMs: r.bakeMs, exposure: r.exposure,
      errors: errors.length, warns: warns.length
    }));
    for (const l of logs) console.log('      ' + l);
    if (r.sky) console.log('      sky: ' + JSON.stringify(r.sky));
    if (r.walk) console.log('      walk: ' + JSON.stringify(r.walk));
    await ctx.close();
  }
}
await browser.close();
const file = path.join(import.meta.dirname, 'structural.json');
fs.writeFileSync(file, JSON.stringify({ base: BASE, rows }, null, 2));
console.log('wrote', file);
console.log(bad ? bad + ' FAILING ROWS' : 'all rows pass');
