# Serenity Pool Access — design spec

Source material: `thai/plan.jpg` (photo of the developer brochure, "TYPE
1B LA · 1 BEDROOM L · POOL ACCESS", Serenity) plus 11 interior photos.
Total area per the listing: 45 m² (interior ≈ 35 m² + pool terrace).

## Plan measurement (Prompt A §2, done programmatically)

The plan was extracted from the brochure photo (rotated 90°, dark-pixel
wall mask, row/column run profiles). Scale calibrated at ≈ 42 px/m
against the 1.6 × 2.05 bed, the 0.6 m kitchen counter depth, the 0.9 m
front door, and the listed 45 m² total.

- Rooms: 4 + terrace — living room with kitchenette and entry hall,
  bedroom, bathroom, covered pool-access terrace. Single storey.
- Main envelope ≈ 5.75 × 6.65 m by wall centrelines; terrace
  ≈ 2.65 × 2.4 m attached to the living-room end.
- The model is built rotated 180° from the brochure sheet so the pool
  side faces +z (south), matching the baked sun direction. In model
  coordinates: entrance in the north wall, kitchen along the east wall
  of the hall, bathroom in the north-west corner, bedroom the west
  half, living room south-east, terrace due south of the living room.
- Openings measured off the plan: front door 0.9 m; sliding terrace
  door ≈ 1.4 m; bedroom pass with a parked wooden slider ≈ 1.05 m;
  bench window ≈ 1.4 m in the bedroom south wall; the bathroom has TWO
  doors — from the hall (drawn gap in the west-wall run) and from the
  bedroom (door swing drawn on the plan, hinge east) — both confirmed
  by photos 1, 5 and 8.

## Decisions that are not on the plan

- 45 m² is read as the marketed total (interior + terrace), consistent
  with the "1 Bedroom L" type; per-room m² badges show net areas.
- The terrace is modelled covered (soffit at ceiling height) with open
  south edge; the pool, coping, hedges and neighbour unit masses are
  `surroundings` boxes. The walkable zone ends at the deck edge.
- Interior door leaves are not rendered (platform rule); the entrance
  keeps its closed leaf.
- The washer under the kitchen counter (photo 5) is not modelled —
  the platform's `washerDryer` is a double 1.35 m unit that does not
  fit the 0.6 m slot.
- Builder extensions added for this flat, both config-driven:
  `daylight: true` on a door opening registers it as a baked area
  daylight source (the glazed terrace slider is the living room's only
  window), and `water` / `stone` / `hedge` materials in
  `surroundings` for the pool environment. Curtain rods and parked
  curtain panels are now clamped to their wall run — the bedroom
  window's rod used to poke through the terrace wing wall.

## Photo → spot mapping

1 bathroom, 2 terrace, 3/4/9 living room, 5 kitchen & hall looking at
the front door, 6/7/8/11 bedroom, 10 pool from the terrace edge.

## Photorealism pass, 2026-08-26

Full record and measurements:
`docs/superpowers/plans/2026-08-26-serenity-photorealism.md`. Summary of what
changed in this file's terms:

- **The living room was arranged mirror-image to the photographs** and is
  fixed. The sofa's back is now against the east wall with the nautical
  triptych over it; the dining table sits north of it against the same wall,
  beside the kitchen. Seen from the dining table looking out (9.webp) the sofa
  is on the LEFT of the terrace opening, which is what the photograph shows
  and the opposite of what this model used to build.
- **The bathroom is clad in stone**, floor to ceiling, on all four walls.
  Until this pass the platform gave every wall in every apartment one flat
  material, so it could not be. The vanity is now a wall-hung walnut unit with
  an open shelf and a round black-framed mirror above; the shower gained a
  rain head, a recessed niche and a full-height glass divider.
- **The kitchenette is complete**: fridge west of the front door, mosaic
  splashback, a microwave in the wall units, and the under-counter washing
  machine. The washer was recorded above as "not modelled — the platform's
  `washerDryer` is a double 1.35 m unit that does not fit the 0.6 m slot";
  `F.washer` is that missing single unit and **that note is now closed**.
- **The entrance door moved 0.5 m east and narrowed to 0.85 m.** 5.webp shows
  a full-size fridge standing against the north wall immediately west of it,
  and at the measured position that stretch of wall was 0.38 m. This is the
  only wall-level change; `start` and the Entrance spawn moved with it.
- **The bedroom window moved to `at: 1.45, w: 1.20`** so its parked curtain
  panels stop landing inside the glass (the parker clamps to `L − 0.33` along
  the wall run, which for the old opening was inside it). The window seat now
  runs the full width of the window with a bolster, the wardrobe is a
  floor-to-ceiling slider with one smoked-glass leaf, and the bed carries a
  plain grey upholstered headboard, a petrol throw and striped scatter
  cushions instead of a quilted panel and a patterned blanket.
- **The pool environment** gained the planted island standing in the water,
  six-plus palms, the hanging macramé chair on its shepherd's crook, a
  submerged entry step and a cloudy sky. The basin stayed where it was: pulling
  it 0.5 m closer was tried, measured and reverted — 2.webp shows about 1.5 m
  of granite between the terrace step and the water.
- **`meta.photoFovLong` 120 → 85.** An instrument change only; see the plan
  document for the three lines of evidence and for why it is a best-fit
  pinhole equivalent rather than a measured lens.
- **`exposure` 0.31 → 0.327**, re-fitted on mean linear luminance after the
  albedo changes, per the standing rule.

Still absent and deliberately not blocking anything: the foreground table of
fruit and the two glasses in 2.webp/10.webp, the table setting in 9.webp, and
the pool fountain.
