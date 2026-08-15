# Phase B, plan 4a — wall winding, and walls that take their own light

Design agreed 2026-08-15. Supersedes nothing; this is the first plan written
after plan 3 closed and after the merge gate was restated on the same day.

**Read first:** `docs/PHASE-B-RESUME.md` (especially "The gate, restated
2026-08-15"), then `docs/superpowers/metrics/README.md`, then this file.

## Why this plan exists, and why it is called 4a

The resume document carries a single line — "plan 4 — serenity content: B1
geometry, exterior, GLTF, PBR" — that is not one plan. It bundles engine code,
config geometry, and an asset-curation effort the design spec budgets at a day
or more of **human** work per property. Bundling those guarantees a plan that
stalls on its human half while its code half waits.

Plan 4 is therefore split, and this document specifies only the first part:

| Plan | Scope | Nature |
|---|---|---|
| **4a — this document** | Wall winding defect; walls take position-sensitive shading; the exposure/bloom re-fit both force | Pure code, no external assets |
| 4b — to be written | serenity's living room (B1), kings-court's missing Bathroom 2 shower, mis-pointed `photoSpots` | Config and `F.*` geometry |
| 4c — to be written | HDRI and exterior, GLTF furniture, PBR/KTX2 texture sets | Loader architecture is code; asset curation is human |

**4a goes first because of a hard ordering constraint, not preference.** The
phase's standing rule is that when light changes, exposure and bloom are
re-fitted together. Fixing the winding changes the render; so does giving
walls real shading. Both are in 4a, so 4a pays for **one** re-fit. Run 4b or
4c first and that re-fit is paid two or three times over. The original design
spec states the same ordering for a different reason — "furniture cannot go
into a room with the wrong window, and textures on boxes are wasted work."

## The two defects

Both are recorded in `tour/bake.js:502-547`, in a comment block written when
plan 3 task 2 found them. Neither is new to this plan and neither was
introduced by phase B.

### Defect 1 — winding

`grid()` (`tour/bake.js:560`) builds each wall quad, and `pts` inside it
(`:577`) emits **one fixed triangle order**. A quad's geometric front face is
therefore `uVec × vVec` regardless of the normal `n` passed in. The merged
wall material is `MeshBasicMaterial` with no `side` override, so it is
`FrontSide` and backface culling is live.

Worked through all twelve `grid()` calls per wall piece, **8 of 12 faces are
reversed**:

- the `else` branch (walls along z): all six faces — both large faces, both
  end reveals, top and bottom;
- the `alongX` branch: the four vertical faces are correct, but **top and
  bottom are reversed too**.

**The fix is a sign test — reverse the quad when `(uVec × vVec) · n < 0`.** It
is explicitly *not* a reversal of the `else` branch, which would leave top and
bottom broken on every wall in every apartment. An earlier write-up said
exactly that before it was corrected, so the wrong fix is on record and must
not be re-derived.

Measured on the unmodified tip, standing 1 m off each wall's centreline and
raycasting at it:

| | serenity | kings-court |
|---|---|---|
| along-x walls showing the **near** face | 6/6 | 14/16 |
| along-z walls showing the **far** face | 8/8 | 17/18 |

So every along-z wall presents its far face — 14 cm from where the visitor
thinks the surface is, shaded from a sample point on the other side of the
wall, which for a shell wall is outside the building. It is invisible today
only because walls are flat-shaded.

**The two kings-court walls that show neither face are unexplained.** Plan 3
recorded that gap and left it. This plan closes it or states why it cannot.

### Defect 2 — resolution

Wall quads are shaded from their four geometric corners and Gouraud-
interpolated at `SEG = 0.45` m (`tour/bake.js:556`), and **each end reveal,
top and bottom is a single quad however large**. Corners that sit on hidden
surfaces — a reveal butted into the wall it meets, an underside buried in the
floor slab — return ~0 under a position-sensitive shading term, and that zero
is smeared 0.45 m across wall a visitor is looking straight at. When it was
tried, **14% of serenity's wall vertices went to a true zero** and the
living-room wall band rendered at pixel value 1 where it had been 85.

Defect 2 is why walls still pass `sampled=false` to `lightAt` and keep the
flat ambient constant. Defect 1 is why they *cannot* take a position-sensitive
term at all until it is fixed.

## What this plan does about them

Defect 1 is fixed outright. Defect 2 is **mitigated and measured, not
solved** — the full solution is a wall lightmap atlas, which plan 3 task 2
split out after finding that `UVUnwrapper` is a thin wrapper over
`xatlas-web`, an Emscripten WASM module, and would need a from-scratch atlas
rasteriser in `bake.js` on top. That remains out of scope here and stays
available to a later plan.

The mitigation is to refine `SEG` — an existing knob, not new architecture —
so the smear distance shrinks, and then let walls take the visibility-scaled
ambient. Refining `SEG` reduces the size of the spoiled region; it does not
remove the cause, and this plan does not claim otherwise.

## Tasks

### Task 1 — the winding sign test

1. **Reproduce the defect before fixing it.** Build the raycast harness and
   confirm it returns the counts in the table above on the unmodified tip. A
   harness that cannot show the defect is not measuring what it claims — this
   repo has shipped a verification that could not fail before, and plan 3 task
   1 caught a real inverted-axis bug precisely because it was required to fail
   first.
2. Apply the sign test in `grid()`.
3. Re-run the harness: every wall must present its **near** face. Account for
   the two kings-court walls that previously showed neither.
4. **Verification pass of its own**, because moving these faces moves apparent
   room dimensions: `window.__issues` empty on all three apartments; the four
   standing walk routes; sky-leak raycasts; the dollhouse measuring tape
   against `areas`; draw calls through the post chain against ≤400 desktop and
   ≤250 mobile.
5. Re-measure the gate and **attribute** the movement per the restated gate's
   rule 2 — a same-session paired A/B, both arms on the same machine and
   harness.

### Task 2 — walls take the visibility-scaled ambient

This is a pilot with a pre-agreed exit criterion. It may end in a No-Go and
that is an acceptable outcome, not a failure to be avoided.

1. **Record the before** on all three apartments: spawn-pooled sRGB mean and
   p5, linear-domain contrast, all-spot legacy ΔE, wall vertex count, bake
   time, draw calls.
2. Sweep `SEG` and pass `sampled=true` for walls.
3. **Record the after**, same measures, same harness.

**Exit criterion, agreed before the work and not renegotiable after it:**

> **serenity's linear-domain contrast ≥ 4.32.**

Derived as a third of the current measured gap: render **3.384**, photographs
**6.196**, so 3.384 + 2.812/3 = 4.32. This is the same derivation plan 3 task
6 stated for itself, applied to today's committed numbers rather than to the
phase A series that plan 2 closed outright.

**The criterion's population is known to be weak, and this is recorded before
the work rather than discovered after it.** `tools/luminance.py` filters
through `delta_e.scorable`, which requires `poseVerified`, and serenity has
exactly **two** spots that pass — `1.webp` (Bathroom) and `11.webp` (Bedroom).
Both are among the highest-p5 rooms in the flat, i.e. the least shadow
available to change, and **the darkest spawn (Entrance, spawn-pooled p5 66.4)
is not in this population at all.** For a step whose whole purpose is to
deepen shadow on walls, that population is biased against the step by
construction.

The decision taken was to keep the bar rather than move it mid-flight, and to
compensate with a second reading:

- **Go/No-Go rests on contrast ≥ 4.32 and nothing else.**
- **The task must additionally report spawn-pooled p5 over every `spawns[]`
  entry, including the Entrance, on all three apartments.** This number does
  not change the verdict. It exists so that a No-Go measured on two bright
  rooms is not written into the record as "walls do not help" when the dark
  room may have moved. If the two disagree, the report says so plainly and
  the No-Go still stands.

**Cost ceilings, any one of which is also a No-Go:** draw calls past ≤400
desktop or ≤250 mobile. Bake time has no fixed ceiling (rule 4a) but must be
reported for all three against the medians on record — serenity 267 ms,
horkyone-10 1323 ms, kings-court 8674 ms.

**A known trap, named in advance.** If black bands appear at wall junctions,
that is a No-Go signal and **not** an invitation to fix them with dilation.
Plan 3 task 5 measured exactly that: generalising the dilation gutter changed
every apartment's runtime bake, moving kings-court's spawn-pooled p5 from 55.9
to 54.5. Whatever eventually replaces the one-ring gutter has to be
distance-based rather than texel-count-based and needs its own before/after on
all three apartments — which is a different piece of work than this one.

**On a No-Go the step is reverted in full** — walls return to
`sampled=false` — the winding fix from task 1 is kept, and the null result is
committed with its measurements.

### Task 3 — exposure and bloom re-fit

Mandatory, not conditional, whatever task 2 decides: task 1 alone changes the
render. Standing rules apply without exception:

- Fit toward the photographs' luminance target from `tools/luminance.py`.
  **Never fit toward ΔE**; report ΔE as a consequence. Plan 2 caught this
  substitution once — an exposure chosen as the ΔE minimum and labelled a
  luminance match — and plan 3 task 4 was dispatched with it named as the trap.
- Fit exposure and bloom **together**; they are coupled through the same
  buffer.
- Track the **fraction** of frame over the bloom threshold, never the peak.
- Where the two criteria disagree, take luminance and state what it cost.

Current shipped values being re-fitted: serenity `0.329`, kings-court `0.575`,
horkyone-10 `0.46`; bloom threshold `1.8`, strength `0.1`. horkyone-10 has no
photographs and is fitted on mean-scene-luminance proximity to the other two,
within ±10.

### Task 4 — the gate and new baselines

Measured by plan 3 task 7's method, which is the one that removes method as a
variable: **both trees at once in one session** — HEAD on `:8742` and a
detached base worktree on `:8743`, the same scripts pointed at each.

Under the restated gate:

- record new baselines for serenity and kings-court;
- **attribute** every movement past the noise floor (±0.03 rounded, ±0.039
  full precision) with a same-session paired A/B. An unattributed movement
  past the floor fails;
- check the hard stop: no apartment worse by more than 0.5.

Both halves of the gate are verified present before any measurement —
`?fov=legacy` in `measure.js` and `--all-spots` in `delta_e.py`. Both have
been deleted once and restored; the gate is unenforceable without them, so
this is checked, not assumed. Gate readings are **all-spot**, never the
`poseVerified` subset.

## Failure modes and degradation

No new assets, so there is nothing to fall back from. One failure mode does
carry over and must be handled:

**A silent sampler failure is indistinguishable from success.** If the BVH
sampler fails, `ambientVis` returns 1, the bake completes, and the render is
bit-identical to the unsampled build — a harness would then score the old
build and report it as "after". Plan 3 task 2 hit this and added
`window.__ambSampled`, published and also pushed to `window.__issues` on
failure. This plan extends that mechanism to cover walls; the verification run
asserts on it rather than on the render looking plausible.

`Sampler.selfTest()` must stay 8/8 throughout.

## Risks, stated up front

- **Rooms will read about 28 cm narrower along z once the winding is fixed.**
  This is the truth, not a regression: collision in `controls.js` was always
  against the config's wall segments, and it is the *render* that disagreed
  with them. But it is a visible product change and the owner should see a
  before/after by eye, not only in numbers.
- **Bake time will rise** — more wall vertices, each running 16 ambient rays
  against the BVH. kings-court is already the slow one at ~8.7 s on the
  reference machine. Rule 4a's position stands: no fixed ceiling, and the
  architectural fix (a Worker) is deferred.
- **Plan 3 task 4's exposure fit expires.** Accepted knowingly when the
  winding was deferred; task 3 is the price, not an oversight.
- **This plan may deliver a correctness fix and nothing visible.** If task 2
  returns No-Go, 4a ships an inside-out-walls fix, a re-fit, and a measured
  null result. That is a legitimate outcome and the plan should not be steered
  away from it.

## Out of scope, explicitly

- The wall lightmap **atlas** — the real fix for defect 2. Blocked on needing
  a from-scratch atlas rasteriser; unblocked by this plan's task 1, since an
  atlas baked onto inside-out walls records the wrong side.
- GTAO. Rejected in plan 3 task 3 on two grounds. One of them — black walls
  from reversed normals — **is** cured by task 1 here. The other, a structural
  mobile draw-call breach (kings-court 150→282 against ≤250), survives it, so
  GTAO stays rejected. The unexplored cheap path recorded there — the external
  G-buffer route, held shut by an upstream dereference bug — belongs to a
  later plan, not this one.
- Everything in 4b and 4c.
