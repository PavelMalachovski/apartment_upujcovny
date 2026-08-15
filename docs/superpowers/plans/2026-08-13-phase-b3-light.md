# Phase B, plan 3 — reachable blacks

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make shadow actually reach the frame. Today the darkest 5% of every
render sits above 30% grey because the baker seeds an ambient term nothing can
occlude and clamps its own occlusion at 0.35. Fix that at the source, give
walls the ambient occlusion they have never had, and then measure whether
offline path-traced lightmaps earn their cost on top.

**Architecture:** One BVH hemisphere sampler (`tour/sampler.js`) with three
consumers — the runtime bake at 8 rays, an offline baker at thousands, and
furniture vertex AO. `GTAOPass` from the r185 addons joins the existing post
chain. Offline lightmaps are piloted on serenity only, behind a manifest hash
so stale light can never ship silently.

**Tech Stack:** Three.js 0.185.0, `three-mesh-bvh` (peer `three >= 0.159.0`,
ESM, runs in Node), `UVUnwrapper` from three-gpu-pathtracer (xatlas, MIT, for
wall atlases only), classic `WebGLRenderer`, no bundler, no npm.

## Global Constraints

- Three.js **0.185.0** exactly. Classic `THREE.WebGLRenderer`. No WebGPU, no
  node/TSL.
- `builder.js`, `bake.js`, `controls.js`, `doll.js`, `validate.js`, `app.js`,
  `materials.js`, `post.js` stay classic scripts. Nothing converted to ESM.
- The JSON config is the single source of data. **No coordinates in code.**
- `window.__issues` empty under `?check=1` on all three apartments before
  every commit.
- Draw calls ≤400 desktop, ≤250 mobile.
- Everything in the repository is in English.
- Cache version on the single `<script type="module">` tag, bumped **after**
  the last code edit of a task. It is currently **`?v=92`**.
- **Vendored library files carry their version in the directory path**, never
  a `?v=` query — relative imports between addons do not inherit a query
  string. See `tour/lib/three-0.185.0/`.
- Third-party code is vendored **verbatim**, with its licence beside it.

## The constraint that governs this whole plan

**serenity's merge condition passes by 0.01–0.02 against a ±0.03–0.039 noise
floor.** Plan 2 closed it to parity: 16.57 against a 16.58 ceiling, where
16.58 is serenity's own final pre-migration score. PR #27 is out of draft on
that basis.

This plan changes `lightAt`, `aoAt` and the post chain — every one of them
upstream of serenity's render. **Any of them invalidates that margin.**

So:

- **Re-run the merge condition after every task that touches light**, all-spot
  population, and record it. Not at the end — after each one, so a regression
  is attributable.
- **If light changes, exposure and bloom must be re-fitted together.** They
  are coupled through the same buffer; fitting either alone makes it absorb
  the other's error. This is a standing rule, recorded in
  `docs/superpowers/metrics/r128-reference.md`.
- **Never fit toward ΔE.** Fit toward the photographs' luminance from
  `tools/luminance.py` and report ΔE as a consequence. Plan 2 caught exactly
  this substitution once already.
- **Track the fraction of frame over the bloom threshold, never the peak** —
  the peak scales with render-target size (9.75 at 240×150 to 16.23 at
  1280×800) while the fraction holds.

## What this plan is fixing, measured

From `docs/PHASE-B-OBSERVATIONS.md` and plan 1's record:

| Fact | Where |
|---|---|
| `lightAt` seeds every indoor sample with `0.40/0.385/0.36` that **no occlusion removes** | `bake.js:128` |
| `aoAt` returns `0.35 + 0.65 * (open / n)` — an occlusion floor nothing goes below | `bake.js:120` |
| `bakeWalls` calls `lightAt` and **never** `aoAt`, so a floor-to-wall corner darkens on the floor side only | `bake.js:241,264` |
| The sampler tests 47 AABB occluders, not the real geometry | `bake.js` |
| 5th-percentile sRGB luminance: serenity 81, kings-court 136, horkyone-10 156 | observation A2 |
| Linear-domain contrast (mean / p5), `tools/luminance.py`: render **3.6**, photographs **7.6** | phase A |

## File structure

| File | Responsibility |
|---|---|
| `tour/lib/three-mesh-bvh-0.9.14/` | **New.** Vendored BVH, version in the path |
| `tour/sampler.js` | **New.** Hemisphere sampler over a BVH. One implementation, three consumers |
| `tour/bake.js` | Modified: `lightAt`/`aoAt` consume the sampler; walls get an atlas |
| `tour/post.js` | Modified: `GTAOPass` added to the chain |
| `tour/lightmaps.js` | **New.** Loads baked lightmaps, verifies the manifest hash, falls back |
| `tools/bake_lightmaps.mjs` | **New.** Playwright driver for the offline bake |
| `tour/lightmaps/<apt>/` | **New.** Committed lightmaps plus `manifest.json` |

---

### Task 1: Vendor the BVH and build the sampler, failing first

**Files:**
- Create: `tour/lib/three-mesh-bvh-0.9.14/` (vendored, verbatim, with LICENSE)
- Create: `tour/sampler.js`
- Modify: `tour/main.js` (import and publish, as it does for the three addons)

**Interfaces:**
- Produces: `Sampler.build(meshes)` → an opaque handle; `Sampler.visibility(point, normal, rays, maxDist)` → fraction in `[0, 1]` of hemisphere rays that escape without hitting geometry; `Sampler.rayHit(origin, dir, maxDist)` → boolean.

- [ ] **Step 1: Vendor `three-mesh-bvh` 0.9.14**

Version in the directory path, never a query string. Fetch from unpkg the
same way `tour/lib/three-0.185.0/` was vendored, take the ESM entry and
whatever it imports relatively, and include the LICENSE. Then run the same
closure check that task used: every bare specifier must be `three`, every
relative one must resolve to a file on disk. Repeat until the set closes.

- [ ] **Step 2: Write the test before the sampler**

This project has no test runner, so the check is a browser-side assertion.
Write it first, and **write it so it fails on the sampler you have not built
yet** — a check that cannot fail proves nothing, and this repo has shipped one
that could not.

Add to `tour/sampler.js`, exported as `Sampler.selfTest()`:

```js
  // Floor-only geometry: a hemisphere sampled just above it, pointing up,
  // sees nothing above it -- visibility exactly 1, no occluder exists to
  // sample. Pointed DOWN, every ray hits the floor immediately --
  // visibility 0. A single ray answers the last two the same way,
  // deterministically. These are analytic: they do not depend on ray
  // count, jitter or the apartment, so a wrong answer means the sampler is
  // wrong rather than under-sampled.
  //
  // A true 90-degree corner (floor y=0, wall x=0, both large squares) is
  // its own case with its own geometry: sampled from just inside the
  // corner with the normal on the bisector, the escaping fraction is not
  // 0 or 1 but a specific cosine-weighted value, 1/sqrt(2) = 0.70710678,
  // derived by integrating the cosine-weighted hemisphere density against
  // the two half-planes -- see tour/sampler.js for the full derivation and
  // the measurement the 0.06 tolerance is drawn from.
  selfTest: function () {
    const T = THREE;

    const floor = new T.Mesh(new T.PlaneGeometry(20, 20).rotateX(-Math.PI / 2));
    const hFloor = Sampler.build([floor]);
    const P = new T.Vector3(0, 0.5, 3);
    const up = new T.Vector3(0, 1, 0), down = new T.Vector3(0, -1, 0);
    const openSky = Sampler.visibility(P, up, 64, 50, hFloor);
    const intoFloor = Sampler.visibility(P, down, 64, 50, hFloor);

    const cornerFloor = new T.Mesh(new T.PlaneGeometry(200, 200).rotateX(-Math.PI / 2));
    const cornerWall = new T.Mesh(new T.PlaneGeometry(200, 200).rotateY(Math.PI / 2));
    const hCorner = Sampler.build([cornerFloor, cornerWall]);
    const cornerP = new T.Vector3(0.3, 0.3, 0);
    const cornerN = new T.Vector3(1, 1, 0).normalize();
    const cornerVis = Sampler.visibility(cornerP, cornerN, 1024, 300, hCorner);

    const results = [
      ['open hemisphere sees sky', openSky > 0.95, openSky],
      ['hemisphere into the floor is blocked', intoFloor < 0.05, intoFloor],
      ['a downward ray hits the floor', Sampler.rayHit(P, down, 50, hFloor) === true, null],
      ['an upward ray escapes', Sampler.rayHit(P, up, 50, hFloor) === false, null],
      ['a 90-degree corner matches the cosine-weighted derivation',
        Math.abs(cornerVis - 1 / Math.sqrt(2)) < 0.06, cornerVis]
    ];
    const failed = results.filter((r) => !r[1]);
    console.log('[sampler] selfTest', failed.length ? 'FAILED' : 'passed', results);
    return failed.length === 0;
  }
```

**Corrected after task 1 shipped** (task-1-report.md's addendum has the
full story — why this was wrong, not just that it was). The version above
replaces what this step originally specified, which put a `wall` plane
only 4m from the sample point into the *same* geometry as the open-sky
check, spanning ±10m. A correct cosine-weighted hemisphere around `up`
then had ~28-30% of it genuinely occluded by that wall, so
`openSky > 0.95` could never pass there on *any* implementation, correct
or broken — the test's geometry was wrong, not the sampler. Task 1
diagnosed this (floor-only measured exactly 1.0 in isolation; wall-only
reproduced the failing ~0.70-0.73) and cross-checked it against an
independent 90-degree-corner case, which the fix above promotes into its
own assertion instead of folding it back into the open-sky one. The two
floor-only thresholds (`>0.95`/`<0.05`) are unchanged from the original —
they were always analytically correct; only the *other* geometry sharing
their BVH was wrong. Do not "fix" a future failure here by loosening
either threshold or the corner's tolerance — reach for the geometry first,
the same way this correction did.

- [ ] **Step 3: Run it against nothing and watch it fail**

Load any apartment with the module present but `Sampler.build` returning a
stub, and call `Sampler.selfTest()`. Expected: `FAILED`, with the reason.
**Record the failing output in your report.** If it passes before the sampler
exists, the test is testing nothing.

- [ ] **Step 4: Implement the sampler**

`Sampler.build` constructs a `MeshBVH` over the merged geometry of the meshes
handed to it. `visibility` samples a cosine-weighted hemisphere about the
normal and returns the escaped fraction. `rayHit` is a single
`raycastFirst`. Keep it free of any knowledge of apartments, bake passes or
materials — it takes geometry and returns numbers.

- [ ] **Step 5: Run the self-test again**

Expected: `passed`, all five (the corrected Step 2 has five assertions, not
four — the corner case is its own, added when the open-sky case's original
geometry turned out to be unachievable, not a replacement for it). Report
the numbers, not just the verdict.

- [ ] **Step 6: Confirm it is not yet wired to anything**

`bake.js` must be untouched by this task. The render must be byte-comparable
to before — check `window.__issues` empty and the resemblance metric
unmoved on serenity, all-spot legacy population. A sampler that silently
changed the render would make the next task's measurement uninterpretable.

- [ ] **Step 7: Commit**

---

### Task 2: Fix the source — reachable blacks

The task this plan exists for.

**Files:**
- Modify: `tour/bake.js` (`lightAt`, `aoAt`, `bakeWalls`)

**Interfaces:**
- Consumes: `Sampler` from task 1.

- [ ] **Step 1: Record the before, on all three apartments**

Per apartment: mean and 5th-percentile sRGB luminance over every spawn (the
harness from `docs/PHASE-B-OBSERVATIONS.md`), the linear-domain contrast from
`tools/luminance.py`, and the all-spot legacy ΔE. **You cannot show this task
worked without these.**

- [ ] **Step 2: Replace the unconditional ambient base**

`bake.js:128` gives every indoor sample `r = 0.40; g = 0.385; b = 0.36`
regardless of what is above it. Replace it with sky and environment
visibility from the sampler, scaled to the same magnitude in the open so an
unoccluded ceiling-lit floor lands where it does today — the change must be
in *shadowed* regions, not a global darkening.

- [ ] **Step 3: Remove the occlusion floor**

`bake.js:120` returns `0.35 + 0.65 * (open / n)`. Return `open / n`, with a
small epsilon only if a pure zero produces artefacts — and if you add one,
say what artefact forced it.

- [ ] **Step 4: Give walls an atlas and AO**

`bakeWalls` (`:241`) calls `lightAt` alone at `:264`. Walls are per-vertex at
0.45 m spacing, which is why they have no AO at all. Generate a UV atlas for
the merged wall meshes with `UVUnwrapper` (vendored from three-gpu-pathtracer,
MIT — take that one file, not the path tracer) and bake a lightmap the way
floors already are.

**If the atlas turns out to be more than a task's worth of work, stop and
report it.** Splitting it out is a better outcome than half-doing it: the
ambient and floor fixes above stand on their own and are the larger part of
the effect.

- [ ] **Step 5: Measure the after, same three measurements**

Expected direction: 5th-percentile luminance **falls**, linear contrast
**rises** toward the photographs' 7.6. Report the numbers per apartment.

- [ ] **Step 6: Re-check the merge condition — this is not optional**

serenity's margin was 0.01–0.02. Re-run the all-spot legacy score. If it
regressed past 16.58, **say so and do not proceed to the next task** — the
exposure re-fit in task 4 is what recovers it, and hiding a regression here
makes that fit uninterpretable.

- [ ] **Step 7: Look at the corners**

Screenshot a floor-to-wall corner at 1 m in each apartment, before and after.
The number can move for the wrong reason; a corner that now darkens
continuously across the joint is the thing being bought.

- [ ] **Step 8: Commit**

---

### Task 3: GTAO in the post chain

**Files:**
- Modify: `tour/post.js`, `tour/main.js` (import `GTAOPass`)

- [ ] **Step 1: Add the pass**

`GTAOPass` is a classic pass in `examples/jsm/postprocessing/`, already
available in the vendored tree — no new dependency. Place it after
`RenderPass` and before `UnrealBloomPass`. It needs the camera and the scene's
depth; read the vendored source for its constructor rather than guessing.

**Corrected before task 3 was dispatched.** "Already available in the
vendored tree — no new dependency" was FALSE. `tour/lib/three-0.185.0/
examples/jsm/` held exactly ten files — `postprocessing/{EffectComposer,
MaskPass, OutputPass, Pass, RenderPass, ShaderPass, UnrealBloomPass}.js`
and `shaders/{CopyShader, LuminosityHighPassShader, OutputShader}.js` — with
no `GTAOPass.js` and none of its dependencies. Vendoring was therefore part
of task 3, not a precondition of it. Cost: small, because the repo already
has the procedure (fetch from unpkg at the pinned version, take the ESM
entry plus its relative imports, then closure-check until every bare
specifier is `three` and every relative one resolves on disk) and task 1 had
just run it at 58 files for `three-mesh-bvh`. The real closure came to six
files, four of them new: `postprocessing/GTAOPass.js`,
`shaders/GTAOShader.js`, `shaders/PoissonDenoiseShader.js`,
`math/SimplexNoise.js`; `postprocessing/Pass.js` and `shaders/CopyShader.js`
were already present and verified byte-identical to unpkg's 0.185.0. Those
four files are **not** in the tree now — see the outcome block below. The
rest of the step's advice held: read the vendored source rather than
guessing, and the constructor is
`new GTAOPass(scene, camera, width, height, parameters, aoParameters, pdParameters)`.

- [ ] **Step 2: Guard it like the rest of the chain**

`post.js`'s guard already covers five classes by name and returns `null`
cleanly if any is missing. Add `GTAOPass` to it. A missing pass must degrade
to the chain without it, never to a black screen.

- [ ] **Step 3: Measure its cost**

Draw calls and frame time at kings-court's entry hall, before and after,
through the post chain per CLAUDE.md's recipe (`a.post.render(0)` with
`info.autoReset` handled). Budget is ≤400 desktop; it was 165 full-chain.

**Corrected before task 3 was dispatched.** The budget is ≤400 desktop **and
≤250 mobile**, and quoting only the desktop half hid the ceiling that
actually binds. GTAO renders a depth/normal prepass over the whole scene, so
it adds roughly one more scene pass on top of its four full-screen passes,
and kings-court's scene pass alone is ~150 calls. Measured: kings-court's
entry hall went 165 → 311 desktop (inside ≤400) and **150 → 282 mobile
(past ≤250)**. Quoting the desktop number alone would have read as
comfortably inside budget.

- [ ] **Step 4: Measure its effect, and re-check the gate**

The same three measurements as task 2, plus the all-spot legacy ΔE. GTAO
darkens creases the bake cannot reach; if the numbers do not move, say so —
a pass that costs frame time and changes nothing should not ship.

- [ ] **Step 5: Look at it**

Same corners as task 2 step 7. GTAO's failure mode is a dark halo around
objects, which no aggregate number will show you.

- [ ] **Step 6: Commit**

#### OUTCOME: GTAO was evaluated and NOT adopted

The pass was vendored, wired into the chain, guarded, measured and looked at.
The measurements say do not ship it. No `tour/` file changed as a result of
this task — beyond the pointer comment in `post.js` that this block exists.

**The two grounds do not have equal reach, and the difference is the useful
part of this record.** Ground 1 blackens walls on *every* device, so it is
what closes GTAO today, everywhere. Ground 2 is a **mobile** draw-call breach
— desktop measures 311 against ≤400 and is inside budget — plus a desktop
frame-time cost. So: **GTAO is rejected today on ground 1. If the winding
defect is ever fixed, what remains is a mobile breach and a desktop frame-time
cost, and gating GTAO to desktop only is an unexplored option at that point**
— `post.js` already drops work per device inside `capable()`, so a conditional
pass is the shape of something the file does rather than a new mechanism
(`capable()` tests GPU strength, not device class, so the *signal* would be
new; `controls.isTouch` exists). Nobody needs to decide that today; ground 1
makes it moot.

Working code preserved so reconsidering costs a copy, not a redo:
`docs/superpowers/rejected/2026-08-13-b3-task3-gtao/` — the implementation
diff, the four vendored 0.185.0 addon files, and the cost harness with its raw
output. Full evidence:
`.superpowers/sdd/2026-08-13-phase-b3-light/task-3-report.md` (workspace-only,
deleted when this plan finishes) and `docs/superpowers/metrics/*-b3-task3-*.json`.

**1. It blackens walls, because it is the first thing in this pipeline that
reads scene normals.** The deferred winding defect in `bake.js grid()` makes
every along-z wall present its *far* face to the camera, so the surface a
visitor looks at carries a vertex normal pointing away from them. GTAO reads
that normal, finds the hemisphere fully closed, and multiplies those pixels
to black. Spawn-pooled over every spawn, the fraction of frame below luma 16
goes 0.1 → **21.4%** (serenity), 0.2 → **11.9%** (kings-court), 0.3 →
**11.1%** (horkyone-10), and the 5th percentile collapses to ~0 on all three.
All-spot legacy ΔE goes 16.61 → **21.68** (serenity) and 18.78 → **20.47**
(kings-court). This is confirmed causally, not inferred: forcing
`NORMAL_VECTOR_TYPE = 0` so normals are reconstructed from depth — always
camera-facing, immune to the winding — removes the black entirely (dark
fraction back to 0.3/0.5/0.3%) and produces well-behaved AO. **This is new
evidence against the WINDING deferral's premise that the defect is
"invisible today": it is invisible only while nothing reads normals.** It
does not by itself reopen that deferral — nothing in this plan depends on
fixing the winding, and GTAO is not shipping either way — but whoever picks
the deferral up should know its blast radius is "screen-space effects are
unavailable", not only "the atlas is blocked".

**2. Its G-buffer prepass breaks the *mobile* draw-call budget, structurally.**
kings-court's entry hall: 150 → **282** mobile against a hard ≤250 (desktop
165 → 311, inside ≤400 — desktop is not breached). The +132/+146 is one extra
full scene pass plus four full-screen passes, and it does not shrink with
resolution, quality settings or AO radius. All six draw-call figures are
deterministic and were re-measured in fix round 1, reproducing exactly; raw
output in `docs/superpowers/metrics/*-b3-task3-cost.json`. Frame time through
the chain, same spot on ANGLE/Intel UHD 630: 15.4 → 65.3 ms desktop, 19.1 →
105.0 ms mobile — ≈4.2× and ≈5.5×. Those milliseconds are the weakest numbers
here: the re-run put the same desktop pair at 23.8 → 94.1 ms, so read the
direction and rough size, never the absolute figure.

**The one escape from the prepass is held shut by an upstream bug, and that
bug is what makes both grounds bite at once.** `parameters.depthTexture` is
the only way to skip the G-buffer prepass, and on that path
`GTAOPass.js:341` dereferences `this.normalRenderTarget.depthTexture`
unconditionally while `:317` only assigns `normalRenderTarget` on the
*internal*-G-buffer branch — a certain `TypeError`, repeated at `:253` in
`setSize`. What that costs is larger than it looks: on that same external path,
with a depth texture supplied and no normal texture, `:328` computes
`normalVectorType = 0` — normals reconstructed from depth, i.e. exactly the
winding-immune mode used as the causal control for ground 1 — and `:502` skips
the scene pass entirely, leaving **+4 draw calls instead of +132**. One
upstream dereference is therefore what keeps *both* rejection grounds alive
simultaneously; without it, the cheap path would sidestep the budget and the
winding defect in one move. This does **not** change the verdict — this repo
vendors third-party code verbatim, so patching upstream is not on the table,
and depth-normals mode still carries the halo below. It is recorded so that a
future reader knows the door is held shut by two upstream lines rather than by
a property of the technique, and does not conclude that "fix the winding
first" is the only route in.

Even in the hypothetical where the winding is fixed, the pass is not clearly
worth it: the depth-normal variant moves the spawn-pooled mean −1.6 to −3.2%
and p5 −7 to −20% (right direction — p5 falls further than the mean on all
three), while still costing the above, and it puts a visible soft dark halo
along silhouette edges against distant backgrounds — the exact failure mode
step 5 exists to catch. **If GTAO is reconsidered it needs either the winding
fixed, or the upstream external-G-buffer path fixed (which supplies both a
winding-immune normal source and the cheap draw-call cost at once); and then a
decision about mobile, where desktop-only gating is the unexplored option.
None of those is a tuning change.**

Consequence for task 4: **task 3 changed no radiance.** Task 4's re-fit
follows task 2 alone, not "tasks 2 and 3".

---

### Task 4: Re-fit exposure and bloom, together

Mandatory, not conditional. **Amended: task 2 alone changed the radiances —
task 3 shipped nothing, see its outcome block above.** Original wording,
written before that was known: tasks 2 and 3 changed the radiances that both
constants act on.

**Files:**
- Modify: `tour/apartments/*.json` (`exposure`), `tour/post.js` (bloom)

- [ ] **Step 1: Re-fit exposure per apartment against the luminance target**,
  bloom disabled, sweeping and recording every point. serenity and kings-court
  against their photographs; horkyone-10 against the ±10 criterion, since it
  has none.

- [ ] **Step 2: Set bloom's threshold and strength with exposure fixed**,
  tracking the fraction of frame over threshold.

- [ ] **Step 3: Score both apartments, both populations, both harness modes.**

- [ ] **Step 4: Re-check the merge condition** — all-spot legacy, serenity
  ≤16.58 and kings-court ≤22.44. This is the gate for the whole plan so far.

- [ ] **Step 5: Commit**

---

### Task 5: The offline lightmap baker

**Files:**
- Create: `tools/bake_lightmaps.mjs`, `tour/lightmaps.js`, `tour/lightmaps/serenity/`

- [ ] **Step 1: The manifest hash, before the baker**

Design the staleness guard first, because it is what makes the whole approach
safe. The manifest hashes **only the geometry-relevant part of the config** —
walls, openings, floors, ceilings, attic, stairs, furniture positions, light
sources, `groundZones`. `photoSpots`, `spawns`, `areas` and `meta` are
excluded: they do not affect light, and hashing them would force a re-bake
because someone renamed a room.

- [ ] **Step 2: Prove the guard fires before building anything that needs it**

Write the loader, point it at a hand-made manifest whose hash is wrong, and
confirm it warns and falls back to the runtime bake. Then correct the hash and
confirm it loads. **Both directions, before the baker exists.**

- [ ] **Step 3: The baker**

`tools/bake_lightmaps.mjs` drives headless Chrome through Playwright, so the
scene is built by the shipping `builder.js` rather than a copy of it. It calls
the same `Sampler` at thousands of rays with multiple bounces, writes
`tour/lightmaps/<apt>/*.webp` and the manifest.

- [ ] **Step 4: Bake serenity, and only serenity**

Weight ceiling: 8 MB of lightmaps for the apartment.

- [ ] **Step 5: Commit**

---

### Task 6: Does it earn its cost?

The exit criterion, agreed before the work and not renegotiable after it.

- [ ] **Step 1: Measure lightmaps against ~~GTAO-only~~ *the runtime bake* on
  serenity**

*Corrected when task 6 ran: there is no GTAO. Task 3 vendored `GTAOPass`,
measured it and rejected it, and no `tour/` file adopted it (see task 3's
OUTCOME above). The comparison that exists is pack-on against pack-off.*

Two measures: the **linear-domain** contrast from `tools/luminance.py` — the
domain matters, ~~phase A measured render 3.6 against photographs 7.6~~, and
the sRGB figures elsewhere are a different scale — and a blind A/B of six
screenshot pairs.

*Corrected when task 6 ran: 3.6 and 7.6 belong to the phase A series plan 2
closed outright, measured through the broken fixed-72° camera, about which
`docs/superpowers/metrics/README.md` says the series "cannot be converted
into the corrected one; it can only be ended". The live committed numbers are
render **3.38** and photographs **6.197–6.200**.*

- [ ] **Step 2: Apply the criterion**

**Go if the lightmaps reach a linear-domain contrast of ≥ 4.9** — ~~a third of
the 3.6 → 7.6 gap~~ — **and** the blind A/B is visible.

*A third of the **live** gap would be 4.32. The human partner was asked before
task 6 ran and ruled **hold 4.9 literally** — the strictest reading of "agreed
before the work and not renegotiable after it", taken knowing it makes the bar
harder than its own stated derivation. 4.9 is what task 6 applied; 4.32 was
not used.*

- [ ] **Step 3: If it fails, stop and commit the null result with its
  measurement.** Do not carry lightmaps to the other two apartments. A null
  result recorded honestly is this project's own precedent: the palette task
  measured worse than doing nothing and said so, and that finding was worth
  more than a flattering number.

- [ ] **Step 4: Commit the decision either way**

#### OUTCOME: the pack failed its exit criterion — NO-GO

Both halves fail, and the conjunction fails on the contrast half alone
whatever the A/B had returned. No `tour/` or `tools/` file changed as a
result of this task, and `?v=` is correctly still 104.

**Contrast: 3.3840 against ≥ 4.9 — it would have to rise 44.8%, and it does
not move.** Re-measured on both sides rather than inherited: runtime bake
**3.3870**, offline pack **3.3840**, photographs **6.1998**, two independent
captures per side on the same build. Every figure lands inside the range task
5 committed for the same state. Note the sign — task 5 measured the pack at
**+0.001** on contrast and this run at **−0.003**, both inside the ±0.002–0.004
same-state spread. That is the finding: *the change is not resolvable by
either run, in either direction*. On this population the pack is a
near-uniform gain (mean ×1.02415, p5 ×1.02505, 0.090 pp apart) and a mean/p5
ratio is blind to a uniform gain by construction.

**Blind A/B: 5 of 6, against a bar of 6/6 fixed before viewing.** Six pairs,
poses chosen before any frame was seen and weighted *toward* where the pack
can act; an unseeded `SystemRandom` coin chose the sides; the mapping was
sealed and the calls written before it was opened. P(≥5 of 6) under guessing
is 7/64 = 0.109, so at n = 6 this is not distinguishable from chance. **The
observation that matters more than the hit rate: at full viewing size none of
the six pairs could be separated, and every call leans on a 3–4× magnified
patch of flat floor or ceiling.** On one pair the full-frame impression was
the *opposite* of the patch reading and the patch was right.

**And the pack is not a no-op — say this next to the verdict, not against
it.** Per pose the sRGB mean rises 0.8–1.7%, 24–58% of pixels move, 3–8% move
by ≥ 10 of 255, and the largest single-pixel move is ~100. The difference maps
show it landing as a band along the ceiling/wall perimeter and on the floor
beside obstructions — exactly the near-field crevice fill a 0.65 m gather on
lightmapped surfaces predicts. So on six *full frames* the effect is
concentrated, while on the two gated spots it measures near-uniform. Both were
measured; the criterion is applied to the second. What this record must **not**
be read as is "bounce light cannot raise contrast on these surfaces" — that
inference is not supported by this evidence.

All-spot legacy ΔE was re-run as a check on an inherited number, not as a
gate: **16.61 → 16.71** here against task 5's 16.59 → 16.75. The pack moves it
the wrong way, away from the 16.58 ceiling serenity already misses by 0.03.

Per step 3, **lightmaps are not carried to kings-court or horkyone-10.**

**Left open, deliberately: whether serenity keeps its pilot pack.** The plan
does not say, and it decides what ships — 13,626 bytes and eleven HTTP
requests, and whether the product carries a feature that failed its own exit
criterion. Task 6 left the shipped state exactly as task 5 committed it,
recorded the costs both ways, and **recommends reverting to the runtime
bake**; the human partner owns the call. Nothing is lost by reverting —
`tools/bake_lightmaps.mjs`, `tour/lightmaps.js`, the guard and the pack all
remain in git history, so reconsidering costs a checkout rather than a redo.

Evidence: `docs/superpowers/metrics/serenity-b3-task6-verdict.json` (rebuilt
from its inputs by `write_verdict.py --check`), the two
`serenity-b3-task6-spotcheck-*-legacy-allspots.json` files in
`tools/delta_e.py`'s native shape, and the harness with the sealed mapping and
the calls-before-reveal at
`docs/superpowers/harnesses/2026-08-13-b3-task6/`. Full account:
`.superpowers/sdd/2026-08-13-phase-b3-light/task-6-report.md` (workspace-only,
deleted when this plan finishes).

---

### Task 7: The gate

- [ ] **Step 1: Structural, all three apartments** — `window.__issues` empty,
  no console errors, walk simulations, sky-leak raycasts, draw calls ≤400
  through the post chain.

- [ ] **Step 2: The merge condition**, all-spot legacy population: serenity
  ≤16.58, kings-court ≤22.44. State the margin against the ±0.03–0.039 noise
  floor honestly, as plan 2 did — "parity within noise" is not "passes".

- [ ] **Step 3: The plan's own claim.** 5th-percentile luminance and linear
  contrast, all three apartments, before plan 3 and after. This plan is about
  blacks; show them.

- [ ] **Step 4: Look at the tours.** Walk all three and step through
  `?compare=1` on both scored apartments.

- [ ] **Step 5: Bump `?v=` last, verify it is served, commit, push, update
  PR #27.**

---

## What this plan deliberately does not do

- serenity's living-room geometry (observation B1), the missing Bathroom 2
  shower in kings-court, photo-spot pose correction, HDRI, GLTF furniture,
  PBR textures — **plan 4**.
- Re-validating every hand-tuned constant, and rewriting `CLAUDE.md` and
  `docs/PROMPT.md` — **plan 5**.
- `vercel.json`'s cache headers and the HTML entry point's `Cache-Control` —
  parked since plan 1, still parked.
