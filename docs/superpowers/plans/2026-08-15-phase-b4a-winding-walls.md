# Phase B plan 4a — wall winding, and walls that take their own light

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the shipped defect that makes 8 of 12 wall faces render inside-out, then measure whether walls can take position-sensitive shading once they are the right way round, and re-fit exposure and bloom for whatever render results.

**Architecture:** One sign test in `grid()` (`tour/bake.js`) corrects the winding. A `SEG` refinement plus `sampled=true` on the wall `lightAt` calls is then trialled behind a pre-agreed exit criterion, reverted in full if it misses. Everything downstream — exposure, bloom, gate baselines, docs — follows from whichever of those two lands.

**Tech Stack:** Vanilla ES modules, no bundler, no build step. Three.js r185 vendored at `tour/lib/three-0.185.0/`. Python 3 for `tools/serve.py`, `tools/delta_e.py`, `tools/luminance.py`. Playwright only for the preserved harnesses, and it is **not** installed in this repo (see Global Constraints).

**Spec:** `docs/superpowers/specs/2026-08-15-phase-b4a-winding-walls-design.md`. Read it before task 1.

## Global Constraints

- **The gate was restated on 2026-08-15.** It is a regression tripwire, not a quality ceiling. Baselines: **serenity 16.61**, **kings-court 18.90**, all-spot in `&fov=legacy`. Movement inside ±0.03 (rounded) / ±0.039 (full precision) passes silently. Movement past that floor **must be attributed by a same-session paired A/B or it fails**. Any single task making a reading worse by more than **0.5** stops the branch. Full text: `docs/PHASE-B-RESUME.md`, "The gate, restated 2026-08-15".
- **Never gate on the `poseVerified` subset.** All gate readings are `--all-spots`. serenity scores 11, kings-court 14.
- **Never fit toward ΔE.** Fit toward `tools/luminance.py`'s photograph target; report ΔE as a consequence.
- **Fit exposure and bloom together.** Track the *fraction* of frame over the bloom threshold, never the peak.
- **Verify both halves of the gate exist before measuring anything:** `?fov=legacy` in `tour/measure.js` and `--all-spots` in `tools/delta_e.py`. Both have been deleted once and restored. Check, do not assume.
- **`window.__issues` must be empty on all three apartments before every commit.**
- **Cache:** bump `?v=N` on the single module tag in `tour/index.html` (currently **`?v=107`**, line 254) **after** the last code edit of a task. Docs-only commits do not bump.
- **Draw-call budget: ≤400 desktop, ≤250 mobile**, measured through the post chain with `info.autoReset` disabled. Plan 3 task 7 measured 72/165/83 desktop and 64/150/64 mobile for serenity/kings-court/horkyone-10.
- **Bake time has no fixed ceiling** (CLAUDE.md rule 4a) but is reported every time. Reference medians: serenity **267 ms**, horkyone-10 **1323 ms**, kings-court **8674 ms**.
- **Start the server with the sandbox disabled.** `python tools/serve.py` writes captures via `POST /save/<name>`; under a sandbox that endpoint **returns HTTP 200 and silently writes nothing**. Probe for a file on disk before trusting any capture.
- **Playwright is not installed in this repo.** Re-running a preserved harness needs three things: `tools/serve.py` unsandboxed, a `node_modules` junction pointing at an install that has Playwright, and the harness directory itself. Create the junction by hand and remove it afterwards.
- **Shipped values entering this plan:** exposure serenity `0.329`, kings-court `0.575`, horkyone-10 `0.46`; `UnrealBloomPass(size, 0.1, 0.5, 1.8)` — strength 0.1, threshold 1.8.
- **Commit your own files explicitly.** `git add -A` has twice been one keystroke away from sweeping another session's uncommitted work into the wrong commit.
- Angles in apartment JSON are **degrees**. Yaw 0 looks north (−z), 90 west, 180 south, 270 east.

## File structure

| File | Responsibility in this plan |
|---|---|
| `tour/bake.js` | `grid()` gets the sign test (task 1); `bakeWalls()`'s `SEG` and the `sampled` argument change (task 2); the `:502-547` comment block is rewritten to match reality (task 5) |
| `tour/index.html` | `?v=` bump after each task that edits shipped code |
| `tour/apartments/*.json` | `exposure` re-fit (task 3) |
| `tour/post.js` | Bloom constants, only if the re-fit moves them (task 3) |
| `docs/superpowers/harnesses/2026-08-15-b4a-task1/` | Created: the wall-face raycast harness. This is evidence, not scratch — it must survive the branch |
| `docs/superpowers/metrics/*.json` | Created: before/after readings for tasks 1–4 |
| `docs/PHASE-B-RESUME.md`, `CLAUDE.md` | Updated in task 5 |

---

### Task 1: The winding sign test

**Files:**
- Create: `docs/superpowers/harnesses/2026-08-15-b4a-task1/faces.mjs` (harness, browser-console form)
- Create: `docs/superpowers/harnesses/2026-08-15-b4a-task1/README.md`
- Create: `docs/superpowers/metrics/faces-b4a-task1-before.json`, `…-after.json`
- Modify: `tour/bake.js` — `grid()` at `:560-590`
- Modify: `tour/index.html:254` — `?v=` bump

**Interfaces:**
- Produces: a corrected `grid()`. No signature change — `grid(o, uVec, vVec, n, su, sv, occ, shade)` stays exactly as it is. Task 2 calls it unchanged.
- Produces: `faces.mjs`'s console function `__faces()` returning `{apt, walls:[{i, alongX, near, far, none}], totals:{near, far, none}}`. Task 2 re-runs it to prove the winding fix survived its edits.

- [ ] **Step 1: Read the spec and the defect's own comment**

Read `docs/superpowers/specs/2026-08-15-phase-b4a-winding-walls-design.md`, then `tour/bake.js:502-547`. The comment records the fix and, importantly, records the **wrong** fix so nobody re-derives it: reversing the `else` branch leaves top and bottom broken on every wall in every apartment.

- [ ] **Step 2: Derive the eight reversed faces yourself before trusting anyone**

Compute `(uVec × vVec) · n` for all twelve `grid()` calls at `tour/bake.js:601-616`. You must independently reach: `alongX` south, north and both reveals are **correct**; `alongX` top and bottom are **reversed**; all six `else`-branch (along-z) faces are **reversed**. Eight of twelve. If your arithmetic disagrees with that, stop and report it — do not proceed on someone else's count.

- [ ] **Step 3: Write the failing harness**

Create `docs/superpowers/harnesses/2026-08-15-b4a-task1/faces.mjs`. It reads wall centrelines from the config (`window.APT.walls`, each `{x1,z1,x2,z2,h}`; along-x when `z1 === z2`), stands 1 m off each side of the centreline and casts at it. Wall thickness is 0.14, so the **near** face is at distance 0.93 and the **far** face at 1.07. Filtering by `userData.doll` is what keeps furniture and floors out of the count.

```js
// docs/superpowers/harnesses/2026-08-15-b4a-task1/faces.mjs
// Paste into the console at ?apt=<id>, after `await window.__bakeReady`.
window.__faces = function () {
  const a = window.__app, T = window.THREE;
  const rc = new T.Raycaster();
  rc.camera = a.camera;                       // required, or sprites throw
  const TH = 0.07;                            // half of WALL_TH 0.14
  const isWall = (o) => o.userData && (o.userData.doll === 'walls1' || o.userData.doll === 'walls2');
  const walls = window.APT.walls || [];
  const out = [], totals = { near: 0, far: 0, none: 0 };

  walls.forEach((w, i) => {
    const alongX = Math.abs(w.z2 - w.z1) < 1e-6;
    // perpendicular unit vector in the ground plane
    const px = alongX ? 0 : 1, pz = alongX ? 1 : 0;
    let near = 0, far = 0, none = 0;
    // sample along the wall and up its height; openings make single probes lie
    for (const t of [0.15, 0.35, 0.5, 0.65, 0.85]) {
      const cx = w.x1 + (w.x2 - w.x1) * t, cz = w.z1 + (w.z2 - w.z1) * t;
      for (const y of [0.4, 1.5, 2.2]) {
        if (y > w.h - 0.1) continue;
        for (const s of [1, -1]) {
          const o = new T.Vector3(cx + px * s, y, cz + pz * s);
          const d = new T.Vector3(-px * s, 0, -pz * s);
          rc.set(o, d);
          const h = rc.intersectObjects(a.scene.children, true)
                      .find(h => h.object.visible && isWall(h.object));
          if (!h) { none++; continue; }
          if (Math.abs(h.distance - (1 - TH)) < 0.02) near++;
          else if (Math.abs(h.distance - (1 + TH)) < 0.02) far++;
          else none++;                        // an opening, or another wall in front
        }
      }
    }
    totals.near += near; totals.far += far; totals.none += none;
    out.push({ i, alongX, near, far, none });
  });
  return { apt: new URLSearchParams(location.search).get('apt'), walls: out, totals };
};
```

- [ ] **Step 4: Run the harness on the UNMODIFIED tree and confirm it shows the defect**

Start the server **with the sandbox disabled**:

```bash
python tools/serve.py
```

Open `http://localhost:8742/?apt=serenity`, then in the console:

```js
await window.__bakeReady; copy(JSON.stringify(window.__faces(), null, 2))
```

Expected: **along-x walls hit predominantly `near`, along-z walls predominantly `far`.** The recorded counts on the unmodified tip are along-x near 6/6 (serenity) and 14/16 (kings-court), along-z far 8/8 and 17/18.

**A harness that does not show the defect is not measuring what it claims.** If along-z walls come back `near`, stop and report — either the defect is not what the record says or the probe is wrong, and both are findings worth more than proceeding. This repo has shipped a verification that could not fail before; that is why this step exists.

Repeat for `?apt=kings-court` and `?apt=horkyone-10`. Save all three as `docs/superpowers/metrics/faces-b4a-task1-before.json`.

- [ ] **Step 5: Account for the walls that show neither face**

kings-court previously showed 14/16 along-x and 17/18 along-z — two walls unexplained, and plan 3 left it that way. For every wall whose `none` count dominates, say **why**: an opening filling the probe line, another wall standing in front, a wall shorter than the probe offset, or a genuine gap. Write the explanation into the harness README. "Unexplained" is not an acceptable end state for this step; "explained and benign" is.

- [ ] **Step 6: Apply the sign test**

In `tour/bake.js`, inside `grid()`, compute the cross product once per quad grid and reverse the emitted triangle order when it opposes `n`. **Reverse the triangle order only — do not flip `N`.** The normal passed in is the intended outward normal and is already correct; what is wrong is which side the renderer culls.

Replace the `pts` line at `:577` and add the test above the emit loops:

```js
      // WINDING. `pts` below emits a fixed triangle order, so a quad's
      // geometric front face follows uVec x vVec whatever `n` says, and
      // MeshBasicMaterial is FrontSide, so culling is live. Eight of the
      // twelve grid() calls per wall piece disagree with their own normal:
      // all six of an along-z piece, plus top and bottom of an along-x one.
      // The test below covers all eight and leaves the four correct ones
      // alone. It is NOT a reversal of the else branch -- that would leave
      // top and bottom broken on every wall in every apartment.
      const flip =
        (uVec[1] * vVec[2] - uVec[2] * vVec[1]) * n[0] +
        (uVec[2] * vVec[0] - uVec[0] * vVec[2]) * n[1] +
        (uVec[0] * vVec[1] - uVec[1] * vVec[0]) * n[2] < 0;
      for (let j = 0; j < sv; j++) {
        for (let i = 0; i < su; i++) {
          const pts = flip
            ? [[i, j], [i + 1, j + 1], [i + 1, j], [i, j], [i, j + 1], [i + 1, j + 1]]
            : [[i, j], [i + 1, j], [i + 1, j + 1], [i, j], [i + 1, j + 1], [i, j + 1]];
```

- [ ] **Step 7: Bump the cache version**

`tour/index.html:254`: `main.js?v=107` → `main.js?v=108`. Without this the JSON and JS edits simply never arrive — that bug has cost this project an hour before.

- [ ] **Step 8: Re-run the harness and confirm the defect is gone**

Same three apartments, same procedure as step 4. Expected: **every wall now reports `near`**, with the `none` counts explained in step 5 unchanged. Save as `docs/superpowers/metrics/faces-b4a-task1-after.json`.

If any wall still reports `far`, the sign test is incomplete — report which one and its `uVec`, `vVec`, `n`.

- [ ] **Step 9: Run the verification pass this change specifically needs**

Moving these faces moves **apparent room dimensions**, so a clean validator is not sufficient evidence here.

```js
window.__bakeReady.then(() => console.log(window.__issues))   // [] on all three
```

Then, on all three apartments:
- the four standing walk routes (set `c.pos`, hold `KeyW`, `c.update(0.033)` in a loop, assert the end coordinates);
- sky-leak raycasts in five directions from each zone — set `rc.camera` first or sprites throw, and include invisible meshes since ceiling overlays are one-sided;
- the dollhouse measuring tape against the `areas` values in the config: rooms should now measure **closer** to their configured size, not further;
- draw calls through the post chain, against ≤400 desktop and ≤250 mobile:

```js
const a = window.__app, c = a.controls;
c.pos.x = 3.6; c.pos.z = 0.75; c.ground = 0; c.yaw = 178 * Math.PI / 180; c.update(0.001);
a.renderer.info.autoReset = false;
a.renderer.info.reset();
if (a.post && a.post.enabled) a.post.render(0); else a.renderer.render(a.scene, a.camera);
console.log(a.renderer.info.render.calls);
a.renderer.info.autoReset = true;
```

- [ ] **Step 10: Take the before/after a human will actually look at**

The rooms will read about 28 cm narrower along z. That is the truth — collision in `controls.js` was always against the config's centrelines and it is the render that disagreed — but it is a visible product change. Capture the same first-person view before and after on serenity and kings-court and file both frames in the harness directory.

- [ ] **Step 11: Measure the gate and attribute the movement**

```bash
# open ?apt=<id>&measure=1&fov=legacy, then: await window.__bakeReady; await window.__measure();
python tools/delta_e.py --apt serenity --all-spots --phase b4a-task1-after
python tools/delta_e.py --apt kings-court --all-spots --phase b4a-task1-after
```

Both arms — before and after — **in the same session, on the same machine, through the same harness**. That pairing is what the restated gate's rule 2 requires; a naked after-number compared to a remembered baseline does not satisfy it. Confirm each committed file carries `population: all-spot`, `scored == compareTotal` (11 and 14) and `skippedPoseVerification: 0`.

Check the hard stop: neither apartment worse by more than 0.5.

- [ ] **Step 12: Commit**

```bash
git add tour/bake.js tour/index.html docs/superpowers/harnesses/2026-08-15-b4a-task1 docs/superpowers/metrics/faces-b4a-task1-before.json docs/superpowers/metrics/faces-b4a-task1-after.json docs/superpowers/metrics/serenity-b4a-task1-after-allspots.json docs/superpowers/metrics/kings-court-b4a-task1-after-allspots.json
git commit -m "Task 1: fix the wall winding with a sign test, not an else-branch reversal"
```

---

### Task 2: Walls take the visibility-scaled ambient

**This task may end in a No-Go. That is an acceptable outcome and the implementer must not treat it as a failure to be avoided or soften the measurement to escape it.** This project's precedent is that an honest null result is worth more than a flattering number — the palette task measured worse than doing nothing and said so.

**Files:**
- Modify: `tour/bake.js` — `SEG` at `:556`, and the `lightAt` call inside `grid()` at `:571`
- Create: `docs/superpowers/metrics/{serenity,kings-court,horkyone-10}-b4a-task2-luminance.json`
- Create: `docs/superpowers/metrics/{serenity,kings-court}-b4a-task2-{before,after}-allspots.json`
- Modify: `tour/index.html:254` — `?v=` bump

**Interfaces:**
- Consumes: task 1's corrected `grid()` and its `__faces()` harness.
- Consumes: `lightAt(P, N, occ, data, outdoor, sampled, ambFn)` at `tour/bake.js:258`. The sixth positional argument is `sampled`; `grid()` currently passes `false` at `:571`.
- Consumes: `window.__ambSampled` (boolean, set in `run()` at `:732`) and the `__issues` entry pushed beside it at `:743`.
- Produces: either a shipped `SEG` value and `sampled=true` for walls, or a full revert plus a committed null result.

- [ ] **Step 1: Record the before, on all three apartments**

Nothing is changed yet. Capture and commit:
- spawn-pooled sRGB mean and interpolated p5 over **every** `spawns[]` entry at 480×300 through the full post chain;
- linear-domain contrast from `tools/luminance.py`;
- all-spot legacy ΔE for serenity and kings-court;
- wall vertex count, bake time (`window.__bakeMs`), draw calls.

```bash
python tools/luminance.py --apt serenity --sets b4a-task2-before
```

```js
window.__bakeReady.then(() => console.log(window.__bakeMs));
```

Two runs per apartment. The harness is deterministic on the reference machine — serenity's repeats have agreed to every printed digit before, so a disagreement is itself information.

- [ ] **Step 2: Understand the ceiling on this effect before measuring it**

Read `tour/bake.js:534-540` (defect 2, resolution). Wall quads are shaded from four geometric corners and Gouraud-interpolated at `SEG = 0.45`, and **each end reveal, top and bottom is one quad however large**. Corners on hidden surfaces returned ~0 when this was tried, 14% of serenity's wall vertices went to a true zero, and the living-room band rendered at pixel value 1 where it had been 85.

Refining `SEG` **shrinks the spoiled region; it does not remove the cause.** The full fix is a wall lightmap atlas and it is explicitly out of scope. Do not attempt one here.

- [ ] **Step 3: Turn on sampled ambient for walls and sweep SEG**

At `tour/bake.js:571`, change the sixth argument from `false` to `true`:

```js
          const L = shade ? lightAt(P, N, occ, data, false, true) : [0.5, 0.48, 0.46];
```

Then sweep `SEG` at `:556` over `0.45, 0.30, 0.22, 0.15`, measuring the full set from step 1 at each value. Report the whole sweep, not only the value you end up proposing.

- [ ] **Step 4: Watch for the trap, and do not fix it**

If black bands appear at wall junctions, **that is a No-Go signal.** Do not reach for dilation. Plan 3 task 5 measured exactly that: generalising the dilation gutter changed every apartment's runtime bake and moved kings-court's spawn-pooled p5 from 55.9 to 54.5. Whatever eventually replaces the one-ring gutter must be distance-based rather than texel-count-based and needs its own before/after on all three apartments — different work, not this task's.

Screenshot every junction artefact you see and file it, whichever way the verdict goes.

- [ ] **Step 5: Apply the exit criterion**

> **GO if serenity's linear-domain contrast ≥ 4.32. Otherwise NO-GO.**

Derived as a third of the current measured gap: render 3.384, photographs 6.196, so 3.384 + 2.812/3 = 4.32. **Do not re-derive this threshold and do not renegotiate it.** It was agreed before the work.

**The criterion's population is known to be weak and you are told so in advance.** `tools/luminance.py` filters through `delta_e.scorable`, which requires `poseVerified`; serenity has exactly two such spots — `1.webp` (Bathroom) and `11.webp` (Bedroom) — both among the highest-p5 rooms in the flat, and **the darkest spawn (Entrance, spawn-pooled p5 66.4) is not in that population at all.**

So this step has two halves and they do different jobs:
1. **The verdict rests on contrast ≥ 4.32 and nothing else.**
2. **You must additionally report spawn-pooled p5 over every `spawns[]` entry, including the Entrance, on all three apartments.** It does not change the verdict. It exists so a No-Go measured on two bright rooms is not written into the record as "walls do not help" when the dark room may have moved. **If the two disagree, say so plainly in the report and let the No-Go stand.**

- [ ] **Step 6: Apply the cost ceilings — any breach is also a No-Go**

- Draw calls past ≤400 desktop or ≤250 mobile: No-Go.
- Bake time: no fixed ceiling, but report all three against the medians (serenity 267 ms, horkyone-10 1323 ms, kings-court 8674 ms) and state the multiplier.
- Wall vertex count: report before and after. Walls are the one thing in this scene already merged into a handful of huge meshes.

- [ ] **Step 7: Verify the sampler actually ran**

A silent sampler failure is indistinguishable from success: `ambientVis` returns 1, the bake completes, and the render is bit-identical to the unsampled build — a harness would then score the old build and report it as "after".

```js
await window.__bakeReady; console.log(window.__ambSampled, window.__issues);
```

`__ambSampled` must be `true` on all three apartments. Assert on **this**, not on the render looking plausible. Also confirm `Sampler.selfTest()` returns 8/8.

- [ ] **Step 8: On GO — ship it**

Keep the chosen `SEG` and `sampled=true`. Bump `?v=108` → `?v=109`. Re-run `__faces()` from task 1 and confirm the winding fix survived: every wall still `near`. Commit the sweep, the metrics and the screenshots.

- [ ] **Step 9: On NO-GO — revert in full and commit the null result**

Restore `SEG` to `0.45` and the `lightAt` sixth argument to `false`. Confirm `git diff` against task 1's tip is **empty for `tour/`** — the shipped product must be byte-identical to task 1's tip, and `?v=` must **not** be bumped, since no shipped code changed. Commit the measurements, the sweep, the screenshots and a plain statement of what was measured and why it missed.

This is the same shape as plan 3 task 3's GTAO rejection, which is the model to follow: the thing was built, measured, looked at, and then not adopted, with the evidence preserved.

- [ ] **Step 10: Commit**

```bash
git add tour/bake.js tour/index.html docs/superpowers/metrics/serenity-b4a-task2-luminance.json docs/superpowers/metrics/kings-court-b4a-task2-luminance.json docs/superpowers/metrics/horkyone-10-b4a-task2-luminance.json
git commit -m "Task 2: walls take the sampled ambient -- GO/NO-GO against contrast >= 4.32"
```

---

### Task 3: Exposure and bloom re-fit

**Mandatory whatever task 2 decided.** Task 1 alone changes the render, so the fit from plan 3 task 4 has expired regardless. This was accepted knowingly when the winding was deferred; it is the price of that ordering, not an oversight.

**Files:**
- Modify: `tour/apartments/serenity.json`, `kings-court.json`, `horkyone-10.json` — the `exposure` key
- Modify: `tour/post.js` — bloom threshold/strength, only if the fit moves them
- Create: `docs/superpowers/metrics/{serenity,kings-court}-b4a-task3-exposure-sweep.json`, `…-final.json`
- Modify: `tour/index.html:254` — `?v=` bump

**Interfaces:**
- Consumes: whatever render tasks 1 and 2 left. Read the tip, do not assume task 2 shipped.
- Produces: three `exposure` values and a bloom threshold/strength pair, which task 4 gates against.

- [ ] **Step 1: Name the target before sweeping anything**

State, in writing, the luminance target you are minimising the difference against and where it comes from. **The specific trap this task can fail on has been sprung on this project once**: a prior fit swept serenity, picked the lowest-ΔE row, and described it as the closest luminance match while comparing 0.0036 against 0.0048 backwards. It did not look like cheating and nothing in the numbers flagged it; a review caught it.

- [ ] **Step 2: Sweep exposure with bloom disabled**

Two to three independent page loads per candidate. Record ΔE on every row but **never aim at it**. Current shipped values: serenity `0.329`, kings-court `0.575`, horkyone-10 `0.46`.

The in-page override is equivalent to editing the JSON, and this is true **by construction** in the vendored library, not merely empirically: `three.module.js:18345-18351` forces `NoToneMapping` whenever the render target is non-null — which is what `RenderPass` renders into — and `OutputPass.js:93` is the only consumer of `toneMappingExposure`.

- [ ] **Step 3: Re-measure the bloom constants from scratch**

Do not carry `1.8 / 0.1` forward on trust. Track the **fraction of frame over threshold**, never the peak — the peak scales with render-target size (9.75 at 240×150 to 16.23 at 1280×800) while the fraction holds at 21.4–21.5%.

- [ ] **Step 4: Where luminance and ΔE disagree, take luminance and say what it cost**

Precedent: kings-court's ΔE falls monotonically toward 0.50 while its luminance crossing sits at 0.575, and the luminance value was taken at a cost of +0.06 ΔE, disclosed.

- [ ] **Step 5: Fit horkyone-10 on sibling proximity**

It has no photographs. Its criterion is mean-scene-luminance within ±10 of the other two. If you run it with the full post chain rather than bloom-disabled, **name that as a deliberate deviation and why** — the precedent is that it is acceptable when every spawn measures 0.00% over threshold, so bloom contributes nothing there.

- [ ] **Step 6: Write the values and bump the cache**

Edit the three `exposure` keys. `exposure` must be a finite number `> 0`; `app.js` warns and falls back to 1.05 for anything else. Bump `?v=` **after** the last edit.

- [ ] **Step 7: Commit**

```bash
git add tour/apartments/serenity.json tour/apartments/kings-court.json tour/apartments/horkyone-10.json tour/index.html docs/superpowers/metrics/serenity-b4a-task3-exposure-sweep.json docs/superpowers/metrics/kings-court-b4a-task3-exposure-sweep.json
git commit -m "Task 3: re-fit exposure and bloom against the post-winding render"
```

---

### Task 4: The gate, and new baselines

**Files:**
- Create: `docs/superpowers/metrics/{serenity,kings-court}-b4a-task4-{BASE,gate}-legacy-allspots.json`
- Modify: `docs/PHASE-B-RESUME.md` — the baseline table under "The gate, restated 2026-08-15"

**Interfaces:**
- Consumes: the tip after tasks 1–3.
- Produces: new recorded baselines replacing serenity 16.61 and kings-court 18.90.

- [ ] **Step 1: Verify both halves of the gate exist**

```bash
grep -n "fov" tour/measure.js
grep -n "all-spots" tools/delta_e.py
```

Both have been deleted once and restored. Without them the gate is unenforceable. Check every session, do not assume.

- [ ] **Step 2: Measure both trees at once, in one session**

This is plan 3 task 7's method and it is the one that removes method as a variable: HEAD on `:8742`, a detached worktree at this branch's merge-base on `:8743`, the same scripts pointed at each.

The base is `b39a99a` — `main` at the time this plan was written, and this
branch's merge-base. Confirm it rather than trusting this line:

```bash
git merge-base HEAD main
git worktree add ../airbnb-base b39a99a
```

Run both arms back to back. Before and after then cannot differ by machine, session or harness.

- [ ] **Step 3: Attribute every movement past the floor**

Per the restated gate's rule 2. For each apartment, state the movement, the same-session paired A/B that establishes it, and which task produced it. **An unattributed movement past ±0.03 rounded / ±0.039 full precision fails the gate.**

Confirm each file carries `population: all-spot`, `scored == compareTotal`, `skippedPoseVerification: 0`, and re-derive each mean from its own `spots[]` array rather than trusting the summary field. Aggregate means cannot distinguish "different session" from "different camera" — only `spots[]` can, and this project has already shipped a mislabelled file that survived three review rounds because nobody checked the arrays.

- [ ] **Step 4: Check the hard stop**

No apartment worse by more than 0.5. If one is, stop the branch and report.

- [ ] **Step 5: Record the new baselines**

Update the baseline table in `docs/PHASE-B-RESUME.md` with the new values and the commit that produced them.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/metrics/serenity-b4a-task4-gate-legacy-allspots.json docs/superpowers/metrics/kings-court-b4a-task4-gate-legacy-allspots.json docs/PHASE-B-RESUME.md
git commit -m "Task 4: gate reading and new baselines under the restated gate"
```

---

### Task 5: Make the durable record match reality

The ledger at `.superpowers/sdd/` is **gitignored and dies with the branch.** Anything that must survive goes in a committed file. Plan 3 nearly lost a partner ruling this exact way.

**Files:**
- Modify: `tour/bake.js:502-547` — the defect comment block
- Modify: `CLAUDE.md` — the `bake.js` row and rule 5
- Modify: `docs/PHASE-B-RESUME.md` — the deferred table
- Modify: `docs/superpowers/metrics/README.md` — a narrated in-place entry

- [ ] **Step 1: Rewrite the bake.js comment block**

`:502-547` describes defect 1 in the present tense as a live bug. After task 1 it is history. Rewrite it to say what was wrong, that it is fixed, and — this is the part worth keeping — that the fix is a sign test and **not** an else-branch reversal, because that wrong fix has now been proposed twice in this project's history.

Defect 2's paragraph stays, updated with whatever task 2 measured.

- [ ] **Step 2: Update CLAUDE.md**

The `bake.js` row states walls get baked light but **no AO**, and that a floor-to-wall corner darkens on the floor side only. Whether that is still true depends on task 2's verdict. Write what the measurements show, not what was hoped for. Rule 5's geometry section should note that wall faces are now wound to match their normals.

- [ ] **Step 3: Remove the winding defect from the deferred table**

In `docs/PHASE-B-RESUME.md`, the row **`grid()` winds 8 of 12 wall faces backwards** — owner "plan 4 or 5" — is discharged. Replace it with what it cost and what it unblocked, and keep the note that **the wall atlas is now unblocked** for whoever writes 4c or plan 5.

Also update the three "consequences accepted knowingly" under "The wall-winding defect, deferred deliberately": one of them (GTAO's black walls) is now cured, though GTAO stays rejected on its surviving independent ground — the mobile draw-call breach, kings-court 150→282 against ≤250.

- [ ] **Step 4: Add the metrics README entry**

Follow the file's own convention — a narrated `>` blockquote marker in place, next to what it supersedes, rather than a new section at the end.

- [ ] **Step 5: Confirm nothing shipped changed**

```bash
git diff --stat HEAD~1 -- tour/
```

Docs and comments only. If `tour/` shows anything but comment text, the `?v=` rule applies and this step is wrong. Comment-only edits to `tour/bake.js` still count as a code edit for cache purposes — bump `?v=` if `tour/bake.js` was touched at all.

- [ ] **Step 6: Commit**

```bash
git add tour/bake.js tour/index.html CLAUDE.md docs/PHASE-B-RESUME.md docs/superpowers/metrics/README.md
git commit -m "Task 5: make the durable record match what 4a actually shipped"
```

---

## Self-review notes

- **Spec coverage.** Defect 1 → task 1. Defect 2 mitigation and its exit criterion → task 2. The re-fit both force → task 3. Gate and baselines → task 4. Documentation and the deferred-table discharge → task 5. Risks named in the spec — 28 cm narrower rooms, bake time, expired fit, "may deliver nothing visible" — appear as steps 10, 6, and the task 2 No-Go path respectively.
- **Out of scope stays out.** The wall atlas is named as blocked-but-unblocked in tasks 2 and 5 and is never a step. GTAO is touched only where task 5 corrects the record about it.
- **Known weakness carried forward deliberately:** task 2's criterion population is two bright rooms. It is stated in the spec, restated in task 2 step 5, and mitigated by a mandatory second reading that does not change the verdict.
