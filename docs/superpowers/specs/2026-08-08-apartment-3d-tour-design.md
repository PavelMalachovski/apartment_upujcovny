# Apartment 3D tour (AirBNB) — design

Date: 2026-08-08. Status: approved by the user ("let's go").
(Historical record; some decisions were later superseded — e.g. pointer
lock was replaced by drag-look, and small decor was added after all.)

## Goal
An interactive first-person browser "walk" through a two-level apartment,
reconstructed from 20 photographs (photo `1.jpeg` is the floor plan of
both levels). The feel: touring the apartment with a realtor, but with
fully free movement.

## Decisions (locked with the user)
- **Format:** interactive 3D tour in the browser (Three.js), not video.
- **Mode:** free walking only (WASD + mouse). No auto-tour.
- **Detail:** "medium+" — all large furniture and built-ins in place,
  real colours/materials (oak, whitewashed ash, black/white marble,
  quilted headboards), no small decor (vases, books, dishes).
- **Scale:** the plan has no dimension lines; calibration against
  standard furniture (180 cm bed, 60 cm kitchen counter depth, ~28 cm
  stair tread). Expected error ±5–10%.

## Architecture
- `tour/` folder: `index.html` + `three.min.js` (local copy, UMD build,
  no bundlers or CDNs).
- Apartment data is a declarative config: walls as segments with
  heights, openings (doors/windows), rooms/floors, stairs, furniture as
  parametric primitives with materials. A "builder" (`builder.js`)
  turns the data into a Three.js scene.
- First-person controls — a small custom module, no examples
  dependencies.

## Scene
- Level 1: entry, kitchen with island, dining for 8, living room,
  bedrooms, bathrooms, laundry, hallway, stairs.
- Level 2 (attic): living room with a TV partition + bedroom, bathroom,
  sloped ceilings, terrace access.
- Terrace: decking, slatted fence, wicker furniture.
- Lighting: hemisphere + ambient + point lights per room; no expensive
  shadows (performance first).

## Controls and physics
- WASD/arrows + mouse, camera height 1.6 m.
- Wall collisions (2D segment tests).
- Stairs — smooth climb (floor-height clamp by position), exit to the
  upper floor and the terrace.
- Start overlay with control hints.

## Accuracy check
- A canvas minimap in the corner with the floor plan and player dot —
  for visual comparison against the original plan.

## Out of scope
- Photogrammetry/photorealism, auto-tour, .glb export.
