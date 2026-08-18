# Phase B, plan 4b — content and poses

Design agreed 2026-08-16, after plan 4a merged. Written against the configs as
they stand on `main` at `?v=113`, not against the older observation notes,
which this document corrects in two places.

**Read first:** `docs/PHASE-B-RESUME.md` ("The gate, restated 2026-08-15"),
then `docs/superpowers/metrics/README.md`, then this file.

## Why this plan matters more than its size suggests

Every plan since phase B started has been fighting a metric it cannot win.
`metrics/README.md` states the reason outright: ΔE2000 against these
photographs is **dominated by pose and content mismatch, not by shading**. Plan
3 spent seven tasks on light and moved serenity by 0.05. Plan 4a fixed a
shipped rendering bug and moved it by 0.61 — and even that came mostly from
spots whose render and photograph show *different rooms*.

**4b is the first plan that attacks the actual residual.** Nine of serenity's
eleven `compare` spots and six of kings-court's fourteen fail pose
verification. Until those are fixed, the metric is measuring a bookkeeping
error and every lighting result is read through it.

## What is actually wrong, measured from the configs

The older notes in `docs/PHASE-B-OBSERVATIONS.md` are **partly stale**. Two
corrections, both verified against `tour/apartments/*.json` on `main`:

**Correction 1 — serenity's terrace opening is no longer a punched window.**
Observation B1 says the living room is modelled with a punched window (sill
0.85, head 2.45). It is not, any more: `serenity.json` wall 4
(`(3.1,5.25)–(5.75,5.25)`) carries `{"at": 0.25, "w": 1.4, "type": "door",
"terrace": true, "daylight": true, "curtain": "gray"}`. **What remains wrong is
its size**, not its kind: a `door` is `DOOR_H` 2.05 high and this one is 1.4 m
wide, where the photograph shows a floor-to-ceiling slider. So B1 is half
closed, and the half that remains is geometry, not opening type.

> **Correction 1a, added 2026-08-18 by task 1 — "floor-to-ceiling slider" is
> wrong, and only the width was ever wrong.** The sentence above inherited B1's
> premise without measuring it. `9.webp` is the only frame with the leaf slid
> open, and reading upward from the opening it shows a crisp head line, then
> plain wall, then the curtain rod, then more wall, then the air-conditioner:
> there is real wall above the head, so the opening cannot be floor-to-ceiling.
> Measured inside that one photograph with the air-conditioner as the ruler
> (235 px wide against 545 px head-to-floor, a wall-split indoor unit being
> 0.78–0.92 m), the **head sits at 1.95–2.10 m — `DOOR_H` 2.05 is already
> right**, and heightening the opening would move the model *away* from the
> building. Task 1 therefore widened it 1.4 → 1.8 m and deliberately left the
> height alone; the review upheld that. **Tasks 2+ must not heighten this
> opening.** Its shipped world extent is in the task 1 report.
>
> One thing the same measurement exposed and did **not** fix: `mainCeilH: 2.6`
> is ~0.3–0.4 m too short (two independent routes off `4.webp` put the real
> ceiling at 2.86–2.92 m and 3.1–3.2 m). Deferred with an owner — see
> `docs/PHASE-B-RESUME.md`, "Deferred, with owners". Task 2 re-points cameras
> inside that short shell knowingly.

**Correction 2 — the wrong-wall spots are a pose defect, not that geometry
defect.** Their `poseNote`s say the terrace door "never appears" at any yaw.
The door exists. The cameras face away from it. Fixing the opening's height
will not by itself make those spots see it.

### serenity — 9 of 11 `compare` spots unverified, in three classes

| Class | Spots | What is wrong | Owner |
|---|---|---|---|
| **Pose** | 3, 4, 9, 5, 6, 7 | Camera points at the wrong wall or the wrong room. 3/4/9 all face away from the terrace door; 5 renders a closet corner instead of the corridor; 6 and 7 render the wardrobe instead of the window wall and the bed | **4b** |
| **Mapping** | 8 | The spot is attached to the **wrong photograph** — its note says the photo it is meant to match "is actually the bathroom" | **4b** |
| **Content** | 2, 10 | The pool vista never appears because there is no pool geometry and no sky. Nothing about the camera fixes this | **4c** |

### kings-court — 6 of 14 unverified

| Spot | What is wrong | Owner |
|---|---|---|
| 17 | Blank marble wall at every fov; the mirror and sink never show. Its own note already calls it "a pose problem" | **4b** |
| 10 | Blank wall at every fov | **4b** |
| 2 | TV wall at a steep angle, never the photograph's composition | **4b** |
| 14 | Renders the whole bathroom where the photo is a tight shower-fixture crop — **and Bathroom 2's shower is not modelled at all** | **4b** (see below) |
| 18 | The rattan seating set the photo centres on does not exist as furniture | **4c** |
| 4 | The "coffee corner" props do not exist. This one needs a ruling, not a fix — see "The B4 decision" | **decision** |

### The missing shower is real and is 4b's

All four `type: "shower"` entries in `kings-court.json` sit outside Bathroom
2's bounds `(8.8, 0)–(11.4, 2.6)` — at x 21.3, 5.35, 4.85 and −4.0. The room
has no shower. Spot 14 is photographed *at* that shower, which is why no
camera angle has ever reproduced it.

## The rule that governs this plan

Re-pointing a camera changes the number the camera produces. That makes 4b the
easiest plan in this phase to cheat with, and the cheat would not look like
cheating: nudge a yaw, watch ΔE fall, call it a fix.

**So the rule, agreed before the work and not renegotiable after it:**

> **Point the camera at the photograph's subject. Never at the ΔE minimum.**

This is the same rule as "fit toward luminance, never toward ΔE", applied to
pose instead of exposure, and it exists for the same reason: this project has
already shipped one fit that picked a ΔE minimum and described it as something
else, and only a review caught it.

Operationally:

1. A pose is chosen by **looking** — `?compare=1` opens the render-versus-
   photograph divider, and `window.__compare(file)` drives it. The chosen pose
   is the one where the render shows **the same subject** as the photograph.
2. **ΔE is recorded for every candidate pose and used to choose none of them.**
   Report it as a consequence.
3. `poseVerified` flips to `true` only when the two frames show the same
   subject. It is not a score threshold and must never become one.
4. Where no pose shows the subject because the subject **does not exist in the
   model**, that is a content defect — say so, leave `poseVerified: false`, and
   route it to 4c rather than pointing the camera somewhere flattering.

## What this plan will do to the gate, stated in advance

Re-pointing spots and adding a shower **will move the all-spot ΔE, probably by
whole points**, because six or seven spots will start rendering their actual
subjects for the first time. That is a real improvement in what the metric
measures, and it is also the largest movement this phase has seen.

Under the restated gate that is fine, on one condition: **each movement must be
attributed.** The plan re-reads the gate after each task and pairs it
same-session. A movement that cannot be attributed to a named change fails,
however good it looks.

**And the movement must not be reported as a rendering improvement.** Nothing
about the renderer changes in this plan. What changes is that the metric starts
comparing like with like. The record must say that in the same breath as the
number.

## The B4 decision, which is not this plan's to make

kings-court spot 4 is a **product detail photograph** — a coffee machine on
marble. The model has no coffee corner. There are two honest options and they
are not equivalent:

- **Model the props**, and the spot becomes scorable.
- **Drop it from the `compare` set**, and the spot stops being scored.

`PHASE-B-OBSERVATIONS.md` already flags why this needs a person: **dropping it
moves the mean**, and a mean that improves because a bad spot was removed must
never read as a render improvement. Whichever way it goes, the decision and its
effect on the mean get recorded.

The same question applies in weaker form to spot 14 once the shower exists: a
tight fixture crop is a hard target for a room-scale model.

## Scope

**In:** serenity's terrace opening geometry (height and width); serenity's six
mis-pointed spots and one mis-mapped spot; kings-court's Bathroom 2 shower;
kings-court's four mis-pointed spots; the gate re-read and attributed after
each.

**Out:** the pool, the sky, exterior planting, the rattan set, GLTF furniture,
PBR textures — all **4c**. Constants and documentation — **plan 5**. The wall
lightmap atlas — unblocked by 4a, owned by nobody yet.

## Acceptance

- Every spot this plan touches shows the photograph's subject at `?compare=1`,
  judged by eye, with a before/after frame pair filed.
- `poseVerified` reflects reality on all three apartments, and the count is
  stated in the metrics record.
- `window.__issues` empty on all three; walk routes, sky-leak rays and the
  dollhouse tape unchanged where the plan did not touch geometry.
- The gate re-read all-spot in `&fov=legacy`, each movement attributed
  same-session, hard stop not tripped.
- The record says plainly that the movement is a measurement correction, not a
  rendering improvement.
