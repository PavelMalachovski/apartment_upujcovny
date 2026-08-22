# Phase B plan 4e — sweep the camera pitch over every remaining photo spot

**Date:** 2026-08-22
**Status:** design, approved in conversation before writing
**Successor document:** `docs/superpowers/plans/2026-08-22-phase-b4e-pitch-sweep.md`

## Goal

Twenty-two `compare`-flagged photo spots are still captured at `pitch: 0`, and
every one of them was pose-verified under that constraint. Derive each one's
real camera tilt from the photographs, ship the values that survive review, and
say plainly which spots' `poseVerified: true` was weaker than it looked.

## Why this is its own plan, and not 4d

`docs/PHASE-B-RESUME.md:598` routes this work to plan 4d. That routing is
wrong for the same reason the repository has already corrected three times —
`mainCeilH`, the kings-court entry-hall wardrobe and the shower divider glass
were each pulled out of a plan whose critical path is **human asset curation
nobody has scheduled**. Plan 4d needs HDRI packs, GLTF furniture and licensed
texture sets. This work needs **no asset at all**: the instrument already
exists, the photographs are already in the repository, and the only thing
missing is measurement.

Parking unblocked work behind a blocked plan is the specific failure this
record keeps re-correcting. So: **plan 4e**, numbered after 4d and running
before it, because it is unblocked and 4d is not.

It is also not plan 5. Plan 5 re-validates documented constants and rewrites
documents; `pitch` is per-spot capture data, not a documented constant, and
plan 5's task 1 explicitly measures without editing.

## What is already true, and must not be re-derived

Plan 4c task 1b built the instrument and it is shipped on `main`:

- `photoSpots[].pitch`, optional, **degrees, positive = looking down**.
- Read by `tour/measure.js:45` and `tour/compare.js:285`, deliberately by both,
  so the divider a reviewer judges and the frame the scorer scores are the same
  camera.
- Converted and **sign-negated** in `tour/main.js:105`, because
  `controls.pitch` feeds `camera.rotation.x` where positive looks *up*.
- Absent or non-finite → 0, with a named `[main]` warning for the non-finite
  case.

**This plan changes none of that.** It is a data plan. The only code it may add
is offline measurement tooling under `tools/`, which the deploy root never
serves.

Two spots already carry a value: serenity `2.webp` (40) and `10.webp` (22),
derived by sweeping and matching the pool's measured water-band rows. Task 1b's
result — all-spot legacy 15.66 → 14.27, `10.webp` 26.37 → 13.32 — stands as the
demonstration that this is worth doing, and is **not** re-litigated here except
as described under "The two shipped values" below.

## The finding that decides the method

The criterion inherited from task 1b is "align the measured rows between render
and photograph". **That criterion is not well defined until you say which
render camera**, and this session measured that the two cameras in the harness
disagree enormously:

| Frame shape | Spots | Gate camera (`?fov=legacy`) | Divider camera (`__spotFov`, `photoFovLong` 120) |
|---|---|---|---|
| 16:9 landscape, 1200×675 | serenity 1–8 | 72.0° vertical | **88.5°** |
| 3:2 landscape, 1200×800 | kings-court 2, 3, 8, 11, 12, 13, 18, 20 | 72.0° vertical | **98.2°** |
| portrait, 919–1200 px wide | serenity 9, 10, 11; kings-court 7, 10, 14, 17, 19 | 72.0° vertical | **120.0°** |

Every portrait spot reads exactly 120° because `__spotFov` returns
`photoFovLong` directly when the long edge is the vertical one
(`tour/main.js:128`). Measured this session from the shipped photographs and
the shipped code, not assumed.

A single physical tilt lands on completely different rows in a 72° frame and a
120° one. So "the pitch that makes the rows line up" has **two different
answers** depending on whether you are looking at the gate capture or the
divider — and the divider is what a reviewer stamps `poseVerified` on while the
gate is what the branch's number comes from.

Therefore this plan derives the **physical** tilt — the one property of the
photograph that both cameras share — rather than a per-camera row offset. That
is the only answer that does not silently mean two different things in the two
places it is used.

**This supersedes nothing in task 1b's record**; task 1b swept a single camera
and said so. It does mean the two shipped values are re-derived by the new
method as a consistency check, below.

## Corrected 2026-08-22, before a single browser capture was spent

**The method this spec chose first — fitting a shift and a scale together — was
built, run against the repository's real frames, and REJECTED by its own
output.** The correction is recorded here rather than quietly swapped in,
because the rejected method is plausible enough that the next reader will
propose it again.

Working: `docs/superpowers/metrics/b4e-preflight-method-rejection.json`. Run
against the frames plan 4c task 5's closing gate left in `tools/shots/`
(2026-08-19, `?fov=legacy`, `?v=136`), where serenity's `2.webp` was captured at
pitch 40 and `10.webp` at 22 — the only ground truth available anywhere in this
repository.

What it measured:

- **Two free parameters are degenerate on real frames.** The fitted field of
  view ran to the search grid's 28° floor on **4 of 24** spots, and landed
  between 28° and 108° with no clustering on the rest. That is the signature of
  an objective that does not constrain its parameters, not of a lens
  measurement.
- **One free parameter is well posed, and hits the truth.** With the field of
  view pinned at the gate camera's 72°, `10.webp` returns **21.50°** against a
  known 22.0°.
- **But the confidence score does not predict correctness, so it cannot guard
  anything.** That correct answer carries a sharpness of **0.003 — the lowest of
  all 24 spots**, against a spread that reaches 0.568. The refusal threshold
  this spec was going to rely on would have thrown the one right answer away and
  kept implausible ones: kings-court `11.webp` fits 27.5° of downward tilt in a
  bedroom photograph, at four times that spot's confidence.
- **`2.webp` misses (21.25 against 40), and is expected to.** It is
  `poseVerified: false` on a furniture-placement reason routed to plan 5, so
  render and photograph do not show the same subject there. That is not evidence
  against the observable.
- **The lens coupling is real but not a constant.** Re-fitting every spot at an
  assumed 57° instead of 72° moves the answer by between **−0.62 and +1.22
  degrees of tilt per degree of assumed field of view**, median 0.15. So a tilt
  derived under one assumed lens cannot be converted to another by a shared
  coefficient, and this plan cannot hand plan 5 the tidy conversion factor it
  hoped to.

**The synthetic tests pass, and that means less than it looks.** They generate
sparse spikes through the same projection the fit inverts, so they prove the
algebra is right and say nothing about a photograph. They are kept for exactly
that narrow purpose and must never be quoted as validation of the method on real
frames.

**What changes.** Automatic fitting is **demoted from deriving values to
proposing candidates.** A human-identified horizontal landmark, measured in both
frames, decides — which is plan 4c task 1b's method, the only one with a record
of working in this repository. The tool's job is to narrow a blind ±52° sweep to
a neighbourhood worth measuring, which is real work saved and an honest use of a
signal too weak to trust alone.

**What this costs, stated plainly.** The reason this spec reached for automation
was that hand-picking two landmarks across 24 spots is ~48 human judgements.
That cost is now the price of correctness rather than a corner that could be
cut, and the plan is longer because of it.

## The instrument

New file `tools/pitch_fit.py`. Offline, reads images from disk, writes JSON.
No browser, no shipped-code change. **It proposes; it does not decide** — see
the correction above.

**Observable: the row profile of horizontal-edge energy.** For a frame, compute
the per-row sum of vertical-gradient magnitude, normalised. Interior scenes are
full of strong horizontal boundaries — floor/wall junctions, ceiling/wall
junctions, counter and table tops, window sills and heads, cabinet lines — and
their *vertical positions* are exactly what pitch moves. Colour is not used, so
the criterion cannot degenerate into ΔE by another route.

**One free parameter, and the lens is pinned, not fitted.** The field of view is
held at the gate camera's **72°** and only the tilt is searched. Fitting the
lens as well was measured to be degenerate (see the correction above), and a
degenerate parameter does not become harmless by being ignored — it drags the
one you care about with it.

The consequence is stated rather than hidden: **a tilt derived at an assumed 72°
is conditional on that assumption**, and `meta.photoFovLong` — 120 in both
apartments' configs, measured at ~57–58° by two independent methods in
kings-court — has never been audited. This plan does not audit it; that is plan
5's row. It ships tilts fitted at 72°, records that they are conditional, and
records the per-spot sensitivity it measured so plan 5 knows the size of what it
will disturb. **It cannot hand plan 5 a single conversion coefficient**, because
the sensitivity was measured to run from −0.62 to +1.22 degrees of tilt per
degree of assumed lens.

**The fit proposes a neighbourhood; a landmark decides the value.** For each
spot the tool returns a candidate tilt. A human then names one horizontal
landmark visible in both frames — a floor/wall junction, a counter edge, a sill,
a ceiling line — measures its row in the photograph and in the render, and
sweeps the tilt until the two rows agree. Two landmarks where the frame offers
two, which is the two-edge requirement this design was given. This is plan 4c
task 1b's method with the water band generalised, and the candidate is there to
make the sweep three values wide instead of two hundred.

**Then confirm, don't trust.** Re-capture each spot at its chosen tilt and
re-measure the landmark rows. A correct value leaves the rows agreeing. A spot
that will not converge keeps `pitch: 0` and the failure is recorded — this plan
never ships a value its own confirming capture rejects.

**The confidence score is reported and never used as a gate.** It was measured
not to predict correctness: the single spot with known ground truth carries the
lowest score of all 24. It goes in the JSON because a future reader deserves to
see it, and nothing branches on it.

## Population, and what "done" means per spot

Twenty-four spots in scope: serenity's 11 and kings-court's 13 `compare`-flagged
ones. That is the twenty-two still captured level, **plus** serenity's two
already-tilted spots, which are re-derived as a cross-check of the instrument
and not as a re-opening of their values — see "The two shipped values" below.
kings-court `4.webp` is not `compare`-flagged and is out of scope.

Each spot lands in exactly one of four states, all recorded:

| Outcome | Meaning | Config effect |
|---|---|---|
| **Tilt derived and confirmed** | A named landmark's rows agree between render and photograph at the chosen tilt, the confirming capture holds, and the reviewer accepts the divider | `pitch` written |
| **Level, confirmed** | The landmark's rows already agree within the measured noise band at 0 | No key written; the spot's `poseVerified` becomes *verified*, not *assumed* |
| **No usable landmark** | The frame offers no horizontal feature identifiable in both images — furniture differs, or the view is a flat surface | `pitch: 0` stands, the reason recorded in words |
| **Will not converge** | A landmark exists, but no tilt makes its rows agree | `pitch: 0` stands, the swept values recorded so nobody repeats the sweep |

**No outcome branches on the fit's confidence score.** It was measured not to
predict correctness — the one spot with ground truth carries the lowest score of
all 24 — so a threshold on it would throw away right answers and keep wrong
ones. It is recorded, not obeyed.

**The fourth row is where the lens problem surfaces**, and it surfaces as an
observation rather than a fitted number. A spot whose landmark cannot be brought
into agreement by *any* tilt is telling you something is wrong that is not tilt,
and the leading candidate is `meta.photoFovLong` — documented as 120 in both
apartments, measured at ~57–58° by two independent methods in kings-court. Those
spots are listed for plan 5 with what was swept and what the residual did.
**That is a result, not a failure of this plan.**

**The noise band is measured, not chosen.** Before any spot is classified, the
plan captures the same apartment in the same state twice and measures the same
landmark rows in both, exactly as this repository already derives its per-spot
ΔE noise floor. The band is that repeatability. Naming a number in this document
would be the mistake this record has on file — a plausible figure that entered
through a document and survived three review rounds.

## poseVerified is re-opened, deliberately

Every one of the twenty-two `pitch: 0` spots carries `poseVerified` decided
under a camera that could not tilt. Where this plan derives a real tilt, that
stamp was answering a question about the wrong frame.

So: **every spot whose derived pitch is non-zero has its `poseVerified`
re-reviewed against the new divider**, and the re-review may lower it. A count
going 10-of-11 → 9-of-11 is an acceptable outcome of this plan and must be
reported as such rather than avoided. Spots confirmed level keep their stamp and
gain a sentence saying it was tested rather than assumed.

## The two shipped values

serenity `2.webp` (40) and `10.webp` (22) are re-derived by the new method
purely as a cross-check of the instrument. They are **not** changed unless the
new derivation both disagrees materially *and* its confirming capture is the
better frame under review. If the two methods agree, that is the strongest
available evidence the new tool works, and it is recorded either way.

`2.webp` also stays `poseVerified: false` on a furniture-placement reason that
belongs to plan 5. This plan does not touch that.

## Acceptance

- **The derivation criterion is geometric.** ΔE is recorded at every step and
  **chooses nothing** — the same rule that governs `exposure`, and the rule
  task 1b followed. A pitch value picked because it improved ΔE is a rejected
  value regardless of the number.
- **Gate:** all-spot legacy ΔE, BASE and HEAD served simultaneously in one
  session, both apartments, plus a repeat run — the established shape. Reported
  explicitly as an **instrument correction, not a rendering improvement**,
  in task 1b's own words, wherever the number appears.
- **The gate does not decide the plan.** The metric may move in either
  direction; a spot whose derived pitch is right and whose ΔE rises is still
  right, and the record already documents that saturated colour in a misaligned
  cell can score worse than the flat grey it replaces.
- `window.__issues` empty on all three apartments before commit.
- Draw calls unchanged — this plan adds no geometry. Measured anyway, through
  the post chain, because the recipe is cheap and the claim is otherwise
  unverified.

## What changes

| File | Change |
|---|---|
| `tour/apartments/serenity.json` | `pitch` on the spots that earn one; `poseVerified` where re-review moves it |
| `tour/apartments/kings-court.json` | same |
| `tour/index.html` | `?v=` bump, after the last JSON edit |
| `tools/pitch_fit.py` | New: the two-parameter fit and its report |
| `docs/superpowers/metrics/*-b4e-*.json` | Per-spot derivations, gate baselines |
| `CLAUDE.md` | The `pitch` row — its "only serenity's `2.webp` and `10.webp` set it" sentence becomes false the moment this plan ships |
| `docs/PHASE-B-RESUME.md` | Row 598 out of 4d; row 33's 4d description; `poseVerified` counts by search, never from memory |
| `docs/superpowers/metrics/README.md` | New baselines with populations; the two-camera finding |

**No change to** `measure.js`, `compare.js`, `main.js`, `builder.js`, `bake.js`,
`app.js`, or any apartment's geometry, furniture, palette or `exposure`. If this
plan finds itself editing a renderer file, it has left its scope.

## Degradation

| Situation | Behaviour |
|---|---|
| Spot has no `pitch` key | Captured level, exactly as today — the shipped fallback, untouched |
| `pitch` non-finite | Named `[main]` warning, 0 used — shipped behaviour, re-verified not re-built |
| `pitch_fit.py` absent | Nothing in the tour changes; the tool is offline and outside the deploy root |
| Fit fails on a spot | That spot ships `pitch: 0` and the failure is recorded; no partial or guessed value |

## Routed out of this plan

- **`meta.photoFovLong`** stays plan 5's, and this plan hands it **less** than
  the first draft promised. The pre-flight measured that fitting the lens is
  degenerate, so there is no per-frame lens measurement to give. What plan 5
  gets instead: the list of spots no tilt could reconcile, the measured
  per-spot sensitivity of tilt to the assumed lens (−0.62 to +1.22 °/°, median
  0.15), and the explicit warning that every tilt this plan ships is
  conditional on the assumed 72° and **cannot be converted by a single
  coefficient** when the constant moves.
- **`mainCeilH`**, serenity's sofa and bedroom, kings-court's Bathroom 2
  mirroring and its entry-hall wardrobe, the noise floor, `stale_claims.py`'s
  seven gaps, the cache headers — all stay plan 5's, untouched.
- **HDRI, GLTF, PBR/KTX2, kings-court's `18.webp` rattan set, the `sky` key on
  the other two apartments** — stay 4d's. This plan removes only the pitch row
  from 4d's list.
- **The wall lightmap atlas** stays unowned.

## Where this is most likely to go wrong

**Furniture that differs between render and photograph.** The row profile is
built from whatever is in the frame, and the render's sofa is not the
photograph's sofa. **This already happened, in the pre-flight** — serenity's
`2.webp`, whose furniture is known-wrong, fitted 21.25° against a shipped 40°.
The failure mode is not hypothetical and the confidence score does not catch it.
What catches it: the landmark must be *named* — a reviewer says which physical
feature they are matching — and a landmark nobody can name in both frames is the
"no usable landmark" outcome, not a value.

**Trusting the tool because it is a tool.** A number printed by a script reads
as more authoritative than the same number guessed, and this one has now been
measured to be wrong at high confidence and right at low confidence. Every step
that consumes the fit must treat it as a suggestion, and the plan must never
contain a step whose only input is the fit's output.

**The second is scope.** Twenty-four spots across two apartments is a wide
branch, and every one of them touches a file the gate reads. The plan must
capture its BASE before it writes a single value, and pair every reading
same-session, because the alternative is a number nobody can attribute.
