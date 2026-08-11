# Horky One — Apartment 10 (2kk, 51.4 m²): tour design

Second property on the platform. Source material: `horkyone-10/1.pdf`
(floor-plan card), `standardy-bytu.pdf` (finish standards), two
marketing renders (`2.jpg` attic living room, `3.jpg` kitchen with
terrace door). Single level, 6. NP attic floor, no staircase.

## Plan measurement (done, programmatic)

- The card's scale bar is wrong for the drawing (bar says 279.4 px/m,
  rooms agree on **145 px/m** — living room rectangle hits 19.9 m²
  exactly). Calibrated per PROMPT.md §2 against the room-area legend.
- The whole flat is **one rectilinear grid rotated −7.85°** on the
  card; measurements were taken on the de-rotated raster. One truly
  diagonal element: the SE corner of the building (neighbour firewall)
  at ≈ −29° in flat coordinates, touching only the terrace and the
  entrance nook.
- Model frame: origin = NW interior corner of the bedroom, x → east,
  z → south (north = −z as the engine expects).

Interior faces (m): bedroom x 0–4.46, z 0–3.14 · living x 4.92–9.74,
z 0–4.11 · bathroom x 5.08–7.06, z 4.23–6.34 · hall x 7.21–8.26,
z 4.23–6.34 + entrance nook x 8.26–9.01, z 5.47–6.34 · terrace east of
x 9.88, cut by the diagonal.

Openings (measured as gaps in the wall bands):

| Opening | Wall | Span |
|---|---|---|
| Bedroom door | partition x=4.86 | z 1.86–2.60 |
| Hall door (from living) | z=4.18 | x 7.40–8.14 |
| Bathroom door | x=7.14 | z 5.58–6.27 |
| Entrance door | z=6.41 (hall) | x 7.35–8.18 |
| Terrace door | E facade x=9.81 | z 0.50–1.47 |
| Fixed glazing ×2 | E facade | z 1.47–2.47, z 3.00–4.02 |
| Bedroom window (bay) | W wall x=−0.07 | z 0.86–2.24 |

North wall is windowless (verified: no gaps in the band). Daylight:
E glazed facade to the terrace, W bay window, 2 skylights.

## Decisions (user-approved 2026-08-11)

1. **Ceiling**: refined against the facades — the courtyard view shows
   the skylights in the north-facing slope, so the ceiling *rises*
   southward: vertical N wall 2.62 m, ridge ≈3.7 m over the pod north
   wall line (z≈4.15), then down to ≈2.4 m at the south wall.
   Bathroom/hall sit under the descending back slope (2.4–3.2 m).
2. **Skylights**: supported in the engine (small builder+bake
   extension), two in the north slope over the living room.
3. **Bathroom**: grey concrete-look Macroni Factor 600×600 tiles,
   white fixtures, walk-in shower (per standards).
4. **Terrace**: ceramic terracotta tiles (standards say "červená
   pálená/cihlová", not wood), metal railing; the diagonal edge is
   approximated with 4 stepped floor plates + stepped rails.
5. Furnished per the plan, styled per the renders: white kitchen
   lowers + anthracite uppers + wood counter, cream sofa, light oak
   DUB TIMOR floor everywhere except tiled bathroom.
6. Photo spots use the two marketing renders, captioned
   "visualization" (not "real photo").
7. Simplifications (recorded for the README): the bedroom W window
   bay (X-marked low-headroom alcove) is flattened to a window in the
   wall; the hall SE diagonal is a straight wall + nook.

## Engine changes (all backward-compatible, kings-court must not move)

- `builder.js`: optional `stairs`/`terraceSteps`; `attic` gains
  `lvl` ('main'|'upper', default 'upper'), `x1`,`x2` extents and
  `skylights:[{x,w,zA,zB}]`; slope meshes tagged `dollRoof`; floors
  gain `terracotta` and `tileGray` materials; lights respect the slope
  and accept `lvl:'terrace'`; terrace colliders map to 'main' when
  `terraceY < 1.5`; generic `rails` (metal) and `surroundings`
  (neighbour masses) config blocks; `F.kitchenRun` colour/sink/hob
  params, `F.diningTable` small-table mode, `F.wallPanel` tile
  option, white entrance-leaf option.
- `bake.js`: window sources accept a `ny` normal component
  (skylights shine downward).
- `controls.js`: attic camera clamp driven by `attic.lvl`/extents
  instead of hard-coded kings-court numbers.
- `app.js`: minimap bounds computed from floor plates; stairs guard;
  terrace plates drawn on the main-level minimap when low; overlay
  text from `meta`; photo caption honours a `vis` flag; rooms menu
  skips level headers for single-level flats.
- `doll.js`: orbit target/distance from the scene bbox; level cutaway
  buttons hidden when there is no upper floor; `dollRoof` handling.

## Verification (PROMPT.md §9 + CLAUDE.md rules)

validate.js must end empty; walk simulations entrance→living→bedroom,
living→terrace, living→bathroom; top-down cutaway screenshot after
furniture placement; sky-leak raycasts from living and bathroom;
draw calls ≤150 at the entrance, living centre, terrace; headboard
raycast (rule 2h) for the bed, sofa, kitchen run; screenshots vs the
two renders; `?v=` bump on all script tags after the last edit;
catalog card; Prompt B audit re-measuring the plan.
