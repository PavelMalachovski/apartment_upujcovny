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
