# Prompt: build an apartment 3D tour platform from photographs

A reusable, project-independent specification. Point it at any folder of
apartment photos — a studio, a townhouse, a two-level penthouse — and it
produces a working browser tour plus the pipeline to add the next
property without a programmer.

Use it in two passes. **Prompt A** builds the product; **Prompt B**
audits the result against the floor plan. Paste A into Claude Code with
the photo folder attached, then B once it reports done.

Everything between the two horizontal rules is prompt text meant for the
model. The sections after them are notes for you; pasting them along
costs little and helps.

Numbers in the schema example are *illustrative defaults*, not this or
any other flat's measurements — the model derives real coordinates from
the plan.

---

# PROMPT A — build the tour

This folder holds photographs of an apartment; one of them is probably a
floor plan. Build an interactive browser 3D tour that feels like walking
the flat with a realtor, and take it to sales quality. Work autonomously
and stop only for genuinely ambiguous forks.

Everything you produce — UI strings, JSON data, README, code comments —
is in English.

## 1. Stack (do not deviate)

- Plain Three.js, **local UMD copy**, no bundler, no CDN, no npm build
  step. The site is static files that a plain HTTP server can serve.
- **All apartment data lives in `apartments/<id>.json`.** No coordinates
  in code, ever. One code base serves every property; a loader picks one
  via `?apt=<id>`. This is what turns a one-off into a product — the
  second apartment must not require a programmer.
- Angles in the config are **degrees**; the loader converts to radians.
  Distances are metres.
- Suggested layout: `index.html`, `catalog.html`, `main.js` (loader),
  `builder.js` (config → scene), `bake.js` (lightmapper), `controls.js`
  (walking), `doll.js` (dollhouse), `app.js` (init/loop/HUD),
  `validate.js` (layout self-check), `three.min.js`.

## 2. Measure the plan programmatically before writing any coordinate

Do not eyeball the plan. Load it with PIL/numpy, find wall lines by dark
pixels, and calibrate the scale against furniture of known size (double
bed 1.8 m wide, kitchen counter 0.6 m deep, dining table ~2.3 m, island
~2.4 m, stair riser ~0.2 m). Then, **in writing, before modelling**:

- Count the rooms and record the flat's overall extents. Eyeballing has
  lost an entire wing containing a whole bedroom and shortened a flat by
  a third.
- Locate the staircase, if any (tread hatching with a climb arrow), and
  determine which room it adjoins. The photos show which room the flight
  is visible from — cross-check.
- Detect façade window openings as gaps in the dark wall band and place
  windows at those measured centres, never at guessed intervals.
- Note how many levels exist. A single-storey flat simply omits the
  upper level, attic and terrace blocks of the schema.

If there is no floor plan among the photos, reconstruct the layout from
the photographs, state your assumptions explicitly in the README, and
expect the audit pass to correct you.

**Topology comes from the plan, not from convenience.** If the plan
shows bedrooms opening off a hallway, they open off the hallway — do not
invent a shortcut through the dining room because it is easier to model.
If the plan draws an en-suite strip (vanity → WC → tub along the far
wall, door at one end), model it as a room with its own door and put the
bed's headboard against it.

## 3. The JSON schema

Produce this shape. Blocks marked *optional* are omitted for flats that
lack the feature.

```jsonc
{
  "mainFloorY": 0,          // ground floor level
  "mainCeilH": 2.8,         // ground floor ceiling height
  "upperFloorY": 3.1,       // optional: upper floor slab top
  "terraceY": 2.98,         // optional: terrace deck — MUST clear mainCeilH + slab

  "attic": {                // optional: sloped roof over the upper floor
    "ridgeZ": 0.8, "ridgeH": 3,     // ridge line position and height
    "northZ": -2.6, "northH": 1.8,  // one eave
    "southZ": 6.6, "southH": 1.4    // the other eave (knee wall, below head height)
  },

  "walls": [{
    "lvl": "main" | "upper",
    "x1": 0, "z1": 0, "x2": 0, "z2": 0,  // CENTRELINE, axis-aligned
    "h": 2.8,
    "ext": true,            // optional: exterior wall, gets outside cladding
    "gable": "w" | "e",     // optional: gable end, follows the roof slope
    "tv": true,             // optional: wall carries a TV panel treatment
    "rail": true,           // optional: railing, not a solid wall
    "openings": [{
      "at": 1.2,            // distance from (x1,z1) along the wall to the opening START
      "w": 0.9,             // opening width
      "type": "door" | "win" | "pass",
      "entrance": true,     // optional: the front door — the minimap marks it
      "terrace": true,      // optional: leads outdoors
      "slider": true        // optional: sliding panel parked beside the opening
    }]
  }],

  "floors": {               // floor plates per level, as rectangles
    "main":    [{ "x1": 0, "z1": 0, "x2": 0, "z2": 0, "mat": "wood" | "marbleW" }],
    "upper":   [{ "...": "...", "over": true }],   // over: nudge up ~12 mm where plates overlap (z-fighting)
    "terrace": [{ "...": "...", "mat": "deck" }]
  },
  "mainCeil": [{ "x1": 0, "z1": 0, "x2": 0, "z2": 0 }],  // ground floor ceiling rectangles

  "stairs": {               // optional
    "x1": 7.5, "x2": 11.3, "z1": -2.5, "z2": -1.3,
    "rise": 3.1,
    "lowX": 11.3, "highX": 7.5      // climb direction: bottom -> top
  },
  "terraceSteps": { "doorX": 4.2, "z1": 2.8, "z2": 3.8 },   // optional

  "furniture": [{
    "type": "bed",          // one of your F.* constructors
    "x": 0, "z": 0,
    "lvl": "main" | "upper" | "terrace",
    "rot": 0,               // optional, DEGREES
    "w": 1.8, "d": 0.6, "h": 0.9, "len": 2.05,   // per-type, optional
    "...": "type-specific fields: colours, patterns, counts, facing"
  }],

  // Lamp height is derived from lvl: ground lamps hang just under the
  // ceiling, upper ones under the roof slope, stairwell ones over the void.
  "lights": [{ "x": 0, "z": 0, "lvl": "main" | "upper" | "stair",
               "dyn": true }],      // dyn: also a real PointLight, MAX 8

  "groundZones": [{         // walkable floor heights — the physics floor
    "x1": 0, "z1": 0, "x2": 0, "z2": 0,
    "y": 0,                 // flat zone
    "ramp": { "axis": "x", "from": 11.3, "to": 7.5, "y0": 0, "y1": 3.1 }  // or a ramp (stairs)
  }],

  "roomLabels": [{ "x1": 0, "z1": 0, "x2": 0, "z2": 0,
                   "y": 0,          // level height, or -1 for "any level" (stairs)
                   "name": "Bedroom 1" }],
  "areas":  [{ "name": "Bedroom 1", "m2": 26, "x": 0, "z": 0, "g": 0 }],
  "spawns": [{ "name": "Bedroom 1", "x": 0, "z": 0, "yaw": 135, "g": 0 }],
  "photoSpots": [{ "file": "8.webp", "name": "Bedroom 1",
                   "x": 0, "z": 0, "g": 0, "yaw": -5.7 }],
  "start": { "x": 0, "z": 0, "yaw": 90 },

  "meta": { "id": "<slug>", "title": "<Property name>",
            "description": "<one line>", "photoBase": "photos/<slug>/" }
}
```

Conventions that bite if you get them wrong:

- **Wall coordinates are centrelines** and the slab has thickness
  (0.14 is a good default). Anything placed against a wall must clear
  the *face*, at centreline ± half-thickness. See §9.
- `groundZones` are what the player actually walks on, independent of
  the visible floor plates. Every plate needs a matching zone, and each
  end of a staircase needs a `ramp` zone. A missing zone is an invisible
  wall; an overlapping zone at the wrong height drops the player through
  the floor.
- `roomLabels`, `areas` and `spawns` are three separate lists driving
  the room caption, the dollhouse m² badges and the teleport menu. All
  hold absolute coordinates and all must be updated together.
- Yaw convention: forward is `(-sin(yaw), -cos(yaw))`, so **yaw 0 looks
  along −z**, 90 along −x, 180 along +z, 270 along +x. Pick −z as north
  and keep it consistent everywhere, including the minimap arrow.

## 4. Geometry rules

- Sensible fixed heights: door 2.05, walk-through passage 2.2, window
  sill 0.85, window head 2.45.
- **Never render interior door leaves** — an open reveal reads as a
  passage, a closed slab reads as a wall and users stop walking. The
  front door is the one exception.
- Walls spanning two levels (roughly `h > 4`) must collide on **both**
  levels, or the upper floor walks through a double-height void wall.
- An outdoor deck must sit **above** the ceiling of the room below, or
  it pokes through it.
- Under a roof slope the ceiling drops below head height; clamp the
  camera to the slope minus ~0.12 so it never pokes through the roof.
- **Re-list floor plates, never patch one.** A forgotten stale plate
  becomes a ceiling over the staircase.

## 5. Lighting: write a CPU lightmapper

This is what makes the result look expensive rather than like a game
prototype. At load time, for every floor, ceiling and roof slope,
compute per-texel irradiance and store it in a `CanvasTexture` used as
`lightMap` (uv2) on a `MeshBasicMaterial`. Walls instead get merged
geometry with **per-vertex** baked light, segmented at ~0.45 m. Baked
surfaces then cost the GPU nothing at runtime.

Visibility is a slab test against AABB occluders (walls, slabs,
furniture with heights). Use ~3 jittered samples per source for soft
shadow edges. These constants are tuned and are a good starting point:

| Term | Value |
|---|---|
| Indoor ambient base (r,g,b) | 0.40, 0.385, 0.36 |
| Outdoor ambient base | 0.66, 0.70, 0.78 |
| Lamp | `intensity * 2.1 / (1 + d² * 0.55) * cos * vis`, cutoff d² > 70 |
| Window | `area * 0.26 / (1 + d² * 0.56) * cos * vis`, cutoff d² > 55, cool tint (0.80, 0.89, 1.00) |
| Sun (outdoor only) | `0.62, 0.59, 0.52 × cos` from a fixed direction |
| HDR headroom | 1.7, matched by `lightMapIntensity` |

The window term is deliberately strong and steep. A flat one makes every
room read identically — that is the single most common reason these
tours look cheap. Verify the peak still fits under the HDR headroom
where several windows overlap: a long façade can put four within reach
of one point. Windows are area sources whose normal points into the
room; skip any sample point behind that plane.

Tone mapping ACESFilmic, exposure ~1.05. Build all materials as
procedural canvas textures — parquet with per-board tone variation and
grain, marble with soft veins plus thin sharp veinlets, quilted
headboards, curtains as wavy planes. Procedural textures keep the repo
small and let you re-tint a whole palette in one place.

## 6. Performance budget

- **≤150 draw calls anywhere.** Measure with
  `renderer.info.render.calls`, never by feel.
- Merge every static mesh by **(material, level)** into a handful of big
  meshes. Skip only meshes carrying their own lightmap and the merged
  walls — the dollhouse cutaway needs those separable per level.
- **Sprites do not batch.** Map markers must be one `THREE.Points` per
  level, not one sprite each; a dozen photo spots otherwise cost a dozen
  draw calls on their own.
- Think twice before splitting merged meshes into spatial zones for
  frustum culling. In a long, narrow flat it *increases* draw calls at
  the entrance, because the whole sightline stays inside the frustum.
  Measure before and after; only keep it if the numbers improve.
- Dynamic `PointLight` count ≤ 8; everything else lives in the bake.
- `pixelRatio` ≤ 1.6 on touch, ≤ 2 on desktop.
- Baking must finish in ~2 s with a progress readout on the start
  overlay.

## 7. Controls and UI

**Walking.** WASD/arrows, Shift to hurry (~1.9 → 3.4 m/s), eye height
1.6, collision radius ~0.24 against wall segments and furniture AABBs.
Floor height comes from `groundZones`; lerp between them so stairs feel
like a ramp, and refuse any step whose target has no floor.

**Never use pointer lock.** Look is drag: hold the left button and move.
With mouse capture, users cannot click a single button and do not
understand why.

**Touch:** a joystick that docks in the lower-left corner and jumps to
wherever the finger lands on the left half of the screen, swipe-look on
the right half, both working simultaneously.

**HUD.**
- `☰ Rooms` — teleport menu built from `spawns`, grouped by level.
- `⌂ Dollhouse` (key **M**) — orbit camera, roof hidden, a cutaway
  switch with one entry per level plus "whole home", m² badges,
  📏 measure (two floor clicks → distance), and click-the-floor to walk
  there. Esc or ✕ returns to walking.
- `📷` markers at photo spots. Walking close reveals a button (key
  **F**) that opens the real photograph over the 3D view. From there it
  is a **gallery of every spot**: ‹ › buttons, ← → keys, touch swipe, an
  "n / total" counter, and neighbour preloading. **Freeze walking while
  it is open**, or the arrow keys strafe and browse at the same time.
- Minimap: current floor plan, camera position and heading, a north
  arrow, and the front door taken from the opening flagged `entrance`.
- Current room caption, bottom left.
- Start overlay explaining **every** control, doubling as the bake
  progress indicator.
- First visit only: pulse the main HUD buttons a few times, then stop;
  remember it in `localStorage`.

Real photographs at their shooting positions are the single biggest
trust generator in the whole product. Budget time for them: convert to
webp ≤1200 px, commit them, and place each spot where the camera
actually stood.

## 8. Write the layout self-check first, not last

A `validate.js` that runs on every load, prints to the console, exposes
its findings on `window`, and shows a badge under `?check=1`. It
reports:

1. **Openings blocked by furniture.** Sample across the opening width;
   the clear span must exceed the player radius. Compute the threshold
   *with* the radius in mind — a 0.85 m door at radius 0.24 is fine, not
   a defect.
2. **Openings into the void** — no floor on one side.
3. **Rooms unreachable on foot.** Flood-fill a ~0.25 m grid from the
   start position using the player's own collision and floor logic, max
   step ~0.35. **The cell key must include the level**, or two floors
   merge into one and everything looks reachable.
4. **Markers inside solids** — no `spawn` or `photoSpot` may sit inside
   furniture. Use *strict containment* here rather than the player
   radius: standing 20 cm from a counter is normal, being inside the
   bathtub is not.

**The list must be empty before every commit.** Written last, this check
found two live bugs within seconds of first running — write it early.

## 9. Verification protocol — run it, do not assume

Export a debug API: `window.__app = {scene, camera, renderer, controls,
doll}` plus a promise that resolves when baking finishes. Then:

- **Screenshot every visual change** in a headless browser and compare
  against the photographs room by room. If your browser pane is hidden
  it may not composite frames, stalling `requestAnimationFrame` and any
  screenshot tool — render offscreen and POST the canvas to a small
  local save endpoint instead of fighting it. Use a real headless
  browser (Playwright) whenever the render loop itself must run.
- **Top view with the floor cutaway after any furniture move.** One
  frame catches blocked passages, furniture rotated across a room, and
  objects floating in mid-air.
- **Walk simulation for a specific route**: set the position, hold the
  forward key programmatically, run the update loop, assert the end
  coordinates. One run tests one line — a passage can exist and still be
  unreachable from the side. Trust the flood fill over any single run.
- **Sky-leak check after reshaping the shell**: raycast in five
  directions from the new zone. Give the raycaster a camera first or
  sprites throw. Ceiling overlays are usually one-sided and hidden by
  the cutaway, so include invisible meshes or probe outside dollhouse
  mode.
- **Anything placed against a wall gets a raycast probe.** Cast along
  the axis to find the real wall face, then confirm a second cast hits
  *your object* first and not the wall.
- **Draw calls** at the entrance and in two or three rooms, every time
  you add geometry.
- Keep furniture ≥ 0.5 m clear of doorways.

## 10. Ship it

- A catalog page listing properties from `apartments/index.json`, plus
  the tour itself.
- Static hosting with no build step. On Vercel: a `vercel.json` whose
  `outputDirectory` points at the tour folder, a long cache for the
  Three.js bundle, a short one for the JSON configs.
- A `README.md` explaining how to add a property in four steps, and a
  `CLAUDE.md` with the architecture, the performance budget and the
  verification checklist.
- **Cache-bust every release**: bump `?v=N` on all `<script src>` tags
  *after* the last code edit, and version the JSON config URL with the
  same value by reading it off the loader's own script tag. Without it,
  phones serve stale geometry for hours and fixed bugs appear alive.
- Work in branches with substantial PR descriptions; verify production
  after merge. If a merge produces no deployment **record** at all, the
  webhook was missed — that is not a failed build, and an empty commit
  re-triggers it.

---

# PROMPT B — audit against the plan

The tour is built. Audit it against the floor plan and fix what
diverges. Do not trust the previous pass.

1. Re-measure the plan programmatically and list, in writing, every
   discrepancy: room count, overall extents, which room each door opens
   into, staircase position, window positions.
2. For every wall the model has that the plan does not — and every wall
   the plan has that the model does not — decide from the plan, not from
   what is easier to model, and fix it.
3. Compare furniture room by room against the plan: headboard walls,
   wardrobe runs, the order of sanitary fixtures in bathrooms, dining
   and lounge zones.
4. Run the full verification protocol (§9 of Prompt A). The layout check
   must end empty.
5. Report what changed and what you verified, with numbers.

Watch for these specifically, because they recur in every project:

- **A hidden object passes every automated check.** Headboards buried
  inside a wall slab were perfectly walkable, invisible, and shipped —
  only a screenshot found them.
- **Moving a wall orphans its attachments** (paintings, panels) *and*
  whatever its collider guarded on the other level: opening a
  ground-floor wall once exposed an unguarded three-metre drop from the
  upper hall into a stairwell.
- **Moving a fixture orphans its photo spot, spawn and area marker.**

---

## Why every rule is here — the failure catalogue

Each line cost real debugging time on a previous build. This is the list
the rules above were written from.

| What went wrong | Rule it produced |
|---|---|
| Mouse capture meant users could not click any button and did not know why | Drag-look, never pointer lock (§7) |
| Three doorways were blocked by furniture; "success" tests lied until end coordinates were asserted | Walk simulation asserts the destination (§9) |
| Eyeballing the plan lost a whole wing with a bedroom in it and shortened the flat by a third | Measure the plan with PIL/numpy first (§2) |
| The staircase had to be relocated twice | Locate it on the plan, cross-check against photos (§2) |
| A narrow shortcut between rooms was invented that the plan never drew | Plan topology over convenience (§2) |
| Both bedroom headboards sat inside the wall slab — invisible, walkable, so nothing complained | Wall coords are centrelines; raycast the face (§3, §9) |
| A photo spot ended up inside a bathtub after a bathroom was rearranged | Markers are absolute; validator check 4 (§8) |
| A teleport point sat inside a bed for a whole release | Same check, found it automatically (§8) |
| Removing a ground-floor wall exposed an unguarded upper-floor drop | Check what a collider guarded on the other level (Prompt B) |
| A forgotten floor plate became a ceiling over the staircase | Re-list plates, never patch (§4) |
| A painting hung in mid-air after its wall moved | Moving a wall orphans its attachments (Prompt B) |
| Baked light revealed a terrace hanging below the ceiling and inverted roof slopes | Deck above ceiling; bake early (§4, §5) |
| Phones served stale JS for hours; fixed bugs looked alive | `?v=N` on scripts *and* the JSON URL, bumped last (§10) |
| Furniture blocked doors five times in one project, and the user found it every time, not the tests | Write the validator first (§8) |
| Enabling the validator instantly surfaced two more hidden blockages | Same |
| A dozen photo-spot sprites quietly cost a dozen draw calls | Markers as `THREE.Points` (§6) |
| Zone-splitting merged meshes for culling made the entrance *worse* | Measure both ways before keeping it (§6) |
| Every room read identically because the window light term was flat | Strong, steep window falloff (§5) |
| Two bedrooms were indistinguishable from memory | One accent palette per room (below) |
| A merge produced no deployment at all — a missed webhook, not a failed build | Check for a deployment *record* before debugging a build (§10) |

## Reference: what a finished furniture catalogue looks like

Aim for roughly this coverage. Each constructor takes `(item, group)`
and returns `{w, d}` for an automatic AABB collider, `{custom: [...]}`
for multi-box shapes, or `{noCollide: true}` for decor.

- **Seating & tables** — sofa, corner sofa, armchair, round table,
  dining table with chairs and place settings, bar stool, bench, desk
  nook, side table, sideboard
- **Sleeping & storage** — bed with quilted headboard and throw,
  wardrobe, wardrobe with TV niche, shelf tower
- **Kitchen** — counter run, tall units, island, extractor hood, hob,
  coffee machine, kettle, knife block, cups
- **Bathroom** — bathtub, glass shower, vanity with lit mirror, WC,
  towels, towel roll, toiletries, bath mat, washer/dryer
- **Outdoor** — terrace chair, terrace table, planter, lantern, string
  lights, hanging planter
- **Decor** — painting, books, vase of flowers, fruit bowl, cushions,
  throw blanket, rug, runner, wall panel, plant, floor lamp, pendant
  cluster, TV on wall, TV wall unit, wine set

Keep a small occlusion-height table for the bake, and exclude
transparent or spindly items (shower cabins, plants, lamps) from
occlusion so they do not cast slab-shaped shadows.

**Design language.** Warm oak floors, whitewashed ash joinery, black and
white marble in wet rooms, quilted headboards, muted curtains. Give
every bedroom **one accent palette** so guests navigate by memory — for
example one warm room (beige quilt, yellow-zigzag throw, olive
cushions), one cool room (navy quilt, blue-square throw, gray-blue rug),
one sage room (striped sage/terracotta throw, sage and pink cushions).
Two rooms sharing a throw pattern read as twins even when everything
else differs.

**Scale accuracy.** Plans rarely carry dimension lines, so the model is
calibrated against standard furniture; expect ±5–10%. Good enough for
visualisation, not for a measured survey — say so in the README so
nobody quotes it in a contract.
