# r128 reference set — phase B migration regression net

Fixed-camera frames captured from the current Three.js r128 build, one per
`spawns` entry plus two dollhouse shells (`doll-1` = ground floor cutaway,
`doll-all` = whole apartment from above), at 640x400, pixel ratio 1, through
the full render pipeline (light bake + post-processing). Captured with
`tour/refshots.js` (`?refshots=1`) via `window.__refshots(dir)`, compared with
`tools/compare_shots.py`. This is the regression net every later task in the
r185 migration plan is judged against — nothing after task 1 is verified
without it.

**The frames themselves are not committed** (`.gitignore` excludes
`tools/shots/` and `*.jpg`). What's committed is this file: the proof that
the comparer actually detects a real change, and the reference it will be
compared against once r185 frames exist.

## Threshold

**`--max-mad 2.0`, the script's own default — not raised.** A same-session
repeat (see "Repeat run" below) landed at **MAD 0.00 on every frame**, so
there was no noise floor to accommodate. This took two fixes to reach (see
"Bugs found while proving the net works" below); before them, a same-session
repeat produced worst-case MAD in the 50s (camera-roll corruption) and then,
after fixing that, ~2.4-2.6 (unpinned film-grain noise) — both of which would
have forced a much looser threshold had they gone unnoticed. `--max-mad 2.0`
is therefore the number every later task's r128-vs-r185 comparison should
start from.

## Frames captured, per apartment

| Apartment | Spawns | Frame names | Total |
|---|---:|---|---:|
| `serenity` | 5 | entrance, living-room, bedroom, bathroom, pool-terrace, doll-1, doll-all | 7 |
| `kings-court` | 14 | entry-hall, kitchen, dining-room, living-room, bedroom-1, bedroom-2, bedroom-3, hallway, bathroom-2, stairs, upper-hall, upper-living-room, upper-bedroom, terrace, doll-1, doll-all | 16 |
| `horkyone-10` | 5 | living-room, bedroom, bathroom, hall, terrace, doll-1, doll-all | 7 |

30 frames total, filed as `ref_<apt>_<slug>.jpg` under `tools/shots/r128/`.
`?check=1`'s `window.__issues` was `[]` for all three before capture.

## Proof the comparer actually works (steps 5 and 6)

Both runs below are the **final** runs, captured on `serenity` at
`tour/index.html?v=68`, after both bugs described below were fixed. `r128`
and `perturbed`/`r128-repeat` were captured in the same page session without
reloading, per the brief (keeps `builder.js`'s `Math.random()` procedural
textures identical between sets).

**Perturbed run — must fail.** `renderer.toneMappingExposure` multiplied by
1.10 (0.33 -> 0.363), full set re-captured, exposure restored, compared
against the unperturbed set:

```
python tools/compare_shots.py --a r128 --b perturbed
```

```
ref_serenity_bathroom.jpg                    MAD   6.37  FAIL
ref_serenity_bedroom.jpg                     MAD   6.42  FAIL
ref_serenity_doll-1.jpg                      MAD   0.25  ok
ref_serenity_doll-all.jpg                    MAD   0.25  ok
ref_serenity_entrance.jpg                    MAD   5.84  FAIL
ref_serenity_living-room.jpg                 MAD   5.05  FAIL
ref_serenity_pool-terrace.jpg                MAD   4.15  FAIL

7 frames, worst MAD 6.42, threshold 2.00, 5 failing
```

**Exit code 1. Worst MAD 6.42.** 5 of 7 frames fail, all comfortably above
the 2.0 threshold. The two dollhouse frames (0.25) don't cross it — a
genuine, worth-stating finding, not a tool defect: a top-down cutaway is
dominated by baked, matte lightmap colour, where a 10% tone-mapping shift
moves the pixel value much less than it does in an eye-level shot with
direct light sources, glazing and glossy surfaces in frame. The run still
fails overall, which is what step 5 requires.

**Repeat run — must pass.** Same exposure, same page session, captured
again with no change at all:

```
python tools/compare_shots.py --a r128 --b r128-repeat
```

```
ref_serenity_bathroom.jpg                    MAD   0.00  ok
ref_serenity_bedroom.jpg                     MAD   0.00  ok
ref_serenity_doll-1.jpg                      MAD   0.00  ok
ref_serenity_doll-all.jpg                    MAD   0.00  ok
ref_serenity_entrance.jpg                    MAD   0.00  ok
ref_serenity_living-room.jpg                 MAD   0.00  ok
ref_serenity_pool-terrace.jpg                MAD   0.00  ok

7 frames, worst MAD 0.00, threshold 2.00, 0 failing
```

**Exit code 0. Worst MAD 0.00** — every one of the 7 frames bit-for-bit
identical under MAD. Better than the brief's own "should land near 0"
expectation, and only true because of the second fix below.

## Bugs found while proving the net works

Both were invisible until steps 5/6 actually exercised the tool across
multiple captures in one page session — exactly the class of bug this task
exists to catch, just found in the harness itself before it ever got to
judge r185.

**1. Dollhouse capture rolls every later walk-view frame ~180 degrees
(`tour/refshots.js`).** `WalkControls.update()` (`tour/controls.js`) sets
`camera.rotation.order/.y/.x` from yaw/pitch but has never needed to touch
`.z` — safe throughout the live app because the real dollhouse orbit camera
(`doll.js`) clamps its pitch to `[0.3, 1.45]` rad and so never points exactly
straight down. `refshots.js`'s own top-down shell shot does exactly that
(camera at `y=40` looking straight down, `up=(0,0,-1)` for a north-up plan
view), a gimbal-lock-adjacent case whose `camera.lookAt()` leaves a large,
persistent roll baked into `rotation.z` (~3.09 rad, measured) that nothing
downstream ever clears. A single `__refshots()` call is unaffected (its own
walk views render before its own doll views), but any second call in the
same session inherits the previous call's leftover roll on every walk frame
— which is exactly the multi-capture-per-session shape steps 5/6 require.
First measured indirectly (an `r128` vs `r128-repeat` same-session comparison
that should have passed came back at worst MAD 59.39, exit 1, i.e. the
"must-pass" proof failing), then confirmed directly by reading back the
`entrance` frame from each set: `r128` shows the dining/living room
right-side up, `perturbed`/`r128-repeat` show an unrelated-looking,
point-symmetric view of the same space. Fixed by setting
`camera.rotation.z = 0` right after `WalkControls.update()` in the walk
branch, and again in the `finally` restore (the sequence always ends on a
doll-kind view, so without the second reset the live game loop would resume
rolled too). `tour/controls.js` itself is untouched — the fix stays inside
the one file that puts the camera into this state, since nothing else in the
app ever does.

**2. Unpinned film-grain time makes even a true repeat noisy
(`tour/refshots.js`).** `post.js`'s grain/vignette pass reads a `time`
uniform that only ever advances via app.js's own `requestAnimationFrame`
loop (`post.render(now * 0.001)`), which keeps running in the background
across the `await fetch(...)` calls between captures. Calling
`a.composer.render()` directly (as the brief's original code did) renders
with whatever `time` the live loop last set — effectively "now" — so two
captures of an unchanged scene taken moments apart differ by a few MAD
purely from the grain dice roll. After fixing bug 1, the repeat run's worst
MAD was ~2.4-2.6 (just over the 2.0 default) instead of nowhere near 0.
Fixed by rendering through `a.post.render(0)` instead of
`a.composer.render()` directly — same pass chain, same bloom/grain/vignette
a real visitor sees, just with the grain seed pinned so two captures of the
same content are actually comparable. `a.post` is part of the real
`window.__app` (see `tour/app.js`'s `window.__app = {...}` assignment) even
though the brief's interface summary only named `composer`; falls back to
`a.composer.render()` then a bare `renderer.render()`, matching the existing
null-composer fallback for weak-GPU/missing-vendor-file sessions where
`post.create()` returns `null`.

Both fixes live entirely in `tour/refshots.js` (new in this task, gated
behind `?refshots=1`, never loaded for a real visitor) — no production file
was changed to reach these results.

## Task 6: r128 vs r185 comparison

`--max-mad 2.0` (unchanged from above). Full method, tables and self-review
in `.superpowers/sdd/2026-08-12-phase-b1-migration/task-6-report.md`.

**PointLight.decay: no change.** The one `new THREE.PointLight(...)` call
(`builder.js`, `buildLights`) already passes an explicit 4th argument,
`1.6` — not the r128 default of `1` the brief expected to find missing.
`git blame` dates that literal to commit `8a5d34d` (2026-08-09), a full
migration cycle before the r128 reference set was frozen (`64add93`), so the
r128 captures already reflect `decay=1.6`. Setting it to `1` as the brief's
Step 2 literally reads would have been a real behaviour change away from
parity, not toward it — the trap the whole exercise exists to catch, just
one step earlier than expected. Left untouched.

**Sequence and result, one variable at a time (worst MAD across all 30
frames each time):**

| Capture | Change | Worst MAD | Mechanism |
|---|---|---:|---|
| `r185-baseline` | none (decay already correct) | 64.61 | — |
| `r185-a-colormgmt` | `THREE.ColorManagement.enabled = false` | 49.86 | r155+ auto-decodes hex `Color`s as sRGB; r128 never did. Not in any prior task's scope (task 4 covered only texture `.colorSpace`, never this separate, renderer-global switch). |
| `r185-b-bloom` | bloom threshold `0.92` → `1.294` | 49.97 | Domain conversion (see below); helped exactly the two frames task 5 flagged (serenity bathroom 34→13, bedroom 43→21), roughly neutral elsewhere as expected. |
| `r185-c-lightmap` | lightmap `lightMapIntensity` `1.7` → `1.7*PI` | 46.42 | r185's `MeshBasicMaterial` lightmap chunk gained a `* RECIPROCAL_PI` r128 never had (three.module.js `fragment$a`) — every baked floor/ceiling/attic surface (not walls, which use vertex colours) rendered at roughly a third of r128's brightness. Biggest single mechanism found; cut every non-dollhouse frame's MAD by roughly half to two-thirds. |
| `r185-d-sky` (rejected) | background/fog compensated for exposure 1.05 only | 62.65 | Helped kings-court/horkyone-10 dollhouse frames a lot, but made serenity's *worse* (46→63) because its exposure is 0.33, not 1.05. Reverted for the exposure-aware version below — recorded here because a rejected fix with a number is still information. |
| `r185` (final) | background/fog compensated using each apartment's own `toneMappingExposure` | **41.33** | Same domain conversion as bloom, generalized to read the real per-apartment exposure instead of a hardcoded one. |

**Final: 30 frames, worst MAD 41.33, threshold 2.00, 30 failing.** Down from
64.61 before any change (36% reduction in worst-case error), but the gate
does not pass — recorded honestly, not silently.

**Residual, with best explanation:**
- **Dollhouse frames stay the worst category** (8.7–41.3 MAD) even after the
  sky fix, because they're dominated by open-sky pixel area where any
  remaining background/environment mismatch shows most. serenity's two
  dollhouse frames (41.3, 40.9) are the global worst — its 0.33 exposure
  sits furthest from the bloom threshold's 1.05 calibration, so whatever
  residual the bloom conversion carries lands hardest there too.
- **The sky fix made three serenity walk-frames worse** (entrance 20.1→21.3,
  living-room 22.7→32.3, pool-terrace 26.3→38.2) even though it improved
  serenity's own dollhouse frames (46.4→41.3) and the worst-of-30 headline
  number. Best explanation: serenity's compensated linear sky is much
  brighter than the naive hex (exposure 0.33 needs a bigger push; blue
  channel ends up at 3.8, vs 1.2 at exposure 1.05) and outdoor/window-facing
  frames now plausibly cross the (also-approximate, 1.05-calibrated) bloom
  threshold where they didn't before — two approximate fixes interacting.
  Not chased further: isolating it needs re-deriving bloom's threshold
  per-apartment-exposure too (the same generalization already applied to
  the sky), which is a real next step but a new variable, not this one.
- **Every interior frame still sits 8–20 MAD above threshold** after all four
  mechanisms. Visual comparison (kings-court kitchen, before/after in the
  task report) shows the two frames are now close on ordinary inspection —
  wall, ceiling, floor and curtain tones all read as matching — with the
  most visible remaining difference a faint blue tint on r128's window glass
  panels that r185 doesn't reproduce. No single further mechanism was found;
  most likely a combination of JPEG/compression noise, antialiasing at
  material edges, and smaller uninvestigated shader-chunk deltas of the same
  general shape as the lightmap one, each individually below the threshold
  where hand-forensics on a single frame can separate it from the others.

## Fix round: grain/vignette was one of those "smaller uninvestigated
## shader-chunk deltas" — and the biggest one found

Coordinator-flagged: `GrainVignetteShader` sits before `OutputPass` in
`post.js`'s chain, so — exactly like the bloom threshold — it reads and
writes linear HDR values where r128 fed it gamma-encoded ones (r128's own
pre-task-5 comment says so outright, recovered via git history). Confirmed
by direct resemblance measurement first, not just pixel diff: coordinator's
`tools/delta_e.py --apt serenity --phase b1-check` on the state above gave
**mean ΔE2000 17.79** against phase A's committed **16.58**
(`serenity-a6-palette-fix2.json`) — resemblance regressed 1.2 points, ~15%
of phase A's gain, not just pixels moving.

**Disable-test (asked-for first step) was inconclusive on its own**: worst
MAD 41.33 → 41.96 with the pass off entirely — most frames got *slightly
worse*. Confounded: r128's own captures also carry grain/vignette
(correctly domained), so "disable" removes both the bug and the
r128-matching effect at once. Reported as a non-collapse, not overridden.

**Real test: reorder, don't convert.** Unlike the bloom threshold (a
comparison point) or the lightmap scalar (a pure pre-nonlinearity multiply),
neither grain constant has an exact linear-domain equivalent — additive
noise added pre-tonemap produces a brightness-dependent lift after encoding
(large near black, negligible near white; provable from the shader alone),
and the vignette multiply changes which part of ACES's compressive curve a
pixel lands on. `OutputPass`'s own class doc says passes needing sRGB input
must follow it — moved `composer.addPass(grain)` to after
`composer.addPass(new OutputPass())`, zero constants touched. Exact
behaviour preservation, not an approximate conversion.

**Result — reordering alone, no constant changed:**

```
30 frames, worst MAD 34.97, threshold 2.00, 27 failing   (was 41.33 / 30 failing)
mean dE2000 (serenity): 17.26                             (was 17.79; baseline 16.58)
```

Three frames now pass the 2.0 threshold outright (both `horkyone-10`
dollhouse frames, `kings-court`'s ground-floor dollhouse frame) — the
largest single-change improvement of anything found in this whole task.
ΔE2000 recovered 0.53 of the 1.21-point regression (~44%), still 0.68 above
the phase-A baseline. Both gates still fail. Full derivation, the exact
disable-test numbers, and the argument for why a constant conversion isn't
possible here (not just harder) are in
`.superpowers/sdd/2026-08-12-phase-b1-migration/task-6-report.md`'s "Fix
round" section.

**Left alone, flagged for next time:** `app.js`'s `invertR128Sky` (previous
round) inverts the same tonemap chain at each apartment's *current*
`toneMappingExposure`. The next plan reportedly re-fits exposure from
scratch — when that happens this goes stale for every apartment
simultaneously, silently (no `window.__issues` entry). It already takes
`exposure` as a parameter rather than a baked-in constant so re-running it
is cheap, but that has to actually happen alongside the refit, not be
assumed.

**Correction, next round: `invertR128Sky`/`applyR128SkyParity` removed
entirely**, not left in place. Measured directly against the metric that
actually matters (ΔE2000, not MAD): 17.26 with the apparatus, 17.22 without
— worth **−0.04**, nothing, slightly the wrong way, for 76 lines coupled to
a value (`toneMappingExposure`) the next plan re-fits from scratch. Superseded
by the final summary below.

---

## Final summary — task 6 complete, gate redefined (commit `1b95f39` of the plan)

**Pixel parity with r128 is not the gate any more.** Fifty-seven Three.js
releases (r128→r185) changed the standard-material BRDF, the IBL path and
`PMREMGenerator`; reproducing r128's pixels exactly would mean shipping
r128's shaders, which defeats the purpose of migrating. `compare_shots.py`
is a **diagnostic** from here on, not pass/fail. The real gates are (1)
structural correctness — hard pass/fail, fully met — and (2) resemblance to
the real photographs (`delta_e.py`) — bounded and explained, not required to
be zero, because every constant the light bake owns was fitted against
r128's pipeline and is mis-fitted under a corrected one **by construction**.
Re-fitting those constants (`EXP`, `WEXP`, the ambient base, serenity's
`exposure: 0.33`) is explicitly plan 2's job, not task 6's.

### The five real behavioural differences found, each with its mechanism and conversion

| # | Difference | Mechanism | Conversion | Status |
|---|---|---|---|---|
| 1 | `ColorManagement.enabled` | Defaults `true` from r155; r128 had no colour-management system, hex `Color`s passed straight through as linear | Disabled globally in `main.js`, before any classic script constructs a `Color` | Kept — largest single contributor to closing the gap |
| 2 | Bloom threshold | r128's patched composer fed `UnrealBloomPass` fully tonemapped+sRGB-encoded pixels; r185's `RenderPass` writes raw linear radiance | `0.92` → `1.294`, exact ACES/sRGB inversion for a neutral input (both ACES matrices have row-sum 1, exact not approximate), calibrated at exposure 1.05 | Kept, then superseded — see note below |
| 3 | Lightmap intensity | r185's `MeshBasicMaterial` `USE_LIGHTMAP` shader branch (`three.module.js`, `fragment$a`) gained `* RECIPROCAL_PI` that r128 never had; every baked floor/ceiling/attic surface rendered ~⅓ as bright (walls use vertex colours, a different chunk, unaffected) | `lightMapIntensity` `1.7` → `1.7 * Math.PI` — exact cancellation, a pure pre-nonlinearity multiply | Kept — biggest single mechanism by frame-count affected |
| 4 | Grain/vignette domain | Same domain move as #2, for a whole shader instead of one constant: `GrainVignetteShader` ran before `OutputPass`, reading/writing linear HDR instead of encoded values | **Not a constant conversion** — proven not to have an exact one (additive grain's needed offset is brightness-dependent; provable from the shader). Pass reordered to run after `OutputPass`, restoring the exact domain its constants were always written for, with the constants themselves untouched | Kept — second-biggest mechanism, moved 3 frames under the old 2.0 diagnostic threshold outright |
| 5 | Background/fog tone-mapping | r128 never tone-mapped or sRGB-encoded a plain `Color` background/fog clear; r185's single-final-resolve `OutputPass` processes the whole buffer uniformly, background included | Built (76 lines, exact per-apartment-exposure ACES inversion), measured, **removed** | **Reverted** — see below |

**Difference 2's status, corrected (a later whole-branch review).** "Kept"
was accurate for this table's own scope — the r128→r185 migration itself,
whose mechanism and conversion columns above are unchanged history — but it
stopped being true of the shipped constant the same phase this document
already tracks changes for: phase B2 task 7 found there was no longer one
shared exposure to hold `1.294`'s analytic derivation valid for (each
apartment fits its own now, see `docs/superpowers/metrics/README.md`
task 7), refit it empirically instead, and shipped **1.8**. `strength`
moved the same task, `0.22` → **0.1** — see "B. Bloom `strength`" below,
corrected the same way. Both current in `tour/post.js`; full derivation in
`docs/superpowers/metrics/README.md`, "Bloom: threshold moved, strength
moved, both empirically." This file went uncorrected long enough after that
task that a later review found the table above still reading as current
state instead of migration history.

**The plan's `PointLight.decay` assumption was wrong.** The brief expected a
bare `new THREE.PointLight(color, intensity, distance)` silently defaulting
from r128's `1` to r155+'s `2`. The one dynamic `PointLight` in the codebase
(`builder.js`) already passed an explicit 4th argument, `1.6`, since commit
`8a5d34d` — a full migration cycle before the r128 reference set was even
frozen. The r128 captures already reflect `decay=1.6`; setting it to the
brief's assumed default of `1` would have moved r185 *away* from parity, not
toward it. No code change. This was the first sign the plan's model of where
the gap would be was incomplete — differences 1, 3, 4 and 5 were all found
by investigating why the measured gap was far larger than the plan's
original two flagged causes (decay, bloom) could explain.

### Why difference 5 was reverted — the cautionary result

Preserving the background/fog behaviour cost 76 lines in `app.js`: a
from-scratch numeric inversion of the full ACES 3×3 matrices plus the
`RRTAndODTFit` rational fit plus the sRGB transfer function, parameterized
by each apartment's `toneMappingExposure` so it wouldn't repeat the mistake
of a single hardcoded exposure (a first attempt at that, calibrated only at
1.05, was tested and rejected — it helped kings-court/horkyone-10 but made
serenity worse, worst MAD 46.4→62.6). The generalized version was exact by
construction and passed its own round-trip check.

None of that mattered to the metric that actually matters. Measured
directly, A/B, no file edit (reset `scene.background`/`scene.fog.color` to
the plain hex at runtime, re-ran `__measure()` + `delta_e.py`):

| | mean ΔE2000 (serenity) |
|---|---:|
| With `invertR128Sky`/`applyR128SkyParity` | 17.26 |
| Without (plain `0xbcd5e8`) | 17.22 |

**−0.04.** Nothing, and slightly the wrong direction, for an apparatus that
also left a background linear value of `(1.053, 2.103, 3.815)` — a blue
channel at 3.8× nominal — coupled to a `toneMappingExposure` the next plan
re-fits from scratch. This is what optimising toward `compare_shots.py`'s
pixel-diff number, instead of the resemblance metric the product is
actually judged by, produces: real engineering effort spent making pixels
match a reference that was never the thing that mattered. **Removed.**
`scene.background`/`scene.fog` are back to the plain `new
THREE.Color(0xbcd5e8)` / `new THREE.Fog(0xbcd5e8, 40, 90)` they always were,
with a comment recording the difference as a **known, accepted** one — not
something the code compensates for.

### Final numbers (differences 1–4 kept, difference 5 reverted)

**`compare_shots.py` — diagnostic, not a gate:**

```
30 frames, worst MAD 50.15, threshold 2.00 (informational), 30 "failing" (informational)
```

Worse than the last round's 34.97/27-failing on the dollhouse and outdoor
frames specifically (serenity `doll-1`/`doll-all` 30.72/30.30 → 50.12/50.15;
kings-court and horkyone-10's dollhouse frames, which had passed outright
with difference 5 in place, no longer do). **Expected, and not a
regression** — those frames only "passed" because a 76-line apparatus was
bending pixels toward a reference that the resemblance metric says wasn't
worth bending toward. This number is now read for which frames are worth a
human look, not compared to 2.0.

**`delta_e.py` — the gate that matters, both apartments with committed
baselines:**

| Apartment | Baseline (phase A, committed) | Final (this task, all 4 kept mechanisms) | Change |
|---|---:|---:|---:|
| serenity | 16.58 (`serenity-a6-palette-fix2.json`) | **17.23** (`serenity-b1-final.json`) | +0.65 (worse) |
| kings-court | 22.44 (`kings-court-baseline.json`) | **21.21** (`kings-court-b1-final.json`) | **−1.23 (better)** |

**Not a uniform regression.** kings-court's resemblance to its own
photographs *improved* after the full r128→r185 migration plus all four
kept fixes — it was never scored between the migration and this task, so
this is the first measurement of it. serenity regressed, by less than the
gap between its two intermediate ΔE readings this task produced (17.79 with
the domain bugs present → 17.26 after the grain/vignette fix → 17.23 after
also dropping the sky apparatus), i.e. most of serenity's regression was
already clawed back by differences 1–4; a further 0.65 remains open, on one
of two scored apartments.

### The residual, stated as unrecoverable by construction

**Not an open defect. Not something task 6 or a further mechanism hunt
should chase.** Two independent, sufficient reasons:

1. **The rendering math changed underneath, permanently.** Fifty-seven
   Three.js releases separate r128 from r185. The standard-material BRDF,
   the image-based-lighting path and `PMREMGenerator` (the environment
   reflection this app's `captureEnvironment()` depends on) all changed in
   ways with no single flag or constant to undo — unlike the five
   differences above, which were each one specific, identifiable, reversible
   mechanism. Reproducing r128's pixels exactly, at this point, would mean
   vendoring r128's shaders — the opposite of a migration.
2. **Every constant the light bake owns was fitted against the old
   pipeline, and is now mis-fitted by construction.** `bake.js`'s `EXP`
   (1.7) and `WEXP` (1.25) headroom constants, the hardcoded indoor/outdoor
   ambient base in `lightAt()`, and serenity's own hand-fitted
   `exposure: 0.33` were all tuned, by eye or by phase A's own iterative
   `delta_e.py` process, against how r128 rendered. r185 renders the exact
   same scene data differently (correctly, per reason 1) — so a constant
   tuned to compensate for r128's specific rendering behaviour necessarily
   over- or under-compensates now. This is **not a bug task 6 introduced or
   could fix**; it is what "the pipeline under these constants changed"
   means, arithmetically. Re-fitting them against r185's actual output is
   plan 2's step 4, explicitly, per the plan document's own gate
   redefinition (commit `1b95f39`).

**This branch does not merge to `main` until plan 2's exposure re-fit
restores ΔE2000 to at least the r128 baseline on both scored apartments.**
Recorded here so the next task starts from the right number, not from 16.58
or 22.44 as if this task hadn't moved them.

---

## Fix wave after the whole-branch review — the differences table becomes six

A whole-branch code review found a **sixth** r128→r185 behavioural difference
that tasks 1–7 missed, and two changes that are real but deliberately not
converted. The table above is superseded by the one here.

### Difference 6 — the legacy-lights π was converted for lightmaps and missed for direct light

**This is the same units change as difference 3, on the other half of the
pipeline.** r128 shipped `WebGLRenderer.physicallyCorrectLights = false`
(verified in the recovered r128 build: `this.physicallyCorrectLights=!1`) and
this app never set it, so `#define PHYSICALLY_CORRECT_LIGHTS` was never
emitted and **three** shader chunks took their legacy branch, each
multiplying irradiance by π:

| r128 chunk | Function | Legacy branch |
|---|---|---|
| `lights_pars_begin` | `getAmbientLightIrradiance()` | `#ifndef PHYSICALLY_CORRECT_LIGHTS  irradiance *= PI; #endif` |
| `lights_pars_begin` | `getHemisphereLightIrradiance()` | same |
| `lights_physical_pars_fragment` | `RE_Direct_Physical()` — directional **and** point | same |

r155 removed the legacy switch. Verified in the vendored r185 copy before
applying anything: `PHYSICALLY_CORRECT_LIGHTS` appears **nowhere** in
`tour/lib/three-0.185.0/`, `getAmbientLightIrradiance()` now returns
`ambientLightColor` unchanged, and `RE_Direct_Physical()` is a bare
`irradiance = dotNL * directLight.color`. Difference 3 already answered the
`MeshBasicMaterial` lightmap half of this exact units change with
`lightMapIntensity = 1.7 * Math.PI` (`bake.js:251`). The direct-light half
was never done — every light intensity in `builder.js` was authored under
r128 and is short by exactly π on r185.

**Conversion:** every intensity `builder.js` creates is multiplied by
`LEGACY_PI` (`Math.PI`), with the derivation in a comment above
`buildLights`. This is a mechanism, not a tuning: r185's `WebGLLights.setup()`
builds every one of these uniforms as a plain `color * intensity`, so scaling
`intensity` by π reproduces r128's `irradiance *= PI` **exactly**, not
approximately.

| Light | Before | After |
|---|---:|---:|
| `AmbientLight` 0xfff2e2 | 0.22 | 0.6912 |
| `HemisphereLight` 0xdfeaf5/0x8a7a66 | 0.38 | 1.1938 |
| `DirectionalLight` 0xfff0d8 (sun) | 0.55 | 1.7279 |
| `PointLight` 0xffe4c0 (per `dyn` lamp) | 0.42 | 1.3195 |

**Only two of those four are live in normal operation.** `app.js` detaches
the `envFallback`-tagged `AmbientLight` and `HemisphereLight` before
`captureEnvironment()` and re-attaches them only if the capture fails, so a
scene traverse after load shows just the sun and the point lights. The
ambient/hemisphere conversion still matters — it is the fallback every
old device and every context-loss path lands on — but the measured effect
below is the sun plus the lamps alone.

### Accepted, documented, deliberately unconverted

Two changes in the same category as the BRDF/IBL residual: real, identified,
and **not** converted, because converting either would mean re-implementing
r128 inside r185 rather than migrating to it.

**A. `PointLight` distance attenuation.** r128's legacy branch of
`punctualLightIntensityToIrradianceFactor()` is a windowed
`pow(saturate(1 - d/distance), decay)`; r185's `getDistanceAttenuation()` is
the physical `1/max(d^decay, 0.01) * (1 - (d/distance)^4)^2`. Both recovered
from source, not from memory. At the values actually used
(`intensity 0.42`, `distance 7.0`, `decay 1.6`) the magnitude is:

| Distance from lamp | r185 / r128 |
|---:|---:|
| 0.5 m | ≈1.1× (slightly brighter) |
| 2 m | ≈5.6× **dimmer** |
| 3 m | ≈8× **dimmer** |

Converting this means shipping r128's attenuation in a custom shader — i.e.
shipping r128's shaders, which the redefined gate explicitly rejects.
Accepted as an r185 correction. Recorded, not compensated.

**B. Bloom `strength`.** Difference 2 converted the bloom *threshold*, which
fixes **which** pixels bloom. It does not fix **how much** they add.
`LuminosityHighPassShader` passes the whole texel through above threshold
(`mix(black, texel, alpha)`), and `UnrealBloomPass` composites
`3.0 * bloomStrength * sum(mips)` with `AdditiveBlending` — so the pass adds
`strength × (radiance of the bright pixels)` in whatever domain it sits in.
On r128 that domain was display-referred and capped near 1.0, so `0.22`
added at most ≈0.22. On r185 it is raw linear radiance, measured on this
branch at **15.32** max luminance / 17.01 max channel at serenity's bathroom
spot and 2.20 / 2.68 at its entrance (task-5-report.md, determinism-checked
across three renders and a page reload) — so the additive term reaches
≈3.4 where r128's was ≤0.22, roughly **15×**, and higher again now that
difference 6 has restored the direct lights' π.

This is structurally the same additive-in-the-wrong-domain bug as difference
4, with the same absence of an exact constant conversion — and unlike
difference 4 it **cannot be fixed by reordering**: bloom must read the HDR
buffer to have anything above 1.0 to bloom at all, so moving it past
`OutputPass` would defeat the pass entirely. Not retuned: any "corrected"
value would be taste, not mechanism, and bloom tuning belongs to plan 2
alongside the exposure re-fit that changes what these radiances are.
Documented in `post.js` beside the constant.

**Corrected (a later whole-branch review): "not retuned" stopped being true
the same task this constraint was written for.** Plan 2's task 7 retuned
`strength` from `0.22` to **0.1**, threshold-first, once bloom's own
threshold (difference 2, above) was itself refit to 1.8 — not the "taste"
outcome the paragraph above warned against, since 0.1 was derived the same
empirical, fraction-of-frame-over-threshold way as the threshold itself,
against exposure held fixed while each was set, per the constraint below.
Current value and full derivation: `tour/post.js`,
`docs/superpowers/metrics/README.md`, "Bloom: threshold moved, strength
moved, both empirically."

**Constraint for plan 2, not a suggestion: fit bloom and exposure together.**
They are coupled through the same buffer — exposure scales the radiances that
bloom's threshold and strength then act on — so fitting exposure alone drives
its value to absorb bloom's domain error, and the resulting number describes
neither. That is the phase-A failure repeating in a new place: a constant
tuned against conditions a later change moves, with nothing re-checking it.
Fit them jointly, or fit exposure with the bloom pass disabled and enable it
only once its own constants are set.

### Resemblance after difference 6 — and what it does to the load-bearing split

Captured with the unchanged harness (same unfixed FOV, per plan 1's scope) at
`?apt=<id>&measure=1`, scored with `tools/delta_e.py --phase b1-final2`.

**Noise floor first**, because the conclusion depends on the deltas being
real: a same-code repeat (fresh page load, procedural textures reshuffled)
scored serenity 17.12 → 17.13 and kings-court 22.09 → 22.06. **±0.03** on the
rounded means; recomputed at full precision from the spot arrays the repeat
noise is **±0.039**, so the 0.89 kings-court move is ~23× the noise floor, not
the ~30× a rounded-means division suggests. Both multiples are overwhelming
and no conclusion here depends on which is used — but the smaller one is the
honest figure.

| Apartment | phase-A baseline | before this wave | after difference 6 | vs baseline |
|---|---:|---:|---:|---:|
| serenity | 16.58 | 17.22 | **17.12** | +0.54 (worse) |
| kings-court | 22.44 | 21.20 | **22.09** | −0.35 (better) |

Attribution is clean by construction — difference 6 is the only rendering
change in the wave (the other five findings touch a comment, an HTML failure
handler, a dev-server status code, and `CLAUDE.md`). Confirmed anyway with a
same-session A/B: dividing every light intensity by π at runtime and
re-measuring returned **serenity 17.22** (matching the branch's committed
pre-wave number exactly) and **kings-court 21.33** (vs 21.20 committed; the
0.13 gap is because `captureEnvironment()` had already baked the PMREM
panorama with π-boosted lights, so a runtime revert cannot un-bake it — the
control is slightly brighter than a true pre-wave build).

**The split no longer holds as load-bearing evidence.** Its *sign* survives
— serenity is still above its baseline, kings-court still below — but the
asymmetry that made it persuasive is gone, and one new data point cuts
directly against the story it was telling:

1. **72% of kings-court's "improvement" was the missing π, not the absence
   of a fit.** Its margin over baseline fell from 1.24 to 0.35. The
   reviewer's competing explanation — that a globally missing light factor is
   also diffuse and of the same magnitude — was correct, and it accounted for
   most of one half of the split.
2. **A strictly correct conversion made kings-court worse, by 0.89, thirty
   times the noise floor.** If kings-court genuinely "had no fit to break",
   fixing a real defect should not have hurt it. It did. The clean
   per-apartment framing (serenity has a fitted `exposure: 0.33`,
   kings-court has none) missed that the light intensities themselves are
   **global** constants shared by all three apartments and were equally
   authored under r128 — so kings-court always had a fit to break too, just
   not a per-apartment one.
3. **Serenity barely moved**: 0.64 → 0.54, only ~16% of its regression
   recovered, against 72% of kings-court's improvement erased. The same
   correction landing that unevenly is better explained by where each
   apartment sits relative to its own photographs (serenity renders too dark
   at `exposure` 0.33 and got closer; kings-court was already about right at
   1.05 and overshot) than by which one had been fitted.

**What survives:** serenity is +0.54 above its baseline and still needs plan
2's exposure re-fit; the do-not-merge condition is unchanged and, if
anything, better supported now that kings-court's cushion is 0.35 rather than
1.24. **What does not survive:** using the serenity/kings-court split as
proof that the regression is a mis-fitted constant rather than a rendering
defect. It is a 0.89-wide difference between two apartments after a
correction that moved them in opposite directions, which is an observation,
not evidence. Plan 2 should re-fit against r185's actual output for **both**
apartments and stop treating kings-court as the unfitted control.

### Structural gate after the fix wave — unchanged, still passing

All three apartments at `?v=71`, `THREE.REVISION 185`:

| | serenity | kings-court | horkyone-10 |
|---|---:|---:|---:|
| `window.__issues` | `[]` | `[]` | `[]` |
| Console errors / page errors | 0 | 0 | 0 |
| Draw calls, full chain, 1280×820, own start position | 72 | 165 | 83 |
| Bake ms | 298 | 2221 | 674 |
| Post chain built | yes | yes | yes |

Sky-leak raycasts: every indoor spawn on all three apartments hits a mesh;
only `Terrace` (kings-court) and `Terrace` (horkyone-10) report
`NOTHING ABOVE`, both open to the sky by design. serenity's `Pool Terrace`
hits a canopy at 1.05 m. kings-court walk simulations: westbound from the
entry hall (22.6, 5, ground 0) ended at x 13.14 still on `ground 0`;
westbound from the `Upper hall` spawn (13.6, 0.9, ground 3.1) ended at
x 4.44 still on `ground 3.1`.

## Task 7: draw-call baseline method

The **144** r128 draw-call figure for kings-court's entry hall (`CLAUDE.md`'s
"Draw calls" line, and every task-1-through-6 comparison against it) was
measured with the **naive method** — a bare `a.renderer.render(a.scene,
a.camera)` with no post chain, no `info.autoReset` handling. Recorded here
because it was never written down anywhere in the repo until now: task 7's
gate re-ran the brief's script (itself the naive method, taken verbatim) and
got 150, a plausible-looking "+6, ~4%, in budget" result that was actually
unverifiable against 144 without knowing what 144 measured. The coordinator
confirmed the method by having taken the 144 reading personally, during the
step-0 walkthrough, with the same bare-`render()` call.

**With the method now attached, both draw-call numbers for kings-court's
entry hall (22.6, 5, ground 0, yaw 90°, 1280×820):**

| Method | r128 | r185 | Note |
|---|---:|---:|---|
| Naive (`a.renderer.render()`, no post chain) | **144** | **150** | Like-for-like — same method both times. +6 calls (~4%), nothing stopped merging. |
| Full chain (`a.post.render(0)`, manual `info.autoReset`) | *(no r128 comparable — pre-migration build not checked out)* | **165** | What a visitor actually pays. CLAUDE.md's current "Draw calls in a spot" recipe; the naive method undercounts the post chain's own draw calls by 15 here (matches its documented ~14-call undercount at serenity's entrance). |

Both numbers are inside the ≤400 desktop budget by a wide margin. The lesson
generalizes past this one figure: `CLAUDE.md` hard rule 4a already flags the
same failure shape for bake-time numbers ("say what the data supports and no
more") — a measurement without its method attached is a number nobody can
actually compare against, which is a more useful thing to fix than the
number itself. Any draw-call figure recorded from here on should name its
method (naive vs. full-chain) alongside the count.
