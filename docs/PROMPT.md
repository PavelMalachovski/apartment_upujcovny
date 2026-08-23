# Prompt: build an apartment 3D tour platform from photographs

A reusable, project-independent specification. Point it at any folder of
apartment photos — a studio, a townhouse, a two-level penthouse — and it
produces a working browser tour plus the pipeline to add the next
property without a programmer.

> **Last reconciled against measurement: 2026-08-23.** Every value below
> that is a real measurement rather than an illustration was checked
> this day — **in the reference project this specification was extracted
> from, whose own repository is the only place the artefacts named here
> exist; none of these paths or commits will be present in your project,
> and this note is provenance for the numbers, not a task for you**
> (frame added 2026-08-23, because the rest of this file is scrubbed of
> reference-project identifiers and this blockquote was not) — against
> that project's `docs/superpowers/metrics/constants-b5-audit.json`
> (~~33~~ **34** constants measured at commit `bfba994`, dated
> 2026-08-22, one added 2026-08-23) and against its `CLAUDE.md` as of
> that same audit, or read directly out of the source it describes. Anything the audit did not cover is either
> phrased qualitatively or read from code and cited as such. The
> previous revision of this file was written before the engine
> migration and described a stack that no longer exists; it was replaced
> outright rather than annotated, because this is a specification and
> not a changelog.

Use it in two passes. **Prompt A** builds the product; **Prompt B**
audits the result against the floor plan. Paste A into Claude Code with
the photo folder attached, then B once it reports done.

Everything between the horizontal rules is prompt text meant for the
model. The sections after them are notes for you; pasting them along
costs little and helps.

Most numbers in the schema example are illustrative defaults — the model
derives real coordinates from the plan, not from this file. A handful are
not: `exposure`, `sky`, and the `pitch`/`vfov` shown on a photo spot are
the reference project's own shipped, measured values, kept because they
carry calibration a new builder benefits from seeing (a plausible
exposure, a plausible sky gradient, a plausible tilt) — not because they
transfer to a different flat. Wherever a figure in this document is a
real measurement rather than a placeholder, including these four, it is
labelled **(reference project — measure your own)** and must be
re-derived for a new property, never copied.

---

# PROMPT A — build the tour

This folder holds photographs of an apartment; one of them is probably a
floor plan. Build an interactive browser 3D tour that feels like walking
the flat with a realtor, and take it to sales quality. Work autonomously
and stop only for genuinely ambiguous forks.

Everything you produce — UI strings, JSON data, README, code comments —
is in English.

## 1. Stack (do not deviate)

- **Three.js as vendored ES modules, resolved through an importmap. No
  bundler, no CDN, no npm build step.** The site stays static files that
  a plain HTTP server can serve. Copy the library into the repo under a
  path that names its version — `lib/three-<version>/` — and map the
  bare specifiers in `index.html`:

  ```html
  <script type="importmap">
  { "imports": {
      "three": "./lib/three-<version>/build/three.module.js",
      "three/addons/": "./lib/three-<version>/examples/jsm/"
  } }
  </script>
  ```

  Vendor the `examples/jsm/` addons you actually use — the
  post-processing passes and their shaders do **not** ship in the core
  build — and never edit anything under the vendored directory.

- **The library's version lives in the directory name, never in a `?v=`
  query.** Addons import each other by *relative* path, and a relative
  specifier does not inherit the importing module's query string. A
  `?v=` on the importmap entries would version only the files the map
  names and leave every transitively-imported file cacheable forever.
  Bump the directory instead; then the vendored tree can be served
  `immutable` for a year, because a new version is a new URL.

- **One module tag, one version number.** The page carries a single
  `<script type="module" src="main.js?v=N">`. `main.js` reads its own
  version off `import.meta.url` and passes it to the config fetch, to
  every classic script it loads, and to the measurement harnesses — so
  one number versions everything the browser caches. See §11.

- **A single module entry needs a single failure path.** With everything
  hanging off one module tag, an unsupported importmap or one 404 among
  the vendored files means the module never executes at all: no
  `try/catch` inside it runs, no graceful degradation inside any file it
  would have loaded. Define a plain classic script *before* the module
  tag that swaps the start overlay to a real error message, and wire it
  to both the tag's `onerror` **and** a `window` error listener — a
  bare-specifier resolution failure is a parse-time error reported to
  the global handler, and does *not* fire the element's error event.
  Without this the visitor sits on "Click to enter" forever with nothing
  but a console message.

- **All apartment data lives in `apartments/<id>.json`.** No coordinates
  in code, ever. One code base serves every property; a loader picks one
  via `?apt=<id>`. This is what turns a one-off into a product — the
  second apartment must not require a programmer.

- Angles in the config are **degrees**; the loader converts to radians.
  Distances are metres.

- Suggested layout: `index.html`, `catalog.html`, `main.js` (loader),
  `materials.js` (palette + procedural textures), `builder.js`
  (config → scene), `bake.js` (CPU lightmapper), `sampler.js` (a
  geometry-only ray/visibility sampler over a BVH), `post.js`
  (post-processing chain), `controls.js` (walking), `doll.js`
  (dollhouse), `validate.js` (layout self-check), `app.js`
  (init/loop/HUD), plus the capture harnesses of §10 which normal
  visitors never download.

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

**Ceiling height is a measurement too, and photographs measure it
badly.** Deriving it from a single photograph — off a curtain rod, off
an air-conditioner unit — gives bands that disagree with each other by
hundreds of millimetres and rest on one frame. Prefer the plan; if you
must use a photograph, use several, record the method beside the number,
and mark the value as provisional rather than letting a later reader
mistake it for a survey.

## 3. The JSON schema

Produce this shape. Blocks marked *optional* are omitted for flats that
lack the feature. Most numbers here are illustrative placeholders; four
are labelled "(reference project — measure your own)" because they are
the reference project's real, shipped calibration and must be re-measured
rather than reused.

> **Corrected 2026-08-23 by plan 5's final whole-branch review.** That
> promise was false when it was written: `mainCeilH`, `upperFloorY`,
> `terraceY`, the wall `h`, and the whole `attic`, `stairs` and
> `terraceSteps` blocks below were the reference project's exact shipped
> coordinates, verbatim and unlabelled — which is precisely what §12's
> "it must not accumulate one property's coordinates" forbids, and the
> failure that rule anticipates is a new project copying a real flat's
> stair geometry because it looked like a default. They have been
> **replaced with arbitrary illustrative numbers**, keeping the shapes,
> the key names and the internal relationships (`rise` = `upperFloorY`,
> wall `h` = `mainCeilH`, `terraceY` between `mainCeilH` + slab and
> `upperFloorY`). Nothing below this line in the schema is a
> measurement. Derive every one of them from your own floor plan.

```jsonc
{
  "mainFloorY": 0,          // ground floor level
  "mainCeilH": 2.7,         // ground floor ceiling height (illustrative)
  "upperFloorY": 3.0,       // optional: upper floor slab top (illustrative)
  "terraceY": 2.92,         // optional: terrace deck — MUST clear mainCeilH + slab

  "attic": {                // optional: sloped roof over the upper floor
                            // every number in this block is illustrative
    "ridgeZ": 1.5, "ridgeH": 3.2,   // ridge line position and height
    "northZ": -3.0, "northH": 1.7,  // one eave
    "southZ": 7.2, "southH": 1.5    // the other eave (knee wall, below head height)
  },

  "walls": [{
    "lvl": "main" | "upper",
    "x1": 0, "z1": 0, "x2": 0, "z2": 0,  // CENTRELINE, axis-aligned
    "h": 2.7,               // normally mainCeilH; illustrative here
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
      "slider": true,       // optional: sliding panel parked beside the opening
      "curtain": "<key>",   // optional: which curtain treatment to hang
      "white": true,        // optional: paint this leaf white instead of wood
      "daylight": true      // optional: also emit this opening as a bake light source
    }]
  }],
  "rails": [{ "...": "..." }],   // optional: standalone railings, not wall segments

  "floors": {               // floor plates per level, as rectangles
    "main":    [{ "x1": 0, "z1": 0, "x2": 0, "z2": 0, "mat": "wood" | "marbleW" }],
    "upper":   [{ "...": "...", "over": true }],   // over: nudge up ~12 mm where plates overlap (z-fighting)
    "terrace": [{ "...": "...", "mat": "deck" }]
  },
  "mainCeil": [{ "x1": 0, "z1": 0, "x2": 0, "z2": 0 }],  // ground floor ceiling rectangles

  "stairs": {               // optional; every number here is illustrative
    "x1": 6.0, "x2": 9.4, "z1": -3.0, "z2": -1.6,
    "rise": 3.0,                    // = upperFloorY
    "lowX": 9.4, "highX": 6.0       // climb direction: bottom -> top
  },
  "terraceSteps": { "doorX": 3.5, "z1": 3.2, "z2": 4.2 },   // optional, illustrative

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
               "dyn": true }],      // dyn: also a real PointLight, MAX 8 — see §6

  "groundZones": [{         // walkable floor heights — the physics floor
    "x1": 0, "z1": 0, "x2": 0, "z2": 0,
    "y": 0,                 // flat zone
    "ramp": { "axis": "x", "from": 9.4, "to": 6.0, "y0": 0, "y1": 3.0 }  // or a ramp (stairs)
  }],

  "roomLabels": [{ "x1": 0, "z1": 0, "x2": 0, "z2": 0,
                   "y": 0,          // level height, or -1 for "any level" (stairs)
                   "name": "Bedroom 1" }],
  "areas":  [{ "name": "Bedroom 1", "m2": 26, "x": 0, "z": 0, "g": 0 }],
  "spawns": [{ "name": "Bedroom 1", "x": 0, "z": 0, "yaw": 135, "g": 0 }],
  "start":  { "x": 0, "z": 0, "yaw": 90 },

  "roomCenter":   { "main": { "x": 0, "z": 0 } },  // optional: which way a room faces —
                                                   // orients curtains/window dressing, and is
                                                   // the first fallback for env.capture
  "surroundings": [{ "...": "..." }],              // optional: neighbouring roofs and masses
                                                   // visible through the windows

  // ---- rendering and photographic-match keys (all optional) ----
  "exposure": 0.42,         // renderer.toneMappingExposure override, fitted per apartment;
                            // 0.42 is the reference project's own fit (reference project —
                            // measure your own), not a default. Must be a finite number > 0;
                            // anything else warns and falls back to 1.05. See §5 — this is
                            // NOT a free-floating knob.
  "sky": { "top": "#b5e2ff", "bottom": "#e0f4ff", "fog": "#e0f4ff" },
                            // vertical gradient background + matching fog; these three hex
                            // values are the reference project's own sky (reference project
                            // — measure your own), not a default. Each field optional, the
                            // block optional. Absent -> a flat clear colour. A malformed
                            // value must warn by name and fall back, never a black screen.
  "palette": { "floorWood": "#rrggbb" },   // material key -> hex albedo override; every key
                                           // optional, absent falls back to the hardcoded
                                           // constant. See §5 for how NOT to derive these.
  "quality": { "aoRays": 8 },              // ray count for the furniture AO sampler; 8 default
  "env": { "capture": { "x": 0, "y": 1.6, "z": 0 } },
                            // where the environment-reflection panorama is shot from;
                            // falls back to roomCenter.main, then start, then the origin

  "photoSpots": [{
    "file": "8.webp", "name": "Bedroom 1",
    "x": 0, "z": 0, "g": 0, "yaw": -5.7,
    "pitch": 22,            // optional: downward tilt in DEGREES, positive = looking down;
                            // absent or non-finite -> 0. 22 and 65 below are values carried by
                            // TWO DIFFERENT spots elsewhere in the reference project — not by
                            // this example spot, and not by each other (attribution corrected
                            // 2026-08-23; the comments used to call them "that spot's own",
                            // which was false: the illustrated spot carries neither key).
                            // (reference project — measure your own) — not typical values.
                            // See §10 before setting one.
    "vfov": 65,             // optional: per-spot vertical fov override, degrees; 65 is
                            // likewise a value some other spot in the reference project
                            // carries (reference project — measure your own)
    "compare": true,        // optional: include this spot in the resemblance harness
    "poseVerified": true,   // optional: a human has looked at the divider and accepted the pose
    "poseNote": "<why>"     // optional: what was checked, or why it could not be
  }],

  "meta": { "id": "<slug>", "title": "<Property name>",
            "description": "<one line>", "photoBase": "photos/<slug>/",
            "photoFovLong": "<measure it>" }  // degrees, across the photographs' LONG edge.
                                    // Do not ship an assumed number — an assumed value can
                                    // be off by a factor of two, and everything fitted on
                                    // top of it inherits the error (§10).
}
```

Conventions that bite if you get them wrong:

- **Wall coordinates are centrelines** and the slab has thickness
  (0.14 m is a good default). Anything placed against a wall must clear
  the *face*, at centreline ± half-thickness. Never compute the face by
  arithmetic — raycast for it. See §9.
- `groundZones` are what the player actually walks on, independent of
  the visible floor plates. Every plate needs a matching zone, and each
  end of a staircase needs a `ramp` zone. A missing zone is an invisible
  wall; an overlapping zone at the wrong height drops the player through
  the floor.
- `roomLabels`, `areas` and `spawns` are three separate lists driving
  the room caption, the dollhouse m² badges and the teleport menu. All
  hold absolute coordinates and all must be updated together —
  `photoSpots` too.
- Yaw convention: forward is `(-sin(yaw), -cos(yaw))`, so **yaw 0 looks
  along −z**, 90 along −x, 180 along +z, 270 along +x. Pick −z as north
  and keep it consistent everywhere, including the minimap arrow.
- **Every optional key needs a defined absent-path and a defined
  malformed-path**, and both must be inert rather than catastrophic. An
  apartment that omits `sky` must render exactly as it did before the
  key existed; an apartment that sets it to nonsense must get a named
  console warning and the same fallback. Prove the absent path is inert
  by rendering with and without the feature and diffing the frames —
  and compare that diff against two loads of the *same* build, because
  nothing here is byte-identical across page loads.

## 4. Geometry rules

- Sensible fixed heights **(reference project — measure your own):**
  door 2.05, walk-through passage 2.2, window sill 0.85, window head
  2.45, wall thickness 0.14 (centreline ± 0.07).
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
- **Wind every wall quad to match the normal it is given, and test the
  winding rather than trusting the branch you wrote.** Walls are drawn
  with backface culling and no `side` override, so a reversed quad
  renders as a hole from the side the visitor is standing on — or, worse,
  shows the face one wall-thickness behind where the visitor believes
  the surface is. The reference implementation shipped with 8 of a wall
  piece's 12 faces inside-out for the whole of its early life; nothing
  caught it, because a wall that renders is a wall that looks fine until
  you measure it. The fix is a sign test on the generated quad —
  `flip` when `(uVec × vVec) · n < 0` — applied to *every* face, not a
  reversal of whichever branch looks wrong today. When it was fixed,
  every measurable span across one axis in all three reference
  apartments moved by exactly twice the wall thickness, and each room
  then measured its configured centreline distance minus one wall
  thickness — the correct dimension, not merely a closer one.
- **Chamfer furniture edges, not walls or floors.** A small bevel makes
  furniture catch the environment highlight instead of showing a
  razor-sharp silhouette. Walls and floors carry their own baked
  lightmap, where a bevel buys nothing, and chamfering every wall edge
  multiplies the vertex count of the one thing already merged into a
  handful of huge meshes.
- **Anything reading geometry back off the merged wall mesh is coupled
  to that winding.** A measuring tape and a click-to-teleport both
  raycast and test the hit face's normal, which under backface culling
  *is* the winding normal — so a triangle-order change silently moves
  where they land. Re-drive both after any winding or wall-geometry
  change, and have them skip meshes the dollhouse owns.

## 5. Lighting: write a CPU lightmapper

This is what makes the result look expensive rather than like a game
prototype. At load time, for every floor, ceiling and roof slope,
compute per-texel irradiance and store it in a `CanvasTexture` used as
`lightMap` (uv2) on a `MeshBasicMaterial`. Walls instead get merged
geometry with **per-vertex** baked light, segmented at ~0.45 m. Baked
surfaces then cost the GPU nothing at runtime.

Direct visibility is a slab test against AABB occluders (walls, slabs,
furniture with heights), with ~3 jittered samples per source for soft
shadow edges. These constants **(reference project — a tuned starting
point, not universal)** ship in the reference implementation:

| Term | Value |
|---|---|
| Indoor ambient base (r,g,b) | 0.40, 0.385, 0.36 |
| Outdoor ambient base | 0.66, 0.70, 0.78 |
| Lamp | `intensity * 2.1 / (1 + d² * 0.55) * cos * vis`, cutoff d² > 70, warm tint (1.00, 0.90, 0.74) |
| Window | `area * 0.26 / (1 + d² * 0.56) * cos * vis`, cutoff d² > 55, cool tint (0.80, 0.89, 1.00) |
| Sun (outdoor only) | `0.62, 0.59, 0.52 × cos` from a fixed direction |
| HDR headroom | `EXP` 1.7 |
| Wall headroom | 1.25 — walls overexpose sooner than floors |
| Wall vertex segment | 0.45 m |

The window term is deliberately strong and steep. A flat one makes every
room read identically — that is the single most common reason these
tours look cheap. Verify the peak still fits under the HDR headroom
where several windows overlap: a long façade can put four within reach
of one point. Windows are area sources whose normal points into the
room; skip any sample point behind that plane.

**Occlusion: pick one estimator per surface class and say which.** The
reference implementation runs a hemisphere-visibility term over the real
triangles — 16 cosine-weighted rays out to 0.65 m, through a BVH — to
scale the *indoor ambient* on lightmapped surfaces, and a separate
short-range AO term (8 rays by default, 0.6 m, over AABBs) on furniture
vertices only. It used to run both on lightmapped texels, which measured
the same thing twice and squared the occlusion. Walls currently get no
occlusion of any kind. Whatever you choose, expose a runtime flag
saying whether the sampler was actually live: if it silently fell back,
every measurement taken from that frame is void and you need to know
that before you interpret one.

**Edge-dilate lightmaps per boundary texel, only where that texel's
footprint overlaps a wall.** A blanket border sounds equivalent and is
not — it plants a bright plateau down the interior seam between two
adjacent floor plates, which reads as a crease in the middle of a room.

**Tone mapping ACESFilmic, sRGB output.** Fit the exposure **per
apartment** and store it in the config; keep a documented fallback
(1.05 in the reference project) for a config that omits or malforms it.
Two warnings, both learned the expensive way:

- **The fitted exposure is downstream of every lighting constant.**
  Anyone who corrects a term inside the lightmapper must re-fit or clear
  every per-apartment exposure, or the render goes several times too
  dark. In the reference project the fitted values sit far below the
  fallback, precisely because the scene runs hot at source; a geometry
  fix that merely *brightened* the render expired the whole fit.
- **Fit exposure toward luminance, never toward a colour-difference
  score.** They disagree, and the colour score is the wrong arbiter
  (§10). Record the population you fitted on, because changing which
  photographs are eligible changes the fit and makes it incomparable to
  the previous number even when the method is identical.

Note also what a global exposure multiplier cannot fix: if the render's
shadows are twice as light as the photographs', raising exposure to
match the mean makes the shadows *worse*. Record that rather than
chasing it with the one knob that cannot solve it.

**Build all materials as procedural canvas textures** — parquet with
per-board tone variation and grain, marble with soft veins plus thin
sharp veinlets, quilted headboards, curtains as wavy planes. Procedural
textures keep the repo small and let you re-tint a whole palette in one
place, which is what makes a per-apartment `palette` override cheap.

**Do not derive that palette by sampling the photographs directly.**
It was tried and measured worse than doing nothing, because a
photograph's pixel is albedo *times* illumination and pasting it back in
as albedo double-counts the light. Derive it in a closed loop instead:
render, compare the render's own colour at that surface against the
photograph's, and scale the old albedo by the ratio. A sampling tool is
a useful *input* to that process; its output is not a value you can
paste into the config.

## 6. Performance budget

- **Set a draw-call ceiling and measure against it, never by feel.** The
  reference project uses **≤400 desktop, ≤250 mobile**, raised from an
  original ≤150 once chamfered furniture and a post-processing chain
  landed: both add real cost that has nothing to do with regressed
  batching, so the old ceiling was measuring a product that no longer
  existed. Pick your ceiling the same way — against the product you
  actually ship.
- **Measure through the post chain, and defeat `info.autoReset`.**
  Calling the renderer directly under-reports, because the bloom and
  grain passes cost draw calls too; and with `autoReset` on, each
  internal pass resets the counter, so reading it after the composer
  returns gives you the last pass's count and not the total. Disable
  `autoReset`, reset by hand, render the chain, read, restore.
- **Measure at the apartment's own start position.** A camera parked at
  another flat's coordinates still returns a number — just not this
  apartment's entrance.
- **Draw-call readings are machine-dependent; only a before/after pair
  taken on one machine in one session means anything.** The reference
  project's own entrance figure has read 69, 72, 78 and 80 across four
  machines for trees differing by at most one branch's furniture. Its
  current per-apartment baselines **(reference project — measure your
  own)** are 78–80, 165 and 86, all inside the desktop ceiling; those
  were desktop readings and say nothing either way about the mobile one.
  **Warning added 2026-08-23: the number 165 appears twice in this
  document meaning two different things, and they are NOT comparable.**
  Here it is the largest apartment's own start-position baseline. In the
  rejected-experiments list at the end it is that apartment's *desktop*
  reading under the rejected GTAO pass (150 → 282 mobile, 165 → 311
  desktop) — a different camera, a different resolution and a different
  render chain. Never subtract one from the other.
- Merge every static mesh by **(material, level)** into a handful of big
  meshes. Skip only meshes carrying their own lightmap and the merged
  walls — the dollhouse cutaway needs those separable per level.
- **Do not zone-split those merged meshes for frustum culling without
  measuring first.** It reads like a natural win and can instead raise
  draw calls, depending entirely on the property's shape — full numbers
  under "What was built, measured and rejected" below.
- **Sprites do not batch.** Map markers must be one `THREE.Points` per
  level, not one sprite each; a dozen photo spots otherwise cost a dozen
  draw calls on their own.
- Dynamic `PointLight` count ≤ 8; everything else lives in the bake.
  **Enforce it in code, or it will be violated silently** — the
  reference implementation adds one live light per flagged config entry
  with no cap anywhere, and one of its three apartments drifted to 11
  without anything complaining.
- `pixelRatio` ≤ 1.6 on touch, ≤ 2 on desktop.
- **Baking has no fixed time budget** — it is whatever the geometry
  costs, and the largest apartment will be much slower than the
  smallest. Do not promise a number. Instead: put a progress readout on
  the start overlay so a slow bake reads as "loading" rather than
  "broken", and record the elapsed time inside the page itself, the
  instant the bake's own promise settles. A timestamp taken from outside
  the page races the bake and undercounts it for the fast apartments.
  Bake times swing by ~2× across loads of an *identical* build on one
  machine, so compare only ratios within one machine's before/after
  pair, and treat any absolute second-count as that machine's history
  rather than a target.

## 7. Controls and UI

**Walking.** WASD/arrows, Shift to hurry (**reference project:**
1.9 → 3.4 m/s), eye height 1.6, collision radius 0.24 against wall
segments and furniture AABBs. Floor height comes from `groundZones`;
lerp between them so stairs feel like a ramp, and refuse any step whose
target has no floor.

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
  progress indicator, and doubling again as the module-failure message
  of §1.
- First visit only: pulse the main HUD buttons a few times, then stop;
  remember it in `localStorage`.

**Post-processing**: a restrained bloom plus film grain and vignette is
worth the passes; it must degrade to a plain render when the vendored
addons are missing or the GPU is weak, and every caller must guard for
that rather than assume the chain exists. Do not add screen-space AO —
see the rejected list at the end of this document.

Real photographs at their shooting positions are the single biggest
trust generator in the whole product. Budget time for them: convert to
webp **≤1200 px on the long edge** — say which edge in your own rules and
check it, because the reference project wrote only "≤1200 px" and five of its
27 photographs turned out to be 1200×1800 or 1200×1500, complying on width and
not on the long edge; nobody measured it for eight plans — commit them, and
place each spot where the camera actually stood.

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

Any constant this check mirrors from the walking code — the player
radius above all — is a mirror that can drift. State in both files that
it is a mirror, and re-check both whenever either moves; a validator
using a stale radius passes things the player cannot walk through.

The same risk exists anywhere a constant is duplicated instead of
shared — copied into a second file, or baked as a literal inside an
expression rather than a reference to the named value. Watch especially
for an **engine or library upgrade that changes what a constant means
without changing its name or its delivered effect**: a rename or a unit
change inside the dependency can force a compensating factor into your
own code, the visible output stays identical, and any comment or doc
that quoted the old raw value is now wrong while looking untouched.
After any such upgrade, grep for the constant's numeric literal, not
just its name — a hardcoded copy will not turn up in a search for the
identifier, and will not move the next time the named constant is
tuned.

**The list must be empty before every commit.** Written last, this check
found two live bugs within seconds of first running — write it early.

## 9. Verification protocol — run it, do not assume

Export a debug API: `window.__app = {scene, camera, renderer, controls,
doll, composer, post}`, an issues array, a promise that resolves when
baking *and* any environment capture that follows it have finished, and
the bake's own elapsed milliseconds. Assign the synchronous ones in the
same turn as init so nothing outside the page can observe a gap; make
anything that depends on baked lighting await the promise, because the
scene renders before that, just unlit. `composer`/`post` may legitimately
be null — guard, never assume.

- **Screenshot every visual change** in a headless browser and compare
  against the photographs room by room. If your browser pane is hidden
  it may not composite frames, stalling `requestAnimationFrame` and any
  screenshot tool — render offscreen and POST the canvas to a small
  local save endpoint instead of fighting it. That endpoint is worth
  writing as a tiny subclass of the stock static server; the stock
  module serves the tour fine and silently 404s the saves. Use a real
  headless browser (Playwright) whenever the render loop itself must
  run.
- **Top view with the floor cutaway after any furniture move.** One
  frame catches blocked passages, furniture rotated across a room, and
  objects floating in mid-air. Render this one *without* the post chain:
  the vignette darkens exactly the corners the shot exists to inspect.
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
  *your object* first and not the wall. Arithmetic from the centreline
  is how headboards end up buried inside the slab — invisible, perfectly
  walkable, and green on every automated check.
- **Draw calls** at the entrance and in two or three rooms, every time
  you add geometry (§6).
- **Check which version of your code actually loaded** before believing
  any result (§11).
- Keep furniture ≥ 0.5 m clear of doorways.

**A verification that cannot fail is worse than none**, because it
converts "unchecked" into "checked and fine". Make each check fail on
purpose once — plant the defect it is supposed to catch and confirm it
screams — before you trust a green run. This applies to prose checks as
much as to geometry: a tool that scans documents for stale claims must
itself be mutation-tested, or it will report clean because its patterns
never matched anything.

## 10. Measuring resemblance to the photographs — and what it cannot decide

Once real photographs exist at real camera positions, it is tempting to
score the render against them and optimise the number. Build the
harness; it is genuinely useful. But bound what it may decide.

**The harness.** Under a query flag, render every spot flagged
`compare` from that spot's own camera and aspect, POST each frame to the
local save endpoint, and score them offline: a mean colour difference
per spot and overall, a lightness-only score that isolates exposure from
colour, and a decomposition of the residual into a *global colour
offset* (removable) versus *per-spot spread* (content and geometry, not
removable). Also render a side-by-side divider view for a human to look
at.

**Rules that keep it honest:**

- **Absolute scores are meaningless.** Lens, exposure and furniture
  model all differ from the photograph. Only the trend across runs
  carries information.
- **A resemblance score dominated by pose and content mismatch cannot
  arbitrate lighting.** If the render's sofa is a different sofa and the
  camera is a few degrees off, that residual swamps whatever the
  lightmapper did, and the score will happily prefer a worse-lit scene.
  Fit lighting toward luminance and let the colour score observe, not
  decide. In the reference project, obeying that rule knowingly cost a
  little of the colour score, and that was the right trade.
- **The divider and the scorer must use the same camera.** A divider
  that shows a human a different camera from the one being scored is
  worse than no divider, because it launders a mismatch into an
  approval.
- **Carry the build version inside each measurement.** Read it at
  measure time and write it into the result file. Then a lost server
  log, a stale tab or a browser cache cannot make a run
  unattributable — and you can tell "measured before the fix" from
  "measured after" months later without trusting anybody's memory.
- **Record the population, not just the score.** Changing which spots
  are eligible changes every aggregate; a number fitted on nine spots is
  not comparable to one fitted on ten, however identical the method.

**Deriving camera pose from a photograph.** If you let a spot carry a
tilt or a lens override, derive it geometrically and by *looking*:

- Pick a **named** horizontal landmark, crop both frames, and confirm by
  eye that it is the same physical object in each. Then measure its row
  in both.
- **A tight residual is a property of the method, not evidence of
  correctness.** A row read at a fixed column slides monotonically with
  tilt, so an *unrelated* render line can always be swept into agreement
  with an unrelated photograph row — and it converges beautifully. In
  the reference project this error class occurred in both apartments'
  first attempts, produced residuals in the thousandths, and was caught
  only by a human cropping and looking. **A rename is not a
  re-derivation:** relabelling the landmark without re-cropping it left
  the same defect in place and passed review once.
- Accept "no usable landmark" as an outcome. Some renders and
  photographs simply do not share enough unambiguous architecture; a
  flat where no spot yields a tilt is an honest result, not a failure to
  try harder.
- **Any derived tilt is conditional on the assumed lens.** If the
  assumed field of view moves, tilts do not convert by a single
  coefficient — measure the sensitivity rather than assuming one. So
  measure the photographs' actual field of view early: an assumed value
  can be off by a factor of two, and everything fitted on top of it
  inherits the error.
- Automatic joint fitting of tilt and lens together was tried and
  rejected by measurement before it cost a single capture. Do not
  re-propose it without reading why.

## 11. Cache, and why one number

**Bump `?v=N` on the single module tag after the last code edit**, never
before, or the new code caches under the old version. Because the loader
reads its own version off `import.meta.url` and forwards it to the config
fetch, to every classic script and to the harnesses, that one number
versions everything the browser caches. The vendored library is the
exception and needs no bump — its version is in its directory path (§1).

**Verify, do not assume, which version loaded:**

```js
[...document.querySelectorAll('script')].map(s => s.src.split('?').pop())
```

**The bump does not help if the HTML document itself is cached, and that
is a different failure with the same symptom.** A dev server that sends
no cache headers lets the browser re-use `index.html`, and then every
script loads at the *old* version, because the tag naming them is inside
the stale document. What it looks like: your edit is in the file, `curl`
proves the server is serving it, and the page still runs the old code.
In the reference project three new furniture constructors were silently
skipped this way — an unknown furniture type is not an error, it is a
`continue` — and the scene simply rendered without that geometry. Reload
with a cache-buster on the *document* to break it.

**Then fix it properly in production headers.** Serve HTML entry points
`max-age=0, must-revalidate`; give JS/CSS and the JSON configs short
revalidated lifetimes; give photos a long one; and give the vendored,
directory-versioned library `immutable` for a year. A stamped diagnostic
header on the HTML responses is worth having, so you can confirm from
the outside which policy actually applied.

## 12. Ship it

- A catalog page listing properties from `apartments/index.json`, plus
  the tour itself.
- Static hosting with no build step: an output directory pointing at the
  tour folder and the cache policy of §11.
- A `README.md` explaining how to add a property in four steps, and a
  `CLAUDE.md` with the architecture, the performance budget and the
  verification checklist. Keep this specification separate from that
  file: this one is what you hand someone starting a *new* property
  platform, and it must not accumulate one property's coordinates.
- **Every number in your durable documentation is a claim with a
  shelf life.** Write the provenance next to the value — what was
  measured, how, on what commit — and re-audit the whole set
  periodically against the code. A documented constant that silently
  went stale at one specific commit is indistinguishable from a
  correct one until somebody measures.
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
5. Verify the winding of every wall face you touched, and re-drive the
   measuring tape and the click-teleport afterwards (§4).
6. Report what changed and what you verified, with numbers — and with
   the build version each number was taken at.

Watch for these specifically, because they recur in every project:

- **A hidden object passes every automated check.** Headboards buried
  inside a wall slab were perfectly walkable, invisible, and shipped —
  only a screenshot found them.
- **Moving a wall orphans its attachments** (paintings, panels) *and*
  whatever its collider guarded on the other level: opening a
  ground-floor wall once exposed an unguarded three-metre drop from the
  upper hall into a stairwell.
- **Moving a fixture orphans its photo spot, spawn and area marker.**
- **A wall that renders is not a wall that is correct.** Reversed
  winding looks fine and moves apparent room dimensions by a whole wall
  thickness.

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
| Both bedroom headboards sat inside the wall slab — invisible, walkable, so nothing complained | Wall coords are centrelines; raycast the face, never compute it (§3, §9) |
| A photo spot ended up inside a bathtub after a bathroom was rearranged | Markers are absolute; validator check 4 (§8) |
| A teleport point sat inside a bed for a whole release | Same check, found it automatically (§8) |
| Removing a ground-floor wall exposed an unguarded upper-floor drop | Check what a collider guarded on the other level (Prompt B) |
| A forgotten floor plate became a ceiling over the staircase | Re-list plates, never patch (§4) |
| A painting hung in mid-air after its wall moved | Moving a wall orphans its attachments (Prompt B) |
| Baked light revealed a terrace hanging below the ceiling and inverted roof slopes | Deck above ceiling; bake early (§4, §5) |
| Most wall faces were wound inside-out for the project's whole early life; rooms measured a wall thickness too small and nothing noticed | Sign-test the winding on every face (§4) |
| A blanket lightmap border planted a bright crease down the seam between two floor plates | Dilate per boundary texel, only against walls (§5) |
| Two occlusion estimators were multiplied together, squaring the darkening | One estimator per surface class (§5) |
| Phones served stale JS for hours; fixed bugs looked alive | One versioned module tag, bumped last (§11) |
| The edit was in the file, the server served it, and the page still ran the old code — the HTML document itself was cached | Cache-bust the document; fix it in headers (§11) |
| New furniture types were silently skipped because an unknown type is a `continue`, not an error | Same; and check which version loaded (§9, §11) |
| Furniture blocked doors five times in one project, and the user found it every time, not the tests | Write the validator first (§8) |
| Enabling the validator instantly surfaced two more hidden blockages | Same |
| A dozen photo-spot sprites quietly cost a dozen draw calls | Markers as `THREE.Points` (§6) |
| A draw-call figure moved across machines and was nearly blamed on a branch | Compare within one machine's before/after pair only (§6) |
| A dynamic-light budget was documented but enforced nowhere; a config drifted past it unnoticed | Enforce budgets in code (§6) |
| Every room read identically because the window light term was flat | Strong, steep window falloff (§5) |
| A palette sampled straight from photographs scored worse than doing nothing | Closed-loop albedo correction, not sampling (§5) |
| Camera tilts were "derived" against landmarks that were two different physical objects, and converged to residuals in the thousandths | Crop-confirm the same object by eye; a rename is not a re-derivation (§10) |
| A colour-difference score was allowed to arbitrate lighting it could not see past pose and content error | Fit toward luminance; the score observes (§10) |
| A lighting change silently expired every fitted exposure | Exposure is downstream of the lightmapper (§5) |
| A stale-claim checker reported clean because its patterns matched nothing | Make every check fail on purpose once (§9) |
| Two bedrooms were indistinguishable from memory | One accent palette per room (below) |
| A merge produced no deployment at all — a missed webhook, not a failed build | Check for a deployment *record* before debugging a build (§12) |

## What was built, measured and rejected

A specification that lists only what worked sends the next person down
the same dead ends. Each of these was implemented, measured against a
stated criterion, and dropped. The criterion matters more than the
verdict: if yours differs, the answer may differ too.

- **Screen-space ambient occlusion (a GTAO pass).** Criterion: the
  mobile draw-call ceiling. Its depth/normal prepass is a second full
  scene pass, so the largest apartment's entry hall went **150 → 282**
  mobile calls against a ≤250 ceiling (desktop 165 → 311, inside ≤400).
  **The 165 here is the GTAO experiment's desktop before-figure at that
  experiment's own camera and resolution — it is not the same quantity as
  the 165 per-apartment baseline in §6, and the two must not be compared
  (warning added 2026-08-23).**
  It also blackened whole walls on every device — it was the first thing
  in the project to read scene normals, and the walls were presenting
  their far face (§4). Occlusion lives in the bake instead.

- **Offline path-traced lightmap packs, loaded instead of baking at
  runtime.** Criterion: linear contrast (mean ÷ p5) ≥ 4.9. Measured
  **3.384**, and it failed *by construction* rather than by tuning:
  reaching the target required p5 to fall by about a third, and bounce
  light *raised* it. A blind six-pair A/B could not separate the frames
  at viewing size, and the resemblance score moved the wrong way in two
  independent readings. It was not a no-op — it genuinely filled
  perimeters and shaded beside obstructions — it simply did not buy the
  thing it was adopted for. If you try this, expect also to re-fit
  exposure and bloom afterwards, and expect the loader's guards to need
  more care than they look: a per-surface geometry guard that ignores
  rotation will happily ship a mirrored lightmap, an empty manifest
  reads as a successful load, and a fetch without a timeout leaves the
  start overlay up forever.

- **Sampled ambient occlusion on vertex-shaded walls.** Criterion:
  linear contrast ≥ 4.32. Measured **3.9347** — vertex shading bought
  roughly a fifth of the required improvement, because reveals, tops and
  bottoms are single quads whatever the segment size says, so
  corner-sampled Gouraud has nowhere to carry contact shading and
  refining the segmentation cannot help. Read that result at its scope:
  it bounds *vertex-shaded* walls, not walls. A per-texel wall lightmap
  atlas remains the open path and needs a from-scratch atlas rasteriser.

- **Zone-splitting the merged meshes for frustum culling.** Criterion:
  draw calls at the entrance must fall. They rose. The flat is a single
  long sightline, so at the entrance every zone stays inside the frustum
  and the split only adds calls. Measure both ways before keeping it;
  in a differently-shaped property it might win.

- **Sampling the palette directly from the photographs.** Criterion: the
  mean colour difference must improve. It got worse (16.79 against 16.57
  for doing nothing), because a photograph's pixel is albedo times
  illumination (§5).

- **Automatically fitting camera tilt and lens together.** Rejected by
  measurement before any capture was spent on it (§10).

## Reference: what a finished furniture catalogue looks like

Aim for roughly this coverage. Each constructor takes `(item, group)`
and returns `{w, d}` for an automatic AABB collider, `{custom: [...]}`
for multi-box shapes, or `{noCollide: true}` for decor.

- **Seating & tables** — sofa, corner sofa, armchair, round table,
  dining table with chairs and place settings, bar stool, bench, desk
  nook, side table, sideboard, window bench, lounger
- **Sleeping & storage** — bed with quilted headboard and throw,
  wardrobe, wardrobe with TV niche, shelf tower
- **Kitchen** — counter run, tall units, island, extractor hood, hob,
  coffee machine, kettle, knife block, cups
- **Bathroom** — bathtub, glass shower (with optional divider panel,
  valve and handheld — default them *off* so existing callers are
  unchanged), vanity with lit mirror, WC, towels, towel roll,
  toiletries, bath mat, washer/dryer
- **Outdoor** — terrace chair, terrace table, planter, lantern, string
  lights, hanging planter, pool edge (coping band, submerged wall,
  basin floor, rippled water surface), planting mass, slat fence
- **Decor** — painting, books, vase of flowers, fruit bowl, cushions,
  throw blanket, rug, runner, wall panel, plant, floor lamp, pendant
  cluster, TV on wall, TV wall unit, wine set

New furniture goes through these constructors so it merges automatically
and gets a shadow occluder. Keep a small occlusion-height table for the
bake, and exclude transparent or spindly items (shower cabins, plants,
lamps) from occlusion so they do not cast slab-shaped shadows. When you
extend an existing constructor, add options that **default to the old
behaviour** — that is what keeps its other callers untouched and out of
the verification budget.

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
