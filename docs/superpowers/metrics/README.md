# Phase A photorealism — resemblance metrics

Mean CIEDE2000 (ΔE2000) between the render and the real photograph, over
an 8×8 grid of cell-mean colours, at the 11 Serenity photo spots flagged
`compare` (of which ~~2 currently pass~~ **9 currently pass** pose
verification — corrected 2026-08-19 by plan 4b task 5; kings-court is
**10 of 13**, its population having changed from 14. See "Pose
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
exposure. Most do not: ~~**serenity 2 of 11 pass**~~ **serenity 9 of 11**,
~~**kings-court 8 of
14**~~ **kings-court 10 of 13** (corrected 2026-08-19, plan 4b task 4 fix
round 1 — struck in place per repo convention rather than deleted; the
population also changed, see the 2026-08-19 note below. **serenity's live
figure was added inline 2026-08-19 by task 5**: fix round 1 struck the old
serenity number without putting the new one beside it, so this sentence read
as though only kings-court had a current count. The correction below was
always there; a reader who stopped at this line could not see it. As of this
branch **most spots now DO pass** — 19 of 24 across the two flats — so the
sentence's own "Most do not" is itself historical, and that is the single
largest thing plan 4b changed)
(classification and evidence:
`.superpowers/sdd/2026-08-13-phase-b2-measurement-exposure/task-3-report.md`).
The failures are camera-pose and modelling defects, not lens ones, and
they are fatal to everything this directory measures — ΔE2000, luminance
and the residual decomposition all assume the rendered and photographed
pixels are the same surface. Scoring through a mismatched spot measures
the mismatch, not the render — the exact contamination the palette task
already showed makes a metric *worse* than doing nothing (`CLAUDE.md`,
the `palette` config key).

> **serenity is now 9 of 11, 2026-08-19** (plan 4b task 2, `1e0d4e5`). Six
> mis-pointed cameras were re-pointed and `8.webp` — a photograph of the
> bathroom attached to a spot standing in the bedroom — was moved into the
> bathroom. Only the pool vista (`2.webp`, `10.webp`) still fails; it is a
> content defect owned by 4c. ~~kings-court's 8 of 14 is unchanged.~~
>
> **kings-court is now 10 of 13, 2026-08-19** (plan 4b task 4). Four
> mis-pointed cameras were re-pointed; `2.webp` and `10.webp` flipped to
> `poseVerified: true`, `14.webp` and `17.webp` stayed `false` because their
> subjects are defective in the model, not mis-aimed (see their `poseNote`s).
> **The denominator changed too:** the merge owner ruled that `4.webp`'s
> coffee corner will not be modelled, so its `compare` flag was removed and
> **kings-court's compare population is 13, not 14, from that commit on** —
> any before/after pair that straddles it is on two different populations.
> The same `luminance.py` warning below applies: kings-court's
> luminance-fitting population went from **8 spots to 10** in that commit,
> and the committed `exposure: 0.52` was fitted against the 8.
>
> **If you are here to re-fit `exposure`, read this before you run anything.**
> `tools/luminance.py` builds its population with `delta_e.scorable`, which
> requires `poseVerified`, and it has **no `--all-spots` flag** — there is no
> way to ask it for the all-spot population the ΔE gate uses. So the flip
> above changed serenity's luminance-fitting population **from 2 spots to 9**
> without anyone editing `luminance.py`. Consequences, in order of how easily
> they are missed:
>
> 1. The committed `exposure: 0.295` was fitted against the **2-spot**
>    population. Any new fit runs against **9**. The two numbers are not
>    comparable, and a change between them is not evidence that anything about
>    the lighting moved.
> 2. The 9-spot population is the better instrument — it is nine frames that
>    actually photograph what they render, instead of two — so this is an
>    improvement. It is recorded here because it is silent, not because it is
>    wrong.
> 3. **horkyone-10's ±10 luminance criterion is derived from serenity's
>    mean-scene-luminance**, so it moves when serenity's population changes.
>    Re-derive the band; do not check horkyone-10 against the old one.

The verdict is recorded as data: `photoSpots[].poseVerified`
(`true`/`false`) in `serenity.json` and `kings-court.json`, with a
`poseNote` on every failing spot describing what it actually renders so
the next reader doesn't have to re-derive it. **Absent means verified** —
an apartment nobody has classified yet (horkyone-10) keeps scoring every
`compare` spot it has, instead of silently scoring zero. `tools/delta_e.py`,
`tools/luminance.py` and `tools/residual.py` all skip `poseVerified: false`
spots by construction and print how many they skipped.

~~**Serenity's number now rests on 2 spots (`1.webp`, `11.webp`). Kings-court's
rests on 8 (`3, 7, 8, 11, 12, 13, 19, 20`).**~~ **Serenity's rests on 9 of 11
(all but `2.webp` and `10.webp`); kings-court's on 10 of 13 (all but `14.webp`,
`17.webp` and `18.webp`)** — corrected in place 2026-08-19 by plan 4b task 5.
**These are not equally
trustworthy and must never be read as comparable to each other, or to the
trend table below** — ~~a 2-spot mean swings on a single frame; an 8-spot
mean is only somewhat steadier~~ the populations are now 9 and 10, which is
a real improvement in both, but **no error bar accompanies either** and that
was always the load-bearing half of this sentence.

> **Why this sentence was corrected rather than scoped, 2026-08-19 (task 5).**
> It is the one genuinely ambiguous site in this file's stale-count sweep. It
> could be read as scoped to the dated proof run immediately below it, in
> which case 2/8 would be right and untouchable. It is not: the word **"now"**
> and the present tense make it a **live status claim** about what the
> `poseVerified` population currently is, and it sits above the table rather
> than inside it. So it was corrected. **The table below it was not** — that
> is a dated 2026-08-13 measurement and its 2/11 and 8/14 are the populations
> that run actually had. The distinction is the whole point: a claim about
> today gets corrected, a record of a measurement gets left alone.

Proof run
that the filter is live, **2026-08-13 — a dated record, deliberately NOT
updated; its 2/11 and 8/14 are the populations this run scored**
(`serenity-b2-poseverified.json`,
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

> **SUPERSEDED IN PLACE, 2026-08-19 by plan 4b task 5 — every defect this
> section names has since been fixed, disproved or re-routed, and the
> section is written in the present tense throughout.** Kept rather than
> deleted, because it is the diagnosis plan 4b was built from and because
> the tested-fov ranges recorded in it are not written down anywhere else.
> **Read every "is", "needs" and "Plan 4 owns" below as "was", as of
> 2026-08-13.** Bullet by bullet:
>
> - **serenity's living-room cluster — the premise was wrong, not just
>   stale.** The model was already a `type: "door"` before plan 4b started,
>   and **the photograph is not a floor-to-ceiling slider either**: task 1
>   measured `9.webp`, the only frame with the leaf slid open, and put the
>   head at **1.95–2.10 m**, which `DOOR_H` 2.05 already builds. Only the
>   **width** was ever wrong; task 1 widened it 1.4 → 1.8 m and deliberately
>   left the height alone. **"No camera angle reproduces the photograph" was
>   also false** — it was true of the camera *position* it was swept from,
>   not of the room. Task 2 moved those spots as well as turning them, and
>   all three now pass. What actually survives is a defect this section never
>   named: **the sofa is on the wrong wall**, routed to 4c.
> - **kings-court's `14.webp` — the shower exists now.** Task 3 built it
>   (`d9672c3`); the spot moved **25.78 → 21.75**, the largest single-spot
>   movement on the branch. **And the marble exculpation in that bullet is
>   now wrong.** It says task 3 "checked and ruled out" B3's marble defect
>   "for this spot specifically" — task 3's own fix round then found
>   Bathroom 2's marble **inverted** (fixture wall black where the
>   photograph is white, bath wall the reverse) and swapped it (`c1a7329`).
>   Both defects were present; the ruling-out was mistaken. The spot still
>   fails, for reasons no camera fixes: the room is the photograph's mirror
>   image and `F.shower` builds no divider glass — a `builder.js` change,
>   genuinely blocked.
> - **kings-court's `4.webp` — decided, not fixed.** The merge owner ruled
>   the coffee corner will not be modelled; task 4 removed its `compare`
>   flag. **kings-court's compare population is 13, not 14, from that commit
>   on.**
> - **"These need position/yaw recalibration" — all ten got it.** Tasks 2
>   and 4 re-pointed every spot in that list, plus serenity's `8.webp`,
>   which was a *mapping* defect rather than a pose one (a bathroom
>   photograph attached to a spot standing in the bedroom). Six of the ten
>   now pass; the four that do not — serenity `2.webp`/`10.webp`,
>   kings-court `18.webp`, and `17.webp` — fail on **content that does not
>   exist or is wrong in the model**, not on aim.
> - **"Plan 4 fixes the geometry defects above" — plan 4b did.** `poseVerified`
>   went **2 of 11 → 9 of 11** on serenity and **8 of 14 → 10 of 13** on
>   kings-court: **10 of 25 spots showed their photograph's subject when this
>   section was written, and 19 of 24 do now.**
>
> **And the thing that must travel with those numbers:** serenity moved
> **16.00 → 15.49** and kings-court **18.59 → 18.17** on one fixed 14-spot
> population, shipping **17.59** on 13. **No renderer, bake,
> post-processing, material or shader code changed anywhere in plan 4b.**
> The metric began comparing like with like, and two objects that were
> missing or wrong got fixed. It is a **measurement correction, not a
> rendering improvement.**
>
> **Why this block exists at all, for whoever sweeps next.** This section
> survived *five* consecutive stale-record sweeps in this plan, including
> task 5's own. Every earlier sweep — this one included — searched for
> **digit patterns** (`2 of 11`, `8 of 14`, `9 of serenity's 11`). Not one
> phrase in this section contains a digit pattern: "the model has a punched
> window", "the geometry itself is missing", "these need position/yaw
> recalibration". **Sweep for the claim, not for the number**, and read the
> abstract of every document you touch — an abstract restates counts in
> prose.

Marked `poseVerified: false` with a `poseNote`, not deleted and not left
unflagged — deleting them would make these defects invisible to the
metric, and a future regression there would go undetected:

- **[SUPERSEDED — premise disproved; see the block above]** **Serenity's
  Living Room cluster (`3.webp`, `4.webp`, `9.webp`)** —
  observation B1 (`docs/PHASE-B-OBSERVATIONS.md`): the flat has a
  floor-to-ceiling sliding door with sheer curtains; the model has a
  punched window. No camera angle reproduces the photograph. Plan 4 owns
  the fix.
- **[SUPERSEDED — shower built; marble exculpation later withdrawn; see the
  block above]** **Kings-court's `14.webp` (Bathroom 2)** — none of the config's four
  `type: "shower"` furniture entries fall inside Bathroom 2's bounds
  (x 8.8–11.4, z 0–2.6); the photograph's actual subject was never
  modelled here. Not the same defect as observation B3's near-blank
  marble walls — task 3 checked and ruled that out for this spot
  specifically (the render is a fully lit tub, just the wrong subject) —
  the geometry itself is missing, not the material.
- **[SUPERSEDED — ruled on, not modelled; spot left the `compare` set]**
  **Kings-court's `4.webp` (Coffee corner)** — observation B4: a
  product-detail shot of a coffee machine the model never built; the
  render is a plain wall regardless of fov.
- **[SUPERSEDED — all ten re-pointed by tasks 2 and 4]** **Spots whose
  recorded pose is simply wrong** — no fov value
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
**[It did — plan 4b, 2026-08-19. `poseVerified` 2 of 11 → 9 of 11 on
serenity and 8 of 14 → 10 of 13 on kings-court. See the block at the top of
this section for what happened to each defect, and note that no renderer,
bake, post-processing, material or shader code changed to produce any of
it.]**

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
> radiances, and ~~ship today as 0.329 / 0.575 / 0.46~~ **were superseded
> again before they ever reached `main`: plan 4a task 3 re-fitted all three
> against the post-winding render, and `origin/main` ships serenity
> **0.295**, kings-court **0.52**, horkyone-10 **0.42*** (corrected
> 2026-08-19 by plan 4b task 5, fix round 2 — verified by reading
> `origin/main:tour/apartments/*.json` directly, not inferred). Both bloom
> constants
> were re-measured and held. The method described here is unchanged and
> still current; only the values and the gate reading moved.
>
> **This line is the subtlest instance of the sweep failure this file
> documents, and it is worth understanding rather than just fixing.** Note
> where it sat: **inside a narrated supersede-marker.** The marker correctly
> retires one generation of values (0.326 / 0.56 / 0.45) and then, in the
> same sentence, asserts the *next* generation as current — and that
> generation was itself superseded four days later. **A marker that
> supersedes one claim and then makes a live claim about its successor is a
> trap, and it is more dangerous than a bare stale sentence, not less**,
> because the marker has already bought the reader's trust by the time the
> live claim arrives. Three of this plan's sweeps read past it. **Rule for
> the next sweeper: a claim inside a supersede-marker still needs checking.
> Markers are not immune; they are where staleness hides best.**
>
> It also survived because of a *second* wrong belief, filed in this task's
> own report and corrected here: that the line was "correct for `main`,
> where plan 4a is unmerged". **Plan 4a is merged** — PR #30, `feac92a`, an
> ancestor of `origin/main` — so the line was stale everywhere, and the
> report's claim to have "flagged" it described text that was never written.
> **Check the merge status of the branch you are reasoning about; do not
> infer it from a document that predates the merge.**

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

> **Superseded values — the method below is still the live one, every number
> in it is not.** Added 2026-08-15 by plan 4a task 5. This section fits
> horkyone-10 to **0.45** against siblings at serenity **0.326** /
> kings-court **0.56**, and its sibling-band arithmetic (window
> [139.66, 148.36], the ±5-ish diffs, the 1.05 comparison) is computed from
> those three. All three have since moved twice: plan 3 task 4 →
> 0.329 / 0.575 / 0.46, then plan 4a task 3 → **0.295 / 0.52 / 0.42**, which
> is what ships on `phaseB-plan4a-winding` (fitted and measured at `?v=110`;
> the tree is at **`?v=112`** after two comment-only bumps that moved no
> value — `main` still carries plan 3 task 4's set until that branch
> merges). **Read this section for the
> criterion and the procedure — "mean sRGB luminance within ±10 of both
> fitted flats, every `spawns[]` entry at 480×300 through the full post
> chain, pooled" — and for nothing else.** The live band and the live sweep
> are in plan 4a task 3's harness
> (`docs/superpowers/harnesses/2026-08-15-b4a-task3/`, `session.json` →
> `spawnPooledLuminance`): serenity 140.27, kings-court 148.19, acceptance
> window **[138.19, 150.27]**, and horkyone-10 at 0.42 reads 145.44 pooled
> over three loads, +5.17 from serenity and −2.75 from kings-court.
>
> **And the criterion had lapsed unnoticed.** The 0.46 this section's
> successor fitted **was already failing the same ±10 test before plan 4a
> touched anything** — at +11.07 from serenity, measured on the sweep above.
> Nothing broke it directly: plan 4a task 1's winding fix brightened all
> three apartments, serenity's own re-fit came down further than
> horkyone-10's, and the band moved out from under a value nobody re-checked.
> That is a structural gap, not a slip. **horkyone-10's exposure is defined
> relative to two other apartments' exposures and no check re-runs when
> either of them moves**, so it can fall out of its band silently and stay
> there. Plan 4a task 3's refit to 0.42 was therefore mandatory rather than
> cosmetic. Carried into `docs/PHASE-B-RESUME.md`'s deferred table so it is
> owned by a plan rather than only recorded here.

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
> status. **Nor is the ≤16.58 ceiling itself live any more** — it was
> superseded on 2026-08-15 when the merge owner accepted that 0.03 and
> restated the gate as a baseline-plus-attribution tripwire
> (`docs/PHASE-B-RESUME.md`, "The gate, restated 2026-08-15").

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

> **Reconfirmed then, superseded twice since.** Added 2026-08-15 by plan 4a
> task 5. The exposures in the table below (0.326 / 0.56 / 0.45) are two
> generations old — plan 3 task 4 moved them to 0.329 / 0.575 / 0.46 and plan
> 4a task 3 to **0.295 / 0.52 / 0.42**. The criterion and the method are
> unchanged and still current; only the values are history. See the marker
> under "horkyone-10: fitted, and it passes the ±10 luminance check" above
> for the live band, and for why this criterion went unenforced between the
> two moves.

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
  job; not chased here. **[Plan 4 did it — 2026-08-19, task 5. This bullet
  is a dated eyeball record and is left as observed, but the defect is not
  live: task 2 re-pointed `3.webp` and it passes pose verification now.
  What this bullet actually saw — sofa where the photograph has the dining
  nook — turned out to be **two** defects, and only one was pose: the sofa
  really is on the wrong wall in the config, which no camera fixes and
  which is routed to 4c.]**
- **Kings-court `7.webp` (Dining room)** — one of the eight poseVerified
  spots — matches well: same table, chairs, pendant lights, kitchen beyond.
- **Kings-court `14.webp` (Bathroom 2)** — the missing-shower defect,
  confirmed still present: photograph shows a marble shower with a
  rain-head and glass door, render shows a bathtub wall with no shower
  geometry at all. Matches task 3's finding exactly. Plan 4's job. **[Plan
  4 did it — 2026-08-19, task 5. Dated record, left as observed. Plan 4b
  task 3 built the shower (`d9672c3`) and the spot moved 25.78 → 21.75.
  Note this bullet named the **glass door** as part of the photograph's
  subject and it is still absent: `F.shower` builds no divider between
  shower and bath, a `builder.js` change that 4b forbade, so `14.webp`
  still fails pose verification — for that and because the room is the
  photograph's mirror image.]**

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

## Every phase-A file in this directory

Every one of the **14 phase-A files** — `serenity-baseline.json` plus the
thirteen `serenity-a*.json` — is legended below: the trend table cites one
canonical file per stage, and this section covers that file plus every
intermediate and exploratory run behind it.

**Scope corrected 2026-08-15.** This heading and sentence read "every file in
this directory" and "every one of the 14 `*.json` files in this directory"
when phase A's fourteen were all there was. The directory now holds **152**
`*.json` files — phase B's plans 1–3 added the rest — and this section has
never covered them. Phase B's files are legended in their own sections
further down, named for the plan and task that produced them
(`<apt>-b<plan>-task<n>-*.json`).
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

> **The measurements below stand; the ceilings they are read against do
> not.** On 2026-08-15 the merge owner accepted serenity's 0.03 and
> **restated the gate** — the all-spot legacy reading is now a regression
> tripwire with per-apartment baselines and an attribution rule, not a
> pass/fail ceiling. serenity's **16.61** and kings-court's **18.90** are
> the recorded baselines under that regime, so this table's *numbers* are
> the live ones while its *verdict column* is history. The grounds were not
> "the threshold is noisy" — they are this file's own finding that the
> metric is dominated by pose and content mismatch and cannot arbitrate a
> 0.03 of lighting. See `docs/PHASE-B-RESUME.md`, "The gate, restated
> 2026-08-15" and "How the 0.03 was resolved".
>
> **And there is a SECOND ruling, mirrored here so one deletion cannot lose
> it.** Added 2026-08-15 by plan 4a task 5. After plan 4a task 1's winding
> fix put serenity at **16.32** — *under* the old ≤16.58 ceiling, not over
> it — and task 3's re-fit took it to **16.00** (kings-court **18.58**), the
> merge owner ruled a second time: **keep the restated gate; do not
> reinstate the absolute ceilings** now that serenity would pass them. The
> grounds are the ones above and never depended on the 0.03 — this metric
> cannot arbitrate lighting at that resolution, and serenity's ΔE is
> expected to move by whole points once plan 4 fixes the living-room
> opening, the missing shower and the mis-pointed spots.
> **[That forecast resolved, and it was right — 2026-08-19, plan 4b task 5,
> fix round 2. Plan 4b corrected all three named defects, though the
> living-room opening was not too short, only too narrow, and the
> "floor-to-ceiling slider" premise was disproved photographically.
> serenity moved 16.00 → 15.49 and kings-court 18.59 → 18.17 on a fixed
> 14-spot population — half a point rather than "whole points", so the
> magnitude overshot, but the direction, the cause and the ruling drawn
> from them are all confirmed. **No renderer, bake, post-processing,
> material or shader code changed anywhere in plan 4b**, so this is not
> evidence that the lighting improved. Full note at the twin of this
> paragraph in `docs/PHASE-B-RESUME.md`, "How the 0.03 was resolved".
> Added here because fix round 1's report claimed both twins were
> annotated and only the `PHASE-B-RESUME.md` one was.]**
> **Provenance, stated because it is thinner than the first ruling's:** a
> merge-owner decision taken **in session on 2026-08-15** and recorded by
> the controller, made conversationally after task 1's numbers were
> verified. **No in-tree artefact of it exists** — no commit, no report, no
> metrics file — which is why it is written into committed prose in two
> places rather than cited. Read it as a recorded decision, not a citation.
> The primary copy, with the numbers that occasioned it, is in
> `docs/PHASE-B-RESUME.md` under "Option 4 was executed after all, and the
> 0.03 is gone".

| Apartment | Ceiling (superseded) | Now | Verdict at the time |
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

> **This pass expired, and nothing noticed for a while.** Added 2026-08-15 by
> plan 4a task 5. The 0.46 fitted here stopped satisfying its own ±10
> criterion once plan 4a task 1's winding fix brightened all three
> apartments: re-measured on the post-winding render it reads **+11.07 from
> serenity**, outside the band. It was not broken by anything done to
> horkyone-10 — serenity's own re-fit came down further and the band moved
> out from under it. Plan 4a task 3 refit horkyone-10 to **0.42** (pooled
> mean 145.44, +5.17 / −2.75 against the siblings' 140.27 / 148.19). The
> measurement is a paragraph up in this section's own terms; the reading of
> record is `docs/superpowers/harnesses/2026-08-15-b4a-task3/session.json`.

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

**Linear contrast, the quantity task 6 gates on, did not move.** The
population is **2 of serenity's 11 `compare` spots** (`tools/luminance.py`
filters through `delta_e.scorable`, which requires `poseVerified`) — and
those two, Bathroom and Bedroom, are the two rooms with the *highest* p5
in the flat. **[Scoped, not corrected, 2026-08-19 by plan 4b task 5: "2 of
11" is the population *this plan-3 task-6 run* had, and every number in the
table below was measured on it. serenity is 9 of 11 today, so `luminance.py`
would build a different population now and these rows must not be re-run and
compared against. The mechanism sentence — that `luminance.py` filters
through `delta_e.scorable` — is still live and still has no `--all-spots`
escape.]** Repeats are independent captures of the same state:

| set | n | mean | p5 | contrast |
|---|---:|---:|---:|---:|
| runtime bake | 4 | 0.2820 | 0.0833 | **3.385** (3.383–3.387) |
| offline pack, bounces 0 — identity | 2 | 0.2821 | 0.0836 | **3.374** (3.370–3.378) |
| offline pack, as shipped | 4 | 0.2890 | 0.0854 | **3.386** (3.384–3.387) |
| photographs | — | 0.2993 | 0.0483 | **6.197** |

**The identity row is the one to read first.** A pack baked at
`bounces = 0` is the runtime's own estimator and should reproduce it. It
reproduces the mean and not p5, so **the pipeline's own identity residual
on contrast is −0.011 — an order of magnitude larger than the shipped
pack's +0.001.** No contrast claim of that size is available from this
harness at all.

Why p5 moves under a nominal identity is **not settled**. Denoising fits
(2048 paths per texel remove the 4.8/255 per-texel noise `bake.js:186-193`
records at 16 rays, and p5 is a tail statistic) but does not obviously
explain the sign: the same identity moves per-spawn p5 *down* in the sRGB
population (Entrance −0.9 = −1.4%), four times the relative size and the
opposite way. The identity set is also n=2 with a contrast spread of
0.008. **The conclusion holds either way** — denoising or uncharacterised
variance, −0.011 dominates +0.001, and an unexplained residual widens the
harness's uncertainty rather than rescuing the result.

What the shipped pack does on this population is a **near-uniform gain of
~2.5%**: mean ×1.02482, p5 ×1.02461, differing by 0.022 pp against the
±0.06 pp that four-decimal rounding alone puts on the p5 ratio. A
mean/p5 ratio is blind to a uniform gain by construction. That is also
the same order as what the exposure re-fit absorbs (task 2 cost −2.0% of
linear mean; 0.326→0.329 put it back), and exposure scales mean and p5
together — so on this population the effect is entirely of a kind a
re-fit would undo.

The effect is not uniform everywhere: in the 5-spawn sRGB population the
**Entrance**, the darkest spawn and outside the gated two, is the one
place p5 outruns the mean (+3.31% against +1.43%). Where a frame's
darkest 5% is wall rather than floor or ceiling this pack cannot reach it
at all — walls have no lightmap and cannot get one until the `grid()`
winding defect is fixed.

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

## Phase B3 plan 3 task 6: the exit criterion — NO-GO

The pilot pack was measured against the criterion agreed before the work:
**Go if the linear-domain contrast reaches ≥ 4.9 AND the blind A/B is
visible.** It fails both halves, and it fails the conjunction on the
contrast half alone. Committed record:
`serenity-b3-task6-verdict.json`, rebuilt from its inputs by
`docs/superpowers/harnesses/2026-08-13-b3-task6/write_verdict.py`
(`--check` reports MATCH). The A/B protocol, the sealed mapping and the
calls-before-reveal live in that harness directory.

**Two corrections to the plan's own wording, both stale rather than
wrong-at-the-time.** The comparison is the **offline pack against the
runtime bake**, not "against GTAO-only" — task 3 rejected GTAO and no
`tour/` file adopted it. And 4.9 is derived in the plan as a third of a
3.6 → 7.6 gap, which are phase A numbers from the series plan 2 closed
outright; a third of the live gap would be 4.32. **The human partner was
asked and ruled: hold 4.9 literally**, knowing that makes the bar harder
than its own derivation. 4.9 is what was applied.

### The contrast half

Re-measured on both sides rather than inherited — same build, `?v=104`,
exposure 0.329, `?fov=legacy`, two independent captures per side, the
only difference being whether `tour/lightmaps/serenity/` is on disk:

| set | n | mean | p5 | contrast |
|---|---:|---:|---:|---:|
| runtime bake | 2 | 0.282078 | 0.083283 | **3.3870** |
| offline pack, as shipped | 2 | 0.288891 | 0.085369 | **3.3840** |
| photographs | — | 0.299289 | 0.048274 | **6.1998** |

Every figure lands inside the range task 5 committed for the same state,
so its numbers are inherited **with a check** rather than on trust.
(Task 5's `photographs` contrast reads 6.197 because it divides a stored
4-dp capture pair; 6.1998 is the same quantity at full precision. Nothing
turns on it — both are far above 4.9 and far above the render.)

**Contrast would have to rise 44.8% to reach 4.9 — and the mechanism is
worth more than the shortfall.** Contrast here is mean ÷ p5, so at the
with-pack mean of 0.288891 reaching 4.9 requires p5 to **fall** to
**0.0590**: a **31% darkening of the shadows**. The pack **raised** p5 by
**2.5%** (0.083283 → 0.085369). Bounce light fills shadows — that is what
it is for — so **the pack moved the gated quantity in the direction
opposite to the gate, by construction.** Not a wrong setting, and not an
amount a better bake recovers.

**Nor does a friendlier population rescue it.** On task 5's spawn-pooled
set — which *includes* the Entrance that this gate's poseVerified
population excludes, and where task 5 located the one genuine fill
signature — the pack's contrast gain is **+0.83%** (1.7316 → 1.7460,
`serenity-b3-task5-luminance.json`). Scale the gated 3.3870 by that, the
most favourable relative figure anywhere in the committed record, and it
lands at **~3.415** against 4.9, a 30% shortfall. (The two are different
estimators — spawn-pooled sRGB luma vs. linear-light Rec.709 over the
compare spots — so this is a scaling argument about the relative move, not
a claim that 1.746 and 3.384 are the same quantity.) **The criterion fails
on every population in the committed record, not only the gated one.**

Note the sign: task 5 measured the pack at **+0.001** on contrast
and this run measures it at **−0.003**. Both sit inside the same-state
repeat spread of ±0.002–0.004, which *is* the finding — the change is not
resolvable by either run, in either direction. On this population the
pack is a near-uniform gain (mean ×1.02415, p5 ×1.02505, differing by
0.090 pp), and a mean/p5 ratio is blind to a uniform gain by
construction. That reproduces task 5 down to the detail that the mean/p5
*ordering* is not resolvable either.

### The visible half

Six side-by-side pairs, poses fixed before any frame was looked at and
deliberately weighted toward where the pack can act (the outdoor terrace
spawn was excluded because it bakes with no gather and could not differ).
An unseeded `SystemRandom` coin chose which half of each composite got
the pack; the mapping was sealed and the six calls written to
`calls.json` before it was opened. The bar was fixed before viewing:
visible only at **6/6**, since P(6/6) under guessing is 1/64 = 0.016
while P(≥5/6) is 7/64 = 0.109.

**Result: 5 of 6** — above the 3 expected from guessing, short of the
pre-registered bar, and at n = 6 not distinguishable from chance. The
observation that matters more than the hit rate: **at full viewing size
none of the six pairs could be separated**, and every call leans on a
3–4× magnified patch of a flat floor or ceiling. On pair 3 the full-frame
impression was the *opposite* of the patch reading, and the patch was
right — recorded rather than quietly dropped.

### What the pack does do, measured after the reveal

**It is not a no-op, and the difference is not a flat offset.** Per pose
the sRGB mean rises 0.8–1.7%, 24–58% of pixels move at all, 3–8% move by
≥ 10 of 255, and the largest single-pixel move is ~100. The difference
maps (`…/harnesses/2026-08-13-b3-task6/diff/`) show where: a band along
the **ceiling/wall perimeter** and the **floor beside obstructions** —
the near-field crevice fill a 0.65 m gather on lightmapped surfaces
predicts, landing exactly where it should.

Hold that next to the verdict rather than against it, and do not flatten
the tension: on these six *full frames* the effect is concentrated, while
on the two gated spots it measures near-uniform. Both were measured. The
criterion is applied to the second.

The honest sentence is about what was measured, on which population, with
which caveats — **not** "bounce light cannot raise contrast on these
surfaces", which is an inference this evidence does not support.

All-spot legacy ΔE2000 was re-run as a second check on an inherited
number, not as a gate: **16.61 → 16.71** here against task 5's 16.59 →
16.75. Direction reproduces, magnitude is smaller, and the before reading
sits inside the 16.60–16.62 this file already records for that state.

### The decision, and the revert

**Whether serenity keeps its pilot pack was the one thing task 6 did not
decide.** The plan says a failure means "do not carry lightmaps to the
other two apartments" and is silent on the pilot; task 6 left the shipped
state as task 5 committed it, recorded the costs both ways in the verdict
JSON, and recommended reverting. **The human partner has now decided:
serenity reverts to the runtime bake.**

Done in two commits on `phaseB-plan3-light`. `"lightmaps": true` removed
from `tour/apartments/serenity.json`, `tour/lightmaps/serenity/` (11 files,
13,626 bytes) deleted, and — in the fix round — `tour/lightmaps.js`, the
runtime loader, removed too, one line out of `main.js`'s `CLASSIC` array.
`?v=` bumped **104 → 105 → 106**, each time after the last edit.

**The loader was kept in the first round and that was reversed on
corrected facts.** Keeping rested on removal costing "edits to `bake.js`
and `main.js` to delete a reviewed staleness guard". It does not:
`bake.js:681` already reads
`(typeof Lightmaps === 'undefined') ? Promise.resolve(null) : …` and
`grep -rl Lightmaps tour/` returns only `bake.js` and the loader, so
removal is one line and `bake.js` is untouched — the guard is what makes
removal *safe*, not what removal destroys. On the corrected facts one
principle covers both artefacts: **anything inside the deploy root that
drives nothing comes out; anything outside it that costs nothing stays.**
The loader shipped ~10 KB and one request on every page load of every
apartment for no effect, and restores more cheaply than the pack it
served. **`tools/bake_lightmaps.mjs` stays** — `vercel.json` sets
`outputDirectory: "tour"`, so it never reaches a visitor.

**Verified rather than assumed:** **zero requests mentioning "lightmap" at
all** on all three apartments — not just zero pack probes but zero for the
loader script, which is no longer asked for — no HTTP failure of any
status, no `[lightmaps]` warning, no console error, `APT.lightmaps` absent
and `typeof Lightmaps === 'undefined'` everywhere. Removing a classic
script is precisely the failure `main.js`'s error handling exists for, so
that it did **not** fire is asserted: `__tourEntryRan` true, `__app`
present, the overlay still reading "Click to enter". Plus `__issues`
empty, `__ambSampled` true, `Sampler.selfTest()` 8/8, draw calls unchanged
at 72/64, 165/150, 83/64, `exposure` (0.329 / 0.575 / 0.46) and bloom
(1.8 / 0.1) untouched.

**The number that proves it took:** serenity's all-spot legacy ΔE2000
returned to **16.59** with the loader still present
(`serenity-b3-task6-revert-legacy-allspots.json`) and **16.60** after
removing it (`serenity-b3-task6-revert-noloader-legacy-allspots.json`).
Read against every committed reading of this quantity:

| state | task 4 | task 5 | task 6 | revert | loader removed |
|---|---:|---:|---:|---:|---:|
| runtime bake | 16.60 | 16.59 | 16.61 | **16.59** | **16.60** |
| offline pack | — | 16.75 | 16.71 | — | — |

A 16.59–16.61 band for the runtime bake against 16.71–16.75 with the pack:
both post-revert readings sit inside the first and ≥0.11 clear of the
second, and are 0.01 apart — this metric's documented repeat noise.
Structurally the second could not have moved: the loader already returned
before any I/O, so every surface was baking at runtime either way. (This
table supersedes the "16.60–16.62" range quoted a few paragraphs above,
which omitted task 5's own 16.59.)

**Nothing is lost.** The baker, the loader, the pack, the staleness guard
and every measurement remain in git history at **`6a607fa`** — the task 6
verdict commit. Re-adopting is `git checkout 6a607fa -- tour/lightmaps.js
tour/lightmaps/serenity`, re-adding `lightmaps.js` to `main.js`'s
`CLASSIC` list and the config key: a checkout and one line, not another
551 s bake, with `bake.js` untouched in either direction. **The standing
warning is unchanged — do not extend the pilot to another apartment**, and
re-adopting it on serenity would still owe the exposure and bloom re-fit
that keeping it would have owed.

## Phase B3 plan 3 task 7: the gate, and what plan 3 actually did

Every number below was taken fresh in one session with **both trees served at
once** — HEAD (`736a867`) from `tools/serve.py` on `:8742`, a detached
`c2bb0bd` worktree from
`docs/superpowers/harnesses/2026-08-13-b3-task7/serve_base.py` on `:8743` —
and **the same script pointed at each side**. `measure.js` is byte-identical
between the two trees (`git diff c2bb0bd..HEAD -- tour/measure.js` is empty)
and the only apartment-config difference is the `exposure` value, so the
capture path and the scored population are the same on both sides by
construction. No earlier task's number is cited as a result here; older
readings appear only as corroboration.

### Structural gate: clean, on both budgets

`node structural.mjs`, six rows (three apartments x desktop/mobile). Draw
calls through the post chain per `CLAUDE.md`'s recipe — `info.autoReset` off,
reset by hand, `post.render(0)`, read, restore — taken at **both** established
spots, because the repo has a precedent for each and they are different
numbers.

| | serenity | kings-court | horkyone-10 | requirement |
|---|---:|---:|---:|---|
| `window.__issues` | `[]` | `[]` | `[]` | must be `[]` |
| `window.__ambSampled` | `true` | `true` | `true` | must be `true` |
| `Sampler.selfTest()` | 8/8 | 8/8 | 8/8 | must pass |
| Console errors / page errors | 0 | 0 | 0 | must be 0 |
| Desktop chain, `APT.start` | **72** | **165** | **83** | <=400 |
| Desktop chain, `spawns[0]` | 71 | 165 | 56 | <=400 |
| Mobile chain, `APT.start` | **64** | **150** | **64** | <=250 |
| Mobile chain, `spawns[0]` | 62 | 150 | 54 | <=250 |
| Desktop naive, `APT.start` | 57 | 150 | 68 | — (the "144"-style figure) |

**All eight draw-call figures that have a precedent reproduce it exactly**:
the desktop `APT.start` row against `r128-reference.md`'s "Structural gate
after the fix wave" table (72 / 165 / 83), and both `spawns[0]` rows against
plan 3 task 3's cost table (desktop 71 / 165 / 56, mobile 62 / 150 / 54, in
`<apt>-b3-task3-cost.json`). Draw calls in this project are deterministic and
they behaved that way again. Mobile is measured at 390x844 @ dSF 2 with
`isMobile`+`hasTouch`, which the renderer clamps to pixelRatio 1.6 — a
624x1350 buffer, asserted in the run rather than assumed.

Sky-leak raycasts, straight up from every `spawns[]` entry, **markers hidden
first** — an unhidden `THREE.Points` marker sits ~0.3 m above a spawn and
returns a false hit before the ray reaches the ceiling, which is the bug plan
2 task 9 caught in its own first draft. serenity 5/5 hit a `Mesh` (Pool
Terrace at 1.05 m, the canopy, matching every prior measurement of that spot);
kings-court 13/14, `Terrace` reporting `NOTHING ABOVE`; horkyone-10 4/5,
`Terrace` likewise. Both terraces are open to the sky by design and both match
`r128-reference.md`.

Walk simulations, the standing routes, all four exact against precedent:

| Route | End | Precedent |
|---|---|---|
| kings-court entry hall westbound | x 13.14, ground 0 | x 13.14 |
| kings-court upper hall westbound | x 4.44, ground 3.1 | x 4.44 |
| serenity start southbound | (3.24, 2.13) | (3.24, 2.13) |
| horkyone-10 living room northbound | (7.75, 1.26) | (7.75, 1.26) |

One console **warning** on one of the six rows (serenity desktop): an
ANGLE/HLSL shader-compiler precision notice (`X4122: sum of 1 and -1.49e-017
cannot be represented accurately in double precision`). A compiler diagnostic
from the D3D backend — not a page error, not in `window.__issues`, not a gate
condition. Recorded because "zero console errors" and "zero console messages"
are not the same claim.

### The merge condition: serenity fails, and plan 3 is what moved it

Population stated first, because it is the whole point. The merge condition
was set over the **all-spot** population — every `compare`-flagged spot
regardless of `poseVerified` — captured at `?measure=1&fov=legacy`. Every ΔE
file committed for this task is `tools/delta_e.py`'s native output with
`--all-spots`, so `scored == compareTotal` and `skippedPoseVerification: 0` in
all twelve, and each file's `mean` recomputes from its own `spots[]`.

| Apartment | Tree | Runs (native mean-of-rounded) | Full precision | Ceiling | Verdict |
|---|---|---|---|---:|---|
| serenity | BASE `c2bb0bd` | 16.54, 16.56 | 16.5409, 16.5648 | <=16.58 | passes |
| serenity | **HEAD `736a867`** | **16.61, 16.60** | 16.6089, 16.6000 | <=16.58 | **FAILS by 0.03 / 0.02** |
| kings-court | BASE `c2bb0bd` | 18.74, 18.73, 18.74, 18.73 | 18.7452, 18.7279 | <=22.44 | passes |
| kings-court | **HEAD `736a867`** | **18.86, 18.88, 18.86, 18.84** | 18.8565, 18.8750 | <=22.44 | **passes by ~3.57** |

**serenity fails, by 0.03 and 0.02 rounded — 0.0289 and 0.0200 at full
precision.** That shortfall is itself the size of this metric's documented
repeat-run noise floor (+-0.03 rounded, +-0.039 full precision). The
established phrasing for landing *inside* that floor on the passing side is
"parity within noise, not a clean pass"; the same standard applies here in the
failing direction, and it does not rescue the result. What makes this a real
failure rather than a coin flip is the population of readings rather than any
single one: **eight independent all-spot readings of the HEAD-side render sit
between 16.59 and 16.62** — task 2's fix1 (16.60), task 3 GTAO-off (16.61),
task 4's four (16.60 / 16.62 / 16.61 / 16.60), task 6's two post-revert
(16.59, 16.60) — plus this task's two. **Not one has reached 16.58.** (The
band is 16.59–16.62; an earlier version of this section wrote 16.59–16.61 and
contradicted its own list, where task 4's repeat is 16.6155. The wider band is
the honest one and it weakens rather than strengthens the headline.)

**And plan 3 is what moved it across the line.** BASE reads 16.54 / 16.56 and
HEAD reads 16.61 / 16.60: **+0.0516** on the mean of two runs per side
recomputed unrounded from the images, **+0.0518** on the committed
mean-of-rounded values — either way larger than the ±0.039 full-precision
floor. Every pair delta below uses the mean-of-rounded form, because that is
the only precision task 2's files carry.

**It is task 2's change, not task 4's exposure, and the evidence is a paired
exposure-held A/B.** The direct measurement is plan 3 task 2's own:
`serenity-b3-task2-before-allspots.json` **16.5427** (repeat **16.5464**) →
`serenity-b3-task2-fix1-allspots.json` **16.6027**, both captured in a single
session and both **before commit `6372939` changed `exposure` from 0.326 to
0.329**. That is **+0.0582 with exposure held constant**. This task's pair is
the endpoint measurement, one session, 0.326 → 0.329: **+0.0518**. The two
agree to 0.006.

Exposure cannot account for either. Task 4's sweep measured this metric
against exposure directly and reads **16.6133 at 0.326 against 16.6160 at
0.329** — the whole interval is worth **0.0027**, and the best exposure
anywhere in 0.30–0.34 is worth 0.0056
(`serenity-b3-task4-exposure-reach.json`). That file was captured on **task
4's own tree** (`preconditionsAsserted.cacheVersion` `"102"`, not HEAD's
`106`); an earlier version of this section said "on the HEAD tree", which was
wrong. What it establishes is the *slope* of ΔE against exposure in this
neighbourhood — a property of the metric, not of which tree measured it — and
tasks 5 and 6 net to zero on serenity's render in any case
(`serenity-b3-task4-final-legacy[-repeat*]` 16.6018 / 16.6155 / 16.6064
against task 7's 16.6082 / 16.6009).

**Paired first, pooled as support.** The ten BASE-lineage and eleven
HEAD-lineage all-spot legacy readings in this directory separate without
overlap — max BASE 16.5700 against min HEAD 16.5882 — and the ten BASE
readings, all of byte-identical render code across **five separate sessions**,
span only **0.0291**, inside the ±0.039 same-session floor. That is a real
supporting leg.

**No probability is quoted for it, and none should be.** Repeat runs inside
one page session are not independent draws — `materials.js` re-randomises per
load but everything upstream of it is shared — so the 21 readings are not 21
independent samples and any exchangeability arithmetic over them would
overstate its own confidence. The load-bearing evidence stays the two
same-session paired A/Bs above, which need no distributional assumption at
all: both arms of each pair share a session, a machine and a build.

Task 7's own reading is anchored the same way. It did not compare a naked HEAD
number against a historical threshold — it measured **its own BASE arm**, at
16.5409 / 16.5645, in family with five prior sessions, in the same session and
on the same machine as the failing HEAD reading. The gate verdict rests on a
same-session control, not on a remembered baseline.

kings-court moved the same way and it does not matter there: **18.7346 →
18.8557** on the four-run mean-of-rounded, +0.1211, against a ceiling 3.57
away. (An earlier version wrote "18.7366 → 18.8658 on the four-run means";
those were means of the **two** full-precision values quoted in the table
above, not four-run means.)

#### The lineage table, recorded so it is not re-derived and misread

Every all-spot legacy reading of serenity's *runtime-bake* render in this
directory, by lineage. Values are the mean of each file's own rounded
`spots[]`, so each row recomputes from the file it names.

| Lineage | n | range | files |
|---|---:|---|---|
| BASE (pre-task-2 render) | 10 | **16.5409 – 16.5700** | `b2-final-legacy[-repeat]`, `b2-fixwave-final-legacy[-repeat]`, `b2-task9-legacy[-repeat]`, `b3-task2-before[-repeat]`, `b3-task7-BASE-c2bb0bd-legacy[-repeat]` |
| HEAD (post-task-2 render) | 11 | **16.5882 – 16.6155** | `b3-task2-fix1`, `b3-task3-off`, `b3-task4-final-legacy[-repeat,-repeat2]`, `b3-task5-before-legacy`, `b3-task6-spotcheck-before-legacy`, `b3-task6-revert-legacy`, `b3-task6-revert-noloader-legacy`, `b3-task7-gate-legacy[-repeat]` |

They do not overlap; the gap is 0.0182. **Do not convert that into a
significance figure** — the readings are not independent draws (see "Paired
first, pooled as support" above).

Excluded from both rows for the reasons they have always been excluded:
**fixed-FOV captures** (`b2-final`, `b2-fixwave-final`, `b2-task9-newzero`,
`b3-task4-final`, and **both task-1 files** — see the note below),
pre-fix-wave states (`b2-legacy` 17.14), and states that are neither lineage —
GTAO on (`b3-task3-on` 21.68) and depth-normals (`b3-task3-depthnormals`),
lightmap pack on (`b3-task5-after`, `b3-task6-spotcheck-after`), and
`b3-task2-after` (16.6409), which is task 2 *before* its own review fix round
and so is a third render, not either lineage.

**Also excluded: every `b4a-*` file.** Plan 4a's task 1 changed which wall face
is drawn, so its post-fix readings are a further render again — 16.19–16.40,
below both rows — and its task 2's are mostly a reverted trial. (Its
`b4a-task1-before`, 16.6036, is the pre-fix render and belongs to no row
either.) See "Plan 4a's readings are a third render, and one of them is a
reverted trial" below.

#### The task-1 pair is a fixed-FOV capture, not a session outlier

`serenity-b3-task1-baseline-allspots.json` (16.8667) and
`serenity-b3-task1-legacy-allspots.json` (16.8616) sit ~0.3 above every legacy
reading. **Both files' own notes, and task 1's report, attribute that gap to
"this session's own environment (GPU/driver/browser)". That attribution is
wrong**, and an earlier version of this section repeated it. The gap is the
**camera**, not the session:

| spot | task1-baseline | fixed (`b2-task9-newzero`) | legacy (`b2-task9-legacy`) |
|---|---:|---:|---:|
| 3.webp | 17.45 | 17.46 | **15.29** |
| 9.webp | 19.67 | 19.65 | **18.66** |
| 10.webp | 22.01 | 22.04 | **25.29** |
| 1.webp | 19.33 | 19.37 | **18.48** |

All eleven spots track the **fixed-FOV** capture to within 0.11 (mean |Δ|
**0.045**) while diverging from the legacy capture by −3.28 to +2.16 — **in
both directions**. No GPU or driver term moves one spot down 3.3 and another
up 2.2 while simultaneously reproducing a *different session's* fixed-FOV
capture to 0.03.

The mechanism is in the source: at task 1's own commit `d32f263`,
`tour/measure.js` has **no `?fov=` check at all** — it applies
`window.__spotFov(spot, W/H)` unconditionally, so every task-1 capture is
necessarily per-photograph FOV. The `?fov=legacy` branch was restored later
(`f56295d`). "All-spot" is a *population* and "legacy" is a *camera*; task 1's
filename conflated them.

Four same-session, same-code fixed-minus-legacy pairs in this directory give
**+0.3227, +0.3427, +0.3118, +0.2845**. Task 1's 0.2967 sits inside that
family. And the decisive check is the BASE row above: ten legacy readings of
byte-identical code across five sessions spanning **0.0291**. A 0.297 session
offset and a 0.029 five-session span cannot both be true.

**No cross-session floor is documented anywhere** — `r128-reference.md`
defines the ±0.03 / ±0.039 floor from same-session, same-page-session repeats.
The BASE row is the best available estimate of a cross-session one and puts it
at **≈0.03, comparable to the same-session floor**, not at 0.3.

**Read this the right way round.** ΔE2000 against these photographs is
dominated by pose and content mismatch, not by shading — 9 of serenity's 11
compare spots and 6 of kings-court's 14 are not pose-verified, serenity's
living-room geometry is wrong (observation B1), kings-court's Bathroom 2 has
no shower, and two of serenity's worst spots (10.webp at 25.21, 2.webp at
18.08) are a real swimming pool photographed against a flat abstraction of
one. A lighting change moving this metric by 0.05 is not evidence that the
lighting got worse; it is evidence that this metric cannot arbitrate lighting.
But the merge condition is the merge condition, and against it serenity is now
on the wrong side of it.

> **This paragraph is HISTORICAL and is scoped, not corrected — 2026-08-19,
> plan 4b task 5.** Read it as plan 4a's account of plan 3's position, not as
> current status. Four of its clauses have since been falsified, and changing
> the digits in place would have destroyed the argument the paragraph was
> making, which is why it was left standing instead:
> - "9 of serenity's 11 … are not pose-verified" — **2 of 11 now** fail
>   (plan 4b task 2). "6 of kings-court's 14" — **3 of 13 now** (task 4;
>   the denominator moved too).
> - "serenity's living-room geometry is wrong (observation B1)" — B1's
>   opening premise was **disproved** by 4b task 1 and the pose half closed by
>   task 2. What survives is the sofa-on-the-wrong-wall defect, which B1
>   never named. See `docs/PHASE-B-OBSERVATIONS.md`.
> - "kings-court's Bathroom 2 has no shower" — **it has one** (4b task 3).
> - "serenity is now on the wrong side of [the merge condition]" — the 0.03
>   shortfall was closed by plan 4a task 1, and the absolute ceilings were
>   retired on 2026-08-15 for the restated baseline-plus-attribution gate.
>
> **The paragraph's actual thesis was not falsified — it was confirmed, and
> then acted on.** It says this metric is dominated by pose and content
> mismatch rather than shading. Plan 4b tested that by fixing only pose and
> content, and moved serenity **16.00 → 15.49** and kings-court **18.59 →
> 18.17 on one fixed 14-spot population** — larger than anything seven tasks
> of lighting work achieved — **without changing one line of renderer, bake,
> post-processing, material or shader code.** That is this paragraph's claim
> being proved, not withdrawn.

#### Plan 4a's readings are a third render, and one of them is a reverted trial

Plan 4a (`b4a-task1`, `b4a-task2`, `b4a-task3`, `b4a-task4`)
adds **twenty-three** all-spot legacy readings to this directory. **None of them belongs in either lineage row above, and none
of them may be compared to the 16.58 merge ceiling.** Two independent reasons,
either of which is sufficient:

**They are a different render.** Plan 4a task 1 fixed the wall winding — eight
of the file's twelve `grid()` call sites emitted a quad whose geometric front
face disagreed with its own normal, so on the unmodified tip a visitor saw the
*far* face of every along-z wall — and it also moved two serenity paintings out
of a wall slab. That changes which surface is drawn and shaded. Task 1's own
session measured the effect directly: serenity **16.60 → 16.40 → 16.32**
(before, after the winding fix, after the paintings), kings-court
**18.87 → 18.79**.

**They are different hardware, twice over.** Task 2 ran on a third machine
again (ANGLE / Intel UHD 630 / D3D11) and re-measured its own baseline rather
than inheriting task 1's, precisely so its before/after pairs would be
same-machine.

The two facts together are what makes the cluster arithmetic unusable here, and
they also give the one cross-session check worth recording: task 2's
independently measured before is **16.34** against task 1's committed after of
**16.32** (kings-court **18.81** against **18.79**), Δ0.02 on both — so the
post-winding-fix render reproduces across two sessions and two machines at
**≈16.33** (16.3227 and 16.3391, mean 16.3309), about **0.21–0.24 below** the
BASE row's 16.5409–16.5700 and **0.26–0.28** below HEAD's. That is a third
lineage, not a stray reading in either existing one.

| lineage | serenity all-spot legacy | files |
|---|---|---|
| BASE (pre-b3-task-2 render) | 16.5409 – 16.5700 | see the lineage table above |
| HEAD (post-b3-task-2 render) | 16.5882 – 16.6155 | see the lineage table above |
| **plan 4a, post-winding-fix** | **16.19 – 16.40** | `b4a-task1-after[-paintings]`, all five `b4a-task2-*` |

Values are the mean of each file's own rounded `spots[]`, the same computation
as the lineage table above, quoted here at 2 dp. The plan-4a row's **upper end
is `b4a-task1-after` (16.4027), which is an intermediate state** — winding
fixed, paintings still buried in the wall slab — and it is the only reading in
the row above 16.34. Task 1's *tip* is `-after-paintings` (16.3227), and that
is the state task 2's before (16.3391) reproduces; the ≈16.33 figure above is
those two and not the row's full span. `b4a-task1-before` (16.6036) is
deliberately **not** in the row: it is the pre-fix render, which is the thing
this row exists to be distinguished from.

**Ten of the twenty-three are `b4a-task2`, and eight of those ten measure code that
is not in the tree** — the two `-before-` files are the shipped state, one per
apartment. Task 2 switched walls to the visibility-scaled ambient
and swept `SEG` over 0.45 / 0.30 / 0.22 / 0.15; it **failed its exit criterion
(linear contrast 3.9347 against ≥ 4.32) and was reverted in full**, so `tour/`
is byte-identical to task 1's tip. Only the two `-before-` files describe
shipped code:

| file | serenity | kings-court | state |
|---|---:|---:|---|
| `*-b4a-task2-before-legacy-allspots` | **16.34** | **18.81** | shipped (= task 1 tip) |
| `*-b4a-task2-seg045-legacy-allspots` | 16.27 | 19.46 | **trial, reverted** |
| `*-b4a-task2-seg030-legacy-allspots` | 16.19 | 19.35 | **trial, reverted** |
| `*-b4a-task2-seg022-legacy-allspots` | 16.30 | 19.22 | **trial, reverted** |
| `*-b4a-task2-seg015-legacy-allspots` | 16.29 | 19.24 | **trial, reverted** |

`kings-court-b4a-task2-seg045-legacy-allspots.json` (**19.46**, against a
before of 18.81) is the one most likely to be grepped alone and misread as a
shipped regression. It is not: it is trial state, it was one of the readings
that produced the No-Go, and nothing survived the revert. Following the
`b3-task3` GTAO precedent, the not-shipped marker lives in the companion
`{serenity,kings-court,horkyone-10}-b4a-task2-luminance.json` files
(`"shipped": "NOTHING…"`), not in the all-spot files themselves — so read the
two together.

> **Read task 2's NO-GO at its own scope — it is about vertex shading, not
> about walls.** Added 2026-08-15 by plan 4a task 5, because this verdict is
> the single most over-generalisable finding on the branch. What the data
> supports: ***vertex-shaded*** walls taking the visibility-scaled ambient
> cannot reach a linear contrast of 4.32. What it does **not** support:
> "walls are not worth lighting". The sweep's own shape is the reason —
> contrast was **highest at the coarsest `SEG`** and fell as `SEG` refined —
> **3.8647 (0.45) → 3.6405 (0.30) → 3.3748 (0.22) → 3.4380 (0.15)**, each
> the *first* reading at its own state, so the four are like for like; the
> 0.45 state's repeat is the 3.9347 quoted above, and the last two differ by
> less than the sweep's own ±0.07 spread, so they are not resolvable from
> each other. All five are `sweep.json`'s own `linearContrast` values (the
> file writes the last one as `3.438`; it is shown here to 4 dp to match the
> artefact-suppressed figure below, and no other digit differs). (An
> earlier version of this marker wrote the first value as **3.90**, which is
> the *mean* of the two 0.45 readings — 3.8997 rounded — set alongside three
> direct readings. Corrected in fix round 1; the conclusion is unaffected
> either way.) The statistic was being moved by defect 2's smeared near-zero
> vertices rather than by walls being correctly shaded, and buying the
> criterion would have meant shipping the artefact that produced it. Suppress that artefact as far as the sweep can (`SEG`
> 0.15, true-zero fraction 7.7% → 4.8%) and the surviving real effect is
> 3.2062 → **3.4380: about +0.23 of the +1.11 the criterion asked for,
> roughly a fifth.** **3.4380 is not an upper bound on a wall lightmap
> atlas.** An atlas samples per texel *on* the surface and produces real
> gradients; this shades from four geometric corners, and on the reveals,
> tops and bottoms — single 1×1 quads whatever `SEG` says, which is why
> refining `SEG` cannot fix them — some of those corners sit inside adjoining
> solids. Plan 4a task 1 **unblocked** that atlas (it could not be baked onto
> inside-out walls at all); its remaining cost is a from-scratch atlas
> rasteriser, since three.js's `UVUnwrapper` is a thin wrapper over the
> `xatlas-web` WASM module. Whoever writes plan 4c or 5 owns that decision on
> these terms, not on the headline 3.9347.

**Four of the twenty-three are `b4a-task3`, and they are a FOURTH render again —
do not fold them into the plan-4a row above.** Task 3 re-fitted every
apartment's `exposure` against the post-winding render (serenity 0.329 →
**0.295**, kings-court 0.575 → **0.52**, horkyone-10 0.46 → **0.42**), because
task 1's winding fix brightened the scene and expired the fit plan 3 task 4
had made. An exposure change alters every pixel, so these readings share no
render state with the rows above and their span is not comparable to the
16.19–16.40 row, let alone to the 16.58 merge ceiling.

| file | serenity | kings-court | state |
|---|---:|---:|---|
| `*-b4a-task3-BEFORE-e<old>-legacy-allspots` | 16.34 | 18.80 | task 1's tip, re-measured this session as the paired before arm |
| `*-b4a-task3-final-legacy-allspots` | 16.00 | 18.58 | **shipped**, independent page load |
| `*-b4a-task3-final-legacy-allspots-repeat` | **15.98** | **18.58** | **shipped, and the headline gate arm** — same page load as the BEFORE row |

**The `-repeat` suffix is misleading and is explained rather than renamed.**
The two `-final-` files are both the shipped state; they differ only in which
page load they came from. The one carrying `-repeat` is the *same-load* arm,
paired against the `BEFORE` row on the identical page and bake with only
`renderer.toneMappingExposure` moved, so it is the arm the −0.36 / −0.22 gate
delta is computed from. The unsuffixed `-final-` file is the independent
second load, quoted as the reproduction check (16.00 against 15.98; kings-court
18.58 both times). Either is a valid statement of the shipped ΔE; only the
`-repeat` one is half of a controlled pair.

The task-3 BEFORE rows reproduce task 1's committed tip (16.32 / 18.79) to 0.02
and 0.01, which is what licenses reading the deltas as caused by the exposure
change rather than by the session.

Task 2's own verdict, threshold arithmetic and the artefact finding that
underwrites it are in those three luminance files and in
`docs/superpowers/harnesses/2026-08-15-b4a-task2/`.

**The remaining four of the twenty-three are `b4a-task4`, and they are the only
pair in this directory measured on two trees at once.** Task 4 is plan 4a's
closing gate. It ran `b39a99a` (the branch's merge-base, `?v=107`) on port 8743
and the branch tip `f0315ea` (`?v=110`) on port 8742 from one browser session on
one machine, three interleaved rounds per arm, so no reading in the pair can
differ by machine, session or harness. `tools/` is byte-identical between the
two commits, so both arms ran the same scorer and the same `measure.js`; the
`compare` populations are identical too (serenity 11, kings-court 14, same
files).

| file | serenity | kings-court | what it is |
|---|---:|---:|---|
| `*-b4a-task4-BASE-legacy-allspots` | 16.6173 | 18.8443 | merge-base `b39a99a`, round 1 |
| `*-b4a-task4-gate-legacy-allspots` | 15.9891 | 18.5864 | branch tip `f0315ea`, round 1 |

Rounds 2 and 3 of both arms, and the two counterfactual-exposure probes that
decompose the movement, are in
`docs/superpowers/harnesses/2026-08-15-b4a-task4/` rather than here, following
task 3's precedent for raw probe dumps. Over three rounds the arms read
serenity BASE 16.6173/16.6182/16.5973 against tip 15.9891/16.0055/15.9973, and
kings-court BASE 18.8443/18.8921/18.9000 against tip 18.5864/18.5643/18.5764 —
a within-arm spread of 0.016–0.056, and a movement of **−0.61 on serenity and
−0.30 on kings-court**, both improvements and both far outside it. The BASE arm
reproduces the recorded baselines it was measured against (serenity 16.61
exactly, kings-court 18.88 against a recorded 18.90), which is the check that
licenses reading the movement as the branch's rather than the session's.

**Do not read the whole of kings-court's −0.30 as the render getting better.**
Plan 4a task 3 re-fitted every `exposure` on the mandated **all-spot**
population where plan 3 task 4 had fitted on `poseVerified`. That convention
change moved the fitted exposure in its own right, and an exposure change moves
every pixel — so part of this branch's ΔE movement is a change in how the fit's
population is chosen rather than anything a visitor would see.

The split was measured, not inferred. For each apartment the tip was re-read at
the exposure its **`poseVerified`** fit would have chosen — read off task 3's
own committed sweep as the zero crossing of that population's luminance diff,
the same method for both apartments — against a control at the shipped
exposure **on the same page load**, two loads each:

| apartment | counterfactual | render | convention | convention share |
|---|---:|---:|---:|---:|
| serenity | 0.298 | **−0.590** | **−0.024** | **3.9%** |
| kings-court | 0.5596 | **−0.151** | **−0.152** | **50.1%** |

**serenity's improvement is essentially all render** — 96% of it. **kings-court's
splits about evenly**, and the two halves are 0.0005 apart, which is far inside
this measurement's own spread: **which half is larger is not resolved, and must
not be reported as though it were.** What is resolved is the magnitude — about
half of kings-court's headline improvement is measurement convention.

> **"Render" here does not mean "the winding fix" — read this before quoting
> the 96%.** Added 2026-08-16 by the final whole-branch review, which found
> that this section carried no per-task attribution at all and that a reader
> of it alone would credit the geometry fix with the whole movement. In this
> section "render" means exactly **"not attributable to the all-spot vs
> `poseVerified` population convention"**, and it therefore **includes task
> 3's exposure re-fit**, which is the single largest component. The per-task
> split lives in [`docs/PHASE-B-RESUME.md`](../../PHASE-B-RESUME.md)'s
> attribution table, not here: serenity's −0.614 is **winding −0.201,
> paintings −0.080, task 2 0.000 (reverted in full), exposure −0.357** (sum
> −0.638, residual +0.025); kings-court's −0.303 is **winding −0.081, task 2
> 0.000, exposure −0.228** (sum −0.309, residual +0.006). So on serenity the
> exposure constant is **58%** of the movement and the geometry fix plus the
> painting move are **46%** — both inside the 96% called "render". Neither
> framing is wrong; quoting one without the other is.

The counterfactual crossings come from
`{serenity,kings-court}-b4a-task3-exposure-sweep-fixedfov-allspot.json`:
kings-court's `poseVerified` diff crosses zero between 0.53 (−0.0148) and 0.56
(+0.0002), i.e. **0.5596**; serenity's crosses at **0.2974–0.2981** across three
independent batches, probed here at 0.298.

**Sensitivity, since the split depends on those two numbers.** The measured ΔE
slopes are 7.879 (serenity) and 3.833 (kings-court) per unit exposure, so the
counterfactual at which each split would read 50/50 is **0.3339** and
**0.5595**. serenity's crossing sits 0.036 below its break-even — further below
than the whole 0.329→0.295 exposure change — so its render-dominated conclusion
is robust. kings-court's crossing sits **0.0001** from its break-even, which is
another way of saying its split is a dead heat and its ordering is not
recoverable from this data.

**An earlier version of this section reported 60% for kings-court and 14% for
serenity, and both were wrong.** serenity's counterfactual was taken from task
3's finding-2 slope arithmetic (0.295 + 0.011) rather than from the sweep, and
the 0.011 was computed on the pre-winding tree; and both probes were single
loads compared against means of *other* loads, which inflated kings-court's
slope from 3.833 to 4.554 because the probe load happened to sit high. Pairing
control and probe on the same load removes that: the per-load convention
readings agree to 0.0018 (serenity) and 0.0036 (kings-court), where the loads'
absolute values disagree by up to 0.074. Corrected in plan 4a task 4's fix
round 1; the superseding readings are the `*-b4a-task4-fix1-*` files in the
harness.

**A claim that was withdrawn rather than repaired:** the earlier text said this
split "confirms task 3's own prediction from luminance slopes (~62%) by an
independent route". It does not. 62% is a share of the *exposure* move and this
is a share of the *ΔE* move; the two need not agree even when both are right.
Task 3's slope table and this sweep also disagree about the exposure worth of
the population switch — 0.032 against a measured 0.560 − 0.520 = 0.040 — so
there was no corroboration to claim.

**Which spots the movement actually comes from.** Both figures are all-spot
means by mandate, and on both apartments the movement is concentrated in a
handful of spots. Stated here because the concentration cuts against the
headline in serenity's case:

* **serenity's −0.61 is carried entirely by two spots that are
  `poseVerified: false`** — `7.webp` (−4.96) and `6.webp` (−4.11), together
  −0.825 of the −0.614, i.e. more than all of it. Its **only two** pose-verified
  spots both moved slightly the *other* way (`1.webp` +0.37, `11.webp` +0.16).
  So serenity's headline improvement comes from spots this same document says
  cannot arbitrate lighting, and its two readable spots did not improve.
* **kings-court's is the other way round**: seven of its eight pose-verified
  spots improved. The exception, `19.webp` (Laundry), regresses **+1.55** — the
  largest single-spot movement on the branch, reproduced in all three rounds
  (19.63/19.63/19.62 → 21.18/21.18/21.17). The probe locates most of it in the
  exposure rather than the render: at 0.56 it reads 19.95, at the shipped 0.52
  it reads 21.18.

Neither fact changes a baseline — the gate is all-spot by rule 5 and both
readings stand — but neither should be discovered by a later reader rather than
read here.

> **The honest bound on everything plan 4a measured.** Added 2026-08-15 by
> plan 4a task 5. **Narrowed 2026-08-16 by the final whole-branch review: the
> sentence below used to say the chain is machine-checked "from `sweep.json`
> (and the other committed harness JSON) outward", and that overstated it.**
> `check_metrics_readme.py` never opens `sweep.json`, nor anything else in
> task 2's or task 3's harness — it reads the section of this README headed
> "Plan 4a's readings are a third render", and for data it reads `metrics/`
> plus the **task-4** harness directory, by literal filename, no glob.
> **Machine-checked:** task 1's before/after/paintings series, task 2's
> per-file state table and the three file counts, the `grid()` claim against
> `bake.js`'s own argument lists, and all of task 4 — the gate pair, the
> twelve round readings, the two headline movements, the render/convention
> split, the slopes, the break-evens and the per-spot disclosures.
> **Not machine-checked, at all:** every figure in **task 3's** three-row
> table and its three exposure values (that whole table can be deleted with a
> green run), **task 5's narrated `linearContrast` blockquote** two rounds
> above — 3.8647 / 3.6405 / 3.3748 / 3.4380 / 3.9347, 3.2062, the 4.32 bar,
> ±0.07, 7.7%→4.8% — **both blacks tables**, and the 16.58 merge ceiling. The
> cost of that gap is visible in this very file: the erratum above says
> `sweep.json` "writes the last one as `3.438`" when it writes **`3.4380`** —
> a wrong claim about a committed file, sitting inside the unguarded
> blockquote, which no checker could catch because no checker reads either
> the sentence or that file. Extending the coverage is a follow-up; this
> paragraph is narrowed so it stops claiming coverage that does not exist.
> Within that scope, `write_metrics.py
> --check` proves the metrics files are derived from the raw readings rather
> than typed, `check_metrics_readme.py` proves this README's figures match
> those files, and `check_metrics_readme_selftest.py` proves that checker can
> actually fail. **None of that reaches the first hop.** The raw readings were
> **hand-transcribed out of a browser console into `sweep.json` and into the
> task harnesses' `session.json`.** No harness here verifies that step, and
> none could without re-running the capture — a checker can only confirm that
> the document agrees with the file, never that the file agrees with what the
> browser printed. Two committed checkers guard this README; neither guards
> that. Treat the transcription as the weakest link in every number on this
> branch, and re-capture rather than re-read if a figure ever has to be
> defended.

### The plan's own claim: blacks, before and after

Plan 3 exists to "make shadow actually reach the frame". Task 3 contributed
nothing by design and task 5's lightmaps were measured, failed and reverted,
so the whole of plan 3's effect is task 2's, plus whatever task 4's exposure
re-fit did on top of it.

**Domain discipline, since two are in play.** The first block is
**spawn-pooled sRGB-encoded** luminance 0-255 over **every** `spawns[]` entry
(480x300, full post chain, pixels pooled before the mean and the interpolated
5th percentile — task 2's measure, script unchanged and run against both
trees). The second is **linear-light** Rec.709 over the **poseVerified
`compare` spots only**. Different transfer functions, different populations,
different cameras. They are never tabulated together.

Two runs per side. The harness is deterministic on this machine — serenity's
two BASE runs agree to every printed digit.

| Apartment | mean L | p5 L | contrast (mean/p5) |
|---|---|---|---|
| serenity BASE | 138.3, 138.3 | **80.0, 80.0** | 1.729, 1.729 |
| serenity HEAD | 138.6, 138.7 | **80.0, 80.0** | 1.733, 1.734 |
| serenity HEAD at BASE's exposure | 138.0 | **79.5** | 1.736 |
| kings-court BASE | 149.4, 149.3 | **58.4, 58.9** | 2.558, 2.535 |
| kings-court HEAD | 149.1, 149.2 | **55.5, 55.5** | 2.686, 2.688 |
| kings-court HEAD at BASE's exposure | 147.6 | **55.1** | 2.679 |
| horkyone-10 BASE | 143.6, 143.5 | **98.7, 98.8** | 1.455, 1.452 |
| horkyone-10 HEAD | 143.6, 143.7 | **97.6, 97.6** | 1.471, 1.472 |
| horkyone-10 HEAD at BASE's exposure | 142.2 | **96.4** | 1.475 |

Endpoint to endpoint — what a visitor actually gets — the darkest 5% moved
**0.0%** on serenity, **-5.4%** on kings-court, **-1.2%** on horkyone-10.

**serenity's zero is not a null result; it is two effects cancelling.** Task 2
lowered p5 and task 4's exposure re-fit (0.326 → 0.329) raised it back.
Holding exposure at the BASE value isolates task 2: 80.0 → 79.5, **-0.6%**.
That is smaller than task 2's own reported -1.1% (80.1 → 79.2), measured in a
different session on different hardware; the direction agrees, the magnitude
does not, and this session's is the one taken against a real `c2bb0bd`
checkout. At constant exposure the three apartments read -0.6%, -6.1%, -2.4%.
The "at BASE's exposure" rows are a runtime `renderer.toneMappingExposure`
override in the harness only — **no apartment's `exposure` key was touched**,
task 4 fitted those and is closed.

**The direction is right on all three, and that is a genuine if small
result.** On every apartment, in both readings, p5 falls further than the
mean: endpoint to endpoint, serenity mean +0.25% against p5 0.0%, kings-court
mean -0.13% against p5 -5.4%, horkyone-10 mean +0.07% against p5 -1.2%. The
change is concentrated in shadow rather than being a global dim, which is
exactly what the plan set out to do. It is simply very small.

Linear domain, `tools/luminance.py`'s own estimator at full precision via
`linear7.py`, which agrees with `tools/luminance.py` to four decimals on both
apartments. **Population on every row, because that tool hard-codes the
`poseVerified` filter:**

> **These populations are a dated record and are deliberately NOT updated —
> 2026-08-19, plan 4b task 5.** "2 of 11" and "8 of 14" are what
> `luminance.py` actually built when this plan-4a run was taken, and every
> figure in the table was measured on them. **They are 9 of 11 and 10 of 13
> today** (plan 4b tasks 2 and 4), so the same script re-run now would score a
> different, larger and better-founded population. **Do not re-run this table
> and compare it against these rows.** The mechanism note above stays live:
> `luminance.py` still hard-codes the `poseVerified` filter and still has no
> `--all-spots` escape.

| Apartment (population) | linear mean | linear p5 | contrast |
|---|---|---|---|
| serenity BASE (2 of 11) | 0.285408 | 0.089938 | 3.1734 |
| serenity HEAD (2 of 11) | 0.281739 | 0.083283 | **3.3829** |
| *serenity photographs (2 of 11)* | *0.299289* | *0.048274* | *6.1998* |
| kings-court BASE (8 of 14) | 0.341176 | 0.113214 | 3.0142 |
| kings-court HEAD (8 of 14) | 0.342882 | 0.107727 | **3.1844** |
| *kings-court photographs (8 of 14)* | *0.347877* | *0.024653* | *14.1109* |
| horkyone-10 | — | — | — |

serenity n=2 per side, kings-court n=4 per side (its per-run spread is an
order of magnitude larger than serenity's). **On both apartments the BASE and
HEAD contrast ranges are disjoint** — serenity 3.1732-3.1736 against
3.3826-3.3832, kings-court 2.9544-3.0747 against 3.0888-3.2705 — so the rise
is resolved rather than inferred: **+6.6% on serenity, +5.7% on
kings-court.**

**horkyone-10 has no `compare`-flagged photo spots at all**, so
`tools/luminance.py` exits before scoring anything: the linear domain does not
exist for that apartment. That is "undefined", not "scored zero".

Against the photographs, plan 3 closed **6.9%** of serenity's linear contrast
gap (3.1734 → 3.3829 against a target of 6.1998) and **1.5%** of
kings-court's (3.0142 → 3.1844 against 14.1109). For scale: task 6's exit
criterion for the lightmap pack was a linear contrast of **>= 4.9** on
serenity. Plan 3 ends at 3.38.

### Where the change lands, and why there is so little of it

`framediff-t7.json` — per-frame BASE-vs-HEAD difference on every spawn,
**against a HEAD-vs-HEAD control**, because `materials.js` randomises its
procedural textures on every page load and a bare two-load diff would fold
that in. Signal-over-noise across all 27 frames runs **serenity 3.89–11.80,
kings-court 1.35–12.56, horkyone-10 1.31–8.07**. It collapses to 1.3–1.4 on
the three frames whose walls carry a busy procedural pattern (kings-court
Bedroom 1 at 1.35, Bathroom 2 at 1.44, horkyone-10 Hall at 1.31); those three
are texture noise and nothing can be read off them. kings-court's top-down
cutaway is a fourth low value (**1.77**) for an unrelated reason: it is a raw
render of a plan mostly filled with background sky, so there is little
lightmapped surface in frame to differ.

The amplified difference maps put the change on **floors, ceilings, attic
slopes and furniture contact points**, with ceiling-to-wall junctions
darkening and open ceiling centres brightening — the signature of a real
hemisphere-visibility term arriving. **Flat wall faces are black in every map:
unchanged.**

That is not only an observation about the maps; it is what the code says.
`bake.js`'s `bakeWalls()` calls

```js
lightAt(P, N, occ, data, false, false)
```

— `sampled` false and no `ambFn` — so walls take the flat `AMB_RGB` with
visibility pinned to 1 on both trees. Task 2 could not touch them, and **walls
carry most of a first-person frame's darkest 5%.** That single fact is the
whole explanation for why a change that is correct in direction on all three
apartments is worth 0.6-6% instead of the several-fold move the plan aimed at.

The reason walls were excluded is the deferred `grid()` winding defect — 8 of
12 wall faces wound backwards, written up in `docs/PHASE-B-RESUME.md` under
"The wall-winding defect, deferred deliberately". It blocked task 2's wall
atlas, it is why task 3's GTAO blackened walls, and it will expire task 4's
exposure fit when it is fixed. **Plan 3's small effect and that deferral are
the same fact**, and any future attempt to enlarge the effect starts by fixing
the winding.

### Bake time: one supportable claim, and a warning about the rest

`baketime-t7.json`, two batches of four loads per side per apartment, **both
of them idle-machine batches** taken about five minutes apart. `CLAUDE.md`
rule 4a sets no bake-time budget, but the sampled ambient fires 16 BVH rays
per lightmap texel and recording no cost at all would be dishonest.

The measurement is fragile. The first load of a batch pays cold shader compile
and JIT, and the within-side spread is large enough to be visible in the
committed data itself: serenity's HEAD warm median is 1077 ms in batch 1 and
3163 ms in batch 2, a 3x swing with no code change between them. Warm medians
(first load of each batch dropped):

| Apartment | BASE b1 / b2 | HEAD b1 / b2 |
|---|---:|---:|
| serenity | 639 / 623 ms | 1077 / 3163 ms |
| kings-court | 3133 / 3136 ms | 9858 / 11554 ms |
| horkyone-10 | 2190 / 1042 ms | 1918 / 1937 ms |

**kings-court is the one claim this data supports: about 3x slower to bake,
with the two sides' raw load times disjoint in both batches** (BASE
3006-5548 ms against HEAD 8031-23431 ms). serenity rose in both batches but
its ranges overlap and the two batches disagree by 3x on the same figure;
horkyone-10 is up in one batch and flat in the other. **No claim is made for
those two.** `baketime-t7.json`'s own `reading` field states this same
per-apartment verdict; an earlier version of that field said no claim at all
was supportable, written before the second batch existed, and contradicted
this section. `baketime7.mjs` now writes the corrected text on every run so
the file and this section cannot drift apart again.

Nothing here changes rule 4a's standing conclusion — the fix for kings-court's
bake is architectural, move it into a Worker, deferred to the engine
migration. But plan 3 made the apartment that was already slowest slower
still, and the start overlay's progress readout is now carrying more weight
than it used to.

### The tours, looked at

All three walked (one frame per spawn plus the raw top-down cutaway) and the
`?compare=1` render-versus-photograph divider stepped through on all 11
serenity spots and all 14 kings-court spots — 25 panes, each asserted to have
actually laid out (non-zero photo and canvas rects) before it was
screenshotted, because a pane that failed to lay out screenshots as a plausible
black rectangle and proves nothing.

Nothing is broken: no black walls, no missing geometry, no floating furniture,
no blocked passage in any of the three cutaways, both terraces open to the sky
as designed. BASE against HEAD is not distinguishable by eye at contact-sheet
scale on any of the three apartments — the honest visual counterpart to a
0.6-6% move in p5. The divider panes show what the ΔE section says they show:
the residual is pose and content, not shading.

### Files

Twelve `tools/delta_e.py` native all-spot files,
`{serenity,kings-court}-b3-task7-{gate,BASE-c2bb0bd}-legacy[-repeatN]-allspots.json`.
Three luminance files, `<apt>-b3-task7-luminance.json`, rebuilt from their own
inputs by `write_metrics7.py --check` rather than transcribed. The harness and
the two-tree setup it needs:
`docs/superpowers/harnesses/2026-08-13-b3-task7/`.

The poseVerified population was also read during this task (serenity 16.02 on
2 of 11, kings-court 17.55 on 8 of 14 — **dated populations, left as measured;
they are 9 of 11 and 10 of 13 as of 2026-08-19, plan 4b**) and is
**deliberately not committed**:
this task's own rule is that every committed ΔE file be all-spot, and a
pose-verified file sitting next to the gate files is precisely the invitation
to misread that the "What this means for the merge condition" section above
exists to prevent.

---

## Phase B plan 4b task 5: the closing gate — the largest movement in phase B, and no rendering code produced it

Written 2026-08-19. Branch `phaseB-plan4b-content`, merge-base `5963ddd`
(`?v=113`) → tip `?v=121`. Read the paragraph in bold before the numbers, not
after them.

> **No renderer, bake, post-processing, material or shader code changed
> anywhere in plan 4b.** Every number below moved for exactly two reasons:
> **the metric began comparing like with like** — eleven cameras across two
> flats were re-pointed at the subjects their photographs actually show — and
> **two objects that were missing or wrong got fixed** (kings-court's Bathroom
> 2 shower, which had never been modelled, and that bathroom's inverted
> marble). This is a **measurement correction**, not a rendering improvement,
> and it must not be quoted as one anywhere.

### Method: three trees, one session

The gate was read on three servers running simultaneously in one browser
session, so before and after cannot differ by machine, session or harness:

| Port | Tree | What it is |
|---|---|---|
| 8742 | repo working tree, `?v=121` | the branch tip — the **shipped** reading |
| 8743 | `git archive 5963ddd` extraction, `?v=113` | the merge-base — the **BASE** reading |
| 8744 | `git archive HEAD` extraction with `4.webp`'s `compare` flag restored, `?v=121` | the tip on the BASE's **14-spot** population |

Each tree ran its **own** `tools/delta_e.py`, because that script resolves its
config, photographs and shots directory from its own location — pointing one
script at another tree would have scored the wrong config. Both halves of the
gate were verified present first (`?fov=legacy` in `measure.js`,
`--all-spots` in `delta_e.py`); both have been deleted once in this project's
history. Every capture was probed on disk **and checked non-empty**, for the
reason recorded in `PHASE-B-RESUME.md`'s deferred table. Two full rounds per
leg, each from a fresh page load.

### The third tree exists because the population changed under the branch

kings-court's `compare` set was **14** at the merge-base and is **13** at the
tip: the merge owner ruled `4.webp`'s coffee corner would not be modelled and
task 4 removed its flag. **A raw before/after across that boundary is not a
like-for-like comparison**, so both are reported.

| Reading | Population | Round 1 | Round 2 | Mean | Spread |
|---|---|---:|---:|---:|---:|
| serenity BASE `5963ddd` | 11 | 16.0045 | 15.9864 | **16.00** | 0.018 |
| serenity tip | 11 | 15.4982 | 15.4800 | **15.49** | 0.018 |
| kings-court BASE `5963ddd` | **14** | 18.5614 | 18.6093 | **18.59** | 0.048 |
| kings-court tip, same population | **14** | 18.1871 | 18.1521 | **18.17** | 0.035 |
| **kings-court tip, as shipped** | **13** | 17.5792 | 17.5931 | **17.59** | 0.014 |

- **serenity: 16.00 → 15.49, −0.51.** Population 11 on both sides, unchanged
  by this branch. The BASE arm reproduces plan 4a task 4's recorded 16.00
  baseline **exactly**, which is what licenses reading the movement as the
  branch's rather than the session's.
- **kings-court, like-for-like: 18.59 → 18.17, −0.42.** Same fourteen spots
  both sides. This is the figure that isolates what the work did.
- **kings-court, as shipped: 17.59** on thirteen spots.
- **The removal's arithmetic effect, re-derived rather than quoted.** Dropping
  one spot scoring far above the mean moves the mean by
  `(dE4 - mean14) / 13`. On this task's own two rounds:
  `(25.55 - 18.1871)/13 = 0.5664` and `(25.46 - 18.1521)/13 = 0.5621` —
  **−0.56**, agreeing with task 4's corrected figure. **This is arithmetic.
  Nothing about the render changed to produce it.**

### Attribution, per rule 2

Only spots whose camera or content this branch actually touched moved. The
untouched spots are the control, and they are quiet:

| Apartment | Largest movement on an **untouched** spot | Widest documented same-state per-spot range |
|---|---:|---:|
| serenity | **0.10** (`1.webp`) | 0.14 |
| kings-court | **0.10** (`13.webp`) | 0.35, or 0.75 — see below |

serenity, two-round per-spot means, BASE → tip:

| Spot | BASE | tip | Δ | Attribution |
|---|---:|---:|---:|---|
| 6.webp | 12.46 | 9.81 | **−2.65** | task 2 — camera re-pointed off the wardrobe onto the bed and window wall |
| 7.webp | 14.36 | 12.97 | **−1.38** | task 2 — same room, same cause |
| 5.webp | 11.14 | 10.58 | **−0.56** | task 2 — was rendering a closet corner instead of the corridor |
| 9.webp | 18.17 | 17.74 | **−0.43** | tasks 1+2 — re-pointed at the terrace door, which task 1 widened 1.4 → 1.8 m |
| 3.webp | 15.99 | 15.71 | **−0.29** | tasks 1+2 — same pair |
| 8.webp | 11.16 | 10.91 | **−0.25** | task 2 — the **mapping** fix: a bathroom photograph was attached to a spot standing in the bedroom, and the spot moved into the bathroom. The `name` field changes with it, Bedroom → Bathroom |
| 4.webp | 16.48 | 16.69 | **+0.21** | tasks 1+2 — re-pointed, and it moved the wrong way |
| 1, 2, 10, 11 | — | — | ≤0.10 | **untouched — nothing attributed** |

kings-court, two-round per-spot means, BASE → tip, on the fixed 14-spot
population:

| Spot | BASE | tip | Δ | Attribution |
|---|---:|---:|---:|---|
| 14.webp | 25.78 | 21.75 | **−4.03** | tasks 3+4 — **the shower that had never been modelled**, plus the marble un-inversion, plus a whole-room shot re-pointed to a fixture shot |
| 2.webp | 18.13 | 16.59 | **−1.54** | task 4 — camera moved 3.1 m and now frames the TV wall |
| 10.webp | 18.07 | 16.93 | **−1.15** | task 4 — the camera had been facing 180° away from its subject |
| 17.webp | 12.77 | 13.77 | **+1.00** | task 4 — **a deliberate regression.** The old pose rendered a featureless wall, which is a better colour match to a white-marble photograph than the vanity is. Aiming the camera correctly made the number worse, on purpose |
| 4.webp | 25.48 | 25.51 | +0.03 | untouched (and dropped from the shipped set) |
| 3, 7, 8, 11, 12, 13, 18, 19, 20 | — | — | ≤0.10 | **untouched — nothing attributed** |

**Hard stop (rule 3): not tripped.** No apartment's reading got worse at all.
The only per-spot regression is `17.webp`'s +1.00, chosen with the number in
front of the implementer.

### The noise floors, enumerated across every committed same-state set

Task 4's brief and two of its own passes each estimated this from one set and
each undershot. Enumerated properly, over every group of committed captures of
an identical config in this directory:

| Apartment | Widest committed same-state **mean** spread | Widest committed same-state **per-spot** range |
|---|---:|---:|
| serenity | **0.026** (`b4a-task3-final` pair) | **0.14** (`b3-task4-final` triple, `8.webp`) |
| kings-court | **0.054** (`b4b-task3` AFTER pair) | **0.75** (same pair, `10.webp`) |

Two things follow, and the second is a live disagreement inside this branch:

1. **kings-court's mean band is wider than the ±0.03/±0.039 floor
   `r128-reference.md` documents, and wider than the 0.033 task 4 settled
   on.** This task's own BASE arm independently spread **0.048** across two
   loads of one config, which corroborates 0.054 rather than 0.033. Anyone
   attributing a kings-court mean movement under ~0.06 should measure their
   own band first.
2. **The 0.75 per-spot swing is real, committed, and the two tasks in this
   branch that met it disagree about it.** Task 3's fix round argued it is a
   one-frame capture anomaly rather than a floor — 98.7% of that pair's mean
   spread is that single spot, and `10.webp` reads 17.53 four times running in
   `b3-task7`'s four repeats. Task 4's fix round, having enumerated a
   different subset of sets, carried **0.35** forward. **This task takes no
   side, because it does not have to** — but the reason must be stated **per
   apartment**, because it is not the same reason on both, and an earlier
   draft of this sentence over-reached by giving only kings-court's
   (corrected 2026-08-19, fix round 1):
   - **kings-court: unassailable.** Its smallest attributed movement is
     `17.webp`'s **+1.00** and its largest unattributed movement is **0.10**.
     Every candidate floor — 0.033, 0.14, 0.30, 0.35, 0.75 — falls inside
     that gap, so **no value of the disputed constant changes a single
     attribution.**
   - **serenity: it holds, but thinly, and the margin should be said out
     loud.** ~~every movement attributed above is ≥1.00~~ — **false for
     serenity**, five of whose seven attributed movements are 0.21, 0.25,
     0.29, 0.43 and 0.56. What actually carries serenity is that its own
     floor is **settled at 0.14** (the disputed 0.35/0.75 figures are
     kings-court's, and serenity's fresh same-state worst-spot swings this
     session were 0.08 and 0.09), and its smallest attributed movement,
     `4.webp`'s **+0.21**, clears 0.14 by **1.5×** — not the 10× the
     kings-court framing implies. `8.webp`'s −0.25 is independently safe on
     mechanism (its `name` field changes inside the committed data, Bedroom
     → Bathroom); **`4.webp`'s +0.21 rests on the margin alone and should
     not be leaned on.**

   **Plan 5 should settle it** — it is the only
   open question about this instrument, and both figures are sitting in this
   directory. **Start from ~0.3 rather than re-deriving it.** This task's own
   legs are *fresh* same-state captures on current hardware, and mining them
   — which the first pass did not do, having enumerated only the committed
   historical sets — settles the magnitude even though it does not settle
   the mechanism. Its six kings-court captures fall into **two independent
   same-state groups**:

   | Same-state group | captures | `11.webp` readings | range |
   |---|---:|---|---:|
   | BASE `5963ddd`, pop14 | 2 | 21.73, 22.05 | **0.32** |
   | tip, all four legs — one render state on the 13 shared spots | 4 | 21.75, 21.90, 21.61, 21.60 | **0.30** |
   | serenity BASE / serenity tip (worst spot, either group) | 2 + 2 | — | **0.08 / 0.09** |

   The four tip legs are legitimately one state: pop14 and pop13 differ only
   in `4.webp`'s `compare` flag, which cannot affect how any other spot
   renders. **Stated carefully, because the count matters:** these are **two**
   independent observations of a ~0.3 swing, not four — the seven *pairwise*
   `11.webp` comparisons among these six captures yield
   **0.32 / 0.30 / 0.29 / 0.15 / 0.15 / 0.14 / 0.01**, but pairings of the
   same captures are not independent samples and
   counting them as such would overstate the evidence. (The last figure read
   **0.13** until 2026-08-19, fix round 2: 0.13 is real but is `3.webp`'s
   value for that same pairing, carried across and mislabelled as
   `11.webp`'s. Recomputed from the committed `spots[]`. It changes no
   conclusion and slightly strengthens the argument — a 0.01 makes the
   pairwise spread *wider*, not narrower, and shows the swing is not a
   uniform per-capture jitter.)

   **Two conclusions, and the second is the more useful one.**
   - **Magnitude: kings-court's per-spot floor is around 0.3, not 0.14.**
     This corroborates task 4's **0.35**. It also shows task 3's reading of
     the committed 0.75 was right about the *magnitude* being an
     unreplicated extreme and **wrong to infer that the floor is therefore
     small** — nothing here reaches 0.75, but nothing supports 0.14 either.
   - **It is one spot, not a uniform floor.** `11.webp` is the worst spot in
     **five** of the seven pairwise comparisons and tied-worst in a sixth,
     while the second-worst spot in any pairing never
     exceeds **0.16**. So kings-court's "floor" is better described as *most
     spots ≈0.15, and `11.webp` ≈0.3* — which is a lead on the mechanism,
     not just a number. **`11.webp` (Bedroom 1, desk) is where plan 5 should
     start looking**, and it is also the spot task 4 declined to attribute a
     0.25 movement to, correctly.
   - **The seventh pairing is the useful one, and it points at a capture
     rather than a spot.** In `tip13 r1 vs r2` — the only pairing where
     `11.webp` is *not* worst — it reads **21.61 / 21.60, a 0.01 spread**.
     Across the four tip captures it reads 21.75 / 21.90 / 21.61 / 21.60, so
     the whole 0.30 tip range is carried by **one capture (`tip14 r2`, at
     21.90)** rather than by a spot that jitters on every load. Combined
     with the BASE group's 21.73 / 22.05, the shape is *occasional
     high excursions on one spot*, not continuous noise. **That is a
     testable hypothesis for plan 5** — and it is consistent with task 3's
     "one-frame anomaly" reading of the committed 0.75 while still refuting
     the small floor task 3 inferred from it, because these excursions
     recur.

   Serenity's 0.08/0.09 is why its committed 0.14 is credible, and why the
   0.21 margin above is thin but probably real.

### Pose verification, which is what actually changed

| Apartment | merge-base `5963ddd` | tip |
|---|---|---|
| serenity | **2 of 11** | **9 of 11** |
| kings-court | **8 of 14** | **10 of 13** |

Read together: **10 of 25 spots showed their photograph's subject at the
merge-base; 19 of 24 do now.** That is the change this plan was written to
make, and every ΔE movement above is downstream of it.

Still failing, all routed and none of them pose defects: serenity `2.webp` and
`10.webp` (no pool geometry, no sky — 4c); kings-court `18.webp` (the rattan
set does not exist — 4c), `14.webp` (Bathroom 2's layout is the photograph's
mirror image and `F.shower` builds no divider glass — a `builder.js` change,
**genuinely blocked** for 4b) and `17.webp` (the entry-hall wardrobe crosses a
wall into the Guest WC **and hangs 0.73 m outside the building's exterior
wall** — 4c).

### Files

Ten `tools/delta_e.py` native all-spot files, every one carrying
`population: all-spot`, `scored == compareTotal`, `skippedPoseVerification: 0`,
and naming both the camera and the population in its filename:
`{serenity,kings-court}-b4b-task5-{BASE-5963ddd,gate}-legacy-allspots[-pop13|-pop14][-repeat].json`.
Every mean above was re-derived from each file's own `spots[]` rather than
read off its `mean` field. serenity's files carry no `-popN` suffix because
serenity's population is 11 on both sides of the branch and never moved; the
suffix exists on kings-court's precisely because its did.
