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
