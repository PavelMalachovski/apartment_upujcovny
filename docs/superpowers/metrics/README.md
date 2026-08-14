# Phase A photorealism — resemblance metrics

Mean CIEDE2000 (ΔE2000) between the render and the real photograph, over
an 8×8 grid of cell-mean colours, at the 11 Serenity photo spots flagged
`compare` (of which 2 currently pass pose verification — see "Pose
verification" below, this restriction postdates everything in "The
trend"). Raw data for every run is the sibling `*.json` files in this
directory; `tools/delta_e.py` produces them, `tools/residual.py` produces
the decomposition below.

**Absolute values are meaningless.** Render and photograph differ in
lens, exposure and furniture model — an 8×8 grid mean will never reach
zero, and it isn't supposed to. Only the *trend* between phases carries
information.

## Pose verification (phase B2)

Every `compare`-flagged photo spot was classified by whether its render
and its photograph show the *same room content* — subject, not lens, not
exposure. Most do not: **serenity 2 of 11 pass, kings-court 8 of 14**
(classification and evidence:
`.superpowers/sdd/2026-08-13-phase-b2-measurement-exposure/task-3-report.md`).
The failures are camera-pose and modelling defects, not lens ones, and
they are fatal to everything this directory measures — ΔE2000, luminance
and the residual decomposition all assume the rendered and photographed
pixels are the same surface. Scoring through a mismatched spot measures
the mismatch, not the render — the exact contamination the palette task
already showed makes a metric *worse* than doing nothing (`CLAUDE.md`,
the `palette` config key).

The verdict is recorded as data: `photoSpots[].poseVerified`
(`true`/`false`) in `serenity.json` and `kings-court.json`, with a
`poseNote` on every failing spot describing what it actually renders so
the next reader doesn't have to re-derive it. **Absent means verified** —
an apartment nobody has classified yet (horkyone-10) keeps scoring every
`compare` spot it has, instead of silently scoring zero. `tools/delta_e.py`,
`tools/luminance.py` and `tools/residual.py` all skip `poseVerified: false`
spots by construction and print how many they skipped.

**Serenity's number now rests on 2 spots (`1.webp`, `11.webp`). Kings-court's
rests on 8 (`3, 7, 8, 11, 12, 13, 19, 20`). These are not equally
trustworthy and must never be read as comparable to each other, or to the
trend table below** — a 2-spot mean swings on a single frame; an 8-spot
mean is only somewhat steadier; no error bar accompanies either. Proof run
that the filter is live, 2026-08-13 (`serenity-b2-poseverified.json`,
`kings-court-b2-poseverified.json` — a filter check, not a new baseline;
task 5 draws that line):

| Apartment | Scored / total compare spots | mean ΔE2000 |
|---|---:|---:|
| serenity | 2 / 11 | 14.95 |
| kings-court | 8 / 14 | 19.78 |

Every ΔE2000/luminance number elsewhere in this file, and every other
`*.json` file already in this directory (`serenity-baseline.json` through
`serenity-a6-palette-fix2.json`, every `kings-court-*.json`), predates this
filter and was scored over the *full*, unverified spot set (11 and 14
respectively) — none of it was retroactively recomputed. Task 5 draws the
line between that series and the pose-verified one.

### What the failing spots exposed

Marked `poseVerified: false` with a `poseNote`, not deleted and not left
unflagged — deleting them would make these defects invisible to the
metric, and a future regression there would go undetected:

- **Serenity's Living Room cluster (`3.webp`, `4.webp`, `9.webp`)** —
  observation B1 (`docs/PHASE-B-OBSERVATIONS.md`): the flat has a
  floor-to-ceiling sliding door with sheer curtains; the model has a
  punched window. No camera angle reproduces the photograph. Plan 4 owns
  the fix.
- **Kings-court's `14.webp` (Bathroom 2)** — none of the config's four
  `type: "shower"` furniture entries fall inside Bathroom 2's bounds
  (x 8.8–11.4, z 0–2.6); the photograph's actual subject was never
  modelled here. Not the same defect as observation B3's near-blank
  marble walls — task 3 checked and ruled that out for this spot
  specifically (the render is a fully lit tub, just the wrong subject) —
  the geometry itself is missing, not the material.
- **Kings-court's `4.webp` (Coffee corner)** — observation B4: a
  product-detail shot of a coffee machine the model never built; the
  render is a plain wall regardless of fov.
- **Spots whose recorded pose is simply wrong** — no fov value
  reconciles them with their photograph at any tested zoom (each swept
  across three or more widely-spaced values; most spanned 50°–170°
  vertical, kings-court's `2.webp` specifically 80°–130° — see each
  spot's own `poseNote` for its tested range): serenity `2.webp`,
  `5.webp`, `6.webp`, `7.webp`, `8.webp`, `10.webp`; kings-court
  `2.webp`, `10.webp`, `17.webp`, `18.webp`. These need position/yaw
  recalibration, not a geometry fix or a metric change, and are not
  owned by this plan.

Plan 4 fixes the geometry defects above and re-verifies against them;
this plan only stops measuring through them in the meantime.

## horkyone-10: decided, not left open (task 6)

horkyone-10 has exactly two photographs, `2.webp` ("Living room") and
`3.webp` ("Kitchen"), and going into this task **neither was flagged
`compare`** — nothing to score, nothing to fit an exposure to, since
phase A. Observation A1 (`docs/PHASE-B-OBSERVATIONS.md`) gave this
exactly two ways to close: flag the spots (if they qualify) or accept
the apartment on mean luminance instead. Task 6 makes that call, so it
stops being open.

### Classification, same bar as task 3

Same method as task 3's redo (`.superpowers/sdd/2026-08-13-phase-b2-measurement-exposure/task-3-report.md`
§1): hold the spot's recorded pose (`x`/`z`/`yaw`) fixed and sweep
`vfov` 50°→170° vertical, and pass only if *some* value in that range
shows recognizably the same room content as the photograph — a spot
that shows different content at every tested value is a pose problem,
not a lens one. Evidence: `evidence-horkyone10_{2,3}webp_fov-sweep.jpg`
(8-point sweep grids) and the `_compare_center.png` / `_render_full.png`
/ `_reverify_compare.png` files, all in
`.superpowers/sdd/2026-08-13-phase-b2-measurement-exposure/`; full
per-spot writeup in that directory's `task-6-report.md`.

| Spot | Room (per config) | Verdict | Why |
|---|---|---|---|
| `2.webp` | Living room | **FAIL** | Photo: the main open living/dining/kitchen space under the ridge skylight — chaise lounge, ottoman, sofa, wall-mounted TV, wood flooring, kitchen visible past a column. Render, at every vfov 50–170 from the recorded pose: a small enclosed nook — two plain walls, one storage-box-shaped object, a tall cabinet, a corridor opening onto a small decorative plinth. No skylight, no lounge furniture, no sofa, no TV at any zoom. |
| `3.webp` | Kitchen | **FAIL** | Photo: a sink/faucet run on a wood countertop under dark upper cabinets, opening onto a living room (sofa, coffee table, glazed terrace door) past a column. Render, at every vfov 50–170: a cooktop under a suspended extractor hood, opening onto a *dining* table with chairs and curtains — not a sofa. No sink, no faucet, no wood backsplash, no terrace at any zoom: the room beyond the kitchen is a different room, not just a different crop of the same one. |

**0 of 2 pass** — neither spot is reconcilable with its photograph at
any tested field of view, holding the recorded pose fixed. This is the
same "wrong wall / wrong room, not wrong lens" signature task 3 used to
fail serenity's Living Room cluster and kings-court's `14.webp`: a
low-level category match (it *is* a room with a kitchen fixture in it)
is not enough when the photograph's dominant subject stays absent at
every zoom, from three or more widely-spaced values through the
extremes. Applied at full strength despite the small candidate pool —
the brief is explicit that two candidates earns no discount.

### Decision: do not flag; accept on luminance (task 7 runs the number)

**Neither spot is flagged `compare`. `tour/apartments/horkyone-10.json`
is unchanged by this task.** Flagging a spot that fails this bar "adds
noise to the mean and buys nothing" (task brief) — with 0 of 2
candidates qualifying, flagging either would only recreate the exact
kind of contaminated spot task 3 spent itself removing from the other
two apartments, on an apartment that only has two candidates to begin
with.

That leaves observation A1's fallback as the applicable criterion, not
a consolation prize: **accept horkyone-10 on mean sRGB luminance landing
within ±10 of the two fitted flats** (`docs/PHASE-B-OBSERVATIONS.md`,
row A1). horkyone-10 currently ships at the default `exposure` 1.05,
mean sRGB luminance **193.1**, p05 **155.7**, against serenity's
**144.6** at 0.33 (`docs/PHASE-B-OBSERVATIONS.md`'s "three tours as they
ship today" table). **That comparison is not evaluated here**: both
flats it would be measured against are mid-refit. Task 7 clears
serenity's old r128-fitted `0.33` before refitting exposure and bloom
together against r185, and kings-court has never been fitted at all
(`exposure` still absent, defaulting to 1.05, same table). Reading
horkyone-10 against either number today would be reading it against a
fit task 7 is about to replace. **Task 7 step 5 ("Fit horkyone-10 by
whichever criterion task 6 decided") is where the ±10 check actually
runs**, against the two flats' post-refit numbers — this section
records which criterion applies and why, not the numeric verdict.

### The guard this decision needed anyway

With horkyone-10 at 0 `compare`-flagged spots, `python tools/delta_e.py
--apt horkyone-10` and `python tools/residual.py --apt horkyone-10`
already refuse cleanly — both scripts have always checked
`if not compare_spots: raise SystemExit(...)`. `tools/luminance.py`
never got that check, and divides by `len(spots)` twice (once per
render set, once for the photographs) with nothing upstream stopping an
empty list from reaching either division. horkyone-10 is what finally
exercises the empty case in practice: this decision leaves it with 0
spots flagged at all (the first guard), and it is also the apartment
the brief points at for the second, sharper case — 2 spots flagged and
both failing pose verification, exactly what flagging the two FAIL
spots above would have produced. `tools/luminance.py` now has the same
two guards `delta_e.py` already had, in the same place relative to the
`scorable()` filter; proof both paths exit cleanly instead of crashing
(the real 0-flagged state, and a temporary reproduction of the
2-flagged-both-failing state, reverted before commit) is in
`task-6-report.md`.

## Re-baseline: the field of view was wrong, and the phase A series ends here (task 5)

Every number in "The trend" below — the phase A series that ran 24.36 down
to 16.58 — and both of plan 1's r128-migration bridge numbers (serenity
**17.12**, kings-court **22.09**, recorded in `r128-reference.md`) were
measured through a broken camera. `camera.fov` was fixed at 72° vertical for
every capture regardless of what the photograph was actually framed at (task
3's finding): a 16:9 photograph was scored against a 104.5°-horizontal
render, a portrait one against 55°. Fixing the field of view changes *which
pixels of the room* land in each of the 8×8 grid's cells, not just how well
those pixels agree with the photograph — that is not something this metric's
own arithmetic can back out after the fact. **The phase A series cannot be
converted into the corrected one; it can only be ended.** Nothing below
restates 24.36–16.58 or 17.12/22.09 in "corrected" terms. They stand as what
they always were — measurements taken through the old lens — and a new
series starts at this task.

Both apartments were captured and scored twice, once per mode, on the same
pose-verified population described above (serenity 2/11, kings-court 8/14).
`tools/shots/render_*.jpg` carries no mode suffix, so the legacy-mode frames
had to be scored before the fixed-mode capture overwrote them:

```
# legacy: ?apt=<id>&measure=1&fov=legacy, then
python tools/delta_e.py --apt serenity --phase b2-legacy
python tools/delta_e.py --apt kings-court --phase b2-legacy
# fixed:  ?apt=<id>&measure=1 (recaptured — no &fov=legacy), then
python tools/delta_e.py --apt serenity --phase b2-newzero
python tools/delta_e.py --apt kings-court --phase b2-newzero
```

| Apartment | Mode | Spots scored | mean ΔE2000 | File |
|---|---|---:|---:|---|
| serenity | `&fov=legacy` (bridge to plan 1) | 2/11 | **15.99** | `serenity-b2-legacy.json` |
| serenity | fixed, per-photograph fov ("new zero") | 2/11 | **16.30** | `serenity-b2-newzero.json` |
| kings-court | `&fov=legacy` (bridge to plan 1) | 8/14 | **19.80** | `kings-court-b2-legacy.json` |
| kings-court | fixed, per-photograph fov ("new zero") | 8/14 | **19.86** | `kings-court-b2-newzero.json` |

**The `&fov=legacy` row is a bridge, not a restatement — and it is not plan
1's own measurement either, because it differs in two ways at once, not
one.** `?fov=legacy` reproduces the old fixed-72°-vertical camera, so the
field of view really is held the same as plan 1's 17.12 / 22.09. But
`measure.js` also now hides photo-spot markers unconditionally (task 2), and
`delta_e.py` now scores only `poseVerified` spots (task 4) — neither existed
when 17.12 / 22.09 were recorded, and neither can be switched back off for
this comparison. Presenting 15.99 / 19.80 next to 17.12 / 22.09 as if the
field of view were the only thing that changed would be wrong.

### Separating the two confounds

Cheap to isolate, because `window.__measure()` captures every `compare`-
flagged spot regardless of `poseVerified` — the legacy-mode renders already
on disk cover all 11 / 14 spots, not just the 2 / 8 scorable ones. A one-off
script (not a committed tool: it imports `tools/delta_e.py`'s own
`cell_means()` and `ciede2000()` unmodified and reuses them over the full
spot list, rather than patching the filter into the committed scorer) scored
those same b2-legacy renders both ways. Output kept as
`serenity-b2-legacy-allspots.json` / `kings-court-b2-legacy-allspots.json`
for anyone who wants to check the arithmetic; its poseVerified-only subset
reproduced 15.99 / 19.80 exactly, confirming the two scoring paths agree.

| Apartment | Plan 1 (fov=legacy, markers visible, all 11/14 spots) | + markers hidden, same spots | + poseVerified filter = official b2-legacy | Marker effect | Population effect |
|---|---:|---:|---:|---:|---:|
| serenity | 17.12 | 17.14 | 15.99 | +0.02 | **−1.15** |
| kings-court | 22.09 | 22.12 | 19.80 | +0.03 | **−2.32** |

**The marker effect is not distinguishable from zero.** ±0.02 / ±0.03 sits
inside the same-code repeat-run noise floor `r128-reference.md` already
measured for this exact metric (±0.03 on rounded means, ±0.039 at full
precision) — consistent with photo-spot markers being a handful of
`THREE.Points` sprites, too small a share of any 8×8 cell to move its mean
colour measurably. **The population filter is what actually moved the
number**, by 1.15 and 2.32 points respectively — well past the noise floor,
and past the marker effect too. That is not evidence the render changed: it
means the spots that survived pose verification (serenity's `1.webp`
Bathroom and `11.webp` Bedroom; kings-court's eight) happen to average lower
ΔE than the ones that did not. Which spots pass pose verification is decided
by geometry and camera-pose correctness (task 3), not by this metric, so
this is a population change riding along with the FOV bridge, not a
resemblance change.

### What this means for the merge condition

PR #27's merge condition is serenity ≤ 16.58 and kings-court ≤ 22.44,
measured in legacy mode (`docs/superpowers/plans/2026-08-13-phase-b2-measurement-exposure.md`,
Task 9 Step 2). Both thresholds were scored over the full, marker-visible,
unverified-pose population — the population of the "+ markers hidden, same
spots" column above, not the poseVerified-filtered one. **17.14 and 22.12
are the numbers comparable to 16.58 and 22.44; 15.99 and 19.80 are not** —
the same population gap already noted above between 15.99/19.80 and plan
1's 17.12/22.09: a smaller population, not a better render.

Read on the comparable population, **serenity's 17.14 is above its 16.58
ceiling and fails**, by 0.56 — not the pass 15.99 implies. Kings-court's
22.12 is inside 22.44, but by 0.32, not the 2.64 that 19.80 suggests. No
apartment JSON or rendering code changed to produce any number in this
section — only the capture camera and the scorer's spot filter did. This
is not a result: it is the ground the still-pending exposure/bloom re-fit
starts from, and whoever closes that work owes this same population check
before reading its own legacy-mode number against 16.58 / 22.44.

### What moved between the bridge and the new zero

Holding the population and the marker-hiding fixed and changing only the
field of view — legacy → fixed — moves serenity from 15.99 to 16.30 (+0.31)
and kings-court from 19.80 to 19.86 (+0.06). Both small, on populations
already flagged above as too thin to treat a fraction of a point as signal
(a 2-spot mean swings on a single frame). Not a regression to chase: task 3
calibrated the fixed field of view by eye, against straight edges lining up
between render and photograph
(`.superpowers/sdd/2026-08-13-phase-b2-measurement-exposure/task-3-report.md`),
not by minimizing this score, and a wider, more correct field of view pulls
more of each room's
background into the 8×8 grid — background a box-furniture, procedural-
texture scene was never going to match as well as whatever was already
centred in frame under the old, narrower crop. That is a plausible reading
of a small move, not the only one, and nothing measured here isolates it
further.

### Going forward

**`b2-newzero` (16.30 serenity, 19.86 kings-court) is the new zero** — the
number future work on these two apartments is compared against, not
16.58/22.44 and not 17.12/22.09. It is not comparable to anything measured
before this task. It rests on the same 2/11 and 8/14 populations as
everything else in this section, and plan 4's geometry fixes are expected to
flip some `poseVerified: false` spots to `true` — which changes *which*
spots feed this mean before it changes *how well* any of them score. Whoever
compares a future number to 16.30 / 19.86 must check the population first —
the same caveat this section just applied to plan 1's numbers.

## Exposure and bloom fitted together, and the merge condition re-read (task 7)

> **Superseded in part — see "Phase B3 plan 3 task 4" at the end of this
> file.** The three fitted exposures below (serenity 0.326, kings-court
> 0.56, horkyone-10 0.45) were re-fitted after plan 3 task 2 changed the
> radiances, and ship today as 0.329 / 0.575 / 0.46. Both bloom constants
> were re-measured and held. The method described here is unchanged and
> still current; only the values and the gate reading moved.

The task the whole plan exists for. Three things happened in order, per the
phase's own rule that exposure and bloom are coupled through the same buffer
and must not be fitted in isolation: **(1)** `serenity.exposure`'s old
r128-fitted `0.33` was deleted outright — carrying a compensation fitted
against a different pipeline into a new fit produces a fit of a fit — and the
`app.js` fallback confirmed clean (`renderer.toneMappingExposure` read back
`1.05`, no warning, since an *absent* key is the documented "nothing to fit
against" case, not the "present but invalid" case that actually warns).
**(2)** Exposure was refitted per apartment with bloom disabled. **(3)** Bloom's
threshold and strength were set with exposure fixed. Full sweep data, bloom
frames and the horkyone-10 diagnostic are in
`.superpowers/sdd/2026-08-13-phase-b2-measurement-exposure/task-7-report.md`.

**Corrected by a review fix wave, same day.** Two mistakes in the pass
described below are fixed in place, each marked where it occurs. First:
serenity's chosen exposure (0.32) was picked because it minimised ΔE2000,
while the text described it as the closer luminance match — a false
comparison (0.0036 < 0.0048, so 0.33 was actually closer), fixed by
re-deriving from the luminance target alone; the corrected value is 0.326.
Second: horkyone-10 was measured failing its own ±10 acceptance criterion at
its untouched default (1.05) and left that way, on the theory that fitting
it to pass would be gaming a fallback metric — but the ±10 rule is a fit
target, not a pass/fail gate on an unfitted value (task 6's own framing, and
the brief's verb is "Fit horkyone-10"). It is now actually fitted, to 0.45.
The original `task-7-report.md` keeps both the error and the fix as a
durable record, rather than silently restating history.

### Exposure: fitted toward luminance, ΔE read as a consequence

Target is each apartment's own photographs' mean and p5 linear-light
luminance (`tools/luminance.py`), not the lowest ΔE — the phase's own rule,
restated here because the two very nearly disagreed for kings-court (below).
Every sweep point, both apartments, bloom disabled throughout:

| Serenity exposure | mean lum | p5 lum | ΔE2000 |
|---:|---:|---:|---:|
| 0.6 | 0.4735 | 0.2091 | 19.07 |
| 0.8 | 0.5524 | 0.2876 | 21.32 |
| 1.0 | 0.6089 | 0.3555 | 23.13 |
| 1.2 | 0.6508 | 0.4115 | 24.43 |
| 1.4 | 0.6833 | 0.4551 | 25.38 |
| 0.3 | 0.2772 | 0.0807 | 16.13 |
| 0.32 | 0.2945 | 0.0887 | 16.09 |
| 0.324 | 0.2979 | 0.0901 | 16.09 |
| 0.325 | 0.2987 | 0.0910 | 16.09 |
| **0.326 (chosen)** | **0.2996** | 0.0920 | **16.09** |
| 0.327 | 0.3004 | 0.0922 | 16.09 |
| 0.33 | 0.3029 | 0.0927 | 16.11 |
| 0.34 | 0.3111 | 0.0972 | 16.14 |
| 0.4 | 0.3567 | 0.1230 | 16.58 |
| *photographs* | *0.2993* | *0.0483* | — |

**Correction (review fix wave).** This table originally chose 0.32 and
described it as "the closest mean-luminance match (diff −0.0048, vs. 0.33's
+0.0036 — both close, 0.32 marginally closer)... no tension to resolve." That
compared two numbers backward: 0.0036 is smaller than 0.0048, so **0.33 was
always the closer luminance match, not 0.32** — 0.32 is, instead, the row
with the single lowest ΔE2000 (16.09) in the original 0.01-step sweep. The
fit had silently substituted the ΔE-minimising exposure for the
luminance-matching one while describing the two as agreeing — exactly the
"fit toward the metric" mistake this phase's own rule exists to prevent,
just missed rather than made deliberately. Interpolating the original sweep
puts the true crossing at exposure ≈0.326, refined above with a 0.001-step
sweep across that bracket (bloom still disabled, same method): **0.326** is
the closest tested value to the photographs' mean (target 0.2993, diff
+0.0003) — closer than 0.325 (diff −0.0006) or the original 0.32 (diff
−0.0048). ΔE2000 stays flat at 16.09 across the entire refined bracket, which
is exactly why the wrong row was easy to pick without noticing: at this
apartment the luminance and ΔE criteria never visibly disagree the way they
do at kings-court (below), so nothing about the numbers "16.09 repeated five
times" flags on its own that the ΔE-optimal row and the luminance-optimal row
aren't the same one. 0.326 happens to sit even closer to r128's own retired
0.33 than 0.32 did — the same "not tuned toward it, the sweep just landed
there" caveat applies unchanged.

| Kings-court exposure | mean lum | p5 lum | ΔE2000 |
|---:|---:|---:|---:|
| 0.6 | 0.3670 | 0.1151 | 17.10 |
| 0.8 | 0.4473 | 0.1663 | 18.06 |
| 1.0 | 0.5081 | 0.2149 | 19.10 |
| 1.2 | 0.5553 | 0.2594 | 20.08 |
| 1.4 | 0.5933 | 0.2998 | 20.93 |
| 0.5 | 0.3172 | 0.0897 | 17.00 |
| 0.53 | 0.3329 | 0.0972 | 16.98 |
| **0.56 (chosen)** | **0.3479** | 0.1047 | 17.00 |
| 0.58 | 0.3576 | 0.1100 | 17.05 |
| *photographs* | *0.3479* | *0.0247* | — |

Both apartments' initial 5-point sweep (0.6-1.4, the brief's own prescribed
range) overshot the luminance target at every point — the render only gets
brighter as exposure rises, so the fit for both flats lies below the range
that was expected to bracket it. Serenity's mean-luminance-optimal point is
covered above (0.326, and its closeness to r128's own retired 0.33). **Kings-court
0.56 is the first exposure fit that apartment has ever had** — it shipped at
the renderer default (1.05) through all of phase A and phase B1.

Kings-court is also the case where luminance and ΔE nearly disagreed:
0.53 has the lowest ΔE (16.98) but overshoots the luminance match (diff
-0.0150); 0.56 matches the photographs' mean luminance exactly (0.3479 both)
at ΔE 17.00 — 0.02 worse, inside this metric's own documented repeat-run
noise floor (±0.03 rounded / ±0.039 full precision, `r128-reference.md`).
Chosen 0.56 on the luminance criterion, per the phase's rule; the ΔE
difference this cost is not distinguishable from noise.

**p5 (shadow) luminance is not reachable by exposure alone at either
apartment** — even at the best-fitting exposure, rendered p5 sits well above
the photographs' p5 (serenity 0.0920 vs. 0.0483; kings-court 0.1047 vs.
0.0247), while mean matches closely or exactly. This is the same lifted-black
structural limit `PHASE-B-OBSERVATIONS.md` row A2 already named: `bakeWalls()`
carries no AO and `aoAt`'s occlusion floor (`0.35 + 0.65*(open/n)`, `bake.js`)
puts a hard floor under every corner regardless of exposure. A single
exposure scalar cannot both match the mean and deepen the shadow floor at the
same time when the floor itself is a baked-lighting property, not a tone-
mapping one — out of scope for this task (exposure and bloom only), recorded
here because it's the reason p5 doesn't close even at the winning exposure.

### Bloom: threshold moved, strength moved, both empirically

The old `1.293512` threshold was derived analytically for a single shared
exposure (1.05 — the only value any apartment ran at when phase B1 derived
it). Task 7 fits exposure per apartment, so there is no single exposure left
to re-solve that derivation against; threshold and strength were measured
empirically instead, tracking **fraction of frame area over threshold, never
the peak pixel** (the peak is one specular sample whose magnitude is unstable
across render-target sizes — established plan 1; the fraction is not).
Method: reproduce `RenderPass`'s own `setRenderTarget`/`render` call pattern
into an offscreen `FloatType` target, matching the exact pre-tonemap linear
buffer `LuminosityHighPassShader` thresholds.

At the old threshold (1.294), serenity's entrance — ordinary daylight, not a
highlight — measured **10.51%** of frame area over threshold at its fitted
exposure (0.32): a visibly blown-out ceiling wash confirmed by eye, not the
near-inert result r128 had at this position. The wash has a sharp edge:

| Serenity, fraction of frame over threshold | 1.294 | 1.5 | 1.6 | 1.7 | 1.8 | 2.0 | 3.0 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Entrance (ordinary daylight) | 10.51% | 6.42% | 4.02% | 0.02% | 0.02% | 0.02% | 0.02% |
| Living Room (ordinary) | 3.32% | 1.43% | 0.16% | 0% | 0% | 0% | 0% |
| Bathroom mirror highlight | 4.52% | 1.52% | 0.42% | 0.22% | 0.21% | 0.19% | 0.13% |

**Threshold 1.8** sits just past the wash's cutoff (~1.6-1.7) with a small
margin, while the one known specular highlight — the bathroom's backlit
mirror, plan 1 — keeps a small, real crossing (0.21% of frame), close to
this project's own earlier r185 measurement of that exact highlight (0.17%,
taken at the old 0.33-exposure/0.22-strength settings — `docs/PHASE-B-HANDOFF.md`
and "Is bloom still doing anything?" below; not a retired r128 number, despite
how it reads). Checked across every spawn of all three
apartments at threshold 1.8, including horkyone-10 at its un-fit, brighter
1.05 default (the apartment likeliest to push a shared threshold too low):
kings-court's worst spawn measured 0.20%, horkyone-10's every spawn measured
0%, serenity's non-highlight positions all measured ≤0.05%. Layout check
(`window.__issues`) stayed clean throughout on all three.

With threshold fixed, **strength** was judged by rendering the bathroom
highlight through the full composited, tonemapped chain with bloom on vs.
off and counting changed pixels, then looking at the frames:

| Strength | % of bathroom frame changed (bloom on vs. off) |
|---:|---:|
| 0.05 | 3.71% |
| **0.1 (chosen)** | **7.95%** |
| 0.15 | 13.16% |
| 0.22 (old, unconverted) | 16.27% |
| 0.3 | 17.93% |
| 0.4 | 20.60% |

At 0.22 the mirror highlight visibly bloomed into a soft, spreading halo —
confirmed by eye, both apartments; at 0.1 it reads as a contained glint on
the mirror and the shower glass, without a wash elsewhere. 0.1's pixel-change
proportion (7.95%) is the closest round value to this project's own earlier
r185 measurement of the identical on/off comparison (5.96%, taken at the old
0.33/0.22 settings — `docs/PHASE-B-HANDOFF.md` and below; not a retired r128
number) without dropping the highlight below a confidently visible glint.
**Both constants
are global** (one bloom pass, three apartments at three different fitted-or-
not exposures) — "fitted" here means verified inert-or-glint-shaped across
all three, not tuned against any one apartment's photographs the way
exposure itself is.

### horkyone-10: fitted, and it passes the ±10 luminance check

**Correction (review fix wave).** The pass this section originally described
measured horkyone-10 failing the ±10 check at its untouched default (1.05)
and stopped there, reasoning that picking an exposure purely to land inside
the ±10 band would be "gaming" a fallback metric with no photograph to
verify the result against. That reasoning doesn't hold up: task 6's own
framing is "accept horkyone-10 on mean sRGB luminance landing within ±10 of
the two fitted flats" — ±10 is the acceptance *test*, and the natural way to
pass a test stated as a proximity band is to move the number into the band,
the same way serenity and kings-court's own exposures were swept until their
luminance matched their target. The task brief's own verb is "Fit
horkyone-10," and its Files list names `horkyone-10.json` as a modify
target. horkyone-10 has no photographs to check a resemblance score against,
which is exactly why task 6 wrote a fallback criterion in the first place
instead of leaving it unscored — it was never asking for zero-evidence
tuning, it was asking for exposure to land in the same brightness band its
two siblings now occupy. horkyone-10 is fitted below.

Measured the same way as `PHASE-B-OBSERVATIONS.md`'s original table — every
`spawns` entry, 480×300, through the full post chain, sRGB 0-255 — now that
all three apartments carry their real, current exposure. (This remeasurement
also caught and fixed an unrelated bug in how the fix wave's own script set
camera yaw from `spawns`: `window.APT.spawns[].yaw` is already
degrees→radians-converted by `main.js` at load time, and the first version of
the script converted it a second time, pointing the camera at roughly 1/57th
of the intended angle for every non-zero-yaw spawn. Caught by cross-checking
the read-back yaw against the raw JSON degrees before trusting any number;
every figure below is post-fix. This is why these numbers differ from the
ones this section originally reported for serenity and kings-court, not
because either apartment's render changed.)

| Apartment | exposure | mean L | p5 L |
|---|---:|---:|---:|
| serenity | 0.326 | 138.36 | 84.33 |
| kings-court | 0.56 | 149.66 | 84.47 |
| horkyone-10 | 1.05 (old, unfit default) | 192.49 | 153.48 |
| horkyone-10 | **0.45 (fitted)** | **143.78** | 100.15 |

At the old 1.05 default, horkyone-10 misses by 54.13 against serenity and
42.83 against kings-court — not a close call, consistent with the original
problem statement this whole plan exists to fix (`PHASE-B-OBSERVATIONS.md`
row A1). A sweep (exposure only, same spawns/method) found the ±10 band
quickly once actually searched for:

| horkyone-10 exposure | mean L |
|---:|---:|
| 0.4 | 135.97 |
| 0.45 | **143.78** |
| 0.5 | 150.63 |
| 0.55 | 156.70 |

**Chosen: 0.45.** Diff from serenity +5.42, diff from kings-court −5.88 —
both comfortably inside ±10, and close to the midpoint of the window the two
siblings' own values leave open ([139.66, 148.36] as of their current
exposures). Confirmed by eye, not just by the number: walked the Living
room and Bedroom spawns at the full 1280×800 post chain — daylight through
the living-room curtains, dining table and chairs, headboard quilting, wood
wardrobe grain and a bedside lamp all read with normal midtones, no
blown-out whites and no crushed shadow, the same "correctly exposed, not
dark" read the sibling apartments get. Layout check (`window.__issues`)
stayed clean throughout. Written into `horkyone-10.json` as `"exposure":
0.45`.

### Final numbers: both apartments, both harness modes, both populations

**Correction (review fix wave).** Serenity's rows below are recaptured at
its corrected exposure (0.326, not the original 0.32 — see above);
kings-court is untouched and its rows are unchanged. Recaptured fresh
immediately before each scoring pass, per this project's own stale-frame
warning. "poseVerified" is `tools/delta_e.py`'s native, filtered population
(serenity 2/11, kings-court 8/14); "all-spot" reuses `delta_e.py`'s own
`cell_means()`/`ciede2000()` unmodified over every `compare`-flagged spot
regardless of `poseVerified` — the same one-off, uncommitted technique task 5
used to produce the 17.14/22.12 comparable-population figures above.

| Apartment | Mode | Population | mean ΔE2000 | File |
|---|---|---|---:|---|
| serenity | fixed (new-zero) | poseVerified 2/11 | 16.07 | `serenity-b2-fixwave-final.json` |
| serenity | fixed (new-zero) | all-spot 11/11 | 16.89 | `serenity-b2-fixwave-final-allspots.json` |
| serenity | `&fov=legacy` | poseVerified 2/11 | 15.69 | `serenity-b2-fixwave-final-legacy.json` |
| serenity | `&fov=legacy` | all-spot 11/11 | **16.55** | `serenity-b2-fixwave-final-legacy-allspots.json` |
| kings-court | fixed (new-zero) | poseVerified 8/14 | 17.02 | `kings-court-b2-final.json` |
| kings-court | fixed (new-zero) | all-spot 14/14 | 18.36 | `kings-court-b2-final-allspots.json` |
| kings-court | `&fov=legacy` | poseVerified 8/14 | 17.52 | `kings-court-b2-final-legacy.json` |
| kings-court | `&fov=legacy` | all-spot 14/14 | **18.77** | `kings-court-b2-final-legacy-allspots.json` |

**Repeat-run check on serenity's legacy/all-spot number**, since it sits
closest to its gate: a second, independent full-page-reload capture and
score reproduced **16.54** against the first run's 16.55 — a 0.01 spread on
the rounded means, tighter than this metric's own documented repeat-run noise
floor (±0.03/±0.039). At full precision (not rounded per-spot before
averaging, unlike the committed `delta_e.py` output): first run 16.5485,
repeat 16.5410, a 0.0075 spread. Reproducible, not a fluke — but see the
merge-condition reading below for what a margin this size against a 16.58
ceiling actually means (`serenity-b2-fixwave-final-legacy-allspots.json`,
`serenity-b2-fixwave-final-legacy-repeat-allspots.json`).

### The merge condition, read correctly

PR #27's merge condition (serenity ≤ 16.58, kings-court ≤ 22.44) was scored
in legacy mode over the full, unverified-pose population — **the "all-spot"
row above, not "poseVerified"**, for the exact reason given earlier in this
document ("What this means for the merge condition"): the poseVerified
filter changes which spots feed the mean, not how well the render matches.

- **Serenity: 16.55 ≤ 16.58 — reaches parity within noise, not a clean
  pass.** Margin 0.03 on the rounded means. At full precision the margin is
  0.0315 (first run, 16.58 − 16.5485) to 0.0390 (repeat run, 16.58 − 16.5410)
  — the same order as this metric's own documented repeat-run noise floor
  (±0.03 rounded / ±0.039 full precision). The number is reproducible (see
  above), so this isn't a fluke that happened to land on the right side once
  — but a margin the same size as the noise floor itself is honestly
  described as parity with the ceiling, not headroom under it. Whoever next
  changes anything upstream of serenity's render (plan 4's geometry fixes are
  already scoped against it) should re-run this exact check rather than
  assume today's number still holds in either direction.
- **Kings-court: 18.77 ≤ 22.44 — passes, by 3.67.** Comfortable margin, and
  kings-court's first-ever exposure fit is most of why: at the unfit 1.05
  default it was already inside the gate in raw terms (`PHASE-B-OBSERVATIONS.md`,
  22.44 was in fact *measured* at 1.05), but ran ~45 L points brighter than
  serenity and visibly over-exposed; this task fixed the exposure without
  spending the ΔE margin the apartment already had. Unchanged by the review
  fix wave.
- **horkyone-10 is not part of PR #27's stated ΔE gate** (it has no
  `compare` spots to score), and — corrected by the review fix wave — now
  passes its own separate luminance-proximity acceptance criterion too
  (fitted to exposure 0.45, above), rather than being left failing at its
  untouched default.

### Known staleness this task creates, out of scope to fix here

Two documents described state this task changed, and this task's original
scope (apartment JSONs' `exposure`, `post.js`'s bloom constants, this file)
didn't extend to either. **`CLAUDE.md`'s `exposure` entry was corrected by
the review fix wave** — it named serenity's value as 0.33, then as this
section's original pass left it, 0.32; it now says 0.326 — because that fix
wave's own scope explicitly included the one clause. `docs/superpowers/metrics/r128-reference.md`
still describes bloom `strength: 0.22` as an accepted, kept-as-is r185
residual (it has been 0.1, converted, since the original task 7) — still out
of scope for both that task and this fix wave, still narrated here rather
than silently left for a future reader to trip over.

**Closed by a later whole-branch review.** That pass found a second,
undisclosed instance of the same problem in the same file: difference 2's
table row also still called the bloom *threshold* `1.294` "Kept" — true of
the migration this document records, not of what has shipped since task 7
refit it to 1.8. Leaving the threshold error undisclosed while the strength
error was at least narrated here was judged not a coherent deferral, so
both are now corrected in place in `r128-reference.md` itself — beside
difference 2's table row and beside "B. Bloom `strength`" — rather than
adding a third paragraph of disclosure on top of this one.

## Task 9: the gate, and the merge decision

> **Superseded — see "Phase B3 plan 3 task 4" at the end of this file.**
> This section's decision ("I consider the merge condition met", below)
> was correct for the code it measured and is kept as the record of that
> moment. It is no longer the current state: plan 3 task 2 changed the
> bake, and serenity now reads **16.61 all-spot legacy against the same
> ≤16.58 ceiling**, over six independent readings spanning three tasks
> and two exposure values. Do not quote this section as the live gate
> status.

Everything above this section was recorded by tasks 4–7. This section is the
gate itself — re-measured independently rather than trusted from the last
commit, because the merge decision is the one place in this plan where
"probably still true" isn't good enough.

### Structural — clean on all three, method attached

`window.__issues` empty and zero console errors on all three apartments.
Draw calls at each apartment's own `start` position, both methods (naive
undercounts the post chain — see `r128-reference.md`'s own rule to always
name the method):

| Apartment | Naive | Full chain | Budget |
|---|---:|---:|---:|
| serenity (3.6, 0.75, yaw 178) | 57 | **72** | ≤400 |
| kings-court (22.6, 5, yaw 90) | 150 | **165** | ≤400 |
| horkyone-10 (7.75, 5.85, yaw 0) | 68 | **83** | ≤400 |

kings-court's and horkyone-10's full-chain figures reproduce
`r128-reference.md`'s own "Structural gate after the fix wave" table
(165, 83) exactly. Serenity's 72 matches that same table rather than
`CLAUDE.md` hard rule 4's older 69 — the two numbers predate and postdate
the whole-branch review's difference 6 (the direct-light π correction)
respectively; 72 is the one this session reproduced independently.

Sky-leak raycasts (markers hidden first — an unhidden `Points` marker
sitting 0.3 m above a spawn otherwise returns a false "hit" before the
raycast ever reaches the ceiling) from every spawn, all three apartments:
every indoor spawn hits a mesh. Only the apartments' actual terraces report
`NOTHING ABOVE` (kings-court's Terrace, horkyone-10's Terrace — both open to
the sky by design); serenity's Pool Terrace hits a canopy at 1.05 m, same as
every prior measurement of that spot.

Walk simulations: kings-court's two established regression routes reproduce
their recorded endpoints exactly — entry hall (22.6, 5, ground 0) westbound
6 s → **x 13.14**, ground 0; upper hall (13.6, 0.9, ground 3.1) westbound 6 s
→ **x 4.44**, ground 3.1 (both match `r128-reference.md`'s own figures to two
decimal places). Serenity (start, forward 6 s → 3.24, 2.13, ground 0, moved
1.43 m) and horkyone-10 (start, forward 6 s → 7.75, 1.26, ground 0, moved
4.58 m) both moved a plausible distance without producing `NaN` or getting
stuck; neither has a standing precedent route to reproduce exactly.

### The merge condition, re-measured fresh

**Population, restated because getting this wrong quietly is the one
failure this task cannot afford:** the merge condition (serenity ≤16.58,
kings-court ≤22.44) was set over the **all-spot** population — every
`compare`-flagged spot, pose-verified or not — not the pose-verified
subset. See "What this means for the merge condition" above. Every number
in this subsection was captured fresh this task (`?measure=1`, `await
window.__bakeReady` first, per apartment per mode — old renders on disk are
never trusted for a gate reading) and scored with `tools/delta_e.py`
(pose-verified) and the same one-off all-spot technique tasks 5 and 7 used
(`scratchpad/all_spots_delta_e.py`, not committed — imports `delta_e.py`'s
own `cell_means()`/`ciede2000()` unmodified over every compare-flagged spot).

| Apartment | Mode | Population | mean ΔE2000 | File |
|---|---|---|---:|---|
| serenity | `&fov=legacy` | poseVerified 2/11 | 15.66 | `serenity-b2-task9-legacy.json` |
| serenity | `&fov=legacy` | **all-spot 11/11** | **16.57** | `serenity-b2-task9-legacy-allspots.json` |
| serenity | `&fov=legacy` (repeat) | poseVerified 2/11 | 15.68 | `serenity-b2-task9-legacy-repeat.json` |
| serenity | `&fov=legacy` (repeat) | **all-spot 11/11** | **16.56** | `serenity-b2-task9-legacy-repeat-allspots.json` |
| serenity | fixed (new-zero) | poseVerified 2/11 | 16.02 | `serenity-b2-task9-newzero.json` |
| serenity | fixed (new-zero) | all-spot 11/11 | 16.88 | `serenity-b2-task9-newzero-allspots.json` |
| kings-court | `&fov=legacy` | poseVerified 8/14 | 17.51 | `kings-court-b2-task9-legacy.json` |
| kings-court | `&fov=legacy` | **all-spot 14/14** | **18.75** | `kings-court-b2-task9-legacy-allspots.json` |
| kings-court | fixed (new-zero) | poseVerified 8/14 | 17.02 | `kings-court-b2-task9-newzero.json` |
| kings-court | fixed (new-zero) | all-spot 14/14 | 18.35 | `kings-court-b2-task9-newzero-allspots.json` |

**Serenity: 16.57, repeat 16.56, both ≤16.58 — margin 0.01 / 0.02 rounded.**
At full precision (unrounded per-spot dE2000, averaged, not rounded first)
the repeat run is **16.5550**, margin **0.025**; the first run's own
full-precision figure wasn't recoverable (a scripting fix landed between the
two captures and the render files carry no mode suffix, so the first run's
frames were already overwritten by the time the fix existed — its rounded
mean, 16.57, is unaffected and is what's cited). Both margins sit inside
this metric's own documented repeat-run noise floor (±0.03 rounded / ±0.039
full precision, `r128-reference.md`). This session's two numbers (16.57,
16.56) run about 0.02 above task 7's own committed pair (16.55, 16.54) —
itself within the noise floor, and the same shape of session-to-session
drift `r128-reference.md` already attributes to `builder.js`'s procedural
textures reshuffling their `Math.random()` seed on every fresh page load.
Four independent measurements now exist (task 7's two, this task's two),
**all four ≤16.58.** Not chased further, and nothing was tuned toward a
better number — the instruction for this task is to report what's
measured, not to improve it.

**Kings-court: 18.75 ≤22.44 — margin 3.69.** Consistent with task 7's 18.77
(margin 3.67) to within noise. Comfortable, not a close call.

**What changed since task 7:** nothing upstream of the render. `exposure`
in all three apartment JSONs is unchanged (serenity 0.326, kings-court 0.56,
horkyone-10 0.45 — confirmed by reading the files, not assumed), `post.js`'s
bloom constants are unchanged, no `compare`/`poseVerified` flag moved, no
geometry moved (task 8 touched only `compare.js`/`app.js`/`index.html`, all
UI). This section exists to prove that, not assert it — the numbers above
are a fresh, independent re-derivation, not a copy of task 7's.

### The judgement call, made explicitly

**"Reaches parity within noise" is what serenity's number is — not "passes"
and not "fails".** The numeric letter of the condition is satisfied: every
one of four independent measurements across two sessions (task 7's and this
one) landed at or under 16.58. But the margin (0.01–0.04 across those four
readings) is the same order of magnitude as the metric's own documented
repeat-run noise floor, which means the true population mean and the 16.58
ceiling are not distinguishable from each other with the precision this
metric has — a fifth measurement landing at 16.59 would not be a surprise
and would not by itself prove a regression either.

**I consider the merge condition met** — *true of the code this section
measured, and no longer true today: plan 3 task 2 changed the bake and
serenity now reads 16.61 against the same ceiling. See "Phase B3 plan 3
task 4" at the end of this file* — for three reasons rather than the
arithmetic alone: (1) the arithmetic does hold, consistently, across every
independent attempt to break it (repeat run, full-precision recompute, a
separate session roughly two hours after task 7's, with task 8's UI work
landed in between); (2) the pass is not manufactured — task
7's exposure refit closed a real, ~0.6-point gap (17.14 pre-refit → ~16.55–
16.57 now, see "What this means for the merge condition" above), so this is
"a real fix landed exactly at the edge of measurement precision," not "a
fix that didn't work being reported as if it did"; (3) the structural gate
and horkyone-10's separate criterion (below) are both unambiguous, so the
overall picture is not "everything is marginal," just this one number.

**This does not survive a future regression, and the margin is not
headroom.** Plan 4's own scope includes serenity's living-room geometry
(observation B1) — the exact apartment sitting at this margin. The next
change that touches serenity's render, however unrelated it looks, must
re-run this exact check before assuming today's reading still holds in
either direction. A margin this size is a statement about today, not a
guarantee about tomorrow.

### horkyone-10: the luminance criterion, reconfirmed

Task 7 fitted horkyone-10 to exposure 0.45 on the criterion task 6 set —
mean sRGB luminance within ±10 of the two fitted flats. Re-measured fresh
this task (mean/p5 sRGB luminance 0–255, full post chain, 480×300, every
`spawns` entry, pixels pooled across all spawns before computing the mean
and 5th percentile — same method as `PHASE-B-OBSERVATIONS.md`'s original
table and task 7's own remeasurement):

| Apartment | exposure (confirmed unchanged) | mean L (this task) | mean L (task 7) |
|---|---:|---:|---:|
| serenity | 0.326 | 138.31 | 138.36 |
| kings-court | 0.56 | 149.82 | 149.66 |
| horkyone-10 | 0.45 | 143.25 | 143.78 |

horkyone-10 vs. serenity: **+4.94** (task 7: +5.42). horkyone-10 vs.
kings-court: **−6.57** (task 7: −5.88). Both comfortably inside ±10, both
sessions. **Holds.** `window.__issues` stayed empty throughout.

### Looked at the tours, not just the numbers

Walked all three apartments (clean layout badge, no visible defects — no
floating furniture, no blocked passages, no exposure blowout or crush) and
stepped through `?compare=1`:

- **Serenity `1.webp` (Bathroom) and `11.webp` (Bedroom)** — the two
  poseVerified spots — both show genuinely the same room and camera pose as
  their photograph: same mirror position and backlit-mirror highlight in
  `1.webp`, same bed/window/headboard layout in `11.webp` (fabric pattern
  and wall tone differ, expected content mismatch, not a pose one).
- **Serenity `3.webp` (Living Room)** — observation B1, confirmed still
  present exactly as documented: the photograph shows the dining nook
  against a wall; the render shows the sofa and a wardrobe wall from the
  same room. Different content, not a lens or exposure problem. Plan 4's
  job; not chased here.
- **Kings-court `7.webp` (Dining room)** — one of the eight poseVerified
  spots — matches well: same table, chairs, pendant lights, kitchen beyond.
- **Kings-court `14.webp` (Bathroom 2)** — the missing-shower defect,
  confirmed still present: photograph shows a marble shower with a
  rain-head and glass door, render shows a bathtub wall with no shower
  geometry at all. Matches task 3's finding exactly. Plan 4's job.

Nothing observed here changes the numeric decision above — the metric was
already known to be blind to this defect class, and this pass exists to
confirm nothing *new* is wrong, not to re-litigate what plan 4 owns.

### The `?fov=legacy` bridge, removed

`tour/measure.js` no longer reads the `fov` query parameter at all —
removed after, not before, the last legacy-mode capture in this section.
Confirmed functionally, not just by reading the diff: with `&fov=legacy`
still in the URL (an inert query parameter now, harmless), a fresh capture
scored **16.89** all-spot — matching the new-zero population (16.88), not
the legacy one (16.56–16.57) — proving the code path is actually gone, not
merely unreferenced. That verification capture was discarded, not committed
(it exists to prove a removal, not to record a resemblance finding).

### Decision

**Gate met. PR #27 un-drafted.** Structural clean on all three, the ΔE2000
gate satisfied on both scored apartments (serenity within noise of its
ceiling, kings-court comfortably clear), horkyone-10's separate luminance
criterion holds. The fragility above is carried into the PR body, not
hidden by the word "passes."

## The trend

| Stage | mean ΔE2000 | File |
|---|---:|---|
| Baseline, before any work | 24.36 | `serenity-baseline.json` |
| Environment captured from the apartment | 24.81 | `serenity-a1-env.json` |
| Chamfered furniture edges | 24.81 | `serenity-a2-chamfer.json` |
| Baked ambient occlusion | 24.54 | `serenity-a3-ao.json` |
| Post-processing chain | 23.15 | `serenity-a4-post.json` |
| **Exposure matched to the photographs** | **16.57** | `serenity-a5-exposure.json` |
| Palette sampled from the photographs | 16.58 | `serenity-a6-palette-fix2.json` |

**The rows are not independent — read the Post-processing row with that in
mind.** Exposure was fitted (task 7) *after* the post-processing chain was
built and measured (task 6), against the renderer's then-current default
`toneMappingExposure` of 1.05. `serenity-a4-post.json`'s 23.15 is bloom's
effect at exposure 1.05, not at the 0.33 serenity ships with today — the
scene the post-processing task measured no longer exists by the time you
read this table. This is why the post-processing row's contribution to
the trend (24.54 → 23.15) cannot be compared directly against the
exposure row's (23.15 → 16.57): the second delta partly re-measures the
first stage's own effect under different lighting, it does not purely add
exposure's own effect on top of it. See "Is bloom still doing anything?"
below for what bloom is measured to be doing at the exposure the flat
actually ships with.

**The trend went down, from 24.36 to 16.58 — a drop of 7.78 points
(32%).** It is not monotonic: **environment capture raised the score**,
from 24.36 to 24.81 (+0.45), and chamfering then left it unchanged at
24.81. Both were kept anyway. The environment capture's +0.45 is small
next to the 6+ point moves later in the table and is plausibly within
run-to-run noise from the 8×8 grid; more importantly, it buys real
reflections of the apartment's own space instead of a stock studio —
a correctness change with a visual justification independent of this
metric, not something this metric was ever going to reward directly
(reflections shift a handful of glossy pixels; they don't touch the
diffuse colour of the other 63 grid cells). Chamfering is the same shape
of argument: edges that catch a highlight instead of showing a razor
silhouette, kept for how the render looks, not because ΔE2000 asked for
it. Both are cheap to keep and this is the only task in the table that
raised the score; every one after it (AO, post, exposure) brought it
back down and past baseline.

## Every file in this directory

Every one of the 14 `*.json` files in this directory is legended below —
the trend table cites one canonical file per stage, and this section
covers that file plus every intermediate and exploratory run behind it.
Kept deliberately, not clutter: several of the non-canonical files are
the actual evidence for findings stated elsewhere in this document.
Canonical files (the ones the trend table's numbers come from) are marked
**canonical**; everything else is a waypoint, a control, or a ruled-out
alternative, in chronological order.

**File naming.** `serenity-<stage>.json`, where `<stage>` matches the
`--phase` argument passed to `tools/delta_e.py` and is also stored in the
file's own `"phase"` field. Stage numbers are assigned in the order the
phase's tasks actually ran: `a1`=environment capture (task 3), `a2`=
chamfering (task 4), `a3`=baked AO (task 5), `a4`=post-processing (task
6), `a5`=exposure (task 7), `a6`=palette (task 8). If you find an `a5-`
or `a6-` file that doesn't match that ordering, something was renamed
incorrectly — exposure and palette's stage numbers were swapped in the
original commits (files shipped as `a6-exposure*` and `a5-palette*`) and
were corrected to the ordering above as part of this fix wave; every
reference to the old names in this repo's live docs (this file,
`docs/PHASE-B-HANDOFF.md`) was updated at the same time. Historical
planning/review documents that predate the rename (`docs/superpowers/
plans/`, `.superpowers/sdd/*/review-*.diff`) still use the old names —
those are point-in-time records of what was written at the time, not
live documentation, and are intentionally left as they were.

**Baseline and early stages**

| File | mean | What it is |
|---|---:|---|
| `serenity-baseline.json` | 24.36 | **Canonical.** Before any phase A work — the trend table's starting point. |
| `serenity-a1-env.json` | 24.81 | **Canonical.** After capturing the environment-reflection panorama from the apartment itself. |
| `serenity-a2-chamfer.json` | 24.81 | **Canonical.** After chamfering furniture edges. |

**Ambient occlusion (stage: "Baked ambient occlusion," trend-table value 24.54)**

| File | mean | What it is |
|---|---:|---|
| `serenity-a3-ao.json` | 24.54 | **Canonical.** The baked-AO stage's trend-table result. |
| `serenity-a3-ao-fix1.json` | 24.51 | Rerun after AO review round 1 (occluder plane-culling, floor-relative height, dropping a biased ray override). Near-identical to the canonical run — the fixes were correctness fixes to the AO sampler, not attempts to move this metric. |

**Post-processing (stage: "Post-processing chain," trend-table value 23.15 — measured at exposure 1.05, before task 7 refitted it; see the caveat above the trend table)**

| File | mean | What it is |
|---|---:|---|
| `serenity-a4-post.json` | 23.15 | **Canonical.** The post-processing chain's trend-table result. |
| `serenity-a4-post-fix.json` | 23.15 | Rerun after the post-processing correctness fixes (sRGB encoding on the composer's render targets, dropping a DPR-mismatched bloom resize). Same score as the canonical run — expected, since those fixes corrected *how* the chain rendered, not anything this metric measures; recorded to confirm the fixes hadn't regressed resemblance, not to move it. |

**Exposure (stage: "Exposure matched to the photographs," trend-table value 16.57)**

| File | mean | What it is |
|---|---:|---|
| `serenity-a5-exposure.json` | 16.57 | **Canonical.** `renderer.toneMappingExposure` fitted to serenity's own photographs (0.33) — the single biggest move in the whole trend table. Filename corrected in this fix wave; shipped originally as `serenity-a6-exposure.json`, out of stage order (see "File naming" above). |

**Palette (stage: "Palette sampled from the photographs," trend-table value 16.58)**

| File | mean | What it is |
|---|---:|---|
| `serenity-a6-nopalette-check.json` | 16.57 | **Control.** Score with no palette applied at all — matches the exposure-only baseline exactly, and is the number every palette variant below is measured against. This is the file that makes the null result checkable rather than asserted. |
| `serenity-a6-palette-direct-test.json` | 16.79 | **Ruled out.** An early approach: sample photograph colours and apply them directly. This is *worse* than doing nothing (16.79 vs. the 16.57 control) — the measured evidence that direct sampling actively hurts resemblance, which is what justified building the closed-loop approach below instead of shipping this one. |
| `serenity-a6-palette-closedloop-test.json` | 16.59 | The closed-loop sampling approach that replaced direct sampling. Roughly flat against the 16.57 control — the approach that was actually adopted and committed. |
| `serenity-a6-palette.json` | 16.62 | First committed wiring of the adopted approach: palette values reached only the live (non-baked) materials via `Materials.init()`. Baked floors, ceilings and walls still ignored `APT.palette` entirely at this point, which is why this number is *worse* than the 16.57 control rather than better. |
| `serenity-a6-palette-fix1.json` | 16.60 | After wiring `bake.js`'s merged wall tint to the palette (fix round 1). Still worse than the control — the floor/ceiling lightmap tint was still unwired. |
| `serenity-a6-palette-fix2.json` | 16.58 | **Canonical.** After wiring `builder.js`'s floor/ceiling overlay tint too (fix round 2) — palette now reaches every surface. This is the trend-table's "Palette sampled from the photographs" result, and it is where the null result becomes trustworthy: with every surface genuinely wired, the score (16.58) still lands within noise of the no-palette control (16.57). Filename corrected in this fix wave; shipped originally as `serenity-a5-palette-fix2.json` (and its siblings above as `serenity-a5-*`), out of stage order (see "File naming" above). |

## Is bloom still doing anything?

Checked directly as part of this fix wave, since the post-processing
row's score (above) can no longer be read as bloom's effect at the
exposure serenity actually ships with. Rendered the post-chain's
scene pass (before bloom/grain) at every one of serenity's 11 `compare`
photo spots plus its start position, at the shipped exposure (0.33), and
read back the maximum encoded channel value per frame —
`UnrealBloomPass`'s 0.92 threshold operates on exactly this encoded
value (see `post.js`'s comment on `composer.renderTarget1.texture.encoding`).

**At 11 of the 12 camera positions tested, nothing in the frame reaches
the threshold** (encoded max ranged 185–215 out of 255, i.e. 0.73–0.84,
all below 0.92 × 255 ≈ 235) — bloom is measurably inert there, consistent
with the reviewer's arithmetic that baked `MeshBasicMaterial` surfaces
can't reach it at this exposure.

**At the Bathroom spot, one small live (non-baked) surface does cross
it.** The bathroom vanity's backlit mirror panel (`MeshStandardMaterial`,
`metalness: 0.9`, `roughness: 0.1`) catches a specular highlight from the
baked environment reflection, reaching an encoded 246/255 (0.965) on
0.17% of the frame's pixels. That single spot's arithmetic differs from
the reviewer's: the
1.6 ceiling only bounds *baked, diffuse* surfaces (the lightmap's clamp
times `lightMapIntensity`); a live specular highlight on a near-mirror
metal is unbaked and unclamped, and can exceed it locally regardless of
exposure. Toggling `UnrealBloomPass.enabled` and diffing the two frames
confirms it is visible, not just numerically above threshold: 5.96% of
the Bathroom frame's pixels change (max per-channel-sum diff 62/255)
with bloom on vs. off, against 0% pixel difference at a spot with no
threshold-crossing pixels (Living Room, checked as a control).

*Attribution corrected, task 5 of plan 2.* This paragraph originally
credited the highlight to "a chrome/metal fixture," which reads as
`M.chrome` (`materials.js:384`) — but `M.chrome` is roughness **0.25**, not
0.1. `metalness: 0.9, roughness: 0.1` is `M.smoke`'s own signature
(`materials.js:415`), and the only `M.smoke` surface at this spot is the
vanity's backlit mirror panel (`F.vanity` in `builder.js`, the mesh
explicitly commented `// backlit mirror`). The measured numbers above —
246/255, 0.17%, the 5.96% pixel-diff — are unchanged; only which object
they belong to.

**Conclusion: bloom is not inert, so it was not removed.** It is inert
or near-inert across nearly the whole apartment at the shipped exposure,
and produces one small, real, localized highlight-glint on a specular
metal surface in the bathroom — a legitimate instance of exactly what
`post.js`'s own comment says the high threshold is for ("only real
daylight blooms"), just rarer at 0.33 exposure than it would be at 1.05.
`tour/lib/UnrealBloomPass.js`, `tour/lib/LuminosityHighPassShader.js` and
the post-processing chain in `tour/post.js` are unchanged by this
finding.

## Two results worth stating plainly, not smoothing over

**The exposure task did almost all of the work.** A reviewer decomposed
it: the CIEDE2000 lightness term fell from 15.9 to 0.6, and the predicted
post-fit score of ~16.8 matched the measured 16.57. The gain is entirely
lightness, with no unexplained remainder — one wrong global number
(display-referred exposure, never previously measured against the source
photographs) was responsible for most of the phase's total improvement.
Every other task in this phase — environment, chamfering, AO, post,
palette — together moved the score less than exposure alone.

**The palette task returned a null result, and it is a real one.** Task 8
sampled six material colours out of the photographs into `APT.palette`.
The first wiring only reached `Materials.init()`'s live materials; baked
surfaces (floor/ceiling lightmap tint in `builder.js`, the merged wall
mesh in `bake.js`) ignored the palette entirely, so two follow-up fixes
wired the palette into all three baked paths before the null result could
be trusted. With walls, floors, ceilings and furniture all genuinely
reachable, the score still went from 16.57 to 16.58 — not an improvement,
within noise of a regression. A reviewer confirmed the null was honest
rather than concealed tuning: see the residual decomposition below for
*why* a colour correction had nothing left to correct.

## Where the residual ~16.5 actually lives

`tools/residual.py` asks a different question than the trend table: is
what's left a **global colour cast** — the same shape of problem exposure
turned out to be — or **distributed content error** that no global
correction can reach? Run from the repo root against the current
(post-palette) renders:

```bash
python tools/residual.py
```

```
file      room                 dL      da      db      dE dE_noAB
1.webp    Bathroom          +7.85   -1.02   +1.15   17.88   17.79
2.webp    Pool Terrace      +3.76   +2.38   +6.73   17.36   16.23
3.webp    Living Room       +2.89   +2.04   +0.56   16.25   15.91
4.webp    Living Room       +3.26   +1.50   -0.09   13.91   13.68
5.webp    Kitchen & Hall    +0.66   +1.42   +1.41    9.81    9.32
6.webp    Bedroom           -2.79   -0.64   +2.66   15.95   15.62
7.webp    Bedroom           -4.78   +1.65   +7.82   19.31   18.05
8.webp    Bedroom           +6.48   +1.89   -1.78   11.74   11.01
9.webp    Living Room       +7.41   -3.10   +0.10   18.87   18.17
10.webp   Pool Terrace      +6.44   +2.00   -4.18   29.02   28.98
11.webp   Bedroom           -1.22   -0.13   +3.99   12.33   11.81

mean offsets across spots:  dL +2.72   da +0.73   db +1.67
spread (std):               dL  4.09   da  1.64   db  3.34

mean dE2000 now:                        16.58
after ONE global a/b shift (0.73, 1.67): 16.47
  -> a single global colour correction is worth 0.11 points
```

Reading this against exposure's result (worth 6.6 points as a global
lightness correction) is the whole point:

- **Removing the global a/b colour offset entirely is worth 0.11 ΔE
  points** (16.58 → 16.47). There is no global colour correction left to
  make — which is exactly why the palette task found nothing to fix.
- **Per-spot lightness still swings −4.78 to +7.85** even though the
  *mean* (dL +2.72) matches what exposure fitted. The light
  *distribution* differs room by room; only its average was corrected,
  because exposure is a single scalar and a per-room distribution is not
  a problem a single scalar can solve.
- **Spot 10, the Pool Terrace, is a huge outlier at 29.02 against a 16.6
  mean.** That photograph is mostly water, planting and real sky — this
  scene renders those as flat coloured boxes. Pure content mismatch, not
  a lighting or colour problem at all.

**The conclusion: the residual ~16.5 is content and geometry mismatch,
not calibration.** Box furniture where the photograph has real objects,
procedural textures approximating real materials, crude surroundings
outside the windows, and a per-room light distribution that doesn't match
the real one. None of it is reachable by any global correction — global
corrections were exhausted by exposure, down to the 0.11-point floor
measured above. It is what real GLTF furniture, PBR texture sets and
proper multi-bounce GI exist for, and that is the next phase (the engine
migration), not this one.

## Phase B3 plan 3 task 4: exposure and bloom re-fitted, and the gate does not close

Everything above this section predates plan 3. Read it as history: **the
merge condition it describes as reached ("Serenity: 16.55 ≤ 16.58 —
reaches parity within noise") no longer holds.** Plan 3 task 2 changed
`lightAt`'s indoor ambient and dropped `aoAt`'s occlusion floor on
lightmapped surfaces, and task 4 re-fitted the two constants that act on
the result. Full sweep data, method and frames:
`.superpowers/sdd/2026-08-13-phase-b3-light/task-4-report.md`; committed
numbers in `{serenity,kings-court}-b3-task4-exposure-sweep.json`,
`bloom-b3-task4.json`, `horkyone-10-b3-task4-luminance.json` and the ten
`*-b3-task4-final*.json` files `tools/delta_e.py` wrote.

**Fitted values.** `serenity.exposure` 0.326 → **0.329**,
`kings-court.exposure` 0.56 → **0.575**, `horkyone-10.exposure` 0.45 →
**0.46** — all three up, because task 2's change darkened the render and
exposure is what puts the mean back. Both bloom constants were
re-measured from scratch (task 2 moved the radiances the threshold acts
on) and **held at threshold 1.8 / strength 0.1**: the daylight wash still
cliffs between 1.6 and 1.7, 1.7–3.0 is one flat plateau, and serenity's
backlit bathroom mirror still keeps a real 0.19% crossing at 1.8.

Fitted toward luminance, exactly as the rule requires: the quantity
minimised was `|render mean − photograph mean|` on `tools/luminance.py`'s
output, pooled over two or three independent page loads per candidate,
with the bloom pass disabled and ΔE2000 recorded on every row but never
aimed at. At kings-court the two criteria disagreed as they did last
time — ΔE falls monotonically toward exposure 0.50 while luminance
crosses at 0.575 — and the luminance value was taken, costing **+0.06**
ΔE on the gate metric (measured same-load: 0.56 → 18.78, 0.575 → 18.84).

**The merge condition, all-spot, `&fov=legacy`:**

| Apartment | Ceiling | Now | Verdict |
|---|---:|---:|---|
| serenity | ≤16.58 | **16.61** (four runs: 16.60, 16.62, 16.61, 16.60) | **fails by 0.03** |
| kings-court | ≤22.44 | **18.90** | passes by 3.54 |

The 0.03 is the same size as this metric's own repeat-run noise floor,
but it lands on the wrong side of the line in **every** run, where the
pre-task-2 state landed under it in all four of its runs — so it is a
consistent, reproducible miss whose magnitude merely equals the noise
floor, not parity.

**It is not this task's fit, and it is not noise: six independent
readings above the ceiling, across three tasks and two exposure values.**
`serenity-b3-task2-fix1-allspots.json` 16.60 and
`serenity-b3-task3-off-allspots.json` 16.61 both predate this task and
were taken at the old 0.326; the four task-4 runs read 16.60, 16.62,
16.61, 16.60 at 0.329. A miss that reproduces six times, on two
different exposures, in three different tasks' harness runs, is a real
miss.

**Exposure cannot reach it, measured in the gate's own camera.** One page
load, `&fov=legacy`, shipped chain, only exposure changing, all-spot
11/11. Each point is its own `tools/delta_e.py` file — `…-reach-e0.30`
through `…-reach-e0.34`, indexed by
`serenity-b3-task4-exposure-reach.json` — so every mean re-derives from
its own per-spot list, like the gate files:

| exposure | 0.30 | 0.31 | **0.32** | 0.326 | **0.329 (ships)** | 0.34 |
|---|---:|---:|---:|---:|---:|---:|
| ΔE2000 (`delta_e.py`) | 16.64 | 16.62 | **16.61** | 16.61 | 16.61 | 16.65 |
| full precision, same frames | 16.6433 | 16.6161 | **16.6104** | 16.6133 | 16.6160 | 16.6454 |
| an earlier independent load | 16.6424 | 16.6147 | 16.6085 | 16.6121 | 16.6142 | 16.6437 |

The curve is a shallow U whose **minimum over the whole neighbourhood is
16.61**, at exposure 0.32 — still above the 16.58 ceiling, and worth only
0.0056 against the shipped value, a sixth of the shortfall and a seventh
of the noise floor. It rises on both sides, and two independent page
loads agree on every point to within 0.002. **There is no exposure that
passes this gate**, so the trade-off between the luminance fit and a
passing score does not exist to be made — the question of whether it
would have been allowed never arises. The residual is a redistribution
across the 8×8 cell means, and a single scalar on the mean cannot undo
one; the decision about it belongs to whoever owns the merge.

**horkyone-10** (no `compare` spots, so no ΔE) passes its own criterion:
spawn-pooled mean sRGB luminance **143.6** against serenity 138.7 and
kings-court 149.0 — inside ±10 of both, and 0.25 off the siblings'
midpoint.

**This fit expires.** It was made against a render carrying the deferred
`grid()` winding defect (8 of 12 wall faces backwards, `bake.js`),
knowingly and by agreement; when that fix lands, exposure and bloom both
have to be re-fitted.

## Phase B3 plan 3 task 5: the offline lightmap baker, and it is flat

`tools/bake_lightmaps.mjs` drives headless Chrome through Playwright and
bakes serenity's floor/ceiling lightmaps offline at 2048 cosine-weighted
paths per texel with 2 bounces, against the runtime bake's 16 single-hop
rays. `tour/lightmaps.js` loads the result, but only while a SHA-256 of
the config's geometry keys still matches the manifest — otherwise it
warns, pushes into `window.__issues` and bakes at runtime. Only serenity
ships a pack (13.3 KB, 0.16% of the task's 8 MB ceiling). Full method,
guard proof and per-surface data:
`.superpowers/sdd/2026-08-13-phase-b3-light/task-5-report.md`; committed
numbers in `serenity-b3-task5-luminance.json` and the two
`serenity-b3-task5-*-legacy-allspots.json` files.

**Linear contrast, the quantity task 6 gates on, did not move:**

| set | mean | p5 | contrast |
|---|---:|---:|---:|
| runtime bake | 0.2819 | 0.0833 | **3.384** |
| offline pack | 0.2891 | 0.0854 | **3.385** |
| photographs | 0.2993 | 0.0483 | **6.196** |

Mean moved toward the photographs and p5 moved away from them, and the
two cancel. That is what a bounce term *does*: its only mechanism is to
put light back into the near-field shadows the runtime bake crushes to
black, which raises the floor, and contrast is mean/p5. A configuration
that raised contrast would have to take light out of the darkest 5%, and
the surfaces owning the darkest 5% of a first-person frame are the walls
— which have no lightmap and cannot get one until the `grid()` winding
defect is fixed.

All-spot legacy ΔE2000 moved **16.59 → 16.75**, away from the 16.58
ceiling. Spawn-pooled sRGB luminance moved 138.7 / 80.1 to **140.2 /
80.3** (contrast 1.732 → 1.746) against a run-to-run noise floor of 0.1.

**Two things worth carrying forward.** The pack does not make the page
load faster and on the dev server makes it slower: the texel loop it
skips costs 233 ms for all ten surfaces, while its eleven HTTP requests
cost 4.5–6.8 s of wall time — `Baker.run`'s cost is the BVH build, the
wall pass and the furniture AO pass, none of which a pack touches. And
lightmaps cannot currently be baked at a finer texel grid than the config
asks for: `bakeSurface`'s edge dilation replaces exactly one boundary
ring from a neighbour that may itself be spoiled, so at 3× density
serenity's ceilings came back with a black band 13/255 against an
interior of 185. The obvious generalisation was written, measured and
reverted — at the *shipped* densities the spoiled run already exceeds one
texel on 254 / 454 / 122 edge scans, so it changes every apartment's
bake.
