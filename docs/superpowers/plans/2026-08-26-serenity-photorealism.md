# Serenity photorealism pass + codebase audit — 2026-08-26

Branch `claude/thailand-apartment-audit-ofiqvc`. Scope agreed with the human
partner up front: **serenity only**; engine changes allowed but **strictly
opt-in** (kings-court and horkyone-10 must render unchanged, proved by
measurement); furniture may be rearranged and walls moved where the
photographs pin them down. The two defects the docs already route to "plan 6"
(kings-court's 11 dynamic PointLights, its five over-size photos) were
explicitly left alone.

## Headline

| | BASE | HEAD |
|---|---|---|
| ΔE2000, all-spot, `?fov=legacy` | **14.34** (repeat 14.33) | **13.14** (repeat 13.13) |
| mean linear luminance vs photographs (0.2924) | 0.2966 | **0.2916** |
| p5 linear luminance vs photographs (0.0379) | 0.0795 | 0.1097 — **worse, see costs** |
| `window.__issues` | `[]` | `[]` |
| draw calls at `APT.start`, post chain live | 80 | **93** (budget ≤400 / ≤250) |
| dynamic PointLights | 3 | 3 (budget ≤8) |
| bake, medians this machine | ~4.4 s | ~4.8 s |

BASE here is the pre-branch `serenity.json` **rendered on this branch's
engine**, so the delta is the config's, not the engine's. Both sides measured
in one session on one machine, which is the only comparison this repository's
own rules accept.

## What the audit found

Read the eleven photographs, then the config, then the render at every
`compare` spot. Findings, worst first:

1. **The living room was mirrored.** Seen from the dining table looking at
   the terrace door (9.webp), the sofa is on the LEFT of the opening; the
   config had it on the right, against the west partition. This is an
   *fov-independent* observation — left/right ordering survives any lens —
   and it was confirmed numerically before anything was moved: scoring the
   original renders against **horizontally flipped** photographs beat the
   unflipped ones on exactly 3.webp, 4.webp and 9.webp (and on the mean,
   14.87 vs 15.29). After the sofa moved east the flip test reverses
   decisively (13.23 normal vs 14.81 mirrored). `mirrortest.py` in this
   plan's harness reproduces both readings.
2. **Walls could not be tiled at all.** `builder.js`'s wall builder assigns
   one material to every wall in every apartment (`const segMat = M.wall`),
   so a bathroom clad floor-to-ceiling in stone — which is what both
   bathroom photographs show — was not expressible. Answered with
   `F.wallTile`, a 2 cm clad panel that merges like any other furniture,
   rather than by opening a second material path through the wall bake.
3. **Missing objects that dominate their frames**: the split air
   conditioner (in 4 of 11 photographs), the nautical triptych over the
   sofa, the sliding wardrobe with its smoked-glass leaf, the fridge, the
   under-counter washing machine, the round black-framed mirror, the
   walnut vanity, the macramé hangings, the full-width window seat, the
   planted island in the pool, the palms, the hanging chair, clouds.
4. **`meta.photoFovLong: 120` does not describe these photographs.** Five
   values swept (60/72/85/100/120) produce a clean U with its minimum at
   **85** (13.21 against 14.37 at 120), and at 85 the framing visibly
   matches — see `sbs/`. Set to 85. **This is an instrument change, not a
   product change:** `photoFovLong` is read only by `measure.js` (non-legacy)
   and by `compare.js`'s divider. The scoring gate runs at a fixed 72 under
   `?fov=legacy`, so every number in the table above is unaffected by it,
   and the shipped `pitch` values — derived under that same 72 — stay valid.
5. **The floor could not be made pale.** `palette.floorWood` is a
   *multiplier* on the plank map, and the photographs' floor is a grey-washed
   oak that needs MORE green and blue than the honey (184,149,95) base has.
   Added `palette.floorWoodBase`, which selects the base itself; absent, the
   texture is byte-identical to before.
6. **Two invented paintings** on the east wall at z 3.35/3.95 where the
   photographs show bare wall. Removed.
7. **The fridge did not fit.** 5.webp shows a full-size fridge against the
   north wall immediately west of the front door; at `at: 3.55` that stretch
   of wall is 0.38 m. The entrance opening moved to `at: 4.05, w: 0.85` —
   the one wall-level change in this pass, and `APT.start` and the Entrance
   spawn moved with it.
8. **A curtain was being drawn across the glass.** The curtain parker clamps
   a parked panel to `L − 0.33` along the wall run; the bedroom window ran to
   2.9 on a 3.1 m wall, so one panel landed *inside* the opening. Worked
   around by moving the window to `at: 1.45, w: 1.20` — **the clamp itself is
   left alone**, because fixing it would move kings-court and horkyone-10,
   which this pass is not allowed to do. Recorded as a real engine bug below.

## What was NOT done, and why

- **The walls were not re-derived from the photographs**, despite that being
  permitted. Three independent landmark measurements inside a single frame
  (4.webp) return three different focal lengths — 61° from a wall corner,
  84° from the entry door in 5.webp, and a sofa-width solve that needs ~120°.
  The photographs show visible barrel distortion (5.webp's ceiling line is
  curved), so no single pinhole camera fits them, and a plan recovered under
  one is a coincidence dressed as a measurement. This repository has already
  caught that error class three times. The developer's brochure plan, measured
  programmatically in `docs/SERENITY.md`, remains the best evidence available
  and was not overturned.
- **A mirrored-bedroom variant was built, measured and rejected.** It scored
  *better* on ΔE (13.13 vs 13.24 at the time) and looked clearly worse — the
  cameras ended up inside the furniture. Renders kept at
  `harnesses/2026-08-26-serenity/` only as the record; the config is not in
  the tree. This is the exact trap the metrics README warns about, met head-on.
- **The camera poses were not re-fitted.** Several no longer frame their
  photograph at 85° (6.webp most obviously: at 1.35 m from the window the
  window seat falls below the frame). Re-deriving them would be fitting the
  instrument to the model. Open item.
- `meta.photoFovLong` for **kings-court** untouched, per scope.

## Costs, recorded rather than hidden

- **p5 luminance moved the wrong way: 0.0795 → 0.1097** against the
  photographs' 0.0379. The paler floor, the light stone cladding and the
  brighter sky lift the darkest pixels, and the exposure re-fit (fitted on
  the *mean*, per the standing rule) then lifts them again. The render's
  shadows were already about twice too light before this pass; they are now
  about three times. The root cause is unchanged and is not this pass's:
  `bakeWalls()` applies **no occlusion of any kind** to walls, so an interior
  corner never darkens on the wall side. Nothing here can fix that; the
  per-texel wall lightmap atlas that plan 4a task 1 unblocked is the path.
- **Eight of eleven spots improved, three regressed.** Per spot, BASE → HEAD:
  1.webp 19.41→16.73, 2.webp 15.72→**16.03**, 3.webp 16.55→14.32,
  4.webp 17.83→13.70, 5.webp 10.58→9.76, 6.webp 9.68→9.23,
  7.webp 13.24→**13.40**, 8.webp 11.05→9.40, 9.webp 18.59→17.29,
  10.webp 12.59→**13.50**, 11.webp 12.41→11.18. Run-to-run spread on this
  machine is about ±0.1, so 7.webp's +0.16 is barely outside it and
  2.webp's +0.31 and 10.webp's +0.91 are real. 10.webp is the largest
  single regression and it is the pool: the basin is now surrounded by
  palms, a planted island and a cloudy sky where BASE had a flat green wall
  that happened to sit closer to the photograph's average colour. That frame
  reads better and scores worse; both statements belong in the record.
- Draw calls 80 → 93 on this machine. Inside both budgets, but it is +13.

## Engine defects found and deliberately left alone

Each of these would move an apartment this pass is not allowed to move.

1. **Curtain panels can be parked inside their own opening.** The clamp to
   `[0.33, L − 0.33]` in `builder.js`'s window branch is applied without
   reference to `p.from`/`p.to`, so an opening close to a wall end gets a
   drape drawn across the glass. Correct fix: after clamping, push the panel
   outside `[p.from, p.to]`, and skip it when there is no room.
2. **`F.vanity` hard-codes a backlit rectangular mirror.** Five callers
   depend on it, which is why this pass added `mirror: 'none'` plus a
   separate `F.mirrorRound` rather than changing it.
3. **`OCC_H` is a name→height map with a silent 0.8 default**, so a new
   constructor gets a plausible-looking occluder height it never declared.
4. **`buildFurniture` skips unknown types silently** (`if (!fn) continue`).
   A typo in a config produces a missing object and no diagnostic. A single
   `console.warn` would have saved the hour that CLAUDE.md's cache note
   records losing to exactly this.

## Verification run

- `window.__issues` empty; `?check=1` badge clean.
- Seven walk simulations (hard rule 2a), all reaching their target: entrance
  → terrace deck edge through hall, living room and the terrace door; hall →
  bedroom; hall → bathroom; bedroom → bathroom; bedroom → window.
- Top-down cutaway (hard rule 2b) inspected: no floating objects, no blocked
  passages, no furniture rotated across a room.
- **Invariance gate for the other two apartments**, which is what makes the
  "strictly opt-in" claim a measurement rather than a promise. BASE served
  from a `git archive` of the pre-branch tree on port 8743 and HEAD on 8742,
  rendered alternately in one browser session:
  - scene **topology identical** — the multiset of per-mesh
    (type, material type, vertex count, index count) matches exactly for both
    apartments (`geomcmp.mjs`). horkyone-10's full geometry hash, which
    includes every world matrix and bounding box, is identical too.
  - draw calls identical (kings-court 165, horkyone-10 83), PointLights
    identical (11, 3), `__issues` empty on both sides.
  - pixels: procedural textures in this project draw with `Math.random()`, so
    two loads of the *same* tree never repeat. Three BASE and three HEAD
    renders of kings-court give within-tree mean abs differences of
    1.261–1.679 and cross-tree 1.259–1.654 — the cross-pair range sits inside
    the same-tree range, i.e. no measurable change.
  - Getting there caught **three real regressions in shared code**, all now
    fixed and all invisible to the eye: `F.bed`'s throw had moved 8 cm,
    `F.cushions` had shifted 2 mm, and `F.shower`'s head had gained 24
    vertices per shower (kings-court builds five). Topology comparison found
    the third; a pixel diff never would have.

## Open items

- Re-derive the camera poses for 1, 2, 6, 7 against the 85° lens, by matching
  named landmarks in crops, never by ΔE.
- `meta.photoFovLong` for kings-court still says 120 against two earlier
  measurements near 57–58°.
- Wall occlusion in the bake (the p5 gap above).
- The four engine defects listed above.
