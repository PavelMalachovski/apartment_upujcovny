# Phase B plan 4b — content and poses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the resemblance metric compare like with like — point the mis-aimed cameras at their photographs' actual subjects, model the bathroom that was never built, and finish serenity's terrace opening.

**Architecture:** Config-only work. `tour/apartments/*.json` gains a taller terrace opening, a shower in the room that lacks one, and corrected `photoSpots`. No renderer change, no new assets, no new code paths — every object goes through an existing `F.*` constructor.

**Tech Stack:** Vanilla ES modules, no bundler, no build step. Three.js r185 vendored. Python 3 for `tools/serve.py`, `tools/delta_e.py`.

**Spec:** `docs/superpowers/specs/2026-08-16-phase-b4b-content-poses-design.md`. **Read it before task 1** — it corrects two stale facts in `PHASE-B-OBSERVATIONS.md` and states the rule this plan is easiest to break.

## Global Constraints

- **THE RULE THIS PLAN EXISTS UNDER: point the camera at the photograph's subject, never at the ΔE minimum.** Record ΔE for every candidate pose and choose none of them by it. This is the pose-shaped version of "fit toward luminance, never toward ΔE", and this project has already shipped one fit that picked a minimum and called it something else.
- `poseVerified` flips to `true` only when render and photograph show **the same subject**. It is never a score threshold.
- **Gate readings are `--all-spots`, never the `poseVerified` subset.** serenity scores 11, kings-court 14. Every metrics file must carry `population: all-spot`, `scored == compareTotal`, `skippedPoseVerification: 0`.
- **Name the camera AND the population in every metrics filename you create.** `delta_e.py` writes no camera field, so the filename is the only record. This project's sharpest failure entered through a filename.
- **Movement past the noise floor (±0.03 rounded / ±0.039 full precision) must be attributed by a same-session paired A/B or it fails.** Hard stop: nothing worse by more than 0.5 in one task. Live baselines entering this plan: **serenity 16.00, kings-court 18.58**.
- **The movement this plan produces is a measurement correction, not a rendering improvement.** Nothing about the renderer changes. Say so wherever the number appears.
- `window.__issues` must be empty on all three apartments before every commit.
- **Cache:** bump `?v=N` on the single module tag in `tour/index.html` (currently **`?v=113`**, line 254) after the last edit of a task. JSON counts — without the bump your config edits never reach the browser, a bug that has cost this project an hour.
- **Start `python tools/serve.py` with the sandbox disabled.** Its `POST /save/` returns HTTP 200 and silently writes nothing when sandboxed. Probe for the file on disk before trusting a capture. `serve.py:90`'s unguarded `base64.b64decode` kills a handler thread on a malformed body — known, deferred, do not fix.
- Playwright MCP is available; Playwright is **not** npm-installed here.
- **Furniture must clear doorways by ≥ 0.5 m** (CLAUDE.md rule 2a — passages have been blocked five times). **Furniture against a wall is placed by raycasting the wall face, never by arithmetic from the centreline** (rule 2h — that arithmetic buried two paintings inside a wall, which plan 4a had to dig out).
- Angles in apartment JSON are **degrees**. Yaw 0 looks north (−z), 90 west, 180 south, 270 east.
- Commit your own files explicitly. Never `git add -A`.

## File structure

| File | Responsibility in this plan |
|---|---|
| `tour/apartments/serenity.json` | Terrace opening geometry (task 1); six re-pointed spots and one re-mapped spot (task 2) |
| `tour/apartments/kings-court.json` | Bathroom 2 shower (task 3); four re-pointed spots (task 4) |
| `tour/index.html` | `?v=` bump after each task |
| `docs/superpowers/harnesses/2026-08-16-b4b/` | Created: before/after compare frames per touched spot. Evidence, not scratch |
| `docs/superpowers/metrics/*.json` | Created: gate readings per task |
| `docs/PHASE-B-RESUME.md`, `docs/superpowers/metrics/README.md` | Updated in task 5 |

---

### Task 1: serenity's terrace opening

**Files:**
- Modify: `tour/apartments/serenity.json` — `walls[4].openings[0]`
- Modify: `tour/index.html:254` — `?v=` bump
- Create: `docs/superpowers/harnesses/2026-08-16-b4b/terrace-before.jpg`, `…-after.jpg`
- Create: `docs/superpowers/metrics/serenity-b4b-task1-legacy-allspots.json`

**Interfaces:**
- Produces: a wider, taller terrace opening. Task 2 re-points cameras at it, so its final geometry is task 2's input — record the opening's world extent in your report.

- [ ] **Step 1: Read the spec's two corrections before trusting the observation notes**

`docs/PHASE-B-OBSERVATIONS.md` observation B1 says serenity's living room has a punched window. **That is stale.** The opening is already a door. What is still wrong is its size. Verify for yourself:

```bash
python -c "import json; w=json.load(open('tour/apartments/serenity.json'))['walls'][4]; print(json.dumps(w, indent=2))"
```

Expected today: `(3.1,5.25)–(5.75,5.25)`, `h 2.6`, one opening `{"at": 0.25, "w": 1.4, "type": "door", "terrace": true, "daylight": true, "curtain": "gray"}`.

- [ ] **Step 2: Capture the before, by eye**

```bash
python tools/serve.py
```

Open `http://localhost:8742/?apt=serenity&compare=1`, then in the console:

```js
await window.__bakeReady; await window.__compare('3.webp');
```

That is the render-versus-photograph divider — the only instrument in this repo that sees geometry errors. File the frame. **Note what you see**: per the spec, spot 3's camera faces away from this door, so the before frame is expected to show the wrong wall entirely. That is task 2's problem, not task 1's — you are capturing the opening's own appearance, so also take a frame from a camera that does face it.

- [ ] **Step 3: Widen and heighten the opening**

The photograph shows a floor-to-ceiling slider. A `type: "door"` opening is `DOOR_H` 2.05 high against this wall's `h` 2.6, and 1.4 m is narrow for a terrace slider.

Measure the photograph before choosing numbers — count the opening's height against the ceiling and its width against the wall it sits in, and say in your report what you measured and how. **Do not pick a width that happens to score well.** If the photograph cannot settle it, say so and choose the value that matches the visible proportion, stating it as a judgement.

Keep `terrace: true`, `daylight: true` and the curtain. If a full-height opening needs a different `type` than `door`, check what `builder.js` supports before inventing one — `PASS_H` is 2.2 and `type: "pass"` exists; a slider may be better modelled as a passage with a curtain than as a door.

- [ ] **Step 4: Bump the cache**

`tour/index.html:254`: `?v=113` → `?v=114`. **JSON edits need this too.**

- [ ] **Step 5: Verify the geometry did not break navigation**

A wall opening is a hole in a collider. Run all of these on serenity:

```js
window.__bakeReady.then(() => console.log(window.__issues));   // [] required
```

Then the four standing walk routes, the sky-leak raycasts from the living room and terrace zones (set `rc.camera` first or sprites throw, and include invisible meshes — ceiling overlays are one-sided), and the dollhouse tape against `areas`. A taller opening in an `ext: true` wall is exactly the shape that leaks sky.

- [ ] **Step 6: Capture the after and put the frames side by side**

Same recipe as step 2, same camera. The opening must read as the photograph's opening. File both frames in the harness directory.

- [ ] **Step 7: Re-read the gate and attribute the movement**

```bash
# open ?apt=serenity&measure=1&fov=legacy, then:
#   await window.__bakeReady; await window.__measure();
python tools/delta_e.py --apt serenity --all-spots --phase b4b-task1-legacy-allspots
```

Both arms **in the same session**, before and after. Confirm the file carries `population: all-spot`, `scored == compareTotal` (11), `skippedPoseVerification: 0`, and re-derive the mean from its own `spots[]` rather than trusting the summary field.

- [ ] **Step 8: Commit**

```bash
git add tour/apartments/serenity.json tour/index.html docs/superpowers/harnesses/2026-08-16-b4b docs/superpowers/metrics/serenity-b4b-task1-legacy-allspots.json
git commit -m "Task 1: finish serenity's terrace opening"
```

---

### Task 2: serenity's mis-pointed and mis-mapped spots

**Files:**
- Modify: `tour/apartments/serenity.json` — `photoSpots` entries for 3, 4, 5, 6, 7, 8, 9
- Modify: `tour/index.html:254` — `?v=` bump
- Create: `docs/superpowers/harnesses/2026-08-16-b4b/serenity-<file>-{before,after}.jpg` per spot
- Create: `docs/superpowers/metrics/serenity-b4b-task2-legacy-allspots.json`

**Interfaces:**
- Consumes: task 1's terrace opening — spots 3, 4 and 9 are supposed to see it.
- Produces: seven corrected spots and an honest `poseVerified` count for serenity.

- [ ] **Step 1: Read every `poseNote` before touching anything**

```bash
python -c "
import json
s=json.load(open('tour/apartments/serenity.json'))
for i,p in enumerate(s['photoSpots']):
    if p.get('poseNote'): print(i, p['file'], '->', p['poseNote'])
"
```

Those notes are the only automated trail of the defects they describe. They were written by the harness that found them, and **they are your specification for what each spot is supposed to show.**

- [ ] **Step 2: Handle 8.webp first, because it is a different defect**

Its note says the photograph this spot is meant to match "is actually the bathroom". That is a **mapping** error — the spot points at a bedroom and is attached to a bathroom photograph. No yaw fixes it.

Decide which is wrong: the spot's position or its `file`. Open the photograph and look. If the photograph is a bathroom, the spot belongs in the bathroom — move it, or re-map it to the photograph it actually matches, and say which you did and why.

- [ ] **Step 3: Re-point the six pose defects, one at a time, by looking**

For each of 3, 4, 9 (the terrace-door cluster), 5 (renders a closet corner, should be corridor/fridge/dining) and 6, 7 (render the wardrobe, should be the window wall and the bed):

```js
await window.__compare('3.webp');
```

Adjust `x`, `z`, `yaw` and, where the config supports it, the spot's own fov. **Choose the pose where the render shows the same subject as the photograph.** Take a frame at each candidate.

**Record ΔE for every candidate and use it to choose none of them.** Put the table in your report — it is the evidence that the rule was followed, and its absence is the evidence that it was not.

- [ ] **Step 4: Set `poseVerified` honestly**

Flip it to `true` only where the two frames show the same subject. Where they still do not — because the subject is not modelled — **leave it `false`, keep the `poseNote`, and update the note to say what is missing.** Spots 2 and 10 (the pool vista) stay `false` and belong to 4c; do not touch them.

- [ ] **Step 5: Bump the cache and verify**

`?v=` → next. Then `window.__issues` empty on serenity, and **validator check 4** specifically — it catches markers inside solids, which is exactly what a moved spot can become. A photo spot has been left inside a bathtub before.

- [ ] **Step 6: Re-read the gate and attribute**

```bash
python tools/delta_e.py --apt serenity --all-spots --phase b4b-task2-legacy-allspots
```

Same-session paired. **Expect a large movement** — six or seven spots start rendering their actual subjects for the first time. State in your report, in the same sentence as the number, that this is the metric starting to compare like with like and **not** a rendering improvement.

- [ ] **Step 7: Commit**

```bash
git add tour/apartments/serenity.json tour/index.html docs/superpowers/harnesses/2026-08-16-b4b docs/superpowers/metrics/serenity-b4b-task2-legacy-allspots.json
git commit -m "Task 2: point serenity's cameras at their photographs' subjects"
```

---

### Task 3: kings-court's Bathroom 2 shower

**Files:**
- Modify: `tour/apartments/kings-court.json` — `furniture`
- Modify: `tour/index.html:254` — `?v=` bump
- Create: `docs/superpowers/harnesses/2026-08-16-b4b/kc-bathroom2-{before,after}.jpg`
- Create: `docs/superpowers/metrics/kings-court-b4b-task3-legacy-allspots.json`

**Interfaces:**
- Produces: a shower inside Bathroom 2. Task 4 re-points spot 14 at it, so record its final world position and extent in your report.

- [ ] **Step 1: Confirm the room really has no shower**

```bash
python -c "
import json
k=json.load(open('tour/apartments/kings-court.json'))
for f in k['furniture']:
    if f.get('type')=='shower':
        print(f['x'], f['z'], 'inside' if 8.8<=f['x']<=11.4 and 0<=f['z']<=2.6 else 'OUTSIDE')
"
```

Expected: four entries, all OUTSIDE. Bathroom 2's bounds are `(8.8, 0)–(11.4, 2.6)`.

- [ ] **Step 2: Look at the photograph before placing anything**

Spot 14's photograph is a tight shower-fixture crop. Open it. The fixture's wall, the enclosure's shape and its corner are what you are modelling — not a generic box.

- [ ] **Step 3: Find the real wall faces**

Per CLAUDE.md rule 2h — **raycast, never compute from the centreline.** Centreline arithmetic is what buried two paintings inside a wall, and plan 4a had to dig them out.

```js
const a = window.__app, rc = new THREE.Raycaster();
rc.camera = a.camera;                        // required, or sprites throw
rc.set(new THREE.Vector3(10.1, 1.4, 2.0), new THREE.Vector3(0, 0, -1));
const h = rc.intersectObjects(a.scene.children, true).find(h => h.object.visible);
console.log('wall face z =', 2.0 - h.distance);
```

- [ ] **Step 4: Add the shower through the existing constructor**

`F.shower` is at `tour/builder.js:1207` and takes the shape every other entry uses:

```json
{ "type": "shower", "x": 0, "z": 0, "w": 1.3, "d": 1.2, "lvl": "main" }
```

Fill in `x`, `z`, `w`, `d` from steps 2 and 3. Going through `F.*` is what makes it merge into an existing draw call and get a shadow occluder — note that `shower` is in `OCC_SKIP` (`builder.js:1337`), so it is deliberately not an occluder; do not "fix" that.

**Clear the doorway by ≥ 0.5 m** (rule 2a). Passages here have been blocked five times, by a toilet, a nightstand, a vanity, a shelf tower and a dining table.

- [ ] **Step 5: Confirm it is where you think it is**

Raycast again and check your object is hit **before** the wall — the second cast rule 2h requires. Then take a top view with the floor cutaway (rule 2b), which catches blocked passages, furniture rotated across a room and objects floating in mid-air in one frame:

```js
const a = window.__app;
a.doll.enter(); a.doll.setLevel('1'); a.doll.on = false;
a.camera.position.set(10.1, 30, 1.3);
a.camera.up.set(0, 0, -1);
a.camera.lookAt(10.1, 0, 1.3);
a.renderer.render(a.scene, a.camera);   // raw render, not the post chain
```

- [ ] **Step 6: Bump the cache, verify, walk the room**

`?v=` → next. `window.__issues` empty on kings-court. Then walk into Bathroom 2 and out again — a shower is a collider and this is the exact class of change that has blocked a passage five times.

- [ ] **Step 7: Re-read the gate and attribute**

```bash
python tools/delta_e.py --apt kings-court --all-spots --phase b4b-task3-legacy-allspots
```

Same-session paired. Spot 14 will still be mis-pointed at this stage — that is task 4 — so expect a modest movement here, not the full one.

- [ ] **Step 8: Commit**

```bash
git add tour/apartments/kings-court.json tour/index.html docs/superpowers/harnesses/2026-08-16-b4b docs/superpowers/metrics/kings-court-b4b-task3-legacy-allspots.json
git commit -m "Task 3: model the Bathroom 2 shower that was never built"
```

---

### Task 4: kings-court's mis-pointed spots

**Files:**
- Modify: `tour/apartments/kings-court.json` — `photoSpots` entries for 2, 10, 14, 17
- Modify: `tour/index.html:254` — `?v=` bump
- Create: `docs/superpowers/harnesses/2026-08-16-b4b/kc-<file>-{before,after}.jpg` per spot
- Create: `docs/superpowers/metrics/kings-court-b4b-task4-legacy-allspots.json`

**Interfaces:**
- Consumes: task 3's shower — spot 14 is photographed at it.

- [ ] **Step 1: Read the four notes**

```bash
python -c "
import json
k=json.load(open('tour/apartments/kings-court.json'))
for i,p in enumerate(k['photoSpots']):
    if p.get('compare') and p.get('poseVerified') is False:
        print(i, p['file'], '->', p.get('poseNote'))
"
```

Six will print. **Two of them are not yours:** 18 (the rattan seating set does not exist — 4c) and 4 (the coffee corner, which needs a ruling — see step 5). Fix 2, 10, 14 and 17.

- [ ] **Step 2: Re-point the four, by looking**

Same method as task 2 step 3: `window.__compare(file)`, candidates recorded with their ΔE, **chosen by subject and never by score.**

- 17's own note already says "a pose problem, not a content one" — it should be reachable.
- 14 should now find the shower task 3 built. If it cannot, say so — that is evidence about task 3, not about the camera.
- 10 and 2 render blank walls and a steep TV-wall angle; look for the composition the photograph shows.

- [ ] **Step 3: Set `poseVerified` honestly and update the notes**

Same rule as task 2 step 4. Where a subject still does not exist, leave `false` and say what is missing.

- [ ] **Step 4: Bump, verify, re-read the gate**

`?v=` → next. `window.__issues` empty. Validator check 4 for markers inside solids.

```bash
python tools/delta_e.py --apt kings-court --all-spots --phase b4b-task4-legacy-allspots
```

- [ ] **Step 5: Surface the B4 decision — do not decide it**

kings-court spot 4 is a product detail photograph of a coffee machine on marble, and the model has no coffee corner. **Two honest options:** model the props, or drop the spot from the `compare` set.

**This is a merge-owner decision and the plan does not make it**, because dropping a bad spot improves the mean and a mean that improves that way must never read as a render improvement. Report both options, the mean each produces, and stop there.

- [ ] **Step 6: Commit**

```bash
git add tour/apartments/kings-court.json tour/index.html docs/superpowers/harnesses/2026-08-16-b4b docs/superpowers/metrics/kings-court-b4b-task4-legacy-allspots.json
git commit -m "Task 4: point kings-court's cameras at their photographs' subjects"
```

---

### Task 5: the gate, the baselines, and the record

**Files:**
- Create: `docs/superpowers/metrics/{serenity,kings-court}-b4b-task5-{BASE,gate}-legacy-allspots.json`
- Modify: `docs/PHASE-B-RESUME.md` — the baseline table and the pose-verification counts
- Modify: `docs/superpowers/metrics/README.md` — a narrated in-place entry
- Modify: `docs/PHASE-B-OBSERVATIONS.md` — mark B1 and the pose observations against what shipped

- [ ] **Step 1: Verify both halves of the gate exist**

```bash
grep -n "fov" tour/measure.js
grep -n "all-spots" tools/delta_e.py
```

Both were deleted once in this project's history and restored. Check every session.

- [ ] **Step 2: Measure both trees at once, in one session**

HEAD on `:8742` and a detached extraction of this branch's merge-base on `:8743`, the same scripts pointed at each. Plan 4a used `git archive` rather than a worktree and that worked cleanly. Before and after then cannot differ by machine, session or harness.

- [ ] **Step 3: Attribute every movement, and name what it is**

Per apartment: the movement, the same-session pair establishing it, and which task produced it. Then the sentence this plan exists to make sure gets written:

> This movement is the metric beginning to compare like with like. **No rendering code changed in this plan.**

Confirm each file carries `population: all-spot`, `scored == compareTotal`, `skippedPoseVerification: 0`, and re-derive every mean from its own `spots[]`.

- [ ] **Step 4: Record the new baselines and the honest pose counts**

Update `docs/PHASE-B-RESUME.md`'s baseline table with the new values and the commit. Also update **"What the metric can and cannot see"** — it currently says serenity passes 2 of 11 and kings-court 8 of 14. Those numbers move in this plan and are quoted in several places.

- [ ] **Step 5: Correct the observation record in place**

`docs/PHASE-B-OBSERVATIONS.md` B1 says serenity has a punched window. It has not since before this plan started. **Mark it superseded in place — do not delete it** — this project's convention is a narrated marker beside what it supersedes, and the observation is the record of what was true when it was written.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/metrics docs/PHASE-B-RESUME.md docs/PHASE-B-OBSERVATIONS.md
git commit -m "Task 5: new baselines, honest pose counts, and the observation record corrected"
```

---

## Self-review notes

- **Spec coverage.** serenity's opening → task 1. Its six pose defects and one mapping defect → task 2. kings-court's shower → task 3. Its four pose defects → task 4. Gate, baselines and record → task 5. The B4 decision is surfaced in task 4 step 5 and deliberately not made. The pool, sky, rattan set, GLTF and PBR stay out, routed to 4c.
- **The rule appears in the Global Constraints, in task 2 step 3 and in task 4 step 2**, because it is the one this plan is easiest to break and a single mention would not survive a skim.
- **Known risk carried deliberately:** this plan will move the gate more than any plan in this phase, and every task says in its own words that the movement is a measurement correction rather than a rendering improvement. If that sentence goes missing, the plan has failed even with good numbers.
