# Phase B, plan 2 — an honest ruler, then a correct exposure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the resemblance metric measure what it claims to, then re-fit
exposure on all three apartments so the migrated tour is at least as close to
its photographs as the r128 build was — which is the condition on merging
`phaseB-migration`.

**Architecture:** A new `tour/compare.js` renders a photo spot beside its
photograph, first as an acceptance tool and later as a visitor feature. The
capture harness gains a per-photograph field of view and stops photographing
its own UI. Only then is exposure re-fitted — jointly with bloom, because the
two are coupled through the same buffer.

**Tech Stack:** Three.js 0.185.0, classic `WebGLRenderer`, ESM entry +
importmap, no bundler, no npm. Verification is browser-side plus the existing
Python scorers.

## Global Constraints

- Three.js **0.185.0** exactly. Classic `THREE.WebGLRenderer`. No WebGPU, no
  node/TSL.
- `builder.js`, `bake.js`, `controls.js`, `doll.js`, `validate.js`, `app.js`,
  `materials.js`, `post.js` stay classic scripts. Nothing converted to ESM.
- The JSON config is the single source of data. **No coordinates in code.**
- `window.__issues` empty under `?check=1` on all three apartments before
  every commit.
- Draw calls ≤400 desktop, ≤250 mobile. Current: 72 / 165 / 83.
- Everything in the repository is in English.
- The cache version lives on the single `<script type="module">` tag in
  `index.html`, currently **`?v=71`**, and `main.js` propagates it from
  `import.meta.url` to the config fetch, all eight classic scripts and every
  harness. Bump it **after** the last code edit of a task.
- **Fit bloom and exposure together.** They are coupled through the same
  buffer: exposure scales the radiances that bloom's threshold and strength
  act on. Fitting exposure alone drives its value to absorb bloom's domain
  error and the result describes neither. Recorded in
  `docs/superpowers/metrics/r128-reference.md`.
- **kings-court is no longer an unfitted control.** Plan 1's fix wave proved
  it: converting the direct-light π correctly made kings-court *worse* by
  0.89. Its light intensities are global constants authored under r128, so it
  always had a fit to break. Re-fit **both** measured apartments.
- No apartment JSON may be edited **except** the specific keys this plan
  adds or changes: `meta.photoFovLong`, `photoSpots[].vfov`,
  `photoSpots[].compare`, and `exposure`.

## Where plan 1 left things

Read `docs/superpowers/metrics/r128-reference.md` before starting — it is the
record of six r128→r185 mechanisms and two accepted residuals.

- Branch `phaseB-migration`, PR #27 **draft**, must not merge until this plan
  restores ΔE2000.
- serenity **16.58 → 17.12**, kings-court **22.44 → 22.09**, both measured
  with the harness's existing broken field of view.
- The bloom threshold was converted (0.92 → 1.294) but **`strength: 0.22` was
  not** and now adds up to ~3.4 where r128's added ≤0.22.
- `serenity.json` still carries `"exposure": 0.33`, untouched by plan 1.
  kings-court and horkyone-10 have never been fitted at all.

## File structure

| File | Responsibility |
|---|---|
| `tour/compare.js` | **New.** Renders a compare spot beside its photograph with a draggable divider. `?compare=1` acceptance mode; visitor control added in task 7 |
| `tour/measure.js` | Modified: derives `camera.fov` per photograph; hides markers during capture |
| `tour/refshots.js` | Modified: hides markers during capture, same helper |
| `tour/apartments/*.json` | `meta.photoFovLong`, `photoSpots[].vfov`, `exposure` |
| `docs/superpowers/metrics/README.md` | The trend break, the new zero, and one correction owed from phase A |

---

### Task 1: The compare view, acceptance mode

Built first because it is the instrument the next two tasks are calibrated
with, and the acceptance tool for every task after.

**Files:**
- Create: `tour/compare.js`
- Modify: `tour/main.js` (add `compare` to the harness-flag loop)

**Interfaces:**
- Consumes: `window.__app`, `window.__bakeReady`, `window.APT`.
- Produces: `window.__compare(file)` → renders that spot and returns
  `{file, w, h}`; `window.__compareAll()` → steps through every
  `compare`-flagged spot; a divider draggable with the mouse.

- [ ] **Step 1: Write the module**

```js
// ============================================================
// Render-versus-photograph comparison. Loaded under ?compare=1.
//
// Renders a photo spot from that photograph's own camera and lays
// the photograph over it behind a draggable divider. This is the
// only instrument that can see the defect class the DE2000 metric
// is blind to by construction: correct colour in the wrong place.
// It found the serenity living-room window during step 0.
// ============================================================

window.__compare = (function () {
  const a = window.__app;
  let ui = null;

  function build() {
    if (ui) return ui;
    const root = document.createElement('div');
    root.id = 'cmpRoot';
    root.style.cssText =
      'position:fixed;inset:0;z-index:99998;background:#111;display:none';
    root.innerHTML =
      '<img id="cmpPhoto" style="position:absolute;left:0;top:0;height:100%;' +
      'object-fit:cover;clip-path:inset(0 50% 0 0)">' +
      '<canvas id="cmpRender" style="position:absolute;left:0;top:0;height:100%"></canvas>' +
      '<div id="cmpBar" style="position:absolute;top:0;bottom:0;width:2px;' +
      'background:#fff;box-shadow:0 0 8px #000;cursor:ew-resize"></div>' +
      '<div id="cmpLabel" style="position:absolute;left:12px;top:12px;padding:6px 12px;' +
      'border-radius:14px;background:rgba(0,0,0,.7);color:#fff;' +
      'font:13px system-ui,sans-serif"></div>';
    document.body.appendChild(root);
    const bar = root.querySelector('#cmpBar');
    let dragging = false;
    const setSplit = (x) => {
      const r = root.getBoundingClientRect();
      const f = Math.min(Math.max((x - r.left) / r.width, 0), 1);
      root.querySelector('#cmpPhoto').style.clipPath =
        'inset(0 ' + ((1 - f) * 100).toFixed(2) + '% 0 0)';
      bar.style.left = (f * 100).toFixed(2) + '%';
    };
    bar.addEventListener('pointerdown', (e) => { dragging = true; e.preventDefault(); });
    window.addEventListener('pointerup', () => { dragging = false; });
    window.addEventListener('pointermove', (e) => { if (dragging) setSplit(e.clientX); });
    root.addEventListener('click', (e) => { if (e.target === root) setSplit(e.clientX); });
    ui = { root: root, setSplit: setSplit };
    setSplit(window.innerWidth / 2);
    return ui;
  }

  return async function compare(file) {
    const u = build();
    const s = APT.photoSpots.find((p) => p.file === file);
    if (!s) throw new Error('no photo spot for ' + file);
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('cannot load ' + s.file));
      i.src = APT.meta.photoBase + s.file;
    });
    const H = window.innerHeight;
    const W = Math.round(H * img.naturalWidth / img.naturalHeight);

    const c = a.controls;
    if (a.doll && a.doll.on) a.doll.exit();
    c.enabled = true;
    c.pos.x = s.x; c.pos.z = s.z; c.ground = s.g || 0;
    c.yaw = s.yaw; c.pitch = 0; c.keys = {};
    c.update(0.001);

    const prevRatio = a.renderer.getPixelRatio();
    const prevFov = a.camera.fov;
    a.renderer.setPixelRatio(1);
    a.renderer.setSize(W, H, false);
    a.camera.aspect = W / H;
    if (window.__spotFov) a.camera.fov = window.__spotFov(s, W / H);
    a.camera.updateProjectionMatrix();
    if (a.composer) { a.composer.setSize(W, H); a.composer.render(); }
    else a.renderer.render(a.scene, a.camera);

    const cv = u.root.querySelector('#cmpRender');
    cv.width = W; cv.height = H;
    cv.getContext('2d').drawImage(a.renderer.domElement, 0, 0, W, H);
    const ph = u.root.querySelector('#cmpPhoto');
    ph.src = img.src;
    ph.style.width = W + 'px';
    cv.style.width = W + 'px';
    u.root.querySelector('#cmpLabel').textContent =
      s.file + (s.name ? ' · ' + s.name : '') +
      ' · fov ' + a.camera.fov.toFixed(1) + '° · drag the bar';
    u.root.style.display = 'block';

    a.renderer.setPixelRatio(prevRatio);
    a.camera.fov = prevFov;
    return { file: s.file, w: W, h: H };
  };
})();

window.__compareAll = async function () {
  const files = APT.photoSpots.filter((s) => s.compare).map((s) => s.file);
  for (const f of files) {
    await window.__compare(f);
    await new Promise((r) => setTimeout(r, 1500));
  }
  return files;
};
```

`window.__spotFov` does not exist yet — task 3 defines it, and the guard above
means this module works before and after. That is deliberate: the compare view
must be usable to *calibrate* the field of view, which cannot happen if it
depends on the answer.

- [ ] **Step 2: Load it under `?compare=1`**

In `tour/main.js`, extend the existing harness-flag loop to include `compare`
alongside `measure` and `refshots`.

- [ ] **Step 3: Verify it renders and the divider moves**

At `http://localhost:8742/?apt=serenity&compare=1`:

```js
await window.__bakeReady;
await window.__compare('3.webp');
```

Expected: the living-room render fills the view with the photograph clipped to
the left half, and dragging the white bar sweeps between them. Take a
screenshot and look at it — this is a visual tool and a green console proves
nothing about it.

- [ ] **Step 4: Confirm it fails loudly on a bad file**

```js
await window.__compare('nope.webp').catch(e => console.log('OK:', e.message));
```

Expected: `OK: no photo spot for nope.webp`. A comparison tool that silently
shows a stale frame is worse than none.

- [ ] **Step 5: Commit**

```bash
git add tour/compare.js tour/main.js tour/index.html
git commit -m "Add the render-versus-photograph compare view as an acceptance tool"
```

---

### Task 2: Stop photographing our own UI

Photo-spot markers are drawn into the frames the metric scores, so they are
being counted as part of the room. Every phase A number carries this.

**Files:**
- Modify: `tour/measure.js`, `tour/refshots.js`

**Interfaces:**
- Produces: a shared pattern — hide `THREE.Points` markers for the duration of
  a capture, restore after.

- [ ] **Step 1: Find the marker objects**

They are `THREE.Points`, one object per level, created in `app.js` around line
307. Confirm what is in the scene before writing anything:

```js
await window.__bakeReady;
const found = [];
window.__app.scene.traverse(o => { if (o.isPoints) found.push({ name: o.name, visible: o.visible }); });
console.log(found);
```

Record the output in your report. If any marker object is **not** a `Points`,
the helper below misses it and you must widen the predicate.

- [ ] **Step 2: Add the helper to `measure.js`, above `renderAt`**

```js
  // Photo-spot markers are scene objects, so a capture photographs them and
  // the scorer counts them as part of the room. Hidden for the duration of
  // each capture and restored afterwards, including on the exception path.
  function withMarkersHidden(fn) {
    const hidden = [];
    a.scene.traverse((o) => {
      if (o.isPoints && o.visible) { o.visible = false; hidden.push(o); }
    });
    try { return fn(); }
    finally { for (const o of hidden) o.visible = true; }
  }
```

- [ ] **Step 3: Wrap the render in `renderAt`**

In `measure.js`'s `renderAt`, wrap the render-and-read block so the composer
render and the `drawImage` both happen inside `withMarkersHidden(...)`.

- [ ] **Step 4: Do the same in `refshots.js`'s `renderOne`**

Same helper, same placement. Keep the two copies rather than inventing a
shared module for eight lines — the two harnesses are independently loadable
and neither may depend on the other.

- [ ] **Step 5: Prove the markers are gone from a capture**

Capture one spot before and after, and count non-background pixels of the
marker's colour. Simpler and sufficient: capture with the change, then assert
no `Points` object was left invisible afterwards, and confirm visually.

```js
await window.__bakeReady;
await window.__measure();
const stillHidden = [];
window.__app.scene.traverse(o => { if (o.isPoints && !o.visible) stillHidden.push(o.name || 'points'); });
console.log('left hidden (must be empty):', stillHidden);
```

Then open `tools/shots/render_serenity_1.webp`-equivalent JPEG and confirm no
camera markers appear. State in the report that you looked.

- [ ] **Step 6: Commit**

```bash
git add tour/measure.js tour/refshots.js tour/index.html
git commit -m "Keep photo-spot markers out of the frames the metric scores"
```

---

### Task 3: A per-photograph field of view

The defect: `camera.fov` is fixed at 72° vertical and `measure.js` sets
`camera.aspect` per photograph but never touches `fov`. A 16:9 photograph is
scored against a **104.5°** horizontal render; the three portrait ones against
**55°**. Every cell of the 8×8 grid looks at a different part of the room from
the photograph's corresponding cell.

**Files:**
- Modify: `tour/measure.js`, `tour/main.js`
- Modify: `tour/apartments/serenity.json`, `kings-court.json` (`meta.photoFovLong`, and `photoSpots[].vfov` only where a spot genuinely differs)

**Interfaces:**
- Produces: `window.__spotFov(spot, aspect)` → vertical FOV in degrees, used
  by `measure.js` and by `compare.js`'s existing guard.

- [ ] **Step 1: Define the model**

One value per apartment, not per photograph. Every photograph of a flat almost
certainly came from one camera; portrait shots are that camera rotated. So the
config stores **the angle across the long edge of the frame**:

```json
"meta": { "photoFovLong": 73 }
```

For a landscape file that is the horizontal angle; for a portrait file, the
vertical one. A single spot may override with `"vfov": 58.7`, in vertical
degrees, for a photograph that was demonstrably taken differently.

- [ ] **Step 2: Implement the derivation in `main.js`, beside the degree conversion**

```js
  // Per-photograph field of view. The capture camera's fov was fixed at 72
  // vertical while only the aspect changed, so 16:9 photographs were scored
  // against a 104.5-degree horizontal render and portrait ones against 55.
  // meta.photoFovLong is the angle across the frame's LONG edge, one value
  // per apartment because one camera shot the set; per-spot vfov overrides.
  const DEG = Math.PI / 180;
  window.__spotFov = function (spot, aspect) {
    if (spot && typeof spot.vfov === 'number' && spot.vfov > 0) return spot.vfov;
    const long = cfg.meta && cfg.meta.photoFovLong;
    if (!(typeof long === 'number' && long > 0 && long < 179)) return 72;
    // landscape: long edge is horizontal, so convert to vertical through the
    // aspect. portrait: the long edge IS vertical, use it directly.
    if (aspect >= 1) {
      return 2 * Math.atan(Math.tan(long * DEG / 2) / aspect) / DEG;
    }
    return long;
  };
```

The `72` fallback is the current behaviour, so an apartment without the key
keeps scoring exactly as it does today rather than changing silently.

- [ ] **Step 3: Use it in `measure.js`**

In `renderAt`, after `a.camera.aspect = W / H;` and before
`updateProjectionMatrix()`:

```js
    const prevFov = a.camera.fov;
    if (window.__spotFov) a.camera.fov = window.__spotFov(spot, W / H);
```

and restore `a.camera.fov = prevFov;` beside the existing pixel-ratio restore.
`renderAt` currently takes `(spot, W, H)` — it already has the spot.

- [ ] **Step 4: Calibrate the value with the compare view**

This is measurement, not guessing. At
`?apt=serenity&compare=1`, pick a spot with long straight edges visible in
both images — a door jamb, a wall corner, a window reveal:

```js
await window.__bakeReady;
await window.__compare('5.webp');       // Kitchen & Hall: corridor, strong verticals
```

Then sweep the candidate value and watch where the edges land:

```js
for (const f of [65, 70, 73, 76, 80]) {
  APT.meta.photoFovLong = f;
  await window.__compare('5.webp');
  await new Promise(r => setTimeout(r, 1200));   // look at each one
}
```

Choose the value where vertical edges in the render sit on the same edges in
the photograph. Screenshot the chosen one and the two neighbours, and put all
three in your report — the choice must be visible to a reviewer, not asserted.

Repeat independently for kings-court. Do **not** assume the two flats share a
camera.

- [ ] **Step 5: Write the values into the configs**

Add `"photoFovLong": <chosen>` to `meta` in `serenity.json` and
`kings-court.json`. Add a per-spot `vfov` **only** where step 4 showed a spot
that cannot be reconciled with the apartment value; if none, add none.

- [ ] **Step 6: Keep the old behaviour reachable for exactly one measurement**

Task 4 needs to score both ways to bridge the trend. Add to `measure.js`,
where the fov is chosen:

```js
    // ?fov=legacy reproduces the pre-fix behaviour (fixed 72 vertical,
    // aspect-only) so task 4 can publish one bridging measurement against
    // the phase A numbers. Remove after that bridge is committed.
    const legacyFov = new URLSearchParams(location.search).get('fov') === 'legacy';
    if (!legacyFov && window.__spotFov) a.camera.fov = window.__spotFov(spot, W / H);
```

- [ ] **Step 7: Verify the derivation, both orientations**

```js
console.log('landscape 16:9 ->', window.__spotFov({}, 16 / 9).toFixed(1));
console.log('portrait 0.677 ->', window.__spotFov({}, 0.677).toFixed(1));
console.log('override wins  ->', window.__spotFov({ vfov: 40 }, 16 / 9));
```

Expected with `photoFovLong: 73`: landscape ≈ 45.7 vertical (i.e. 73
horizontal), portrait 73 vertical, override 40. If the portrait case returns
the same number as the landscape case, the orientation branch is wrong.

- [ ] **Step 8: Commit**

```bash
git add tour/measure.js tour/main.js tour/apartments/serenity.json \
        tour/apartments/kings-court.json tour/index.html
git commit -m "Score each photograph at its own field of view, not a fixed 72 vertical"
```

---

### Task 4: Re-baseline — the new zero, and the bridge

**Files:**
- Modify: `docs/superpowers/metrics/README.md`
- Create: metrics JSON via `delta_e.py --phase b2-newzero` and `--phase b2-legacy`

- [ ] **Step 1: Score both apartments in legacy mode**

```js
await window.__bakeReady; await window.__measure();
```
at `?apt=<id>&measure=1&fov=legacy`, then:

```bash
python tools/delta_e.py --apt serenity --phase b2-legacy
python tools/delta_e.py --apt kings-court --phase b2-legacy
```

This is comparable to plan 1's 17.12 / 22.09 — same ruler, minus the markers.
Any difference is the markers' contribution, which is itself worth recording.

- [ ] **Step 2: Score both in the fixed mode**

Same, without `&fov=legacy`, `--phase b2-newzero`. **These numbers are not
comparable to anything measured before them.**

- [ ] **Step 3: Write the trend break into `metrics/README.md`**

Add a section stating plainly: the harness's field of view was wrong from the
beginning; every number in the trend table above it was measured through it;
the series ends here and a new one starts. Give the four numbers from steps 1
and 2 side by side as the bridge. Do not restate the old series in new terms —
it cannot be converted, only ended.

- [ ] **Step 4: Pay a debt phase A left**

`docs/superpowers/metrics/README.md:142` says the bloom-crossing highlight
comes from "A chrome/metal fixture (`MeshStandardMaterial`, `metalness: 0.9`,
`roughness: 0.1`)". Verified against the source: `materials.js:384` gives
`M.chrome` **roughness 0.25**, and `materials.js:415` gives `M.smoke`
roughness 0.1, metalness 0.9 — the bathroom's backlit mirror panel. The cited
parameters are `M.smoke`'s. Correct the attribution; the conclusion is
unaffected.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/metrics/
git commit -m "Re-baseline against a correct field of view and end the phase A series"
```

---

### Task 5: Decide horkyone-10, explicitly

It has two photo spots and **none flagged `compare`**, so there is nothing to
score it against and nothing to fit an exposure to. Plan 1 left this open on
purpose. Letting it fall through the gaps is how a property ships over-exposed
for another whole phase.

**Files:**
- Modify: `tour/apartments/horkyone-10.json` (only if the decision is to flag)
- Modify: `docs/superpowers/metrics/README.md`

- [ ] **Step 1: Look at the two photographs and the spots they claim**

```js
await window.__bakeReady;
console.log(APT.photoSpots);
await window.__compare(APT.photoSpots[0].file);
```

- [ ] **Step 2: Decide, on what you saw**

Flag them `compare` **only if** the render and the photograph show the same
place from roughly the same position — a spot that cannot be reconciled adds
noise to the mean and buys nothing. If neither qualifies, the fallback is
observation A1's criterion: accept the apartment on mean sRGB luminance
landing within ±10 of the two fitted flats.

- [ ] **Step 3: Record the decision and its reason** in `metrics/README.md`,
including which option you took and why. A decision nobody can find is a
decision nobody made.

- [ ] **Step 4: Commit**

---

### Task 6: Clear the compensation, then fit exposure and bloom together

The task the whole plan exists for.

**Files:**
- Modify: `tour/apartments/serenity.json` (`exposure`), `kings-court.json`, `horkyone-10.json`
- Modify: `tour/post.js` (bloom `strength`, and `threshold` if the fit moves it)

- [ ] **Step 1: Clear `serenity.exposure` first**

Delete the `"exposure": 0.33` key from `serenity.json`. It is a compensation
fitted against r128's pipeline, and the migration changed lighting units, tone
mapping placement and colour management. Carrying it into a fit produces a fit
of a fit.

Confirm the fallback fires: `app.js` warns and uses 1.05 for anything that is
not a finite number > 0.

```js
await window.__bakeReady;
console.log(window.__app.renderer.toneMappingExposure);   // expect 1.05
```

- [ ] **Step 2: Disable bloom, so exposure is fitted against one variable**

Bloom adds up to ~3.4 to a pixel that r128's added ≤0.22 to. Fitting exposure
with that in the frame drives exposure to absorb it.

```js
const bloom = window.__app.composer.passes.find(p => p.constructor.name === 'UnrealBloomPass');
bloom.enabled = false;
```

- [ ] **Step 3: Fit exposure per apartment against its own photographs**

For each of serenity and kings-court, sweep exposure, capture, score:

```js
await window.__bakeReady;
const bloom = window.__app.composer.passes.find(p => p.constructor.name === 'UnrealBloomPass');
bloom.enabled = false;
for (const e of [0.6, 0.8, 1.0, 1.2, 1.4]) {
  window.__app.renderer.toneMappingExposure = e;
  await window.__measure();
  console.log('captured at exposure', e);   // score each between runs
}
```

Score each sweep point with `python tools/delta_e.py --apt <id> --phase b2-exp-<e>`
and also with `python tools/luminance.py --apt <id> --sets b2-exp-<e>`.

**Fit toward the physical target, report ΔE as a consequence** — the phase's
own rule. The target is the photographs' mean and 5th-percentile linear
luminance from `luminance.py`, not the lowest ΔE. A fit that minimises ΔE
while missing the luminance target is fitting toward the metric.

Then narrow: a second sweep of five points around the best, and take the value
where luminance matches. Record every point, not just the winner.

- [ ] **Step 4: Now set bloom's constants, with exposure fixed**

Re-enable bloom. The threshold (1.294) was derived for the pre-fit exposure
and the strength (0.22) has never been converted at all. With exposure now
settled, measure what fraction of the frame crosses the threshold:

```js
const a = window.__app, W = 480, H = 300;
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, colorSpace: THREE.NoColorSpace });
function overThreshold(x, z, yawDeg, g, thr) {
  const c = a.controls;
  c.enabled = true; c.pos.x = x; c.pos.z = z; c.ground = g || 0;
  c.yaw = yawDeg * Math.PI / 180; c.pitch = 0; c.keys = {}; c.update(0.001);
  a.camera.aspect = W / H; a.camera.updateProjectionMatrix();
  a.renderer.setRenderTarget(rt);
  a.renderer.render(a.scene, a.camera);
  const buf = new Float32Array(W * H * 4);
  a.renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
  a.renderer.setRenderTarget(null);
  let over = 0;
  for (let i = 0; i < buf.length; i += 4) {
    const L = 0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2];
    if (L > thr) over++;
  }
  return +(100 * over / (W * H)).toFixed(1);
}
console.log('entrance', overThreshold(3.6, 0.8, 180, 0, 1.294));
console.log('bathroom', overThreshold(2.7, 1.25, 55, 0, 1.294));
```

**Track the fraction over threshold, never the peak.** Plan 1 established that
the peak is a specular point highlight whose sampled maximum scales with
render-target size — 9.75 at 240×150 rising to 16.23 at 1280×800 — while the
fraction over threshold held at 21.4–21.5% across that whole range.

Target: bloom should behave as r128's did — a real highlight glint on specular
surfaces, not a wash. r128 measured **near-inert at 11 of 12 camera positions**
with one bathroom highlight crossing. Set threshold and strength so the
fraction over threshold is single-digit percent at most positions, then
**look at the frames** and confirm it reads as a glint.

- [ ] **Step 5: Fit horkyone-10 by whichever criterion task 5 decided**

- [ ] **Step 6: Write the values into the configs and `post.js`**

- [ ] **Step 7: Score the result, both apartments, in both harness modes**

```bash
python tools/delta_e.py --apt serenity --phase b2-final
python tools/delta_e.py --apt kings-court --phase b2-final
```

and the same with `&fov=legacy` as `--phase b2-final-legacy`. The legacy
numbers are what the merge condition is judged on, because they are the only
ones comparable to 16.58 and 22.44.

- [ ] **Step 8: Commit**

---

### Task 7: The visitor-facing compare control

Deliberately last of the feature work: a "compare with the photo" button is a
trust argument, and it is only worth making once the render is worth showing.

**Files:**
- Modify: `tour/compare.js`, `tour/app.js` (a control in the photo gallery)

- [ ] **Step 1: Add the control** to the existing photo overlay, shown only
  for spots with `compare: true`, opening the same divider view.

- [ ] **Step 2: Make it work on touch** — the divider already uses pointer
  events, so verify rather than rewrite. Test at a 375×812 viewport.

- [ ] **Step 3: Verify it degrades** — a spot without `compare`, and a
  photograph that 404s, must both leave the tour usable.

- [ ] **Step 4: Screenshot it on desktop and mobile widths, and commit**

---

### Task 8: The gate, and the merge decision

**Files:**
- Modify: `tour/index.html` (version bump, after the last code edit)

- [ ] **Step 1: Structural, all three apartments** — `window.__issues` empty
  under `?check=1`, no console errors, walk simulations, sky-leak raycasts,
  draw calls within ≤400.

- [ ] **Step 2: The merge condition, stated as a number**

serenity must reach **≤16.58** and kings-court **≤22.44**, measured with
`&fov=legacy` — the only mode comparable to those baselines. Report both, plus
the new-zero numbers, plus what changed.

- [ ] **Step 3: If the condition is not met, do not merge and say why.**

Report which apartment missed, by how much, and what you believe remains.
Shipping a worse-looking product because a plan said this was the last step is
the failure this whole gate exists to prevent.

- [ ] **Step 4: Look at the tours**

Walk all three, and step through `?compare=1` on both scored apartments. The
metric cannot see geometry; observation **B1** — serenity's living-room window
— is still unfixed and is plan 4's job, so expect to see it and do not chase
it here.

- [ ] **Step 5: Remove the `?fov=legacy` bridge** now that it has been used,
and say in the commit that it was removed on purpose.

- [ ] **Step 6: Bump `?v=`, verify the new code is served, commit, push**

- [ ] **Step 7: Update PR #27** with the new numbers, and un-draft it **only
if step 2 passed**. Otherwise leave it draft and say so in the PR.

---

## What this plan deliberately does not do

- The BVH sampler, the source fix in `lightAt`/`aoAt`, GTAO, offline
  path-traced lightmaps — **plan 3**.
- serenity's living-room geometry (B1), HDRI, GLTF furniture, PBR textures —
  **plan 4**.
- Re-validating every hand-tuned constant, and rewriting `CLAUDE.md` and
  `docs/PROMPT.md` — **plan 5**.
- `vercel.json`'s cache headers and the HTML entry point's `Cache-Control` —
  parked in plan 1, still parked.
