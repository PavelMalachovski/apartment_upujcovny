# Photorealism for the apartment tours — design

Date: 2026-08-12
Status: approved for planning

## Goal

Raise the tours from "architectural diagram" to a picture a host or an
estate agent can put in front of a paying client, and make the
resemblance to the real flat **measurable** rather than a matter of
taste.

Commercial context that shapes every decision below:

- The buyer is a host or an estate agent; **the flat physically exists
  and photographs of it exist.** Resemblance to those photographs is
  the trust criterion, not generic prettiness.
- Capture is sometimes ours to dictate (a phone walkthrough) and
  sometimes not (whatever the owner sent). The design must not depend
  on controlling the shoot.
- Weight budget: **30–50 MB and a 5–10 s load behind a progress
  indicator** is acceptable — the Matterport bar. The current tour is
  ~700 KB.
- Production effort: **a day or more per premium property is
  acceptable.** Quality outranks throughput.

## Scope: one spec, two implementation plans

Phases A and B are one design because the A work is chosen specifically
to survive into B, but they are **two separate implementation plans**.
Phase A ships and is verified on its own before the migration starts;
nothing in A depends on B existing.

## Non-goals

- Gaussian splatting / capture-based reconstruction. It is the strongest
  possible answer for resemblance and it is deliberately deferred — see
  "Deferred" at the end. Nothing in this design blocks it; the engine
  upgrade in phase B is its prerequisite.
- Refactoring anything in `builder.js` beyond extracting materials.
- Server-side rendering, accounts, or any change to hosting.

## What actually limits realism today

Measured, not guessed:

| # | Limit | Evidence |
|---|---|---|
| 1 | Furniture is boxes | every object goes through `box()`/`cyl()`; hard 90° edges throughout |
| 2 | No environment map | `envMap` appears **0 times** across 65 `MeshStandardMaterial` instances — chrome, glass, marble and the TV reflect nothing |
| 3 | No micro-relief | `normalMap`, `roughnessMap`, `aoMap`: **0 occurrences each**; every surface is mathematically flat |
| 4 | The bake is not GI | bounce light is the constant `0.40, 0.385, 0.36`; 3 jitter samples; walls per-vertex at 0.45 m, so no colour bleed and no soft gradients |
| 5 | No contact shadows | furniture visibly floats; furniture is lit dynamically while floors are baked, so the two do not share a light environment |
| 6 | No post-processing | no SSAO, no bloom, no grain, no vignette — a real camera produces all of these |
| 7 | Three.js r128 (2021) | blocks modern tooling; r152 rewrote colour management, which fixes a class of "the colours are off" problems on its own |

Already correct and worth preserving: ACES tone mapping, sRGB output,
antialiasing, and an honest CPU lightmapper.

## Invariants preserved

From `CLAUDE.md`, unchanged by this work:

- The JSON config is the single source of data. **No coordinates in
  code.**
- One code base serves every property, selected with `?apt=<id>`.
- Static files, no build step, servable by a plain HTTP server.
- `validate.js` must report an empty issue list before every commit.
- Metres and degrees; the yaw convention is unchanged.

## Budgets deliberately revised

The ≤150 draw-call ceiling was measured against box furniture (Serenity
currently renders at 54 calls at the entrance, 48–51 elsewhere). Real
GLTF models make that ceiling dishonest rather than protective. New
budget:

- **≤400 draw calls on desktop, ≤250 on mobile**, re-measured after
  every geometry addition, at the entrance and in two rooms.
- **Phase A bake stays under ~3 s**, because it is still synchronous.
  The A3 ray count is the knob: start at 8 directions per texel and cut
  it until the budget holds. Do not let phase A slow the start overlay.
- **Phase B bake may grow to ~6 s**, but only once it runs in a Worker
  with the progress readout live.
- Total transferred weight per apartment ≤50 MB including shared assets.

## Structural change

`builder.js` is 74 KB doing four jobs: materials, walls, furniture and
merging. Materials move to a new `materials.js`, because materials are
the subject of this entire effort and editing them inside a 74 KB file
is where mistakes will happen. Nothing else in `builder.js` is
refactored — unrelated cleanup is out of scope.

## Phase A — on the current r128

Five changes, no migration, each surviving the later upgrade largely
intact. Each lands as its own PR with before/after screenshots from
fixed cameras.

### A1. Environment map captured from the apartment itself

`PMREMGenerator`, `CubeCamera` and `WebGLCubeRenderTarget` are all
present in the local `three.min.js` core (verified). `RoomEnvironment`
is not — and that is fortunate, because instead of importing a generic
studio box we capture a cube panorama **of this apartment** once, after
the bake, and run it through PMREM.

The tap of the mixer then reflects this flat's actual window. For a
product whose success criterion is resemblance, a captured local
environment beats any stock asset.

- Capture point: `env.capture` in the config; `x` and `z` default to
  the `roomCenter` already present, `y` defaults to 1.6.
- Capture must run **after** the light bake, or it records unlit
  surfaces, and **while `scene.environment` is null**, or reflections
  feed back on themselves.
- Cost: no new files, no new bytes.

### A2. Chamfered edges

A rounded-box generator inside the `box()` helper, radius 5 mm, applied
only where the smallest dimension exceeds 0.15 m so that drawer pulls
and cutlery do not get furniture-scale chamfers. Triangle count rises;
draw calls do not, because everything is merged by `mergeStatic`
regardless.

**A1 and A2 are multiplicative and must ship together.** A chamfer reads
because it catches a highlight along the edge, and there is nothing to
catch until an environment map exists. Individually each is nearly
invisible; together they are what makes an object look manufactured
rather than drawn.

### A3. Ambient occlusion in two places

The occluder set already exists (47 AABBs for Serenity), so this is a
new pass over existing data, not new plumbing.

- **Contact shadows into the floor and ceiling lightmaps**: short rays,
  distance capped at ~0.6 m, ~8 hemisphere directions per texel. Fixes
  furniture appearing to hover.
- **Per-vertex AO baked into the merged furniture geometry**, stored as
  a vertex colour attribute. Today floors are baked while furniture is
  lit dynamically, so furniture sits in a different light environment
  from the room and reads as pasted on. This is roughly half of the
  "pasted on" effect and is easy to overlook.

### A4. Post-processing chain

Requires local UMD copies from the r128 examples — `EffectComposer`,
`RenderPass`, `SAOPass`, `UnrealBloomPass`, `ShaderPass` — none of which
are in the core bundle (verified). Roughly 60–80 KB.

Order: render → SAO → bloom → grain and vignette. Every stage
individually toggleable; the whole chain disables itself on weak GPUs.

Restraint matters here: bloom and grain past a low threshold read as
cheap filters and lose more trust than they gain. Tune against the
photographs, not against taste.

### A5. Palette sampled from the photographs

A throwaway Python script samples reference regions from the committed
webp photos and writes a `palette` block into the apartment config;
`materials.js` reads it and falls back to today's hardcoded values.

This is the only item that serves resemblance directly rather than
beauty generally, and it is available to us only because the flat exists
and was photographed — competitors building tours from plans alone
cannot do it.

## Phase B — engine upgrade and full PBR

### B1. Migration to a current Three.js

Target the latest stable release at migration time (r180 or newer); the
exact version is pinned in the implementation plan, not here, so this
spec does not go stale. ES modules via importmap, so the no-build-step
rule holds. Known breaking changes to work through:

- `outputEncoding` → `outputColorSpace`, `sRGBEncoding` →
  `SRGBColorSpace`, `texture.encoding` → `texture.colorSpace`.
- Physically correct lighting is now the default, so every light
  intensity and `lightMapIntensity` needs recalculating. The bake's
  `EXP = 1.7` headroom constant is part of this.

The regression net is the fixed-camera screenshot set captured before
migration plus the layout validator.

### B2. HDRI environment

A real CC0 map (Poly Haven), 2–4 MB, shared across properties with a
per-apartment choice in `env.hdri`. For Serenity: tropical midday by
water.

The local cube capture from A1 stays. The HDRI supplies sky and overall
tone through the windows; the local capture supplies the reflection of
the actual room. They compose.

### B3. PBR texture sets

Albedo + normal + roughness in KTX2/Basis for oak, plaster, tile, marble
and fabric. Procedural canvas generators remain as fallbacks so existing
configs keep working.

### B4. GLTF furniture

A `model` field per furniture item and a library under `assets/models/`,
Draco/meshopt compressed.

**GLTF does not replace the procedural constructors — it is an optional
field.** With `"model": "sofa-2seat-navy"` the model loads; without it,
`F.sofa` runs as today. This keeps all three existing apartments working
untouched, lets premium properties get real geometry, and gives natural
degradation: a model that fails to load shows a box, never a black
screen.

This is the item that finally kills the box look.

### B5. Two-bounce GI in a Worker

A second bake pass in which lit surfaces become emitters, producing
colour bleed — the navy sofa tinting the white wall beside it. Runs in a
Web Worker so the UI stays alive; with no Worker available it falls back
to today's synchronous chunked bake.

## Config schema additions

All optional, all backwards compatible:

```json
"palette":   { "wall": "#e8e4db", "floorWood": "#c9a97f", "sofa": "#3a5a78" },
"env":       { "capture": { "x": 2.9, "z": 3.3, "y": 1.6 }, "hdri": "tropical-noon" },
"quality":   { "gi": true, "aoRays": 8, "bakeRes": 2 },
"furniture": [ { "type": "sofa", "model": "sofa-2seat-navy" } ],
"photoSpots": [ { "file": "3.webp", "compare": true } ]
```

## Pipeline order

Config → materials from palette → geometry → bake (direct, then AO,
then GI) → `mergeStatic` → cube capture → PMREM → `scene.environment` →
post chain → render loop.

The two ordering constraints in A1 are load-bearing: capture after the
bake, and capture with `scene.environment` still null.

## Success metric: measured resemblance

At every photo spot flagged `compare`, render a frame from that
photograph's camera and compare it to the photograph itself.

Pixel-exact agreement is neither achievable nor desirable — the grid is
what makes the measure robust to small misalignment while staying
sensitive to exactly what this work fixes, namely colour and tonal
distribution. Divide both images into an 8×8 grid, take the mean CIE Lab
colour of each cell, and report the mean **ΔE2000** across the 64 cells.
One number per apartment, which must fall from phase to phase.

**The baseline must be captured before any phase A work begins**, or
there is nothing to compare against later.

The same mechanism becomes a sales feature: at a photo spot the viewer
drags a slider between the render and the real photograph. For an estate
agent that is the strongest trust argument available, and it costs
almost nothing because the photo-spot infrastructure already exists.

## Error handling

The site is static with no server-side guarantees, so one rule governs:
**a missing asset degrades to the procedural path with a console
warning, and never produces a black screen.**

- HDRI, KTX2 or GLTF fails to load → procedural material or constructor.
- No WebGL2, or a weak GPU detected by capability plus a frame-time
  probe → post chain off, reduced asset tier.
- No Worker → synchronous bake, as today.
- Cube capture fails → neutral gradient cube.

## Verification gates

Every existing gate stays:

- `window.__issues` empty under `?check=1`.
- Walk simulations asserting end coordinates into every room.
- Sky-leak raycasts from each zone.
- Draw calls re-measured, now against the revised budget.

Two gates are added:

- The ΔE resemblance metric must not regress.
- A fixed-camera screenshot set captured before and after every step.

The three existing apartments must look the same or better after each
step. They are the real regression suite.

## Risks

- **Cache invalidation changes shape in phase B.** ES modules and an
  importmap mean the version must reach the importmap URLs too, or the
  "bump `?v=N` after the last code edit" rule silently stops working —
  a bug that has already cost an hour on this project once. Handled as
  an explicit migration step, not as an afterthought.
- **Light intensity recalculation in B1 can quietly ruin the bake.**
  Mitigated by the pre-migration screenshot set.
- **Post-processing is easy to overdo.** Tuned against photographs with
  the ΔE metric as the arbiter.
- **Asset licensing.** Only CC0 or properly licensed models enter the
  library; the licence is recorded alongside each asset.

## Deferred: capture-based reconstruction

3D Gaussian splatting from a phone walkthrough is the strongest possible
answer to resemblance, because a splat *is* the photograph, and modern
compressed formats fit the 30–50 MB budget. It is deferred rather than
rejected:

- It only works where we control the shoot, and we sometimes do not.
- A splat cannot be relit or refurnished, and the dollhouse, measuring
  tape and floor plan cannot operate on one — so the modelled version is
  needed regardless, and must not look like a cartoon beside it.
- The r18x upgrade in phase B is its prerequisite.

Phase B is therefore the right investment even if splatting later
becomes the premium tier.
