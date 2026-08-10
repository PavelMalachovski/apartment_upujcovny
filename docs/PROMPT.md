# Prompt: an apartment 3D tour from photographs in one pass

Copy the text below into Claude Code together with a folder of
apartment photos (including the floor plan if there is one).

---

This folder contains photographs of an apartment (one of them may be a
floor plan). Build an interactive browser 3D tour that feels like
"walking with a realtor" and polish it to sales quality. Work
autonomously; ask only about critical forks.

**Stack and architecture (important, do not deviate):**
- Pure Three.js (local UMD copy), no bundlers or CDNs
- All apartment data in a JSON config `apartments/<id>.json`: walls with
  openings (doors/windows/passages), floors per level, attic slopes,
  stairs, furniture, lights, ground zones for physics, teleport points,
  room areas. Angles in degrees. One code base for all properties, a
  loader keyed by `?apt=<id>`
- Take the geometry off the floor plan; calibrate the scale against
  standard furniture (180 cm bed, 60 cm counter depth, ~20 cm riser)

**Functionality:**
1. First-person walk: WASD, drag-look with the mouse (NEVER use pointer
   lock: the cursor must stay visible and buttons clickable). On touch:
   an always-visible joystick on the left + swipe-look on the right,
   multitouch. Collisions (wall segments + furniture AABBs), stairs as
   a smooth height clamp, camera pressed under low attic slopes
2. A "☰ Rooms" menu — teleport to every room (works on phones too)
3. A dollhouse mode "⌂" (M key): orbit camera, roof hidden, a "ground
   floor / whole home" switch (bake walls into two meshes by level),
   "room + m²" labels, a measuring tape (two clicks — distance),
   click-the-floor teleport back into the walk
4. Photo spots: real photographs (webp ≤1200px, committed), marker
   icons at the shooting points; walking close shows a button / F key
   opens the photo over the 3D — the main trust generator
5. A minimap with the floor plan and position, a current-room caption,
   a start overlay explaining ALL the buttons

**Light and performance (this is what "expensive" looks like):**
- Write a CPU lightmapper: visibility tracing against AABB occluders
  (walls, slabs, furniture with heights). Lamps with soft shadows
  (jitter), windows as cool-light area sources, sun with building
  shadows on the terrace. Floors/ceilings/slopes get lightmaps
  (CanvasTexture, uv2, MeshBasic); walls get merged geometry with
  per-vertex light. Baking on load ≤2 s with progress
- Merge all static furniture/frames/curtains by (material, level) —
  budget ≤150 draw calls. Dynamic PointLights ≤8. On touch,
  pixelRatio ≤1.6
- Tone: ACESFilmic; materials are procedural canvas textures (parquet
  with per-board tone, marble with soft veins, quilted headboards,
  curtains as wavy planes)

**Measure the plan programmatically first, not by eye.** Find the wall
lines by dark pixels (PIL/numpy), calibrate the scale against furniture
of known size (dining table ~2.3 m, kitchen island ~2.4 m) and only
then assign coordinates. Recount the number of rooms and the overall
apartment extents from the plan — eyeballing is off by whole rooms: the
first project lost an entire west wing with a fourth bedroom this way,
and the apartment came out a third too short. Find the staircase on the
plan separately (tread hatching with a climb arrow) and check which
space it adjoins: the photos show which room the flight is visible
from.

**Topology comes from the plan, not from convenience.** The hallway
next to the stairs is the hub of the bedroom wing: bedrooms open off
the hallway, not off the dining room. If the plan draws an en-suite
bathroom strip (vanity → WC → tub against the far wall, door at the
end), model it as a room with its own door, and put the bed's headboard
against it. Don't invent extra connecting corridors the plan doesn't
have.

**Process (mandatory — this is what produces the quality):**
- After every geometry block, look at the result in a SCREENSHOT
  (headless browser) and compare with the photos room by room; fix
  discrepancies immediately. Render a top view without ceilings — it
  catches layout errors
- **Write a layout auto-check and run it on every build.** The builder
  collects the list of door openings; the check reports on load:
  (1) openings blocked by furniture; (2) openings with no floor behind
  them; (3) rooms unreachable on foot from the start — a ~0.25 m grid
  walk with the same collisions as the player; (4) photo spots and
  teleport points that sit inside a solid. The cell key must include
  the floor level, or the two floors merge. Compute the "blocked"
  threshold with the player radius in mind: a 0.85 m clear door at
  radius 0.24 is fine, not a defect. For markers use strict
  containment instead — standing 20 cm from a counter is normal, being
  inside the bathtub is not. The list must be empty before commit
- Check a specific route's walkability by simulating the walk (hold W
  programmatically, run update, verify the end point). Remember: one
  run checks one line — a passage may exist yet be unreachable from the
  side. Furniture no closer than 0.5 m to doorways
- Export a debug API (window.__app) to teleport the camera in tests
- On every JS change bump `?v=N` on all scripts AND version the JSON
  config URL with the same value — otherwise the browser serves stale
  geometry from cache and fixes "don't work". Bump the version AFTER
  the last code edit
- Moving a wall: re-check everything attached to it (paintings, panels)
  and re-list the floor slabs — a forgotten slab becomes a ceiling over
  the stairs, and a painting stays floating mid-air. Also check what
  the wall's collider guarded on the other level: an opened ground
  wall can expose an upper-floor drop that needs a rail
- Rearranged fixtures: move their dependents — photo spots, spawn
  points and area labels are absolute coordinates too (a photo spot
  once ended up inside the bathtub)
- Placing anything against a wall, measure the wall FACE with a
  raycast; wall coordinates are centrelines and the slab has
  thickness. Arithmetic alone buried both bedroom headboards inside
  the wall, and no automated check complained because a hidden object
  is still perfectly walkable — only a screenshot showed it
- Work through branches and PRs with meaningful descriptions; verify
  prod after merge

**Result:** a property catalog page + the tour, deployed to Vercel
(vercel.json, static, no build), a README (how to add an apartment in 4
steps) and a CLAUDE.md with the architecture, perf budget and check
checklist. Everything — UI, data, docs, comments — in English.

---

## Why these points are in the prompt (lessons from past projects)

- **Drag-look instead of pointer lock** — with mouse capture users
  couldn't click a single button and didn't understand why
- **Walk simulation** — three doorways turned out blocked by furniture
  while "success tests" lied until the end point was checked
- **Screenshot comparison with photos** — the attic layout diverged
  from reality (a closed room instead of a studio with a low TV
  partition)
- **Baked light exposed geometry** — the terrace hung below the
  ground-floor ceiling, roof slopes were inverted
- **Script versions** — phones kept stale JS for hours and "fixed" bugs
  looked alive
- **Catalog + JSON pipeline** — turns a one-off into a product: the
  next apartment needs no programmer
- **Programmatic plan measurement** — eyeballing undershot the length
  by a third and "lost" the fourth bedroom; the staircase had to be
  moved twice
- **Versioning the JSON config** — without it the browser served stale
  geometry for hours and already-fixed bugs looked alive
- **The openings & reachability auto-check** — written last, should
  have been first: furniture blocked doors five times per project and
  the user found it every time, not the tests. Once enabled, it
  immediately surfaced two more hidden blockages (the dining table at
  the bedroom-hallway entrance and an armchair cutting off half a
  bedroom)
- **Plan topology over invented corridors** — the tour once had a
  narrow pass from the dining room into the bedroom wing that the plan
  never drew; the audit replaced it with the hallway-as-hub layout the
  plan actually shows (en-suite strip, passage at the bedroom's corner,
  wall beside the stair bottom removed)
