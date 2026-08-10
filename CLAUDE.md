# CLAUDE.md — rules for working in this repository

A platform for interactive apartment 3D tours (Three.js, no build step).
Prod: Vercel, repository `PavelMalachovski/apartment_upujcovny`.

## Commands

```bash
# local run (a server is required — the config fetch fails over file://)
python -m http.server 8741 --directory tour
# open: http://localhost:8741/            — tour (?apt=<id>)
#       http://localhost:8741/catalog.html — property catalog
```

Deploy: push to `main` → Vercel builds automatically (`vercel.json`,
site root = the `tour/` folder). Workflow: branch → PR → merge
(the history of PRs #1–#20 shows the accepted description style).

## Architecture (tour/)

| File | Role |
|---|---|
| `apartments/<id>.json` | Apartment DATA: walls+openings, floors, attic, stairs, furniture, lights, ground zones, photo spots, areas. All angles in DEGREES |
| `apartments/index.json` | Catalog list for catalog.html |
| `main.js` | Loader: `?apt=<id>`, degrees→radians, starts `initApp()` |
| `builder.js` | Data → scene: procedural textures, walls with openings, attic slopes, furniture (F.*), occluders/lights for baking, static merging via `mergeStatic` |
| `bake.js` | CPU lightmapper: floors/ceilings/slopes → CanvasTexture lightmaps; walls → merged geometry with per-vertex light (2 meshes: lower/upper) |
| `validate.js` | Automatic check: openings (free, lead onto floor) + reachability of every room by grid walk. `Builder.openings` is collected in builder.js |
| `controls.js` | Walking: WASD + drag-look (NOT pointer lock!), touch joystick, collisions against wall segments and furniture AABBs, floor levels via groundZones, camera clamped under attic slopes |
| `doll.js` | Dollhouse mode: orbit, floor cutaway, area labels, measuring tape, click-teleport |
| `app.js` | Init, loop, minimap, rooms menu, photo spots |

## Hard rules

1. **Every visual change is verified with a screenshot** via Playwright
   or the browser pane (`navigate` → `__bakeReady.then` → teleport via
   `controls.pos/...` → screenshot). Debug API: `window.__app = {scene,
   camera, renderer, controls, doll}`, `window.__bakeReady` (Promise).
   If the pane isn't compositing, render offscreen and POST the canvas
   to a local save endpoint.
2. **The layout auto-check is the first thing to look at after an
   edit.** `validate.js` runs on load and reports to the console;
   `?check=1` shows a badge. It catches three bug classes: a blocked
   opening, an opening into the void (no floor behind it), and a room
   unreachable on foot from the start (0.25 m grid walk with player
   collisions and floor levels). The report also lives in
   `window.__issues`. **Rule: the list must be empty before commit.**
2a. **Walk simulation — for a specific route**: set the position, hold
   `controls.keys.KeyW = true`, run `controls.update(0.033)` in a loop,
   check the coordinates. Careful: a single run checks ONE line — a
   passage may exist yet be unreachable from the side (that happened
   with bedroom 3). Trust the auto-check, not one run.
   Never place furniture closer than 0.5 m to a doorway — passages have
   been blocked five times already (toilet, nightstand, vanity, shelf
   tower, dining table).
2b. **After any furniture rearrangement — a top view with the floor
   cutaway**: `doll.enter(); doll.setLevel('1'); doll.on = false;` then
   a top-down camera and a render. One frame catches blocked passages,
   furniture rotated across the room and objects floating mid-air.
2c. **After reshaping geometry — check for sky leaks**: Raycaster rays
   in 5 directions from the new zone (set `rc.camera`, otherwise
   sprites throw); 'SKY-LEAK' means a hole in the shell. Note: ceiling
   overlays are one-sided and hidden by the dollhouse cutaway — include
   invisible meshes when probing, or probe outside dollhouse mode.
2d. **Moving a wall? Check what was attached to it.** Paintings, wall
   panels and furniture store absolute coordinates: moving the wall
   leaves them hanging mid-air (happened with the dining-room painting
   and with a bathroom that opened into the stair bay). After a shift,
   raycast up over the new gap and inspect neighbouring rooms.
2e. **Removing or shortening a wall? Check what its collider guarded on
   the OTHER level.** A ground-floor wall can be the only thing keeping
   the player from walking off an upper-floor slab edge (the stair-void
   east edge needed a `rail` wall after the corridor was opened).
2f. **Re-list floor slabs, don't patch one by one.** The upper floor is
   several rectangles; a forgotten stale slab becomes a ceiling over the
   stairs. Check: rays up from three points of the flight must reach
   the roof, not a slab.
2g. **Fixtures moved? Move their dependents.** Photo spots, spawns and
   area markers are absolute too — after rearranging a bathroom the
   photo spot ended up inside the bathtub. Grep the JSON for
   spawns/photoSpots/areas near any zone you touch.
3. **Cache**: any JS/JSON change requires bumping `?v=N` in ALL
   `<script src>` tags in `index.html` — bump AFTER the last JS edit,
   or the new code gets cached under the old version. The apartment
   config is fetched with the same `?v=` (main.js reads the version off
   its own tag), so without a bump JSON edits never arrive — this bug
   has already cost an hour. Verify delivery: compare a field from APT
   in the console with the file.
4. **Perf budget**: ≤160 draw calls anywhere (currently ~90–155; the
   plan-true open corridor exposes more merged buckets from the entry
   than the old walled layout did). New
   furniture goes through `F.*` constructors in builder.js: it merges
   into the static meshes automatically and gets a shadow occluder. No
   new dynamic PointLights — light lives in the bake (`dyn: true` on 8
   lamps only).
5. **Geometry**: don't render door leaves (openings must read as open).
   Tall walls (h>4) get 'both' collision. The terrace (y=2.98) sits
   above the ground-floor ceiling (2.8+0.08) — don't lower it. The
   south attic knee is below eye level — the camera clamps via
   `Builder.atticH`.
6. **Photos**: `tour/photos/<id>/*.webp` ≤1200px (webp is not covered
   by the `.gitignore` `*.jpeg` rule). Apartment source photos in the
   repo root are ignored.
7. **The JSON config is the single source of data.** No coordinates in
   code. Angles in degrees; bulk config edits are easiest via a Python
   script.
8. **Language**: the whole project — UI strings, JSON room names, docs,
   code comments — is in English.

## Adding an apartment

1. `apartments/<new-id>.json` (copy kings-court.json as a template)
2. Photos → `photos/<new-id>/`, set `meta.photoBase` and `photoSpots`
3. A card in `apartments/index.json`
4. Open `?apt=<new-id>` and run the checklist: start, every room on
   foot, stairs, terrace, dollhouse on both levels, measuring tape,
   every photo spot
