# CLAUDE.md — rules for working in this repository

Platform for interactive apartment 3D tours. Three.js r185 (vendored ESM,
resolved through an importmap in `index.html`), no bundler, no build step —
the site is still just static files. Migrated from r128 in phase B; the
r128→r185 behavioural differences and the ones deliberately left
unconverted are recorded in
[docs/superpowers/metrics/r128-reference.md](docs/superpowers/metrics/r128-reference.md).
Prod: Vercel, repo `PavelMalachovski/apartment_upujcovny`, branch `main`.

[docs/PROMPT.md](docs/PROMPT.md) is the project-independent
specification for building a tour platform like this one from a folder
of photographs — use it to start a **new** property platform, or as the
reference for why a rule here exists. This file is about working
*inside* this repo.

Everything in the project is in English: UI strings, JSON room names,
docs, code comments.

## Commands

```bash
# local run — a server is required, the config fetch fails over file://
python tools/serve.py
# http://localhost:8742/            tour (?apt=<id>)
# http://localhost:8742/?check=1    tour + layout-check badge
# http://localhost:8742/?measure=1  tour + resemblance capture harness (window.__measure)
# http://localhost:8742/catalog.html property catalog
```

`tools/serve.py` is a small `http.server` subclass, not the stock module: it
also answers `POST /save/<name>` by writing the body to `tools/shots/`, which
every offscreen-screenshot and resemblance-capture recipe below depends on.
Plain `python -m http.server` serves the tour fine but silently 404s those
saves.

Deploy: push to `main` → Vercel builds automatically (`vercel.json`,
site root = `tour/`). Workflow: branch → PR → merge. PRs #1–#21 show the
accepted description style.

## Architecture (tour/)

| File | Role |
|---|---|
| `apartments/<id>.json` | ALL apartment data: walls+openings, floors, ceilings, attic, stairs, furniture, lights, ground zones, room labels, areas, spawns, photo spots, meta. Angles in DEGREES |
| `apartments/index.json` | Catalog list for catalog.html |
| `main.js` | Loader: reads `?apt=<id>`, fetches the config with the same `?v=` as its own tag, degrees→radians, calls `initApp()` |
| `materials.js` | Material palette `M.*` and procedural canvas textures, split out of `builder.js`; `Materials.color(key, fallback)` resolves an `APT.palette` hex or falls back, shared with `bake.js`'s wall tint |
| `builder.js` | Config → scene: walls with openings, attic slopes, floors/ceilings, stairs, terrace, furniture constructors `F.*` (chamfered edges via `chamferBoxGeometry`), occluders and light sources for the bake, `mergeStatic` |
| `bake.js` | CPU lightmapper: floors/ceilings/slopes → CanvasTexture lightmaps (uv2, MeshBasic) including baked ambient occlusion (`aoAt`), also called on furniture vertices (`bakeFurnitureAO`); walls → one merged mesh per level with per-vertex baked light only, **no AO** — `bakeWalls()` calls `lightAt()` alone, so a floor-to-wall corner darkens on the floor side only. Known limitation, recorded during the AO task, not yet closed |
| `post.js` | Post-processing chain: restrained bloom + film grain/vignette (`Post.create`), degrades to a plain render when the example files are missing or the GPU is weak; no SSAO — AO lives in the bake, for floors and furniture (not walls, see `bake.js` above) |
| `lib/three-0.185.0/` | Vendored Three.js r185: `build/three.module.js` + `build/three.core.js` (the facade imports the core, which is where `REVISION` lives), and the `examples/jsm/` addons the post chain needs — `postprocessing/{EffectComposer,RenderPass,ShaderPass,MaskPass,Pass,UnrealBloomPass,OutputPass}`, `shaders/{CopyShader,LuminosityHighPassShader,OutputShader}` — none of which ship in the core build. **The version is in the directory name, not a `?v=` query**: addons import each other by relative path and a relative specifier does not inherit the importing module's query string, so `?v=` would version only the files named in the importmap and leave every transitively-imported file cacheable forever. Never edit anything under here |
| `measure.js` | Resemblance capture, loaded only under `?measure=1`: renders every `compare`-flagged photo spot from its own camera/aspect and POSTs the frame to `tools/serve.py`'s save endpoint for offline `tools/delta_e.py` scoring |
| `validate.js` | Layout self-check: blocked openings, openings into the void, unreachable rooms, markers inside solids |
| `controls.js` | Walking: WASD + drag-look (NOT pointer lock), touch joystick + swipe, collisions against wall segments and furniture AABBs, floor levels via `groundZones`, camera clamped under attic slopes |
| `doll.js` | Dollhouse: orbit camera, ground/upper/whole cutaway, m² badges, measuring tape, click-teleport |
| `app.js` | Init, render loop, minimap, Rooms menu, photo gallery, first-visit hint, environment capture (`captureEnvironment`) that reflects the apartment's own space instead of a stock studio |

## Numbers that matter

| Constant | Value | Where |
|---|---|---|
| Wall thickness | 0.14 (centreline ± 0.07) | `builder.js WALL_TH` |
| Door / passage height | 2.05 / 2.2 | `DOOR_H`, `PASS_H` |
| Window sill / head | 0.85 / 2.45 | `WIN_SILL`, `WIN_HEAD` |
| Eye height | 1.6 | `controls.js` |
| Player radius | 0.24 | `controls.js`, mirrored in `validate.js` |
| Walk / run speed | 1.9 / 3.4 m·s⁻¹ | `controls.js` |
| Reachability grid / max step | 0.25 m / 0.35 m | `validate.js` |
| HDR headroom `EXP` | 1.7 (= `lightMapIntensity`) | `bake.js` |
| Draw-call budget | ≤400 desktop, ≤250 mobile (Serenity entrance measures 69) | measured, revised in phase A — see rule 4 |
| Bake time | no fixed ceiling; measured medians (3 runs): serenity 267 ms, horkyone-10 1323 ms, kings-court 8674 ms | see rule 4a |
| Dynamic PointLights | ≤8, flagged `dyn` in the config | `builder.js` |

Yaw convention: forward is `(-sin(yaw), -cos(yaw))` — **yaw 0 looks
north (−z)**, 90 west, 180 south, 270 east.

## Config keys added by the photorealism phase

On top of the shape documented in `docs/PROMPT.md` §3, the apartment JSON
now carries:

| Key | One-liner |
|---|---|
| `exposure` | `renderer.toneMappingExposure` override, fitted per-apartment against its own photographs (`app.js`); apartments with nothing to fit against keep the default 1.05. Must be a finite number `> 0` — `app.js` warns and falls back to 1.05 for anything else (`null`, `0`, a string). **Compensates for the scene running about twice as hot at source**: serenity's fitted value is 0.326. Anyone correcting `lightAt`'s constants in `bake.js` must re-fit or clear this per-apartment override, or the render goes about three times too dark. |
| `palette` | Map of material key → `#rrggbb`; every key optional, an invalid or absent value falls back to the hardcoded constant (`Materials.color`). **Not** produced by directly sampling the photographs — that was measured and rejected (ΔE2000 16.79 vs. 16.57 doing nothing, task 8) because it double-counts illumination as albedo. The committed values were derived by a closed-loop correction (render's own colour vs. the photograph, old albedo scaled by the ratio) done by hand for task 8; `tools/sample_palette.py` outputs raw sampled photo colour only — see its header — and is a diagnostic input to that by-hand process, not something whose output can be pasted into `palette` directly. |
| `quality.aoRays` | Ray count for the baked ambient-occlusion sampler (`bake.js aoAt`); defaults to 8 when the block or key is absent |
| `env.capture` | `{x, y, z}` override for where the environment-reflection panorama is shot from; falls back to `roomCenter.main`, then `start`, then the world origin (`app.js`) |
| `compare` (on a `photoSpots` entry) | Flags that spot for the resemblance harness — `measure.js` renders it, `tools/delta_e.py` scores it, `residual.py` decomposes it |

## Hard rules

**1. Every visual change is verified with a screenshot.** Debug API:
`window.__app = {scene, camera, renderer, controls, doll, composer, post}`
and `window.__issues` (array) are both set **synchronously inside
`initApp()`, before the light bake even starts** (`app.js`: `Builder.build`
then `Validate.run` run immediately, well before `Baker.run` is called) —
read either one right away, no `await` needed. `window.__bakeReady`
(Promise) resolves once the light bake and the environment-reflection
capture that follows it both finish; `window.__bakeMs` (number) is set
the instant `Baker.run`'s own promise settles, so it does need
`await window.__bakeReady` first or it may still be `undefined`.
Screenshots and anything else that depends on the baked lighting looking
right should wait for `__bakeReady` too — the scene renders before that,
just unlit. `composer`/`post` are `null` when the post-processing chain
didn't build (missing example files, weak GPU) — always guard with
`if (a.post && a.post.enabled)` rather than assuming either exists.
Recipes are below.

**2. The layout self-check is the first thing you look at after an
edit.** `validate.js` runs on load, prints to the console, fills
`window.__issues`, and `?check=1` shows a badge. Four bug classes:
blocked opening, opening into the void, room unreachable on foot,
marker inside a solid. **The list must be empty before commit.**

**2a. Walk simulation is for one specific route.** Set the position,
hold `controls.keys.KeyW = true`, run `controls.update(0.033)` in a
loop, assert the end coordinates. A single run tests a single line — a
passage can exist and still be unreachable from the side (that was
bedroom 3). Trust the flood fill over any one run. Keep furniture ≥ 0.5 m
from doorways; passages have been blocked five times by a toilet, a
nightstand, a vanity, a shelf tower and a dining table.

**2b. After any furniture move, take a top view with the floor
cutaway.** One frame catches blocked passages, furniture rotated across
a room and objects floating in mid-air.

**2c. After reshaping the shell, check for sky leaks.** Raycast in five
directions from the new zone; set `rc.camera` first or sprites throw.
Ceiling overlays are one-sided and hidden by the cutaway, so include
invisible meshes or probe outside dollhouse mode.

**2d. Moving a wall orphans what was attached to it.** Paintings, wall
panels and furniture store absolute coordinates — the dining room
painting once hung in mid-air, and a bathroom opened into the stair bay.
After a shift, raycast up over the new gap and inspect the neighbours.

**2e. Removing or shortening a wall? Check what its collider guarded on
the OTHER level.** A ground-floor wall can be the only thing keeping the
player off an upper-floor slab edge — opening the corridor exposed a
3.1 m drop into the stair void and needed a `rail` wall.

**2f. Re-list floor plates, never patch one.** The upper floor is
several rectangles; one forgotten stale plate becomes a ceiling over the
staircase. Check with rays up from three points of the flight.

**2g. Moved a fixture? Move its dependents.** `photoSpots`, `spawns` and
`areas` are absolute too — a bathroom rearrangement left a photo spot
inside the bathtub. Validator check 4 now catches this class
automatically, but grep the JSON near any zone you touch anyway.

**2h. Furniture against a wall: measure the face, never compute from the
centreline.** Wall coordinates are centrelines and the slab is 0.14
thick, so arithmetic alone buried both bedroom headboards *inside* the
wall — quilting invisible, and every automated check stayed green
because a hidden object is still perfectly walkable. Raycast for the
real face, then confirm a second cast hits your object first.

**3. Cache.** Any JS or JSON change requires bumping `?v=N` on the **single
module tag** in `index.html` (`<script type="module" src="main.js?v=N">`),
and bump it **after** the last code edit or the new code caches under the
old version. One tag is now enough: `main.js` reads the version off its own
URL (`import.meta.url`) and passes it to the config fetch, to every classic
script it loads, and to the `measure`/`refshots` harnesses — so that one
number versions everything the browser caches. (Vendored library files are
the exception and need no bump: their version is in the directory path, see
the `lib/three-0.185.0/` row above.) Without a bump JSON edits simply never
arrive — that bug cost an hour. Verify by comparing a field of `APT` in the
console against the file.

**4. Performance budget: ≤400 draw calls desktop, ≤250 mobile.** Raised
from the original ≤150 in the photorealism phase: that ceiling was
measured against plain box furniture with no post-processing, and the
chamfered edges (more triangles, still one draw call per merged mesh)
plus the bloom/grain/vignette chain (a handful of extra full-screen
passes on top of the scene) both add real cost that has nothing to do
with regressed batching. Serenity's entrance measures **69** draw calls
with the full chain running — comfortably inside budget; see the fixed
"Draw calls in a spot" recipe below, the naive version undercounts by
roughly 14. New furniture goes through `F.*` constructors so it merges
automatically and gets a shadow occluder. No new dynamic PointLights —
light lives in the bake. Markers are `THREE.Points`, one object per
level; sprites do not batch and 14 photo spots used to cost 14 calls.
**Zone-splitting the merged meshes was measured and rejected**: the flat
is a single 28 m sightline, so at the entrance every zone stays inside
the frustum and the split only adds calls. Do not retry it.

**4a. Baking has no fixed time budget — it is whatever the geometry
costs, and one apartment is already slow.** Reference medians of three
runs, recorded before this phase: serenity 267 ms, horkyone-10 1323 ms,
**kings-court 8674 ms**. That base cost predates the phase — kings-court
was already the largest, most detailed apartment, and the CPU lightmapper
was always going to cost more for it; this phase did not create that
slowness. Remeasured this session on different hardware: serenity 323 ms,
horkyone-10 1647 ms, kings-court 9942 ms — **15-24% higher, consistently,
across all three.** That consistent proportional rise is equally
explained by the hardware difference or by this phase's own AO baking
(`aoAt()` now runs for every lightmap texel and every furniture vertex)
costing something everywhere; the two measurements were not taken on the
same machine, so this cannot be isolated further with what's on hand.
Don't read more into it than that — say what the data supports (a
same-direction, similar-sized rise on all three apartments) and no more.
Do not chase kings-court's underlying slowness down inside `bake.js`
regardless of which explanation is right — the fix is architectural
(move the bake into a Worker so it stops blocking the main thread) and is
deferred to the engine migration in phase B. The progress readout on the
start overlay exists specifically so a slow bake reads as "loading," not
"broken," in the meantime.

To reproduce a bake-time measurement, no source edit required —
`window.__bakeMs` is a permanent part of the debug API (set inside
`app.js`, the instant `Baker.run`'s own promise settles, regardless of
how quickly anything outside gets around to checking):

```js
window.__bakeReady.then(() => console.log(window.__bakeMs));
```

A plain post-navigation `performance.now()` marker taken from *outside*
the page would race the bake and undercount it for the fast apartments
(serenity's bake can finish before a second tool round-trip lands) — that
is why the timestamp is taken inside `app.js` itself rather than
described by an external recipe.

**5. Geometry.** Do not render interior door leaves — openings must read
as open. Walls with `h > 4` collide on `'both'` levels. The terrace
(y 2.98) sits above the ground-floor ceiling (2.8 + slab) — never lower
it. The south attic knee is below head height; the camera clamps via
`Builder.atticH`. Furniture edges are chamfered (`chamferBoxGeometry` in
`builder.js`, `CHAMFER` toggled on only for furniture) so they catch the
environment highlight instead of showing a razor-sharp silhouette — walls
and floors deliberately stay unchamfered, both because they carry their
own baked lightmap where a bevel buys nothing and because chamfering
every wall edge would multiply the vertex count of the one thing in the
scene that is already merged into a handful of huge meshes.

**6. Photos.** `tour/photos/<id>/*.webp`, ≤1200 px. Source photos in the
repo root are gitignored (`*.jpeg`); only the compressed webp ship.

**7. The JSON config is the single source of data.** No coordinates in
code. Bulk edits are easiest with a throwaway Python script.

## Debug recipes

All of these assume `await window.__bakeReady` first.

**Layout check**

```js
window.__bakeReady.then(() => window.__issues)   // [] means clean
```

**Screenshot when the browser pane will not composite.** A hidden pane
does not run `requestAnimationFrame`, so the render loop stalls and
screenshot tools time out. Render offscreen and POST it to a small local
save endpoint instead:

```js
const a = window.__app;
a.renderer.setSize(1280, 820, false);
a.camera.aspect = 1280 / 820; a.camera.updateProjectionMatrix();
if (a.post) { a.post.setSize(1280, 820); a.post.render(0); }
else a.renderer.render(a.scene, a.camera);
const c = document.createElement('canvas');
c.width = 1280; c.height = 820;
c.getContext('2d').drawImage(a.renderer.domElement, 0, 0);
fetch('/save/shot.jpg', { method: 'POST', body: c.toDataURL('image/jpeg', 0.85) });
```

Playwright is the better tool when anything depends on the loop running
(photo gallery, `checkPhotoSpot`, hover states) — there `rAF` fires
normally.

**Walk a route**

```js
const c = window.__app.controls;
c.enabled = true; c.pos.x = 9.5; c.pos.z = -0.65; c.ground = 0;
c.yaw = 90 * Math.PI / 180;                 // 90 = west
c.keys = { KeyW: true };
for (let i = 0; i < 180; i++) c.update(0.033);   // 6 seconds
c.keys = {}; console.log(c.pos, c.ground);
```

**Find a wall face before placing furniture against it**

```js
const a = window.__app, rc = new THREE.Raycaster();
rc.camera = a.camera;                        // required, or sprites throw
rc.set(new THREE.Vector3(10.1, 1.8, 4.4), new THREE.Vector3(0, 0, -1));
const h = rc.intersectObjects(a.scene.children, true).find(h => h.object.visible);
console.log('wall face z =', 4.4 - h.distance);
```

**Draw calls in a spot.** Must go through the post chain when one exists
— `a.renderer.render()` directly under-reports by about 14 calls, since
the bloom and grain/vignette passes cost draw calls too. `info.autoReset`
also has to be disabled and reset by hand: the composer's internal passes
each call `renderer.render()` themselves, and with the default
`autoReset`, `info.render.calls` resets on every one of those internal
calls — reading it right after `composer.render()` returns only the
*last* pass's count (1), not the chain's total.

```js
// Serenity's own start position (APT.start: {x:3.6, z:0.75, yaw:178}) —
// not kings-court's. Serenity's walls span x 0-5.75, z 0-6.95, so
// kings-court's old (22.6, 5) parked the camera ~17 m outside the flat
// and still returned a number, just not this apartment's entrance.
const a = window.__app, c = a.controls;
c.pos.x = 3.6; c.pos.z = 0.75; c.ground = 0; c.yaw = 178 * Math.PI / 180; c.update(0.001);
a.renderer.info.autoReset = false;
a.renderer.info.reset();
if (a.post && a.post.enabled) a.post.render(0);
else a.renderer.render(a.scene, a.camera);
console.log(a.renderer.info.render.calls);   // Serenity entrance: 69
a.renderer.info.autoReset = true;
```

**Top-down cutaway.** Deliberately renders **without** the post chain,
unlike the two recipes above. The vignette darkens exactly the corners
this shot exists to inspect (hard rule 2b: blocked passages, rotated
furniture, floating objects all tend to hide near room corners, not
frame centre), so a raw render reads more accurately here than a
post-processed one would.

```js
const a = window.__app;
a.doll.enter(); a.doll.setLevel('1'); a.doll.on = false;  // freeze the orbit
a.camera.position.set(9.6, 30, 2.01);
a.camera.up.set(0, 0, -1);
a.camera.lookAt(9.6, 0, 2.0);
a.renderer.render(a.scene, a.camera);   // raw render, not a.post — see above
```

**Resemblance measurement.** Scores how close the render is to the real
photographs at every `compare`-flagged photo spot. Absolute numbers are
meaningless (lens, exposure and furniture model all differ from the
photo) — only the trend across runs carries information.

```bash
python tools/serve.py
# then open http://localhost:8742/?apt=serenity&measure=1 and, once loaded:
```
```js
await window.__measure()   // renders each compare spot, POSTs to tools/shots/render_<apt>_<file>.jpg
```
```bash
python tools/delta_e.py --apt serenity --phase baseline   # mean CIEDE2000 vs the real photos, per spot + overall;
                                                            # --phase just labels/saves the run, pick any name
python tools/luminance.py --apt serenity --sets a6-exposure-fit   # lightness-only, isolates exposure from colour
python tools/residual.py    # from the repo root: decomposes the residual into a global colour
                             # offset (removable) vs per-spot spread (content/geometry, not removable)
```

## Adding an apartment

1. `apartments/<new-id>.json` — copy `kings-court.json` as a template
   and rewrite the geometry from the floor plan. Measure the plan
   programmatically first (see docs/PROMPT.md §2); metres, angles in
   degrees.
2. Photos → `photos/<new-id>/` as webp ≤1200 px; set `meta.photoBase`
   and the `photoSpots`.
3. Add a card to `apartments/index.json`.
4. Open `?apt=<new-id>&check=1` and walk the checklist: start position,
   every room on foot, stairs both ways, terrace, dollhouse on all three
   cutaways, measuring tape, every photo spot, minimap on both levels.

## Deploy notes

Pushing to `main` normally produces a Vercel production deployment
within seconds. If production still serves the old build, first check
whether a deployment **record** exists at all:

```bash
gh api repos/PavelMalachovski/apartment_upujcovny/deployments --jq '.[0:3][] | {environment, created_at, sha: .sha[0:8]}'
```

No record and no commit status means the webhook was missed — that is
not a failed build, and re-reading build logs will teach you nothing.
An empty commit re-triggers it, or promote the branch's preview
deployment to production from the Vercel dashboard.
