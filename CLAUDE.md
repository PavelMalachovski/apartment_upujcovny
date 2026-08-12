# CLAUDE.md — rules for working in this repository

Platform for interactive apartment 3D tours. Three.js r128 (local UMD
copy), no bundler, no build step — the site is static files.
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
python -m http.server 8741 --directory tour
# http://localhost:8741/            tour (?apt=<id>)
# http://localhost:8741/?check=1    tour + layout-check badge
# http://localhost:8741/catalog.html property catalog
```

Deploy: push to `main` → Vercel builds automatically (`vercel.json`,
site root = `tour/`). Workflow: branch → PR → merge. PRs #1–#21 show the
accepted description style.

## Architecture (tour/)

| File | Role |
|---|---|
| `apartments/<id>.json` | ALL apartment data: walls+openings, floors, ceilings, attic, stairs, furniture, lights, ground zones, room labels, areas, spawns, photo spots, meta. Angles in DEGREES |
| `apartments/index.json` | Catalog list for catalog.html |
| `main.js` | Loader: reads `?apt=<id>`, fetches the config with the same `?v=` as its own tag, degrees→radians, calls `initApp()` |
| `builder.js` | Config → scene: procedural canvas textures, material palette `M.*`, walls with openings, attic slopes, floors/ceilings, stairs, terrace, furniture constructors `F.*`, occluders and light sources for the bake, `mergeStatic` |
| `bake.js` | CPU lightmapper: floors/ceilings/slopes → CanvasTexture lightmaps (uv2, MeshBasic); walls → one merged mesh per level with per-vertex baked light |
| `validate.js` | Layout self-check: blocked openings, openings into the void, unreachable rooms, markers inside solids |
| `controls.js` | Walking: WASD + drag-look (NOT pointer lock), touch joystick + swipe, collisions against wall segments and furniture AABBs, floor levels via `groundZones`, camera clamped under attic slopes |
| `doll.js` | Dollhouse: orbit camera, ground/upper/whole cutaway, m² badges, measuring tape, click-teleport |
| `app.js` | Init, render loop, minimap, Rooms menu, photo gallery, first-visit hint |

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
| Draw-call budget | ≤150 (currently ~85–145) | measured |
| Dynamic PointLights | ≤8, flagged `dyn` in the config | `builder.js` |

Yaw convention: forward is `(-sin(yaw), -cos(yaw))` — **yaw 0 looks
north (−z)**, 90 west, 180 south, 270 east.

## Hard rules

**1. Every visual change is verified with a screenshot.** Debug API:
`window.__app = {scene, camera, renderer, controls, doll}` and
`window.__bakeReady` (Promise). Recipes are below.

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

**3. Cache.** Any JS or JSON change requires bumping `?v=N` on **all**
`<script src>` tags in `index.html`, and bump it **after** the last code
edit or the new code caches under the old version. The config is fetched
with the same `?v=` (main.js reads it off its own tag), so without a
bump JSON edits simply never arrive — that bug cost an hour. Verify by
comparing a field of `APT` in the console against the file.

**4. Performance budget: ≤150 draw calls anywhere.** New furniture goes
through `F.*` constructors so it merges automatically and gets a shadow
occluder. No new dynamic PointLights — light lives in the bake. Markers
are `THREE.Points`, one object per level; sprites do not batch and 14
photo spots used to cost 14 calls. **Zone-splitting the merged meshes
was measured and rejected**: the flat is a single 28 m sightline, so at
the entrance every zone stays inside the frustum and the split only adds
calls. Do not retry it.

**5. Geometry.** Do not render interior door leaves — openings must read
as open. Walls with `h > 4` collide on `'both'` levels. The terrace
(y 2.98) sits above the ground-floor ceiling (2.8 + slab) — never lower
it. The south attic knee is below head height; the camera clamps via
`Builder.atticH`.

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

**Draw calls in a spot**

```js
const a = window.__app, c = a.controls;
c.pos.x = 22.6; c.pos.z = 5; c.ground = 0; c.yaw = Math.PI / 2; c.update(0.001);
a.renderer.render(a.scene, a.camera);
console.log(a.renderer.info.render.calls);
```

**Top-down cutaway**

```js
const a = window.__app;
a.doll.enter(); a.doll.setLevel('1'); a.doll.on = false;  // freeze the orbit
a.camera.position.set(9.6, 30, 2.01);
a.camera.up.set(0, 0, -1);
a.camera.lookAt(9.6, 0, 2.0);
a.renderer.render(a.scene, a.camera);
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
