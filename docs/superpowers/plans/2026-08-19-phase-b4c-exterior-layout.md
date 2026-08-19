# Phase B plan 4c — exterior, layout, and the last two content defects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the three things the photographs show and the model does not — serenity's pool and sky, serenity's real furniture layout, and kings-court's un-mirrored Bathroom 2 with its divider glass — then re-fit serenity's exposure for the render that results.

**Architecture:** Content work with a thin additive code layer. New `F.*` constructors and one new optional config key (`sky`); new optional arguments on `F.shower`. No change to `bake.js`, `post.js`, `sampler.js`, or any existing shading path. Every object goes through a constructor so it merges and gets a bake occluder like the rest of the scene.

**Tech Stack:** Vanilla ES modules, no bundler, no build step. Three.js r185 vendored under `tour/lib/three-0.185.0/`. Python 3 for `tools/serve.py`, `tools/delta_e.py`, `tools/luminance.py`.

**Spec:** `docs/superpowers/specs/2026-08-19-phase-b4c-exterior-layout-design.md`. **Read it before task 1** — it records why 4c was split again, and which plan-5 row this plan takes back.

## Global Constraints

- **The photographs are the ground truth, and every coordinate is derived from one.** Write the derivation into your task report where a reviewer can check it: which photograph, which feature, which pixel ratio, which resulting metre. Numbers quoted in this plan from plan 4b's prose are **starting points to re-derive, never values to apply**. This project has already had a "~2.9–3.2 m" band survive three documents before anyone noticed both its routes rested on one photograph.
- **Never fit toward ΔE.** Poses point at the photograph's subject; exposure fits toward luminance. Record ΔE for every candidate and choose none of them by it.
- **Gate readings are `--all-spots`.** serenity scores **11**, kings-court **13**. Every metrics file must carry `population: all-spot`, `scored == compareTotal`, `skippedPoseVerification: 0`.
- **Name the apartment, the task, the side (BASE/AFTER) and the population in every metrics filename.** `delta_e.py` writes no camera field; the filename is the only record. This project's sharpest failure entered through a filename.
- **Live baselines entering this plan**, measured by plan 4b task 5 at `5963ddd`, two readings each: **serenity 15.50 / 15.48** (11 spots), **kings-court 17.58 / 17.59** (13 spots). serenity's worst spots are `10.webp` 25.38, `1.webp` 19.03, `2.webp` 18.10, `9.webp` 17.77.
- **Movement past the noise floor must be attributed by a same-session paired A/B or it fails.** serenity's floor is ~0.03 (0.08–0.09 per spot); kings-court's is ~0.35 per spot and unsettled — plan 5 owns settling it. Hard stop: nothing worse by more than 0.5 in one task without an explanation you would defend to a reviewer.
- **This plan CAN legitimately move the metric the wrong way, and that is not automatically a revert.** `metrics/README.md` states outright that a change moving this metric by 0.05 is not evidence the render got worse. Adding real sky and real water to two frames that today show flat bands changes them enormously; the number may go either way. Explain and attribute; do not tune toward the number.
- **`window.__issues` must be empty on all three apartments before every commit.** Load `?apt=serenity&check=1`, `?apt=kings-court&check=1`, `?apt=horkyone-10&check=1`.
- **Cache:** bump `?v=N` on the single module tag in `tour/index.html` (currently **`?v=122`**, line 254) **after** the last edit of a task. JSON counts. Without the bump your config edits never reach the browser — a bug that has cost this project an hour.
- **Start `python tools/serve.py` with the sandbox disabled.** Its `POST /save/` returns HTTP 200 and silently writes nothing when sandboxed. Probe for the file on disk before trusting a capture.
- **Furniture must clear doorways by ≥ 0.5 m** (CLAUDE.md rule 2a — passages have been blocked five times). **Furniture against a wall is placed by raycasting the wall face, never by arithmetic from the centreline** (rule 2h — that arithmetic buried two headboards *inside* a wall, and every automated check stayed green because a hidden object is still perfectly walkable).
- **After any furniture move, take the top-down cutaway** (rule 2b) — one frame catches blocked passages, furniture rotated across a room and objects floating in mid-air. Use the raw-render recipe in `CLAUDE.md`, not the post chain; the vignette darkens exactly the corners that shot exists to inspect.
- **Reshaping the ground outside the terrace needs a sky-leak check** (rule 2c): raycast in five directions from the new zone, and set `rc.camera` first or sprites throw.
- **`poseVerified` flips to `true` only when render and photograph show the same subject.** It is never a score threshold, and flipping it is a **product** change: `app.js`'s `compareEligible` uses it to decide whether a visitor is offered the render-versus-photograph view. Only flip it where you would be content for a visitor to open it.
- **The compare divider is opened from the console, not by a URL parameter.** `?compare=1` does not exist. Its button is gated on `poseVerified !== false`, i.e. gated *against* every spot this plan needs to look at. Load `compare.js` by hand and call `window.__compare(file)`, which finds the spot by filename and does not check `poseVerified` — recipe in task 1 step 3.
- Angles in apartment JSON are **degrees**. Yaw 0 looks north (−z), 90 west, 180 south, 270 east. Camera right-hand direction is `cross(forward, up)`.
- **Harness frames:** `.gitignore` carries `*.jpg` and `*.JPG` and the match is case-insensitive here, so a `.jpg` frame outside `docs/superpowers/harnesses/**` is dropped by `git add` **with no error**. Save harness evidence under that directory and `git status` it before claiming it was filed.
- Commit your own files explicitly. **Never `git add -A`.**
- Draw calls must stay inside **≤400 desktop / ≤250 mobile**, measured **through the post chain** with `info.autoReset = false` — the naive recipe under-reports by about 14. serenity's entrance measures 72 today.

## File structure

| File | Responsibility in this plan |
|---|---|
| `tour/apartments/serenity.json` | Pool/planting/fence `surroundings`, new `sky` key, terrace furniture nudges (task 1); living-room and bedroom layout (task 2); `exposure` (task 4); `poseVerified` flips (tasks 1, 2) |
| `tour/apartments/kings-court.json` | Bathroom 2 layout and `poseVerified` (task 3) |
| `tour/builder.js` | New `F.poolEdge`, `F.plantMass`, `F.slatFence` constructors and their `OCC_H` entries (task 1); `F.shower` optional divider / valve / handheld (task 3) |
| `tour/app.js` | `sky` key read, gradient background, fog kept in step (task 1) |
| `tour/materials.js` | New material entries the constructors need (tasks 1, 3). Existing palette entries are **not** touched |
| `tour/index.html` | `?v=` bump after each task: 123, 124, 125, 126, 127 |
| `docs/superpowers/harnesses/2026-08-19-b4c/` | Created: before/after compare frames and cutaways per touched spot. Evidence, not scratch |
| `docs/superpowers/metrics/*.json` | Created: gate readings per task |
| `docs/PHASE-B-RESUME.md`, `docs/superpowers/metrics/README.md`, `CLAUDE.md` | Updated in task 5 |

---

### Task 1: serenity's exterior — pool, planting, fence, sky

**Files:**
- Modify: `tour/apartments/serenity.json` — `surroundings`, new `sky` key, `photoSpots[1]` and `photoSpots[9]`
- Modify: `tour/builder.js` — new `F.poolEdge`, `F.plantMass`, `F.slatFence`; `OCC_H` entries
- Modify: `tour/materials.js` — pool and planting materials
- Modify: `tour/app.js` — `sky` key read
- Modify: `tour/index.html:254` — `?v=` 122 → 123
- Create: `docs/superpowers/harnesses/2026-08-19-b4c/pool-{2,10}-{before,after}.webp`
- Create: `docs/superpowers/metrics/serenity-b4c-task1-{BEFORE,AFTER}-legacy-allspots.json`

**Interfaces:**
- Produces: `F.poolEdge(o, g)`, `F.plantMass(o, g)`, `F.slatFence(o, g)` — the standard constructor signature, returning `{w, d}` (or `{noCollide: true}`), placed from `furniture[]` entries with `lvl: "terrace"`. `sky` config key: `{top: "#rrggbb", bottom: "#rrggbb", fog: "#rrggbb"}`, every field optional. Task 4 re-fits `exposure` against the render this task produces; task 5 measures it.

- [ ] **Step 1: Record the starting state, in numbers, before touching anything**

```bash
python -c "import json; d=json.load(open('tour/apartments/serenity.json')); print(json.dumps(d['surroundings'], indent=1)); print('spots 2,10:', json.dumps([d['photoSpots'][1], d['photoSpots'][9]], indent=1))"
grep -n 'scene.background\|scene.fog' tour/app.js
```

Expected today: seven `surroundings` boxes — a `stone` slab at z 8.3, a `water` slab 0.1 m thick at z 11.2, three `hedge` slabs, two `bldg2` blocks; `scene.background = new THREE.Color(0xbcd5e8)` and `scene.fog = new THREE.Fog(0xbcd5e8, 40, 90)` at `tour/app.js:106-107`. The terrace floor is `x 3.03–5.82, z 5.32–7.65` at `terraceY -0.05`.

- [ ] **Step 2: Take the BEFORE reading and the BEFORE frames**

```bash
python tools/serve.py
```

Open `http://localhost:8742/?apt=serenity&measure=1`, then:

```js
await window.__bakeReady;
await window.__measure();
```

```bash
python tools/delta_e.py --apt serenity --phase b4c-task1-BEFORE-legacy-allspots --all-spots
```

Confirm `mean` lands in **15.48–15.50** and `scored: 11`. If it does not, stop — your tree is not at the branch point and every pairing below is void.

- [ ] **Step 3: Capture the two failing frames side by side with their photographs**

The compare button will not offer these spots. Load the divider by hand, mirroring `app.js`:

```js
await window.__bakeReady;
if (!window.__compare) await new Promise((res, rej) => {
  const v = new URL(document.querySelector('script[src*="main.js"]').src).searchParams.get('v');
  const el = document.createElement('script');
  el.src = 'compare.js?v=' + v; el.onload = res; el.onerror = rej;
  document.head.appendChild(el);
});
await window.__compare('2.webp');
```

Screenshot, then repeat for `10.webp`. File both under `docs/superpowers/harnesses/2026-08-19-b4c/` as `pool-2-before.webp` and `pool-10-before.webp`, then:

```bash
git status docs/superpowers/harnesses/2026-08-19-b4c/
```

Confirm both are listed. A frame that is not listed was silently swallowed by `.gitignore` and is not evidence.

- [ ] **Step 4: Derive the pool's real geometry from `2.webp` and `10.webp`**

Do this before writing any config. Both photographs are in `tour/photos/serenity/`.

What each frame gives you:

- `10.webp` — the pool fills the lower ~two thirds. Its far edge, the raised planting island with its low kerb, the dense planting behind, the white slatted boundary fence, and roughly the top 15% of real sky. Use the **coping course** (the stone band at the water's edge, visible along the near and far sides) to fix the water level below coping: measure the coping band's thickness in pixels against a known vertical, not by eye.
- `2.webp` — the terrace looking down and west. The pool's coping and water at the left edge give you the pool's **near edge relative to the terrace**, which is the number that actually decides whether a camera at the terrace sees water or hedge. The building's white column mid-frame is a fixed reference of known width (`WALL_TH` 0.14 for a wall, but this is a column — measure it against the sliding door opening instead, whose world width is 1.8 m from `walls[4].openings[0].w`).

Write into your report, for each derived number: the photograph, the two features you measured between, the pixel ratio, the world reference you scaled by, and the metre result. **A number without those five things does not go into the config.**

Sanity bounds, not answers: the terrace floor's south edge is at z 7.65 and its west edge at x 3.03, so a pool whose near coping lands north of z 7.65 would be inside the terrace, and one that lands past z ~12 cannot fill `10.webp`'s frame at any legal fov.

- [ ] **Step 5: Write the three constructors**

In `tour/builder.js`, beside the other terrace constructors (`F.terraceChair` is at about line 1290). These are additive; nothing existing changes.

```js
  // Pool: coping ring, submerged walls and a water surface below the coping.
  // Built as a ring rather than a slab because the photographs' defining
  // feature is the STEP from deck to water -- a 0.1 m water slab sitting on
  // the ground reads as a painted rectangle at every camera height.
  F.poolEdge = (o, g) => {
    const w = o.w, d = o.d;
    const cop = o.cop || 0.35;          // coping band width
    const drop = o.drop || 0.28;        // coping top down to water surface
    const deep = o.deep || 1.2;         // water surface down to basin floor
    // coping: four bands around the opening
    for (const [bw, bd, bx, bz] of [
      [w + cop * 2, cop, 0, -(d / 2 + cop / 2)],
      [w + cop * 2, cop, 0, +(d / 2 + cop / 2)],
      [cop, d, -(w / 2 + cop / 2), 0],
      [cop, d, +(w / 2 + cop / 2), 0]
    ]) box(bw, 0.08, bd, M.poolCoping, bx, -0.04, bz, g);
    // submerged walls, drawn inward-facing by being thin boxes inside the rim
    for (const [bw, bd, bx, bz] of [
      [w, 0.06, 0, -d / 2], [w, 0.06, 0, +d / 2],
      [0.06, d, -w / 2, 0], [0.06, d, +w / 2, 0]
    ]) box(bw, drop + deep, bd, M.poolWall, bx, -(drop + deep) / 2 - 0.08, bz, g);
    box(w, 0.04, d, M.poolWall, 0, -(drop + deep) - 0.08, 0, g);   // basin floor
    box(w, 0.02, d, M.poolWater, 0, -drop - 0.08, 0, g);           // water surface
    return { w: w + cop * 2, d: d + cop * 2 };
  };

  // Planting mass: a hedge body with crossed leaf planes on top, so the
  // silhouette against the sky is broken rather than a flat-topped slab.
  F.plantMass = (o, g) => {
    const w = o.w, d = o.d, h = o.h || 2.2;
    box(w, h, d, M.hedgeDark, 0, h / 2, 0, g);
    const n = Math.max(3, Math.round(w / 1.1));
    for (let i = 0; i < n; i++) {
      const px = -w / 2 + (i + 0.5) * (w / n);
      for (const a of [0, Math.PI / 2]) {
        const fr = new T.Mesh(new T.PlaneGeometry(1.5, 1.5), M.plantGreen);
        fr.position.set(px, h + 0.55, 0);
        fr.rotation.y = a + (i % 2) * 0.4;
        g.add(fr);
      }
    }
    return { w, d };
  };

  // Boundary fence: horizontal slats on posts, the white one behind the pool.
  F.slatFence = (o, g) => {
    const w = o.w, h = o.h || 2.0;
    const rows = Math.max(4, Math.round(h / 0.22));
    for (let i = 0; i < rows; i++) {
      box(w, 0.14, 0.04, M.fenceWhite, 0, 0.12 + i * (h / rows), 0, g);
    }
    const nPosts = Math.max(2, Math.round(w / 2.2) + 1);
    for (let i = 0; i < nPosts; i++) {
      box(0.09, h, 0.09, M.fenceWhite, -w / 2 + i * (w / (nPosts - 1)), h / 2, 0, g);
    }
    return { w, d: 0.12 };
  };
```

Add the occluder heights beside the existing `OCC_H` table so the bake sees these masses:

```js
    plantMass: 2.2, slatFence: 2.0,
```

`poolEdge` is deliberately **absent** from `OCC_H`: it is a hole in the ground, and giving it an occluder height would shadow the deck beside it.

- [ ] **Step 6: Add the materials**

In `tour/materials.js`, beside the existing entries. Use `Materials.color(key, fallback)` so an apartment can override any of them from `palette`, exactly as every other material here does:

```js
    poolCoping: new T.MeshStandardMaterial({ color: color('poolCoping', 0xcfc9bd), roughness: 0.88 }),
    poolWall:   new T.MeshStandardMaterial({ color: color('poolWall', 0xdff3f4), roughness: 0.35 }),
    poolWater:  new T.MeshStandardMaterial({ color: color('poolWater', 0x35c6d8), roughness: 0.10, metalness: 0.20 }),
    hedgeDark:  new T.MeshStandardMaterial({ color: color('hedgeDark', 0x40603a), roughness: 0.95 }),
    fenceWhite: new T.MeshStandardMaterial({ color: color('fenceWhite', 0xe6e3dc), roughness: 0.9 }),
```

**Do not change any existing palette entry.** Task 4 re-fits exposure; a silently altered existing colour would land inside that fit and be unattributable.

- [ ] **Step 7: Add the `sky` key to `app.js`**

Replace only the two lines that set background and fog. Keep the recorded r128→r185 comment block above them intact — it explains an accepted difference and is still true.

```js
  // Optional per-apartment sky. Absent -> the flat 0xbcd5e8 clear this
  // scene has always had, byte-identical. Present -> a vertical gradient,
  // because the two serenity spots that still fail pose verification are
  // 15-20% real sky and a flat fill cannot read as one. Opt-in per
  // apartment on purpose: a global change would move three fitted
  // exposures and two photographed apartments' baselines for one flat's
  // benefit.
  const SKY_FALLBACK = 0xbcd5e8;
  function skyColor(v, fallback) {
    if (typeof v !== 'string') return fallback;
    const c = new THREE.Color();
    try { c.set(v); } catch (e) {
      console.warn('[app] APT.sky colour is not parseable:', JSON.stringify(v), '-- falling back');
      return fallback;
    }
    return c.getHex();
  }
  const skyCfg = (APT.sky && typeof APT.sky === 'object') ? APT.sky : null;
  if (APT.sky !== undefined && !skyCfg) {
    console.warn('[app] APT.sky must be an object, got', JSON.stringify(APT.sky), '-- falling back to the flat background');
  }
  if (skyCfg) {
    const top = skyColor(skyCfg.top, 0x3f8fd0);
    const bot = skyColor(skyCfg.bottom, SKY_FALLBACK);
    const cv = document.createElement('canvas');
    cv.width = 4; cv.height = 256;
    const g2 = cv.getContext('2d').createLinearGradient(0, 0, 0, 256);
    g2.addColorStop(0, '#' + top.toString(16).padStart(6, '0'));
    g2.addColorStop(1, '#' + bot.toString(16).padStart(6, '0'));
    const cx = cv.getContext('2d');
    cx.fillStyle = g2; cx.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = tex;
    scene.fog = new THREE.Fog(skyColor(skyCfg.fog, bot), 40, 90);
  } else {
    scene.background = new THREE.Color(SKY_FALLBACK);
    scene.fog = new THREE.Fog(SKY_FALLBACK, 40, 90);
  }
```

- [ ] **Step 8: Prove the absent-key path is byte-identical for the other two apartments**

This is the whole justification for making the key opt-in, so prove it rather than assert it.

```js
// on ?apt=kings-court, before and after your app.js edit
await window.__bakeReady;
const a = window.__app;
a.renderer.setSize(1280, 820, false);
a.camera.aspect = 1280 / 820; a.camera.updateProjectionMatrix();
if (a.post && a.post.enabled) { a.post.setSize(1280, 820); a.post.render(0); }
else a.renderer.render(a.scene, a.camera);
const c = document.createElement('canvas'); c.width = 1280; c.height = 820;
c.getContext('2d').drawImage(a.renderer.domElement, 0, 0);
fetch('/save/kc-skyguard.jpg', { method: 'POST', body: c.toDataURL('image/jpeg', 0.85) });
```

Then compare the two files with `python tools/compare_shots.py` (or an md5 if the tool does not fit) and record the result. Also confirm the console prints no `[app]` warning on an apartment with no `sky` key.

- [ ] **Step 9: Write the pool, planting and fence into `serenity.json`**

Replace the `stone`/`water`/`hedge` entries in `surroundings` with your derived geometry, and add the constructor-driven pieces as `furniture` entries with `lvl: "terrace"`. Keep the two `bldg2` blocks — they carry `occ: true` and the bake uses them. Add the `sky` key with values read off `10.webp`'s sky band, top and bottom sampled separately.

Then bump the cache tag:

```bash
python - <<'PY'
import re, pathlib
p = pathlib.Path('tour/index.html'); s = p.read_text(encoding='utf-8')
s2 = s.replace('main.js?v=122', 'main.js?v=123')
assert s2 != s, 'version tag not found -- check line 254'
p.write_text(s2, encoding='utf-8')
PY
grep -n 'main.js?v=' tour/index.html
```

- [ ] **Step 10: Structural checks**

```js
await window.__bakeReady; console.log(window.__issues);           // must be []
```

Sky-leak raycasts from the new ground, per rule 2c — five directions, `rc.camera` set first or sprites throw:

```js
const a = window.__app, rc = new THREE.Raycaster(); rc.camera = a.camera;
for (const d of [[0,1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]) {
  rc.set(new THREE.Vector3(4.4, 0.5, 7.0), new THREE.Vector3(...d));
  const h = rc.intersectObjects(a.scene.children, true)[0];
  console.log(d.join(','), h ? h.object.name || h.object.type : 'NOTHING', h && h.distance.toFixed(2));
}
```

Walk the terrace and confirm the player cannot walk into the basin:

```js
const c = window.__app.controls;
c.enabled = true; c.pos.x = 4.4; c.pos.z = 6.6; c.ground = -0.05;
c.yaw = 180 * Math.PI / 180;              // 180 = south, toward the pool
c.keys = { KeyW: true };
for (let i = 0; i < 180; i++) c.update(0.033);
c.keys = {}; console.log(c.pos, c.ground);
```

Draw calls at the terrace, through the post chain:

```js
const a = window.__app, c = a.controls;
c.pos.x = 4.6; c.pos.z = 7.3; c.ground = -0.05; c.yaw = 128 * Math.PI / 180; c.update(0.001);
a.renderer.info.autoReset = false; a.renderer.info.reset();
if (a.post && a.post.enabled) a.post.render(0); else a.renderer.render(a.scene, a.camera);
console.log(a.renderer.info.render.calls);
a.renderer.info.autoReset = true;
```

Record the number. ≤400 desktop.

- [ ] **Step 11: Capture the AFTER frames and decide the two `poseVerified` flags**

Repeat step 3's recipe for `2.webp` and `10.webp`, file as `pool-2-after.webp` and `pool-10-after.webp`, `git status` the directory.

**Then decide honestly.** Flip `poseVerified` to `true` only if render and photograph show the same subject — a pool with a coping edge, planting behind it, sky above. If something still differs (the hanging chair, the planting island's kerb, the fruit and glasses on the foreground table), that does not by itself block the flip: those are props, and the *subject* is the pool vista. If the pool still does not read as a pool, leave the flag `false`, **rewrite the `poseNote` to say what is actually missing now** — not what was missing before — and route it in your report.

- [ ] **Step 12: Take the AFTER reading and pair it**

```bash
python tools/delta_e.py --apt serenity --phase b4c-task1-AFTER-legacy-allspots --all-spots
```

Same session as step 2. Report the per-spot deltas for `2.webp` and `10.webp` separately from the other nine — the other nine should move only within the noise floor, and if any of them moves more than ~0.1 you have changed something you did not intend to.

- [ ] **Step 13: Commit**

```bash
git add tour/apartments/serenity.json tour/builder.js tour/materials.js tour/app.js tour/index.html docs/superpowers/harnesses/2026-08-19-b4c docs/superpowers/metrics/serenity-b4c-task1-BEFORE-legacy-allspots.json docs/superpowers/metrics/serenity-b4c-task1-AFTER-legacy-allspots.json
git commit -m "serenity's pool is a basin now, and the sky is a sky"
```

---

### Task 2: serenity's living room and bedroom, re-laid against the photographs

**Files:**
- Modify: `tour/apartments/serenity.json` — `furniture[]` entries for the living room and bedroom
- Modify: `tour/builder.js` — `F.windowBench` constructor and its `OCC_H` entry
- Modify: `tour/index.html:254` — `?v=` 123 → 124
- Create: `docs/superpowers/harnesses/2026-08-19-b4c/layout-{3,4,6,9,11}-{before,after}.webp`, `layout-cutaway-{before,after}.webp`
- Create: `docs/superpowers/metrics/serenity-b4c-task2-{BEFORE,AFTER}-legacy-allspots.json`

**Interfaces:**
- Consumes: task 1's tree, including the `sky` key and the pool. The living room's terrace door frames the pool, so task 1's geometry is visible in `3.webp`, `4.webp` and `9.webp` — do not re-derive it here.
- Produces: `F.windowBench(o, g)` returning `{w, d}`. Task 4 re-fits `exposure` over both tasks' output.

- [ ] **Step 1: Record the starting layout**

```bash
python -c "
import json
d=json.load(open('tour/apartments/serenity.json'))
for i,f in enumerate(d['furniture']):
    if f['type'] in ('sofa','diningTable','rug','bed','cushions','bench','sideboard','tvOnWall','painting','throwBlanket'):
        print(i, json.dumps(f))
"
```

Today: sofa `x 3.6, z 4.15, rot -90, w 1.7, d 0.8`; dining table `x 5.22, z 3.7`; bed `x 1.0, z 5.43, rot 180, w 1.6, len 2.05`. The bedroom window is `walls[3].openings[0]`, `at 1.6, w 1.3` on the wall `(0,6.65)–(3.1,6.65)` — **`at` is the opening's START offset along the wall, not its centre**, so the opening spans **x 1.6–2.9**. `F.bed` draws its headboard `w + 0.5` = **2.1 m** wide, so a bed centred at x 1.0 with its head on that wall runs to x 2.05 and buries roughly 0.45 m of the window.

- [ ] **Step 2: BEFORE reading and BEFORE frames**

```bash
python tools/delta_e.py --apt serenity --phase b4c-task2-BEFORE-legacy-allspots --all-spots
```

Then the compare divider (task 1 step 3's recipe) for `3.webp`, `4.webp`, `6.webp`, `9.webp`, `11.webp`, filed as `layout-N-before.webp`. Also take the top-down cutaway per rule 2b, filed as `layout-cutaway-before.webp`:

```js
const a = window.__app;
a.doll.enter(); a.doll.setLevel('1'); a.doll.on = false;
a.camera.position.set(2.9, 24, 3.31);
a.camera.up.set(0, 0, -1);
a.camera.lookAt(2.9, 0, 3.3);
a.renderer.render(a.scene, a.camera);   // raw render, not a.post
```

- [ ] **Step 3: Derive the living room from `3.webp`, `4.webp` and `9.webp`**

`9.webp` is the frame that settles it: the sofa's back is against a side wall with the terrace sliding door on the **far** wall directly beyond it, and the dining table is in the near foreground with the camera behind it. `serenity.json` has the sofa on the west wall (backing onto x 3.1) and the dining table east at x ≈ 5.2, so a camera that frames the door correctly puts the sofa on the opposite side of the frame from the photograph.

The room is `x 3.1–5.75, z 1.55–5.25`; the terrace door is on `walls[4]` at z 5.25 spanning **x 3.35–5.15**. The camera for `9.webp` is at `(4.4, 2.2) yaw 180 vfov 65` — due south, straight at the door.

Derive, in this order, and write each derivation down:

1. **Which wall the sofa's back is on**, from `9.webp`'s framing relative to the door. Compute the camera's right-hand direction as `cross(forward, up)` and say explicitly which world axis screen-left is at yaw 180, rather than reasoning about it in prose.
2. **The sofa's run and depth**, from its length in `9.webp` against the door's known 1.8 m width.
3. **Where the dining table sits** relative to the camera and the sofa, from `9.webp` and `4.webp` together.
4. **Whether the TV/sideboard wall moves.** `tvOnWall` and `sideboard` are at x 3.22–3.44, z 2.82. If the sofa takes that wall, they must move, and moving them is part of this task, not a follow-up.

- [ ] **Step 4: Derive the bedroom from `6.webp`, `7.webp` and `11.webp`**

`6.webp` settles it: the window wall and the bed-head wall are **perpendicular**, and there is a **built-in bench under the window** — a cushioned seat with drawers below, running most of the window's width. The model has neither.

The room is `x 0–3.1, z 1.55–6.72`. The window is on the south wall (z 6.65) spanning x 1.6–2.9. The camera for `6.webp` is at `(2.15, 5.3) yaw 172`.

Derive:

1. **Which perpendicular wall the bed head is on** — west (x 0) or east (x 3.1). Compute the screen-right world direction at yaw 172 as `cross(forward, up)` and check it against where the bed head appears in `6.webp`; then confirm the answer independently against `11.webp`, whose camera is at `(1.35, 3.9) yaw 178`. **Two frames must agree before you move the bed.**
2. **The bench's run, depth and seat height**, from `6.webp` against the window's known 1.3 m width.
3. **Whether the bed still fits.** `F.bed` draws the headboard `w + 0.5` wide; with `w 1.6` that is 2.1 m against a room 3.1 m deep in x. Check the clearance to `walls[7]`'s door at `(1.6–2.4, 1.55)` — **≥ 0.5 m** (rule 2a; a nightstand has blocked a passage here before).

- [ ] **Step 5: Write the `F.windowBench` constructor**

```js
  // Built-in window seat: drawer base, seat slab, back cushion run.
  // 6.webp shows one under the bedroom window; the model had none, so the
  // bed's headboard was the only thing under that window.
  F.windowBench = (o, g) => {
    const w = o.w, d = o.d || 0.5, h = o.h || 0.44;
    box(w, h - 0.06, d, M.white, 0, (h - 0.06) / 2, 0, g);
    box(w, 0.06, d + 0.03, M.white, 0, h - 0.03, 0.015, g);
    const n = Math.max(2, Math.round(w / 0.7));
    for (let i = 0; i < n; i++) {                       // drawer fronts
      box(w / n - 0.04, h - 0.16, 0.02, M.ashV, -w / 2 + (i + 0.5) * (w / n), (h - 0.06) / 2, d / 2 + 0.012, g);
    }
    box(w - 0.08, 0.10, d - 0.06, M.cream, 0, h + 0.05, 0, g);   // seat cushion
    return { w, d };
  };
```

Add to `OCC_H` beside the other seating entries:

```js
    windowBench: 0.5,
```

- [ ] **Step 6: Move the furniture, by raycast and not by arithmetic**

Rule 2h is the one this task is most likely to break. For **every** piece that ends up against a wall, find the wall's real face first:

```js
const a = window.__app, rc = new THREE.Raycaster();
rc.camera = a.camera;                        // required, or sprites throw
rc.set(new THREE.Vector3(1.5, 1.2, 4.4), new THREE.Vector3(-1, 0, 0));   // west
const h = rc.intersectObjects(a.scene.children, true).find(h => h.object.visible);
console.log('wall face x =', 1.5 - h.distance);
```

Then place the object, reload, and **cast a second ray from the same origin and confirm it hits your object before the wall.** A headboard buried inside a wall is invisible and perfectly walkable, and every automated check stays green.

- [ ] **Step 7: Structural checks and the cutaway**

```js
await window.__bakeReady; console.log(window.__issues);           // must be []
```

Walk both rooms — the living room from the hall toward the terrace door, and the bedroom from its door to the window — with the recipe in `CLAUDE.md`, and assert the end coordinates. **Trust the flood fill in `__issues` over any one run**: a passage can exist and still be unreachable from the side, which is how bedroom 3 was found in an earlier phase.

Then the top-down cutaway again, same camera as step 2, filed as `layout-cutaway-after.webp`. Compare the two by eye for: furniture rotated across a room, anything floating, and any doorway now under 0.5 m of clearance.

- [ ] **Step 8: Bump the cache tag, take the AFTER reading, capture the AFTER frames**

```bash
python - <<'PY'
import pathlib
p = pathlib.Path('tour/index.html'); s = p.read_text(encoding='utf-8')
s2 = s.replace('main.js?v=123', 'main.js?v=124')
assert s2 != s, 'version tag not found'
p.write_text(s2, encoding='utf-8')
PY
python tools/delta_e.py --apt serenity --phase b4c-task2-AFTER-legacy-allspots --all-spots
```

Compare frames for `3, 4, 6, 9, 11` filed as `layout-N-after.webp`.

**The five spots this task touches are already `poseVerified: true` and stay that way** — plan 4b pointed them at the right subjects and this task does not move a camera. If a re-laid room makes one of those cameras wrong, that is evidence your layout is wrong; fix the layout, not the camera. If you conclude otherwise, stop and write it up rather than moving the camera.

- [ ] **Step 9: Commit**

```bash
git add tour/apartments/serenity.json tour/builder.js tour/index.html docs/superpowers/harnesses/2026-08-19-b4c docs/superpowers/metrics/serenity-b4c-task2-BEFORE-legacy-allspots.json docs/superpowers/metrics/serenity-b4c-task2-AFTER-legacy-allspots.json
git commit -m "serenity's sofa and bed move to the walls the photographs put them on"
```

---

### Task 3: kings-court's Bathroom 2 — un-mirrored, with its divider glass

**Files:**
- Modify: `tour/apartments/kings-court.json` — Bathroom 2 `furniture[]`, `photoSpots` entry for `14.webp`
- Modify: `tour/builder.js` — `F.shower` optional divider, valve plate, handheld
- Modify: `tour/index.html:254` — `?v=` 124 → 125
- Create: `docs/superpowers/harnesses/2026-08-19-b4c/bath2-14-{before,after}.webp`, `bath2-cutaway-after.webp`
- Create: `docs/superpowers/metrics/kings-court-b4c-task3-{BEFORE,AFTER}-legacy-allspots-pop13.json`

**Interfaces:**
- Consumes: nothing from tasks 1–2; this is a different apartment and can be reviewed independently.
- Produces: `F.shower` accepts three new optional keys — `divider` (`"n"|"s"|"e"|"w"`, the side carrying a full-height frameless panel instead of a 2.0 m cabin pane), `valve` (boolean), `handheld` (boolean). **All default to today's behaviour**, so every other apartment's shower renders unchanged.

- [ ] **Step 1: Record the starting state and read the photograph**

```bash
python -c "
import json
d=json.load(open('tour/apartments/kings-court.json'))
for f in d['furniture']:
    if 8.0<=f.get('x',-9)<=12.0 and -0.5<=f.get('z',-9)<=3.2 and f.get('lvl')=='main': print(json.dumps(f))
"
sed -n '/F.shower = /,/^  };/p' tour/builder.js
```

Today: `shower x 10.075, z 2.005, w 0.95, d 1.05, rot 180`; `tub x 10.95, z 1.72, w 1.7, d 0.8, rot 90`. The room is `x 8.8–11.4, z 0–2.6`, its door on `walls` `(8.8,0)–(8.8,2.6)` at `at 1.5, w 0.85`. `F.shower` today builds a tray, two 2.0 m glass panes on the `+z` and `+x` sides, a pole and a rain head — no divider, no valve, no handheld.

`14.webp` shows: the shower on the **left** against white marble, the bath on the **right** against black marble, a **frameless floor-to-ceiling glass panel between them with a ceiling brace rod**, a linear drain in the shower floor, a thermostatic valve plate and handheld on the white wall, and a second valve and handheld over the bath.

- [ ] **Step 2: BEFORE reading and BEFORE frame**

```bash
python tools/delta_e.py --apt kings-court --phase b4c-task3-BEFORE-legacy-allspots-pop13 --all-spots
```

Confirm `mean` lands in **17.58–17.59** and `scored: 13`. Then the compare divider on `?apt=kings-court` (task 1 step 3's recipe) for `14.webp`, filed as `bath2-14-before.webp`.

- [ ] **Step 3: Establish the mirroring from the photograph, not from the note**

`14.webp`'s `poseNote` asserts the model puts the shower west of the bath where the photograph puts it east. **Verify it independently before acting on it** — the note is a summary written by a previous task and this plan's first constraint is that summaries are re-derived.

The camera is at `(9.3, 1.2) yaw 200`. Compute its forward vector as `(-sin(yaw), -cos(yaw))` and its screen-right as `cross(forward, up)`; state which world direction is screen-left. Then say which fixture the photograph puts on screen-left, and therefore which world position it must occupy. Write all of it down.

If your derivation disagrees with the note, **your derivation wins and the note gets corrected** — but say so loudly in your report, because it means a shipped `poseNote` is wrong.

- [ ] **Step 4: Extend `F.shower`, keeping today's behaviour the default**

```js
  F.shower = (o, g) => {
    // glass cabin: tray, pole, head, glass on 2 sides.
    // Optional (all default off, so every existing caller is unchanged):
    //   divider  'n'|'s'|'e'|'w' -- one full-height frameless panel with a
    //            ceiling brace on that side, INSTEAD of that side's 2.0 m
    //            cabin pane. 14.webp's defining element.
    //   valve    thermostatic plate on the head wall
    //   handheld rail-mounted handset with hose, beside the valve
    box(o.w, 0.04, o.d, M.marbleW, 0, 0.02, 0, g);
    const H = o.divider ? (o.glassH || 2.45) : 2.0;
    const div = o.divider || null;
    function pane(side, w, rotY, px, pz) {
      const full = (div === side);
      const h = full ? H : 2.0;
      const p = new T.Mesh(new T.PlaneGeometry(w, h), M.glass);
      p.rotation.y = rotY;
      p.position.set(px, h / 2 + 0.04, pz);
      g.add(p);
      if (full) {                                  // ceiling brace rod
        cyl(0.012, 0.012, 0.28, M.chrome, px, h + 0.18, pz, g, 8);
      }
    }
    pane('s', o.w, 0, 0, o.d / 2);
    pane('e', o.d, Math.PI / 2, o.w / 2, 0);
    if (div === 'n') pane('n', o.w, 0, 0, -o.d / 2);
    if (div === 'w') pane('w', o.d, Math.PI / 2, -o.w / 2, 0);
    cyl(0.012, 0.012, 1.9, M.chrome, -o.w / 2 + 0.1, 0.99, -o.d / 2 + 0.1, g, 8);
    const head = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.02, 16), M.chrome);
    head.position.set(-o.w / 2 + 0.3, 2.0, -o.d / 2 + 0.25); g.add(head);
    if (o.valve) {
      box(0.15, 0.15, 0.03, M.chrome, -o.w / 2 + 0.06, 1.05, -o.d / 2 + 0.30, g);
    }
    if (o.handheld) {
      cyl(0.010, 0.010, 0.60, M.chrome, -o.w / 2 + 0.06, 1.35, -o.d / 2 + 0.30, g, 8);
      const hs = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.02, 14), M.chrome);
      hs.position.set(-o.w / 2 + 0.06, 1.62, -o.d / 2 + 0.30); g.add(hs);
    }
    return { w: o.w, d: o.d };
  };
```

**Check every existing caller before you commit this.** The refactor above must leave the two-pane geometry identical when `divider` is absent:

```bash
grep -n '"type": "shower"' tour/apartments/*.json
```

- [ ] **Step 5: Prove the other showers did not move**

For each apartment with a `shower` that this task does **not** intend to change, capture a frame at a spot that shows it, before and after the `F.shower` edit, and compare. serenity has one at `x 0.55, z 0.75` visible from `1.webp`'s camera. Record the comparison result; "it should be unchanged" is not evidence.

- [ ] **Step 6: Un-mirror the room and add the divider**

Swap the shower and the tub to the positions your step-3 derivation puts them in, set `divider` to the side facing the bath, and set `valve: true, handheld: true`. Keep the `wallPanel` entries in step with the fixtures — `14.webp` puts white marble behind the shower and black behind the bath, and the panels at `z 0.1` (black) and `z 2.5` (white) may need to swap with them.

Then bump the cache tag:

```bash
python - <<'PY'
import pathlib
p = pathlib.Path('tour/index.html'); s = p.read_text(encoding='utf-8')
s2 = s.replace('main.js?v=124', 'main.js?v=125')
assert s2 != s, 'version tag not found'
p.write_text(s2, encoding='utf-8')
PY
```

- [ ] **Step 7: Structural checks**

```js
await window.__bakeReady; console.log(window.__issues);           // must be []
```

Walk into the bathroom from its door at `(8.8, 1.5–2.35)` and confirm you can still reach the far corner; the divider panel is glass and `F.shower` returns a collider box, so a badly placed divider can seal the room. Then the top-down cutaway over the bathroom, filed as `bath2-cutaway-after.webp`.

Draw calls at `14.webp`'s camera, through the post chain, with the recipe from task 1 step 10 but `c.pos.x = 9.3; c.pos.z = 1.2; c.ground = 0; c.yaw = 200 * Math.PI / 180`. kings-court is the apartment that breaches budgets — record desktop and mobile.

- [ ] **Step 8: AFTER reading, AFTER frame, and the `poseVerified` decision**

```bash
python tools/delta_e.py --apt kings-court --phase b4c-task3-AFTER-legacy-allspots-pop13 --all-spots
```

Compare frame filed as `bath2-14-after.webp`. Then decide: `14.webp` flips to `true` only if render and photograph now show the same subject — shower and bath on the correct sides, with the divider between them. If it flips, **rewrite the `poseNote` to record what was fixed and when**; if it does not, rewrite it to say what is still missing and route that.

**Twelve of thirteen spots must move only within kings-court's noise floor.** That floor is ~0.35 per spot and `11.webp` is the known outlier at ~0.30–0.32 — plan 5 owns settling it. Report each spot's delta; `14.webp` is the only one this task has any business moving.

- [ ] **Step 9: Commit**

```bash
git add tour/apartments/kings-court.json tour/builder.js tour/index.html docs/superpowers/harnesses/2026-08-19-b4c docs/superpowers/metrics/kings-court-b4c-task3-BEFORE-legacy-allspots-pop13.json docs/superpowers/metrics/kings-court-b4c-task3-AFTER-legacy-allspots-pop13.json
git commit -m "kings-court's Bathroom 2 stops being the photograph's mirror image"
```

---

### Task 4: serenity's exposure, re-fitted

**Files:**
- Modify: `tour/apartments/serenity.json` — `exposure`
- Modify: `tour/apartments/horkyone-10.json` — `exposure`, **only if** the re-derived band demands it
- Modify: `tour/index.html:254` — `?v=` 125 → 126
- Create: `docs/superpowers/metrics/serenity-b4c-task4-luminance.json`, `serenity-b4c-task4-exposure-sweep.json`, `serenity-b4c-task4-final-legacy-allspots.json`

**Interfaces:**
- Consumes: tasks 1–2's serenity tree. Task 3 is a different apartment and does not enter this fit.
- Produces: the shipped `exposure` values task 5 measures the gate against.

- [ ] **Step 1: Read the rule before fitting anything**

**Fit toward luminance, never toward ΔE.** `CLAUDE.md`'s `exposure` row and `metrics/README.md` both say it; this project has already shipped one fit that picked a ΔE minimum and called it something else. `tools/luminance.py` is the instrument.

Then read the population change you are about to inherit:

```bash
python -c "
import json
d=json.load(open('tour/apartments/serenity.json'))
for s in d['photoSpots']:
    print(s['file'], s.get('compare'), s.get('poseVerified'))
"
```

`luminance.py` filters through `delta_e.scorable`, which requires `poseVerified`, and **has no `--all-spots` escape hatch**. If task 1 flipped `2.webp` and `10.webp`, serenity's luminance-fitting population is **11, not 9**, and it has gained two of the brightest frames in the set. Say so explicitly in your report: the resulting fit is **not comparable** to the committed 0.295, which was fitted on a different population.

- [ ] **Step 2: Measure where the current exposure lands**

```bash
python tools/luminance.py --apt serenity --sets b4c-task4-baseline
```

Record the mean scene luminance and the per-spot spread.

- [ ] **Step 3: Sweep**

Sweep `exposure` across a range bracketing the current 0.295 — at least 0.20, 0.24, 0.27, 0.295, 0.32, 0.36, 0.40 — re-running `__measure()` and `luminance.py` at each. Bump `?v=` between each run or the config never reaches the browser.

Record ΔE at every step too, in the same file, and **do not choose by it**. Recording it is how a reviewer confirms you did not.

- [ ] **Step 4: Choose the fit, and write down why**

Choose the value that puts serenity's mean scene luminance closest to the photographs' on the 11-spot population. Write into the metrics file: the chosen value, the luminance residual at that value, the ΔE at that value, and the ΔE at the value that *would* have minimised ΔE — so the gap between "what I chose" and "what the wrong criterion would have chosen" is on the record.

- [ ] **Step 5: Re-derive horkyone-10's ±10 luminance band**

horkyone-10 has zero `compare` spots. Its `exposure: 0.42` was fitted on mean-scene-luminance proximity to the other two apartments, within ±10 — **and that band is derived from serenity's number**, so it moves when serenity's does.

```bash
python tools/luminance.py --apt horkyone-10 --sets b4c-task4-horkyone
python tools/luminance.py --apt kings-court --sets b4c-task4-kingscourt
```

Re-derive the band from the new serenity figure and kings-court's unchanged one, and check whether 0.42 still sits inside it. **If it does, change nothing and record that it was checked.** If it does not, re-fit horkyone-10 too and say so. Do not carry the old band across — plan 4a task 3 found the shipped 0.46 had already fallen out of its own band unnoticed once.

- [ ] **Step 6: Final reading and commit**

```bash
python - <<'PY'
import pathlib
p = pathlib.Path('tour/index.html'); s = p.read_text(encoding='utf-8')
s2 = s.replace('main.js?v=125', 'main.js?v=126')
assert s2 != s, 'version tag not found'
p.write_text(s2, encoding='utf-8')
PY
python tools/delta_e.py --apt serenity --phase b4c-task4-final-legacy-allspots --all-spots
```

```bash
git add tour/apartments/serenity.json tour/index.html docs/superpowers/metrics/serenity-b4c-task4-luminance.json docs/superpowers/metrics/serenity-b4c-task4-exposure-sweep.json docs/superpowers/metrics/serenity-b4c-task4-final-legacy-allspots.json
git commit -m "Re-fit serenity's exposure for the render with a sky in it"
```

(Add `tour/apartments/horkyone-10.json` to that `git add` only if step 5 actually moved it.)

---

### Task 5: the gate, the baselines, and the record

**Files:**
- Modify: `tour/index.html:254` — `?v=` 126 → 127 (only if a doc edit touches `tour/`; otherwise leave it)
- Modify: `docs/PHASE-B-RESUME.md`, `docs/superpowers/metrics/README.md`, `CLAUDE.md`
- Create: `docs/superpowers/metrics/{serenity,kings-court}-b4c-task5-{BASE,gate}-legacy-allspots*.json` (two readings each side)

**Interfaces:**
- Consumes: everything. This task changes no geometry and no constant.

- [ ] **Step 1: Serve BASE and HEAD simultaneously**

The gate restated on 2026-08-15 forbids cross-session pairs, and plan 4b's own resume-doc entry had to be corrected for exactly that. Serve both trees at once, the same scripts pointed at each:

```bash
git worktree add ../airbnb-base b78ebd3
python tools/serve.py                       # HEAD on :8742
cd ../airbnb-base && python tools/serve.py  # BASE on :8743 (edit the port)
```

- [ ] **Step 2: Two readings per side per apartment**

serenity `--all-spots` (11) and kings-court `--all-spots` (13), BASE and HEAD, twice each — eight readings. File them with `BASE`/`gate`, the apartment, `pop11`/`pop13` and `-repeat` in the names.

Report the spread within each side. serenity's is ~0.02–0.03; kings-court's is ~0.35 per spot and this is the reading that either corroborates or refutes that — say which, and route it to plan 5 either way rather than settling it here.

- [ ] **Step 3: Structural sweep on all three apartments**

`window.__issues` empty on serenity, kings-court and horkyone-10. Draw calls through the post chain at serenity's entrance (`3.6, 0.75, yaw 178` — **serenity's own start position**, not kings-court's) and at kings-court's entry hall, desktop and mobile, against ≤400 / ≤250. Walk routes and sky-leak raycasts per the recipes in tasks 1–3. Console clean of errors on all three.

- [ ] **Step 4: Update `CLAUDE.md`**

Only what this branch actually changed:

- the `exposure` row's shipped values, if task 4 moved them, with the population change spelled out (9 → 11 spots) and the old values kept as lineage rather than deleted;
- a new row in "Config keys added by the photorealism phase" for **`sky`** — opt-in, absent means the flat `0xbcd5e8` clear, malformed means a named warning and the same fallback, enabled on serenity only;
- the `?v=` figure;
- the draw-call figure if it moved.

**Do not restate a number you did not measure this session.**

- [ ] **Step 5: Update `docs/PHASE-B-RESUME.md`**

- The plan table's **4c row** — from "not yet written" to what this branch did, and the **4d row** it created.
- The `poseVerified` counts, by search rather than from memory. This document has had the same figures corrected four times, and each earlier sweep missed sites.
- The "What plan 4b left open" table: strike the rows this branch closed with a dated marker beside each — **inline, in the row itself**, because `tools/checks/stale_claims.py` scopes a claim to the smallest unit that renders on its own. The conflict between that rule and this repo's narrated-marker convention is plan 5's to settle; until it is, satisfy the checker.
- A new routed list for **4d**: HDRI, GLTF, PBR/KTX2, kings-court's `18.webp` rattan set, and the `sky` key on the other two apartments.

- [ ] **Step 6: Update `docs/superpowers/metrics/README.md`**

The new baselines with their populations, the exposure lineage, and — if task 1's readings moved `2.webp` and `10.webp` a long way — a plain statement of which direction and why, including the possibility that the number got worse while the render got better. That case is exactly what this document already says the instrument cannot arbitrate; say it again with this branch's figures rather than leaving a reader to infer it.

- [ ] **Step 7: Run the stale-claim checker and the validator one more time**

```bash
python tools/checks/stale_claims.py
```

It fails open in seven known places, all recorded in its own docstring, and plan 5 owns fixing them. A green run is weak evidence — read your own edits as well.

- [ ] **Step 8: Clean up and commit**

```bash
git worktree remove ../airbnb-base
git add docs/PHASE-B-RESUME.md docs/superpowers/metrics/README.md CLAUDE.md docs/superpowers/metrics/
git commit -m "Plan 4c closing gate, baselines and routed record"
```

---

## Self-review notes

**Spec coverage.** serenity's exterior (pool, planting, fence, sky) → task 1. serenity's living room and bedroom, including the window bench → task 2. kings-court's Bathroom 2 mirroring **and** the divider glass, valve and handheld → task 3. serenity's exposure re-fit and horkyone-10's re-derived band → task 4. Gate, baselines, docs and the 4d routing → task 5. The spec's five "rules this branch works under" are the plan's Global Constraints. The spec's degradation table is enforced in task 1 steps 7–8 (`sky` absent and malformed) and task 3 step 4 (`F.shower` without the new arguments).

**Deliberately not here.** HDRI, GLTF, PBR/KTX2, kings-court's `18.webp` rattan set, and the `sky` key on kings-court and horkyone-10 — all routed to 4d in task 5 step 5. `mainCeilH`, the entry-hall wardrobe, `meta.photoFovLong`, the noise floor and the stale-claim checker's gaps stay with plan 5, untouched. The wall lightmap atlas stays unowned.

**The one plan-5 row this plan takes back** is the shower divider glass, with its reason in the spec: it was routed to plan 5 to stop a constructor change sitting blocked behind 4c's unscheduled asset curation, and this plan removes that blockage. Leaving it there would fix one frame's three defects in two branches and measure the same spot twice.

**Where this plan is most likely to go wrong.** Task 2, rule 2h — placing furniture against a wall by arithmetic instead of by raycast. That has already buried two headboards inside walls in this repo, and nothing automated catches it, because a hidden object is still perfectly walkable. Task 2 step 6 requires a confirming second ray for exactly that reason.
