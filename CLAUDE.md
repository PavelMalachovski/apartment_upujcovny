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

# offline lightmap bake (needs the server above running, and playwright).
# KEPT, BUT IT CANNOT RUN AS THE TREE STANDS — corrected 2026-08-15; this
# row previously said "kept working", which was false. The serenity pilot
# failed its exit criterion and was reverted, and tour/lightmaps.js — the
# runtime loader that consumed its output — was removed with it. The driver
# stamps its manifest with that loader's Lightmaps.hash(), so with the
# loader gone the run ends in a ReferenceError. It now refuses at the top
# with that message instead, before it writes anything; restore the loader
# first. See the `lightmaps` row.
node tools/bake_lightmaps.mjs --apt serenity
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
| `builder.js` | Config → scene: walls with openings, attic slopes, floors/ceilings, stairs, terrace, furniture constructors `F.*` (chamfered edges via `chamferBoxGeometry`), occluders and light sources for the bake, `mergeStatic`. Plan 4c added the exterior set — `F.poolEdge` (coping band, submerged wall, basin floor, rippled water surface), `F.plantMass` (hedge body with alpha-cut canopy fronds), `F.slatFence`, `F.windowBench`, `F.lounger` — and three **opt-in** options on `F.shower` (`divider` `'n'|'s'|'e'|'w'`, `valve`, `handheld`) that default off, so its other six callers are unchanged |
| `bake.js` | CPU lightmapper: floors/ceilings/slopes → CanvasTexture lightmaps (uv2, MeshBasic). Occlusion on those surfaces is **one** estimator, the hemisphere visibility that scales the indoor ambient (`ambientVis` → `sampler.js`, 16 cosine-weighted rays to `AMB_DIST` 0.65 m over the real triangles); `aoAt` is deliberately NOT applied there any more — it measured the same thing at 0.6 m over AABBs and multiplying both squared the occlusion. `aoAt` (no lower clamp — a fully enclosed sample really is 0) still runs on furniture vertices via `bakeFurnitureAO`, its only remaining caller and the only consumer of `quality.aoRays`. Lightmaps are edge-dilated **per boundary texel, only where that texel's footprint overlaps a wall** — a blanket border would plant a plateau down the interior seam between two floor plates (hard rule 2f). `window.__ambSampled` reports whether the sampler was live; false means the render is the flat pre-B3 ambient and any measurement of it is void. Walls → one merged mesh per level with per-vertex baked light only, **no occlusion of any kind**: `bakeWalls()` calls `lightAt()` with `sampled=false`, so a floor-to-wall corner still darkens on the floor side only. Two defects blocked closing it, both written up above `bakeWalls`. **The first is FIXED** (plan 4a task 1, `b767b4b`): `grid()` used to reverse the winding on **8 of its 12 faces** — all six of an along-z piece, plus top and bottom of an along-x one — so the renderer showed the far face, 14 cm from where the visitor thought the surface was. It is now wound to match the normal it is passed, by a **sign test** (`flip` when `(uVec × vVec) · n < 0`) and explicitly **not** by reversing the `else` branch, which would leave top and bottom broken everywhere; that wrong fix has been proposed twice and the comment block above `bakeWalls` exists to stop a third. Pre-fix probe of record: along-x showed near 4/4 serenity, 19/19 kings-court, 6/6 horkyone-10 and along-z showed far 5/5, 23/23, 9/9 (the older 8/8, 17/18, 6/6, 14/16 figures counted a different population and are superseded). **The second is still live**: reveals, tops and bottoms are single 1×1 quads whatever `SEG` says, so corner-sampled Gouraud cannot carry contact shading and refining `SEG` cannot help. Plan 4a task 2 tried the sampled ambient on walls anyway and returned **NO-GO** (serenity linear contrast 3.9347 against a required ≥4.32, reverted in full) — with the smearing artefact suppressed as far as that sweep could, vertex shading buys about **+0.23 of the +1.11** required. Read that at its scope: it bounds *vertex-shaded* walls, not walls. The per-texel wall lightmap atlas is the open path, task 1 **unblocked** it, and its remaining cost is a from-scratch atlas rasteriser |
| `post.js` | Post-processing chain: restrained bloom + film grain/vignette (`Post.create`), degrades to a plain render when the example files are missing or the GPU is weak; no SSAO — occlusion lives in the bake: hemisphere visibility on floors/ceilings/slopes, `aoAt` on furniture, nothing on walls (see `bake.js` above). `GTAOPass` was vendored, wired in and measured on all three apartments, then rejected — see hard rule 4 and the file's own header |
| `lib/three-0.185.0/` | Vendored Three.js r185: `build/three.module.js` + `build/three.core.js` (the facade imports the core, which is where `REVISION` lives), and the `examples/jsm/` addons the post chain needs — `postprocessing/{EffectComposer,RenderPass,ShaderPass,MaskPass,Pass,UnrealBloomPass,OutputPass}`, `shaders/{CopyShader,LuminosityHighPassShader,OutputShader}` — none of which ship in the core build. **The version is in the directory name, not a `?v=` query**: addons import each other by relative path and a relative specifier does not inherit the importing module's query string, so `?v=` would version only the files named in the importmap and leave every transitively-imported file cacheable forever. Never edit anything under here |
| `measure.js` | Resemblance capture, loaded only under `?measure=1`. **`c.pitch` was a hard 0 until plan 4c task 1b** and now reads the spot's optional `pitch`; `compare.js` was changed in step so the divider and the scorer use the same camera: renders every `compare`-flagged photo spot from its own camera/aspect and POSTs the frame to `tools/serve.py`'s save endpoint for offline `tools/delta_e.py` scoring |
| `validate.js` | Layout self-check: blocked openings, openings into the void, unreachable rooms, markers inside solids |
| `controls.js` | Walking: WASD + drag-look (NOT pointer lock), touch joystick + swipe, collisions against wall segments and furniture AABBs, floor levels via `groundZones`, camera clamped under attic slopes |
| `doll.js` | Dollhouse: orbit camera, ground/upper/whole cutaway, m² badges, measuring tape, click-teleport. **The tape and the teleport are the only UI that reads geometry off the merged wall mesh** — `floorPoint`/`teleport` raycast and test `h.face.normal`, which is the *winding* normal under FrontSide culling, so anything that changes triangle order in `bake.js` changes what they return. Plan 4a's winding fix silently made both land on wall **tops** until they were taught to skip `userData.doll` meshes; re-drive them after any winding or wall-geometry change |
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
| Draw-call budget | ≤400 desktop, ≤250 mobile (Serenity entrance measures **78** after plan 4c's exterior; 72 at that branch's own BASE, 69 in phase A) | measured, revised in phase A — see rule 4 |
| Bake time | no fixed ceiling; latest medians (3 runs, one machine, phase B3 task 2): serenity 2620 ms, horkyone-10 2715 ms, kings-court 11460 ms — **ratios, not seconds** | see rule 4a |
| Dynamic PointLights | ≤8, flagged `dyn` in the config | `builder.js` |

Yaw convention: forward is `(-sin(yaw), -cos(yaw))` — **yaw 0 looks
north (−z)**, 90 west, 180 south, 270 east.

## Config keys added by the photorealism phase

On top of the shape documented in `docs/PROMPT.md` §3, the apartment JSON
now carries:

| Key | One-liner |
|---|---|
| `exposure` | `renderer.toneMappingExposure` override, fitted per-apartment against its own photographs where it has any (`app.js`); an apartment with none is still fitted, not left at the default — horkyone-10 has zero `compare` spots and ships 0.42 (was 0.46), fitted on mean-scene-luminance proximity to the other two (within ±10) instead of resemblance (`docs/superpowers/metrics/README.md`, "horkyone-10: fitted, and it passes the ±10 luminance check"). The bare default 1.05 is only what an apartment with an absent or invalid key falls back to. Must be a finite number `> 0` — `app.js` warns and falls back to 1.05 for anything else (`null`, `0`, a string). **Compensates for the scene running about three and a half times as hot at source** (1.05 / 0.295 ≈ 3.6): serenity's fitted value is 0.295, kings-court's 0.52. Anyone correcting `lightAt`'s constants in `bake.js` must re-fit or clear this per-apartment override, or the render goes several times too dark — and that is not hypothetical: phase B3 task 2 changed `lightAt`'s indoor ambient, and its own before/after (`tools/luminance.py`, the poseVerified compare spots, `?fov=legacy` — `*-b3-task2-luminance.json`) measures the cost as **−0.0058 of linear mean luminance at serenity (0.2854→0.2796) and −0.0063 at kings-court (0.3423→0.3360)**. Plan 3 task 4 then re-fitted all three exposures upward to put the mean back: 0.326→0.329, 0.56→0.575, 0.45→0.46. **Those three values, and the `1.05 / 0.329 ≈ 3.2` this row used to compute from them, are superseded and are kept here only as the lineage.** Plan 4a task 1 fixed the `grid()` winding defect, which brightened every apartment and expired that fit exactly as the deferred-item write-up predicted; plan 4a task 3 re-fitted against the post-winding render on the mandated **all-spot** population: 0.329→**0.295**, 0.575→**0.52**, 0.46→**0.42** (fitted and measured at `?v=110`; the tree is at **`?v=112`** after two comment-only bumps that moved no value — branch `phaseB-plan4a-winding`, ~~and `main` still carries the older three until it merges~~ **and `main` carries these three: plan 4a merged as PR #30 (`feac92a`), and `origin/main` ships 0.295 / 0.52 / 0.42 at `?v=113` — corrected 2026-08-19 by plan 4b task 5 fix round 3, verified by reading `origin/main:tour/apartments/*.json` directly. The old sentence was wrong on both halves: 4a is merged, and `main` does not carry the older three**). Same rule as before — fit toward luminance, never toward ΔE. **Superseded again for serenity, 2026-08-19 by plan 4c task 4: serenity ships 0.31, kings-court and horkyone-10 are unchanged at 0.52 and 0.42.** The population moved with it and that matters more than the value: `tools/luminance.py` filters through `delta_e.scorable` and has **no `--all-spots` escape hatch**, so serenity's luminance-fitting population went 9 → **10** the moment plan 4c task 1b flipped `10.webp` to `poseVerified`. The new fit is therefore **not comparable** to 0.295, which was fitted on 9. Render mean 0.2939 against the photographs' 0.2924. ΔE was recorded at every swept value and chose nothing: it falls monotonically toward the *dark* end (0.27 → 14.21, 0.295 → 14.23, 0.31 → 14.32) while luminance says the render is too dark at 0.295, so obeying the rule cost 0.11 of ΔE. **Recorded and not fixed:** at 0.31 the render's p5 is 0.0760 against the photographs' 0.0379 — shadows twice as light — and raising exposure to match the mean makes that *worse*, because exposure is a global multiplier. horkyone-10's ±10 band was re-derived rather than carried across (serenity 142.18, kings-court 148.81, window **[138.81, 152.18]**, horkyone-10 at 0.42 measures 145.14 — inside, unchanged, and **checked**, because plan 4a task 3 found the then-shipped 0.46 had silently fallen out of its own band). Working: `docs/superpowers/metrics/serenity-b4c-task4-luminance.json`. |
| `sky` | **Added by plan 4c task 1.** `{top, bottom, fog}`, each `"#rrggbb"` and each optional; the key itself is optional. Present → a vertical gradient background (an 8×256 canvas mapped equirectangular) with the fog colour kept in step. **Absent → the flat `0xbcd5e8` clear this scene has always had**, which is why kings-court and horkyone-10 do not move: it is enabled on **serenity only**. A malformed value gets a named `[app]` warning and the same flat fallback — never a black screen. Opt-in deliberately: a global background change would have forced re-fitting three exposures and re-baselining two photographed apartments for the sake of one flat's two spots. That the absent path really is inert was **measured, not asserted** — rendering kings-court from BASE and HEAD served simultaneously puts the pair at mean abs pixel diff 0.2549, *inside* the 0.2447 between two loads of the same BASE tree (`kings-court-b4c-task1-skyguard.json`). Note what that also says: nothing here is byte-identical across two page loads. **The sky cannot reach the photographs' brightness at serenity's exposure** — every channel saturates around 176/255 for any source colour at 0.31 — so `10.webp`'s zenith of (167, 211, 239) is out of range and the shipped gradient is the closest reachable. |
| `palette` | Map of material key → `#rrggbb`; every key optional, an invalid or absent value falls back to the hardcoded constant (`Materials.color`). **Not** produced by directly sampling the photographs — that was measured and rejected (ΔE2000 16.79 vs. 16.57 doing nothing, task 8) because it double-counts illumination as albedo. The committed values were derived by a closed-loop correction (render's own colour vs. the photograph, old albedo scaled by the ratio) done by hand for task 8; `tools/sample_palette.py` outputs raw sampled photo colour only — see its header — and is a diagnostic input to that by-hand process, not something whose output can be pasted into `palette` directly. |
| `quality.aoRays` | Ray count for the baked ambient-occlusion sampler (`bake.js aoAt`); defaults to 8 when the block or key is absent. Since phase B3 it reaches **furniture vertices only** — lightmapped surfaces get `ambientVis` instead, whose ray count is `AMB_RAYS` in `bake.js` and is deliberately not configurable |
| `env.capture` | `{x, y, z}` override for where the environment-reflection panorama is shot from; falls back to `roomCenter.main`, then `start`, then the world origin (`app.js`) |
| `lightmaps` | **Historical — nothing reads this key today, and the loader that did is no longer in the tree.** It meant: this apartment ships an offline lightmap pack under `tour/lightmaps/<id>/`, load it instead of baking those surfaces. **Serenity had a pilot pack; it FAILED its exit criterion and was REVERTED by the human partner's decision**, along with `tour/lightmaps.js` — measured linear contrast 3.384 against a required ≥4.9, and a blind six-pair A/B that could not separate the frames at viewing size. It failed *by construction*, not by tuning: contrast is mean÷p5, so reaching 4.9 needed p5 to **fall** 31%, and bounce light **raised** it 2.5% — and the same conclusion holds on every population in the record, including the friendlier spawn-pooled one (~3.415 vs 4.9). It was not a no-op (it filled the ceiling/wall perimeter and the floor beside obstructions, up to ~100/255 locally). It moved all-spot legacy ΔE the wrong way in **both** independent readings — task 5 **16.59→16.75**, task 6 **16.61→16.71** — so the runtime-bake band is 16.59–16.61 against 16.71–16.75 with the pack; after the revert serenity reads **16.59–16.60**, back inside the first band. **Do not extend it to another apartment, and do not re-adopt it on serenity without redoing the exposure and bloom re-fit.** `tools/bake_lightmaps.mjs` is kept (it is outside the deploy root, so it costs the product nothing) but **cannot run** until the loader is back — it stamps its manifest with `Lightmaps.hash()`, so it now refuses at the top with that message rather than writing a pack it cannot finish. Re-adopting is a checkout, not a rebuild: baker, loader, pack, guard and all measurements are in git history at **`6a607fa`** — `git checkout 6a607fa -- tour/lightmaps.js tour/lightmaps/serenity`, re-add `lightmaps.js` to `main.js`'s `CLASSIC` list and the key here; `bake.js` needs no edit, its `typeof Lightmaps === 'undefined'` guard is what makes the loader's absence safe. **Restoring it re-opens three known guard gaps, all reviewed and recorded rather than fixed, because the pilot was reverted before they mattered — close them as part of any re-adoption, not after:** (1) the per-surface geometry guard compares `w`/`h`/`pos`/`outdoor` but **not** `res`, `lvl`, `px` or the mesh quaternion, so a ceiling flipped in rotation at the same position and extent passes the guard and ships a mirrored lightmap — exactly the class the guard exists to catch; (2) an empty `man.surfaces` satisfies `0 === 0` and yields `status: 'ok'` with `loaded: 0`, i.e. a silently empty pack reads as a successful load; (3) neither the manifest fetch nor the texture loads carries a timeout, so a stalled-but-open response leaves `__bakeReady` unresolved and the start overlay up forever. Verdict and costs both ways: `docs/superpowers/metrics/serenity-b3-task6-verdict.json` |
| `pitch` (on a `photoSpots` entry) | **Added by plan 4c task 1b.** Optional downward camera tilt in **degrees, positive = looking down**; absent or non-finite → 0, which is every spot that has never had one. Honoured identically by `measure.js` and `compare.js`, deliberately: the divider is what a reviewer judges `poseVerified` on, and a divider showing a different camera from the one the scorer uses is worse than no divider. **The sign is negated in `main.js`** because `controls.pitch` feeds `camera.rotation.x`, where positive looks *up* — established by sweep, not assumed. Why it exists: the harness pinned pitch to 0, so no photograph shot looking down could be reproduced at any yaw or fov, and serenity's `10.webp` puts the pool's far edge at 0.41 of frame height — **above the horizon**, which a level camera cannot produce. Values are derived by matching *measured* band rows between render and photograph, never by ΔE. ~~Only serenity's `2.webp` (40) and `10.webp` (22) set it; the other nine serenity spots and all thirteen kings-court spots are still captured at 0 and were pose-verified under that constraint, which is an open item, not a clean bill.~~ **Superseded 2026-08-22 by plan 4e, which swept all twenty-four `compare` spots in both flats.** Counts read from `docs/superpowers/metrics/{serenity,kings-court}-b4e-derivation.json`, not recalled: **serenity ships seven keys** — its six tilt-confirmed spots `4` (9), `6` (−6), `7` (13), `9` (1), `10` (22), `11` (−6), of which `10`'s 22 is an independent re-derivation that reproduced plan 4c task 1b's value and residual, plus `2.webp`'s 40, which the plan's own carve-out excluded from change; `1`, `3`, `5` and `8` ship no key (`5` and `8` level-confirmed, `1` and `3` no-usable-landmark; `2` is level-confirmed at its own landmark yet keeps 40 under the carve-out). **kings-court ships none at all** and `tour/apartments/kings-court.json` is byte-identical to `main`: 0 tilt-confirmed, 1 level-confirmed, 10 no-usable-landmark, 2 will-not-converge — its renders and photographs do not share enough unambiguous common architecture to derive a tilt, which is an honest outcome and not a failure to try harder. **The derivation is geometric**: a *named* horizontal landmark, crop-confirmed as the same physical object in both frames and measured at one column in each; an automatic proposal only narrows the sweep window, and ΔE chooses nothing. **Automatic fitting of tilt and lens together was tried and rejected by measurement** before the plan spent a single browser capture — see `docs/superpowers/metrics/b4e-preflight-method-rejection.json`, and do not re-propose it. **A tight residual is a property of the method, not evidence of correctness**: a row read at a fixed column slides monotonically with tilt, so an *unrelated* render line can always be swept into agreement with an unrelated photograph row, and it converges tightly — the discarded kings-court pass reached residuals of 0.0002–0.0065 on four spots that were each measuring two different physical objects. Only same-object identity, established by *looking* at both frames, separates a derivation from a coincidence; this error class occurred in both apartments' first attempts and was caught only by review. **Two different cameras read this key**: the gate runs at a fixed 72° vertical under `?fov=legacy`, while the divider runs at the per-spot fov — measured this session on serenity, **88.5°** on its eight 16:9 landscape spots, **120°** on `10`/`11` and **65°** on `9.webp`'s own `vfov` override — so a value that merely aligns rows means two different things in the two places `pitch` is read. Every shipped tilt is therefore **conditional on the assumed 72° gate lens**, and **cannot be converted by a single coefficient** if `meta.photoFovLong` moves: the same pre-flight measured that sensitivity at a median of 0.15 degrees of pitch per degree of assumed vfov but a range of −0.617 to +1.217 across the two flats' spots. |
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

**The bump does not help if `index.html` itself is cached, and that is a
different failure with the same symptom** (found 2026-08-19, plan 4c task 1).
`tools/serve.py` sends no cache headers, so a browser that already has
`index.html` will happily re-use it — and then every classic script loads at
the *old* `?v=`, because the tag it reads them from is inside the stale
document. What that looks like: your edit is in the file, `curl` proves the
server is serving it, and the page still runs the old code. Three new `F.*`
constructors were silently skipped this way (`buildFurniture` does
`if (!fn) continue`, so an unknown type is not an error), and the scene
rendered with the geometry simply missing. **Check the loaded version, do not
assume it:**

```js
[...document.querySelectorAll('script')].map(s => s.src.split('?').pop())
```

If they read the old number, reload with a cache-buster on the *document* —
`/index.html?apt=serenity&cb=1` — not just on the module tag.

**4. Performance budget: ≤400 draw calls desktop, ≤250 mobile.** Raised
from the original ≤150 in the photorealism phase: that ceiling was
measured against plain box furniture with no post-processing, and the
chamfered edges (more triangles, still one draw call per merged mesh)
plus the bloom/grain/vignette chain (a handful of extra full-screen
passes on top of the scene) both add real cost that has nothing to do
with regressed batching. Serenity's entrance measures **78** draw calls
with the full chain running (72 before plan 4c added the pool basin, planting
mass, boundary fence and deck; measured BASE-vs-HEAD in one session, so the
+6 is this branch's and not the machine's) — comfortably inside budget; see the fixed
"Draw calls in a spot" recipe below, the naive version undercounts by
roughly 14. **(This said 69 from phase A until 2026-08-16, when plan 4a's
whole-branch review re-ran the recipe verbatim and got 72, three runs in a
row. The cause is uninvestigated. It is not plan 4a's: the merge-base
`b39a99a` measures 72 as well, on the same machine in the same browser
session, so the difference is between the phase-A machine and this one, not
between the two trees. A triangle-order fix cannot change draw-call count.)** New furniture goes through `F.*` constructors so it merges
automatically and gets a shadow occluder. No new dynamic PointLights —
light lives in the bake. Markers are `THREE.Points`, one object per
level; sprites do not batch and 14 photo spots used to cost 14 calls.
**Zone-splitting the merged meshes was measured and rejected**: the flat
is a single 28 m sightline, so at the entrance every zone stays inside
the frustum and the split only adds calls. Do not retry it.
**Screen-space AO (`GTAOPass`) was measured and rejected too**, phase B
plan 3 task 3: its depth/normal prepass is a second full scene pass, so
kings-court's entry hall goes 150 → **282** mobile calls against ≤250
(desktop 165 → 311, inside ≤400). And before the budget even matters, it
blackens whole walls on every device — GTAO is the first thing here that
reads scene normals, and the walls present their far face (the deferred
winding defect in `bake.js grid()`). Do not re-add it without reading the
`OUTCOME` block under task 3 in
`docs/superpowers/plans/2026-08-13-phase-b3-light.md`; the working code is
preserved at `docs/superpowers/rejected/2026-08-13-b3-task3-gtao/`.

**4a. Baking has no fixed time budget — it is whatever the geometry
costs, and one apartment is already slow.** Reference medians of three
runs, recorded before this phase: serenity 267 ms, horkyone-10 1323 ms,
**kings-court 8674 ms**. That base cost predates the phase — kings-court
was already the largest, most detailed apartment, and the CPU lightmapper
was always going to cost more for it; this phase did not create that
slowness. Remeasured this session on different hardware: serenity 323 ms,
horkyone-10 1647 ms, kings-court 9942 ms — **15-24% higher, consistently,
across all three.** That consistent proportional rise is equally
explained by the hardware difference or by phase A's AO baking (`aoAt()`
**then** ran for every lightmap texel as well as every furniture vertex —
phase B3 task 2 dropped it from lightmap texels, so at HEAD it runs on
furniture only; see the `bake.js` row and `quality.aoRays` above)
costing something everywhere; the two measurements were not taken on the
same machine, so this cannot be isolated further with what's on hand.
Don't read more into it than that — say what the data supports (a
same-direction, similar-sized rise on all three apartments) and no more.

**Phase B3 task 2 raised it again, deliberately.** Same machine both
sides, medians of three loads: serenity 2026 → **2620 ms** (1.29×),
kings-court 8443 → **11460 ms** (1.36×), horkyone-10 2620 → **2715 ms**
(1.04×). That is the hemisphere sampler (`ambientVis`, 16 BVH rays per
lightmap texel) minus what dropping `aoAt` from those same texels gave
back. It is a bought cost, not a regression — do not go hunting for one.
Note the absolute seconds here are much larger than the two older rows
above and **the three sets are not comparable**: they were taken on three
different machines, and this one's spread on an *identical* build reached
2× (kings-court 11301–21768 ms across three loads). Compare ratios within
one machine's before/after pair and nothing else. An intermediate
configuration measured on this same machine ran the sampler at 1.2 m with
`aoAt` still multiplying and cost 1.70× / 1.99× / 2.41× — roughly double
the shipped cost, which is what the radius and the removed second
estimator are worth.

**Two ratios are on record for that same task-2 change on kings-court, and
both are right — do not carry away only the one above.** This row's
**1.36×** (8443 → 11460 ms) is task 2's own machine measuring its own
before/after. Plan 3's closing gate re-measured the same change on a
*different* machine, serving the BASE and HEAD trees simultaneously, and
got **about 3×** (warm medians 3133/3136 → 9858/11554 ms, with the two
sides' raw loads disjoint in both batches) —
`docs/superpowers/metrics/README.md`, "Bake time: one supportable claim,
and a warning about the rest", which is also where the reasons the other
two apartments support *no* claim are written down. Neither figure
supersedes the other under this rule's own "compare within one machine's
pair" instruction; they are two machines' pairs. The supportable summary
is **1.4×–3× on kings-court: direction certain, magnitude
machine-dependent.**

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
scene that is already merged into a handful of huge meshes. **Wall faces
are wound to match the normal they are given** — `grid()` in `bake.js`
reverses a quad when `(uVec × vVec) · n < 0`, so the merged wall mesh
presents the face a visitor is standing in front of rather than the one
14 cm behind it (fixed in plan 4a task 1; before that, 8 of 12 faces were
inside-out). The material is `MeshBasicMaterial` with backface culling
live and no `side` override, so any new wall geometry must go through
`grid()` or reproduce that test — a hand-rolled quad with the wrong
winding renders as a hole from the side a visitor sees, and moving those
faces moves apparent room dimensions: every measurable **x** span in all
three apartments shrank by exactly **0.280** (2 × the 0.14 wall thickness)
and every **z** span by exactly 0.000, because the reversed faces belonged
to walls running along z, which bound a room in x. Each room now measures
its configured centreline distance minus 0.14 exactly — the correct
dimension, not merely a closer one.

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
console.log(a.renderer.info.render.calls);   // Serenity entrance: 78 (72 pre-4c, 69 in phase A)
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
