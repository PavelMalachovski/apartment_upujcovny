# Phase B — engine migration and photoreal quality: design

Date: 2026-08-12
Status: approved for planning

Supersedes the "Phase B" section of
`docs/superpowers/specs/2026-08-12-photorealism-design.md`, which was written
before phase A ran. Reads on top of `docs/PHASE-B-HANDOFF.md` and
`docs/PHASE-B-OBSERVATIONS.md`; where this document and the handoff disagree,
the disagreement is stated and the evidence given.

## Goal

Migrate to a current Three.js and raise the three tours to a quality level a
host or estate agent can put in front of a paying client — with the
resemblance to the real photographs measured, not asserted.

Phase B is finished when all three apartments have migrated without
regression, one apartment demonstrates the new quality level end to end, and
`CLAUDE.md` and `docs/PROMPT.md` describe the result accurately enough that
someone can add a fourth apartment by following them.

## What decided this design

`docs/PHASE-B-OBSERVATIONS.md` — the step-0 walkthrough of all three tours.
Fourteen observations, each mapped to a feature and to whether ΔE2000 can see
it. Three of its findings shape everything below:

- **C1** — the comparison camera has never had the right field of view.
  `measure.js` sets `camera.aspect` per photograph and never touches
  `camera.fov`, fixed at 72° vertical. 16:9 photographs are scored against a
  104.5° horizontal render, the three portrait ones against 55°.
- **B1** — serenity's living room does not match its own photograph: a
  punched window where the flat has a floor-to-ceiling sliding door. It scores
  16.25, better than that flat's average, while the two frames are visibly of
  different rooms.
- **A1/A2** — only serenity has a fitted exposure. The other two ship at the
  renderer default and sit ~45 luminance points brighter. In all three, the
  darkest 5% of the frame never falls below 32% grey.

## Decisions taken

Each of these closes a fork the handoff left open, or that step 0 opened.

**1. Migrate first; the foundation work happens on the new engine.** The
harness port, the FOV fix and the exposure fits all land after r185, not
before.

**2. Classic `WebGLRenderer`, not WebGPU. The fork is closed on evidence, not
preference.** The handoff calls WebGL2-versus-WebGPU "the first fork your plan
must resolve" because it believes GTAO arrives only through the node-based
`RenderPipeline`. Checked against r185: `examples/jsm/postprocessing/` ships
**`GTAOPass.js`**, alongside `SSRPass.js`, `TAARenderPass.js`, `OutputPass.js`,
`UnrealBloomPass.js`, `EffectComposer.js` and `RenderPass.js` — all classic
passes under `EffectComposer`, no WebGPU involved. `three-gpu-pathtracer` is
WebGL2-only as well. Nothing phase B wants requires the node path, and
committing to it would mean two render paths on maintenance plus a rewrite of
everything in `post.js`, `doll.js` and `app.js` that assumes a classic
renderer.

**3. Content pilot: serenity.** One apartment reaches the new quality level in
full; the other two migrate without regression and get their exposure fitted.
serenity because it is small (45 m², five rooms), because every phase A number
was measured on it, and because its 11 compare spots keep the trend
interpretable. Its cost is **B1**: the living-room geometry must be fixed
before any furniture is placed.

**4. Light: cheap and universal first, expensive and local second.** In order:
fix the source in the existing baker, add GTAO, then pilot offline
path-traced lightmaps on serenity with a **pre-agreed exit criterion**.

**5. `three-gpu-pathtracer` cannot bake lightmaps, and the handoff is wrong to
imply it can.** It says "the lightmap workflow is anticipated by its authors"
because `xatlas-web` is a peer dependency. Checked: version 0.0.24, peers
`three >= 0.180.0`, `three-mesh-bvh >= 0.7.4`, `xatlas-web ^0.1.0` — and
**zero occurrences of "lightmap" anywhere in the repository**. What it
actually ships is `src/utils/UVUnwrapper.js`, a xatlas wrapper that unwraps a
`BufferGeometry` (itself derived from Mozilla Spoke, MIT). A UV unwrapper is
not a baker. The inference from a dependency to a feature is exactly the
"written from memory rather than from the code" failure the handoff warns
about. **We take `UVUnwrapper` and write the integrator ourselves.**

**6. The render↔photograph slider ships as both an acceptance tool and a
visitor feature.** Its mechanics were built during step 0, and B1 and C1 are
what it found.

**7. `bake.js` is retained as an automatic fallback**, guarded by a manifest
hash, rather than deleted. See "Staleness" below.

## Sequencing

Steps 2–5 apply to all three apartments; 6–7 to serenity only. Model curation
is not code work and can run in parallel with 2–5.

**horkyone-10 cannot be measured, and steps 3 and 4 must say so.** It has two
photo spots and **none flagged `compare`**, so there is nothing to re-baseline
against and nothing to fit an exposure to. Two ways out, and the plan must
pick one explicitly rather than let the flat fall through the gaps: flag its
spots `compare` first, or accept it on observation A1's stated criterion —
mean luminance landing within ±10 of the two fitted apartments — and record
that in the commit. Silently skipping it is how a property ships over-exposed
for another whole phase.

| # | Step | Gate |
|---|---|---|
| 1 | Freeze the r128 baseline with the **current, unfixed** harness | Already committed: serenity 16.58, kings-court 22.44 |
| 2 | Migrate to r185, measured with that **same unfixed** harness | No regression against step 1 |
| 3 | Fix the FOV (C1), re-baseline | This is the new zero; both numbers published once |
| 4 | **Provisional** exposure fit | Every flat viewable; see the ordering note under Light |
| 5 | Light: source fix + BVH sampler + GTAO | p05 luminance falls; contrast rises |
| 6 | Offline path-traced lightmaps, serenity | Exit criterion below — a null result is a result |
| 7 | serenity content: B1 → B2 → GLTF → PBR | Slider at every compare spot |
| 8 | Re-validate **every** hand-tuned constant, final exposure fit | The step phase A's plan did not have |
| 9 | Rewrite `CLAUDE.md` and `docs/PROMPT.md` | Every number re-derived, every recipe run once |

**Why step 3 comes after step 2, and not before.** `PHASE-B-OBSERVATIONS.md`
recommends fixing the FOV before porting the harness. That is wrong and this
document supersedes it. The FOV error is *systematic*: it distorts both sides
of a before/after comparison identically and therefore **cancels in a
comparison while still corrupting an absolute number**. Measuring the
migration with the unchanged harness keeps the engine and the ruler from
moving at once — the exact confound that let phase A credit a metric
improvement to the wrong cause.

## Architecture after migration

### Renderer and post chain

Classic `WebGLRenderer` + `EffectComposer`:

```
RenderPass → GTAOPass → UnrealBloomPass → grain/vignette → OutputPass
```

The six vendored r128 UMD files in `tour/lib/` are deleted. `examples/js` was
removed in r148 and has no modern equivalent, so `post.js` is **rewritten**
against r185 addons, not ported; only its tuning intent survives.

### Modules without a bundler, and the cache trap

r185 is ESM-only, so an importmap replaces the `<script src>` tags. There is a
mine here that the phase A spec already lists as a risk: the rule "bump `?v=N`
on all tags" **stops working silently** under a prefix mapping, because
`"three/addons/": "./lib/jsm/"` cannot carry a version — those files arrive
from cache with no `?v` at all.

**Corrected while writing plan 1.** This document originally answered that by
enumerating every addon in the importmap with its own `?v=N`. That does not
work. Addons import each other by **relative path** —
`EffectComposer.js` does `import { CopyShader } from '../shaders/CopyShader.js'`
— and a relative specifier resolves against the importing module's URL
**without inheriting its query string**. Enumeration versions only the files
named in the map and leaves every transitively-imported file cacheable
forever, which is the same bug wearing a longer config block.

The fix is to put the version **in the path**: vendored library files live
under `tour/lib/three-<version>/`, so the URL itself changes when the library
does and every relative import inside the subtree inherits it. Third-party
files at a version-stamped path need no `?v` at all.

Our own files keep `?v=N`, and it collapses to **one tag**: `index.html`
carries a single `<script type="module" src="main.js?v=N">`, `main.js` reads
the version from `import.meta.url` (`document.currentScript` is null in a
module), and loads the remaining classic scripts itself with that same
version. Fifteen tags to bump becomes one — a chore that has already cost this
project an hour, removed rather than re-documented.

### Minimal migration, deliberately

`main.js` becomes the single ES module: it imports three and the addons,
publishes `window.THREE` and the addon classes, and then **loads the classic
scripts itself**, in their existing order.

It has to load them rather than let `index.html` do it, and the reason is a
trap worth recording: classic `<script src>` tags execute *before* deferred
module scripts, and `post.js:12` evaluates `const T = THREE;` at load time.
Leaving the classic tags in the HTML would throw `ReferenceError: THREE is not
defined` before `main.js` ever ran.

`builder.js` (62 KB), `bake.js`, `controls.js`, `doll.js`, `validate.js` and
`app.js` are **not converted to ESM**. They only declare classes and touch
`THREE` inside functions, so the global is in place by the time it is read.
Converting eight files to ESM in the same step as the engine change would make
any regression impossible to localise, and without a bundler it buys nothing.
**Explicitly out of scope for phase B.**

### New files

| File | Role |
|---|---|
| `tour/sampler.js` | BVH hemisphere sampler. One implementation, three consumers: runtime bake (8 rays), offline bake (thousands), per-vertex furniture AO |
| `tour/lightmaps.js` | Loads baked lightmaps, verifies the manifest hash, falls back to `bake.js` on mismatch or absence |
| `tour/compare.js` | The render↔photograph slider: `?compare=1` acceptance mode and the visitor-facing control |
| `tools/bake_lightmaps.mjs` | Playwright driver: opens `?apt=<id>&bake=offline`, collects the images, writes assets and manifest |
| `tour/lightmaps/<apt>/` | The lightmaps plus `manifest.json` (geometry hash, texel density, ray count, tool version) |

Vendored additions under `tour/lib/`: `three.module.js`, the enumerated
addons, `three-mesh-bvh` (0.9.14, peer `three >= 0.159.0`, ESM entry, no
`browser` field, runs in Node), and `UVUnwrapper.js` + the `xatlas-web` wasm
for the offline baker only. Attribution and licence recorded alongside each.

### Config additions

All optional, all backwards compatible. No coordinates move into code.

```json
"meta":       { "photoFovLong": 73 },
"photoSpots": [ { "file": "3.webp", "compare": true, "vfov": 58.7 } ],
"env":        { "hdri": "tropical-noon", "capture": { "x": 2.9, "z": 3.3 } },
"quality":    { "lightmaps": true, "aoRays": 8, "bakeRes": 2 },
"furniture":  [ { "type": "sofa", "model": "sofa-2seat-navy" } ]
```

### Budgets

Revised, as the phase A spec anticipated: **≤400 draw calls on desktop, ≤250
on mobile**, re-measured at the entrance and in two rooms after every geometry
addition. Measured today on kings-court, the heaviest: peak **144** calls at
**32,164** triangles. The scene is bound by material count, not geometry, so
the headroom GLTF needs is exactly where it exists. Total transferred weight
per apartment ≤50 MB, with lightmaps capped at 8 MB of that.

## Light

### The source fix

`lightAt` seeds every indoor sample with an unconditional ambient base
`0.40/0.385/0.36` (`bake.js:128`) that **no occlusion removes** — which is why
corners stay bright. `aoAt` returns `0.35 + 0.65 * (open / n)` (`:120`), an
occlusion floor nothing can go below. Both are replaced by real sky and
environment visibility queried through the sampler. Blacks become reachable.

Verified in source while writing this: `EXP = 1.7` (`:61`), point coefficient
`2.1` (`:143`), window coefficient `0.26` (`:166`), sun `0.62` (`:175`),
`WEXP = 1.25` (`:250`), and `bakeWalls` (`:241`) calling only `lightAt`
(`:264`) and never `aoAt` — so the handoff's claim that walls receive no
ambient occlusion at all is correct.

### The sampler

`tour/sampler.js` puts a BVH (`three-mesh-bvh`) over the merged geometry in
place of the 47 AABB occluders. One interface, ray count as a parameter: the
runtime calls it at 8 rays and stays inside today's bake budget; the offline
baker calls the same code at thousands. Walls get a UV atlas for the first
time (via `UVUnwrapper`) and with it the ambient occlusion they have never
had.

### The offline baker and staleness

`tools/bake_lightmaps.mjs` drives headless Chrome through Playwright, so the
scene is built by the shipping `builder.js` rather than a copy of it.

The manifest hash covers **only the geometry-relevant part of the config** —
walls, openings, floors, ceilings, attic, stairs, furniture positions, light
sources, `groundZones`. `photoSpots`, `spawns`, `areas` and `meta` are
excluded: they do not affect light, and hashing them would force a re-bake
because someone renamed a room. At load the runtime recomputes the hash and
compares. A mismatch produces a console warning and falls back to the runtime
bake. Shipping stale light silently becomes impossible.

### Exit criterion, agreed before the work

At serenity's 11 compare spots, lightmaps against GTAO-only, on two measures:
contrast and a blind A/B of six screenshot pairs.

**State the domain, or the criterion is meaningless.** Contrast here is
`tools/luminance.py`'s **linear-domain** mean over 5th percentile, on which
phase A measured render **3.6** against photographs **7.6**. The sRGB-encoded
figures in `PHASE-B-OBSERVATIONS.md` (serenity 1.83, kings-court 1.44,
horkyone-10 1.25) are a different scale, useful for comparing the three
apartments to each other and **not** interchangeable with these. Mixing the
two would produce a confident number describing nothing.

**Go if the lightmaps reach a linear-domain contrast of ≥ 4.9** — a third of
the 3.6 → 7.6 gap — *and* the blind A/B is visible. Otherwise stop, do not
carry them to the other two apartments, and commit the null result with its
measurement.

### One correction to the sequencing

Step 4 fits exposure before step 5 changes the light — which would invalidate
the fitted value. That is handoff fact 2 verbatim: a constant tuned before a
later change, with nothing re-checking it.

So step 4 is recorded as a **provisional** fit, needed only so steps 5–7 can
be judged by eye on a sane image, and the **final** fit happens at step 8 with
the rest of the constant re-validation. Both facts go in the plan explicitly,
so the provisional value is never mistaken for the shipped one.

## Measurement

### C1 — where the field of view comes from

Not one value per photograph. Every photograph of an apartment almost
certainly comes from one camera, so the config carries **`meta.photoFovLong`,
the angle across the long edge of the frame**, once per apartment, with an
optional `photoSpots[].vfov` for exceptions. For a landscape file that is the
horizontal angle; for a portrait file, the vertical one. The harness derives
`camera.fov` from each file's own aspect, which also fixes the
portrait/landscape flip that currently measures three of serenity's spots at
55° horizontal.

The value is calibrated with the slider: drag the angle until door jambs and
wall corners in the render sit on the photograph. The acceptance tool doubles
as the calibration tool.

### Re-baselining, and the break in the trend

Step 3 changes what every number means. Both the old-harness and new-harness
figures are published once, side by side, and `docs/superpowers/metrics/
README.md` states that phase A's trend line ends there. The series is not
quietly restated across the change.

`metrics/README.md` also carries a correction owed from phase A: the bloom
highlight it attributes to "a chrome fixture" belongs to `M.smoke`, the
bathroom's backlit mirror panel — `M.chrome`'s roughness is 0.25, not 0.1.

### The slider

`tour/compare.js`, one implementation with two faces:

- **`?compare=1`** — acceptance mode: steps through every compare spot,
  renders at that photograph's aspect and angle, draggable divider. This is a
  **mandatory step after every item in the plan**, because geometry errors of
  class B1 are invisible to the metric by construction.
- **Visitor feature** on spots flagged `compare`.

Both fix **D1**: photo-spot markers are excluded from capture frames. Today
they land inside the measured frame and are scored as part of the room — noise
in every phase A number — and in the tour itself they sit in the middle of the
view, four at once in serenity's living room and one against open sky on the
terrace.

## Content pilot — serenity

Strictly in this order. Furniture cannot go into a room with the wrong window,
and textures on boxes are wasted work.

1. **B1 — geometry.** The punched window in the living room's south wall
   becomes the full-height sliding door the photograph shows; curtains, rug
   and air-conditioner are added. Acceptance: clean validator, walk
   simulation, and the slider at spot 3.
2. **B2 — exterior.** HDRI plus real pool and planting geometry. Spot 10 is
   the catalogue's worst frame at ΔE 29.02 and the property's headline
   feature; today it is three flat bands.
3. **GLTF furniture.** `furniture[].model`, library under `assets/models/`,
   Draco/meshopt compressed. A model that fails to load falls back to the
   `F.*` constructor — never a black screen. CC0 or explicitly licensed only,
   licence recorded beside each asset.
4. **PBR textures.** Albedo + normal + roughness in KTX2 for oak, plaster,
   tile, marble and fabric. Procedural generators stay as the fallback, so the
   other two apartments' configs keep working untouched.

## Error handling and degradation

One rule, unchanged from phase A: **a missing asset degrades to the procedural
path with a console warning, and never produces a black screen.**

| Failure | Behaviour |
|---|---|
| Lightmap manifest missing, or hash mismatch | Warning; runtime `bake.js` |
| HDRI, KTX2 or GLTF fails to load | Procedural material or `F.*` constructor |
| No WebGL2, or a weak GPU by capability plus frame-time probe | Post chain off, reduced asset tier |
| Cube capture fails | Neutral gradient cube |
| A config field is present but the wrong type | Rejected with a named warning, default used |

That last row is a phase A defect made a rule: a config read accepted `null`,
`0` and `"0.33"` and rendered black with no warning. Types are validated at
every config boundary, not the ones we remember.

## Verification gates

Every existing gate stays: `window.__issues` empty under `?check=1`; walk
simulations asserting end coordinates into every room; sky-leak raycasts from
each zone; draw calls re-measured against the revised budget.

Added:

- **The slider at every compare spot after every plan item.**
- ΔE2000 must not regress — within a harness generation. Never compared across
  step 3.
- Mean and 5th-percentile luminance reported per apartment, per step.
- Fixed-camera screenshot set captured before and after every step.
- **Every acceptance criterion in `PHASE-B-OBSERVATIONS.md`** for the eight
  observations the metric cannot see. They were written before the work
  started precisely so they cannot be renegotiated after it.

And one gate on the gates, from phase A's failure catalogue: **a check that
cannot fail proves nothing.** Every new check is confirmed to fail on
known-bad input before it is trusted — probe the extreme, verify the value and
not its presence, and derive test inputs from the code path rather than by
eye.

Note for the rewritten `CLAUDE.md`: `validate.js` reports zero issues on all
three apartments while every observation in the table is true. It checks
navigation, not appearance. A clean validator is never evidence about quality.

## Deliverables 2 and 3

**`CLAUDE.md`, rewritten** to describe the migrated architecture rather than
patched. Every number re-derived from source and every recipe run once, as
written, before committing. Phase A's closeout found three false claims in it,
all from writing documentation from memory of the work instead of from the
code.

Two numbers already known to need re-deriving: the draw-call budget, and the
bake timings. `PHASE-B-OBSERVATIONS.md` records that kings-court's documented
10-second bake does not reproduce — 1937 ms measured, while serenity
reproduces to within 3%, so machine speed does not explain it.

**`docs/PROMPT.md`, rewritten.** Migration invalidates it in at least four
places: the local UMD copy with no bundler (line 34), the instruction to write
a CPU lightmapper (§5), ACES at exposure ~1.05 (line 222) and the ≤150
draw-call budget (line 230).

Weighting, per the handoff: **brief on what to build, exhaustive on how to
prove it works.** Phase A's value came almost entirely from its verification
protocol. The raw material is the handoff's failure catalogue plus the
observation table — in particular the two classes step 0 added: a metric whose
own camera was never checked, and a geometry error that every automated gate
passed.

## Risks

- **The offline integrator is code we write.** Mitigated by keeping the
  runtime baker as the fallback, and by the exit criterion that lets the
  lightmap work end as a measured null result rather than a sunk cost.
- **Light intensity recalculation in r185 can quietly ruin the bake.**
  Physically correct lighting has been the default since r155. Mitigated by
  the pre-migration screenshot set and the step-2 no-regression gate.
- **Cache invalidation changes shape.** Handled by the enumerated importmap;
  it is a migration step, not an afterthought.
- **serenity's exposure 0.33 must be cleared before anything is fitted.**
  Carrying it across a lighting-unit change renders about three times too
  dark, and it will look like the migration broke something else.
- **Asset licensing.** CC0 or explicitly licensed only; licence recorded with
  the asset.

## Out of scope

- WebGPU and the node-based `RenderPipeline` — closed by decision 2.
- Converting the classic scripts to ESM.
- 3D Gaussian splatting. Still deferred, still not blocked: it needs a modern
  Three.js, which is what this phase delivers.
- Any refactoring of `builder.js` beyond what the migration forces.
