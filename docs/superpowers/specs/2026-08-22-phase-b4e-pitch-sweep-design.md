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

## The instrument

New file `tools/pitch_fit.py`. Offline, reads images from disk, writes JSON.
No browser, no shipped-code change.

**Observable: the row profile of horizontal-edge energy.** For a frame, compute
the per-row sum of vertical-gradient magnitude, normalised. Interior scenes are
full of strong horizontal boundaries — floor/wall junctions, ceiling/wall
junctions, counter and table tops, window sills and heads, cabinet lines — and
their *vertical positions* are exactly what pitch moves. Colour is not used, so
the criterion cannot degenerate into ΔE by another route.

**Fit two parameters, not one.** Model the photograph's profile as the render's
profile under a shift and a scale about the frame centre:

- **shift** ↔ camera pitch,
- **scale** ↔ ratio of the two frames' vertical fields of view.

Fitting only a shift is what makes pitch and fov inseparable: any single row can
be reached by the wrong tilt in the wrong lens. Fitting both separates them, and
the separation is the whole reason the two-edge requirement was chosen over a
one-edge one.

The fit runs against a **pitch-0 render under the legacy 72° camera** — one
capture per spot, already reproducible by the existing `window.__measure()`
recipe. From the fitted pair:

- implied photograph vfov = `2·atan(scale · tan(72°/2))`,
- physical pitch in degrees, computed from the shift **through the implied
  vfov**, never through 72.

**Then confirm, don't trust.** Re-capture each spot at its derived pitch and
re-run the fit. A correct derivation leaves a residual shift near zero. A
derivation that does not converge is reported as a failure and the spot keeps
`pitch: 0` — this plan never ships a value its own confirming capture rejects.

**Predict-then-confirm, not a blind sweep.** Two captures per spot (~48 renders
total), not a six-value sweep over 22 spots (~132). Where the confirm fails, a
local sweep around the prediction is the documented fallback for that spot
alone.

## Population, and what "done" means per spot

Twenty-four spots in scope: serenity's 11 and kings-court's 13 `compare`-flagged
ones. That is the twenty-two still captured level, **plus** serenity's two
already-tilted spots, which are re-derived as a cross-check of the instrument
and not as a re-opening of their values — see "The two shipped values" below.
kings-court `4.webp` is not `compare`-flagged and is out of scope.

Each spot lands in exactly one of four states, all recorded:

| Outcome | Meaning | Config effect |
|---|---|---|
| **Tilt derived and confirmed** | Fit converged, confirm capture's residual near zero, reviewer accepts the divider | `pitch` written |
| **Level, confirmed** | Fit returns a tilt inside the plan's noise band | No key written; the spot's `poseVerified` becomes *verified*, not *assumed* |

**The noise band is measured, not chosen.** Before any spot is classified, the
plan captures the same apartment in the same state twice and runs the fit on
both, exactly as the repository already derives its per-spot ΔE noise floor. The
band is that repeatability. Naming a number here would be the mistake this
record has on file — a plausible figure that entered through a document and
survived three reviews. It is derived in the plan's first task and every later
classification quotes it.
| **Fit refused** | No convergence, or the confirm capture rejects the prediction | `pitch: 0` stands, reason recorded |
| **fov-dominated** | Fit converges only with an implied vfov far from the configured one | No `pitch` written; the spot is **evidence for plan 5's `meta.photoFovLong` row** |

The fourth row is why the two-parameter fit was chosen. kings-court's
`photoFovLong` is documented as 120 and was measured at ~57–58° by two
independent methods on two photographs, so a meaningful number of kings-court
spots are expected to land there. **That is a result, not a failure** — it is
the third and fourth independent measurement of the same constant, over eleven
more frames than the existing two, handed to plan 5 as data.

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

- **`meta.photoFovLong`** stays plan 5's. This plan hands it measurements over
  up to 24 frames and changes nothing.
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
photograph's sofa. A fit can lock onto furniture rather than architecture and
return a confident wrong answer. Two mitigations, both required: the fit reports
its peak's sharpness and a weak peak is a refusal, not a value; and the confirm
capture is looked at by a human before anything is written. The instrument
proposes; the reviewer disposes.

**The second is scope.** Twenty-four spots across two apartments is a wide
branch, and every one of them touches a file the gate reads. The plan must
capture its BASE before it writes a single value, and pair every reading
same-session, because the alternative is a number nobody can attribute.
