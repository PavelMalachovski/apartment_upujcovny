# Phase B handoff — engine migration and photoreal quality

Written at the end of phase A, 2026-08-12, for a fresh session that has none
of that conversation's context. Everything here is either measured on this
branch or verified against the Three.js r185 source. Where something is an
assumption, it says so.

---

## Start here

You are continuing work on a platform that builds walkable 3D tours of real,
photographed apartments, sold to hosts and estate agents. **Resemblance to
the actual photographs is the trust criterion the product rests on** — not
generic prettiness.

Read, in this order:

1. `CLAUDE.md` — repository rules, architecture, debug recipes. Trust it; it
   was corrected against the code at the end of phase A.
2. `docs/PROMPT.md` — the project-independent specification for building a
   tour platform from a folder of photographs. **This is one of the two
   things phase B must leave rewritten** — see Deliverables.
3. `docs/superpowers/specs/2026-08-12-photorealism-design.md` — the design
   spec. Its "Phase B" section is a starting point, but it was written before
   phase A ran and phase A learned things that change it. This document is
   those things.
4. `docs/superpowers/metrics/README.md` — what was measured and what it means.

Then use the brainstorming skill before planning anything. Do not treat this
document's recommendations as decided.

---

## Deliverables

Phase B is not finished when the migration renders correctly. It is finished
when a new apartment can be added at the new quality level by someone
following a written procedure. Three artifacts, and the last two are the
point of the exercise:

1. **The migrated, measurably better tour.** All three apartments, no
   regression against the phase A baseline.
2. **`CLAUDE.md`, rewritten** to describe the migrated architecture — not
   patched. Phase A's closeout found three separate false claims in it, all
   introduced by writing documentation from memory of the work rather than
   from the code. Every number and recipe in the rewrite must be re-derived
   from source and run once.
3. **`docs/PROMPT.md`, rewritten.** This is the prompt used to build a tour
   from photographs, and migration invalidates it in at least four places
   verified today: it mandates a local UMD copy with no bundler (line 34),
   specifies writing a CPU lightmapper (§5), fixes ACES tone mapping at
   exposure ~1.05 (line 222), and sets a ≤150 draw-call budget (line 230).
   All four are wrong after phase A and phase B.

On the ambition behind deliverable 3 — "one prompt that reaches maximum
quality and accounts for every possible error": a prompt cannot guarantee
quality, and any that claims to is lying. What it *can* do is encode the
checks that catch the known failure classes. Phase A's value came almost
entirely from its verification protocol, not from its instructions. Write the
new prompt with that weighting: brief on what to build, exhaustive on how to
prove it works. The failure catalogue at the end of this document is the raw
material.

---

## Where phase A left the project

Three.js r128 (June 2021), local UMD copy, no bundler, no npm, no build step.
Three apartments share one code base: `serenity`, `kings-court`,
`horkyone-10`. All apartment data lives in `tour/apartments/<id>.json`; there
are no coordinates in code.

Phase A moved the resemblance metric — mean ΔE2000 against the real
photographs, 8×8 grid, 11 photo spots — from **24.36 to 16.58**.

**Almost all of that was one thing.** The exposure fit alone took it from
23.15 to 16.57. A reviewer decomposed it: the CIEDE2000 lightness term fell
from 15.9 to 0.6, predicting ~16.8 against 16.57 measured. Everything else —
environment capture, chamfers, ambient occlusion, post-processing — moved it
about a point in total.

**And the phase ended by proving where the rest of the error is not.**
`tools/residual.py` shows a perfect global colour correction is worth 0.11
points, against exposure's 6.6. There is no global correction left. The
residual ~16.5 is **content and geometry mismatch**: box furniture where the
photograph has real objects, procedural textures approximating real
materials, crude surroundings, and a light distribution that matches on
average but swings −4.8 to +7.9 in lightness room by room.

That sentence defines phase B. **Phase B is not about better light on the
same boxes. It is about replacing the content.**

---

## Four measured facts that will bite you

Each was measured on this branch and each will cost you a day if you meet it
by surprise.

### 1. `serenity.exposure` is a compensation, and it must be cleared first

`tour/apartments/serenity.json` carries `"exposure": 0.33`, fitted against
that flat's photographs. It compensates for the scene running roughly **twice
as hot at source**. The real levers are the hand-tuned constants in `lightAt`
in `tour/bake.js` — the indoor ambient base `0.40/0.385/0.36`, the point
coefficient `2.1`, the window coefficient `0.26`, the sun `0.62`, and
`WEXP = 1.25` on walls, which unlike floors has no compensating multiplier.
Note `EXP = 1.7` is *not* a brightness lever: it cancels exactly against
`lightMapIntensity`.

Migration changes lighting units, tone mapping and the environment at once.
**Clear `exposure` before fitting anything, and re-fit from scratch at the
end.** Carrying 0.33 across produces a render about three times too dark, and
it will look like the migration broke something else.

### 2. Any exposure or tone-mapping change silently invalidates threshold constants

This already happened. Phase A tuned a bloom threshold of 0.92 at exposure
1.05; the exposure task moved exposure to 0.33 one task later and nothing
re-checked it. The final review measured it directly (render every
`compare` spot, read back the max encoded channel value the threshold
acts on): bloom is inert at 11 of serenity's 12 tested camera positions —
nothing in frame reaches 0.92 at the fitted exposure — but **not fully
inert**. One live (unbaked) specular highlight, a chrome fixture in the
bathroom, still crosses the threshold and produces a small, visibly
confirmed bloom (5.96% of that frame's pixels change with the pass
toggled off vs. on). Baked diffuse surfaces can't reach the threshold at
this exposure, as the arithmetic predicted; live specular highlights on
near-mirror metal aren't bounded by that same ceiling and can still
exceed it locally, exposure or no. Full detail in
`docs/superpowers/metrics/README.md`'s "Is bloom still doing anything?"
section. Bloom was kept, not removed — it wasn't proven inert, only
mostly so.

Your plan touches exposure, tone mapping and lighting units. **Add an
explicit step that re-validates every hand-tuned constant chosen earlier in
the phase.** Phase A's plan had no such step, and that is the single defect
that survived all nine task reviews.

### 3. The render has lifted blacks, and no exposure value fixes it

Contrast, mean over 5th percentile: render 3.6, photographs 7.6 — about 1.1
stops less shadow range. Structural causes in the bake: `lightAt` seeds every
indoor sample with an unconditional ambient base that no occlusion removes,
`aoAt` clamps occlusion at 0.35, and environment IBL adds unoccluded fill to
every standard material.

**Walls receive no ambient occlusion at all** — `bakeWalls()` calls only
`lightAt()`, so a floor-to-wall corner darkens on the floor side only.

This is the most visible remaining gap after content, and it is what GTAO and
path-traced lightmaps exist to fix.

### 4. `kings-court` bakes in about 10 seconds

Medians of three: serenity 318 ms, horkyone-10 1555 ms, kings-court 10094 ms.
`window.__bakeMs` reproduces it. The cost is the per-texel `lightAt` loop over
that flat's far larger surface, occluder and light counts, and it predates
phase A.

---

## The migration itself is the risky part

r128 → r185 is 57 releases and five years. Known breaking changes:

- **r148 removed `examples/js`**, the UMD example builds. The six vendored
  files in `tour/lib/` have no modern equivalent; the post-processing chain
  must be rewritten, not ported. Treat phase A's `post.js` plumbing as
  throwaway and keep only its tuning intent.
- **r152 rewrote colour management.** Phase A lost a full fix round to an
  sRGB encoding bug that cannot exist in r152+.
- **r155 onward made physically correct lighting the default**, so every
  light intensity and `lightMapIntensity` needs recalculating.
- `outputEncoding` → `outputColorSpace`, `sRGBEncoding` → `SRGBColorSpace`,
  `texture.encoding` → `texture.colorSpace`.

**Port the measurement harness first, before anything else.** `measure.js`,
`tools/delta_e.py`, `tools/luminance.py` and `tools/residual.py` are the
migration's safety net: they let you prove the migration did not regress
instead of hoping. Migrating blind and then finding the score moved leaves
you unable to tell which of fifty changes did it.

The no-build-step rule survives via an importmap. Verify that before
committing to it.

---

## Photographs are a source, not only a reference

Phase A used the photographs only to *measure* against, and once to sample
colours from — which returned a null result. That undersells them. For an
apartment that exists and was photographed, the photographs are input to at
least four pipelines, listed by confidence:

**Materials from photographs.** A specific tile pattern, a specific wood, a
specific fabric. Scanned CC0 libraries (Poly Haven, ambientCG) beat generated
textures for generic materials — oak, plaster, marble — so reach for
generation only when the photograph shows something with no library
equivalent. Note the trap phase A measured: a pixel in a photograph is albedo
multiplied by illumination, so it is never directly an albedo value. Direct
sampling scored *worse* than doing nothing (16.79 against 16.57).

**Furniture matched to photographs.** The dominant residual. Curating real
GLTF models to match what the photograph shows is more reliable today than
generating them: image-to-3D gives blobby topology with lighting baked into
the texture, which reads worse up close than a good library model. Worth one
pilot on a single item to check whether that is still true.

**Camera-matched comparison.** The harness already renders each photo spot
from that photograph's camera. A viewer-facing slider between render and
photograph at each spot is both the strongest trust argument the product can
make and a free QA surface.

**Full capture, where the shoot can be dictated.** 3D Gaussian splatting
(`@mkkellogg/gaussian-splats-3d`, peer dependency `three >= 0.160.0`, ships a
UMD build) turns a phone walkthrough into something that *is* the photograph.
Its `DropInViewer` embeds into an existing Three.js scene as an ordinary
renderable, so the hybrid is architecturally clean: splat for the photoreal
walk, the model for collisions, dollhouse, floor plan, measuring and room
labels, sharing one coordinate frame. The hard practical part is alignment —
photogrammetry produces arbitrary scale and orientation, and the model is
metrically correct from the floor plan, so a similarity transform must be
fitted from corresponding points. Splats cannot be relit or refurnished, and
only work where the shoot is ours to specify.

---

## Review of the proposed feature list

Every claim below was checked against the r185 source. **Three API sketches
in the original list are wrong** and are corrected here.

### Verified correct

| Claim | Status |
|---|---|
| `HDRLoader` | Exists (`examples/jsm/loaders/HDRLoader.js`), alongside `RGBELoader` |
| `IESLoader` | Exists |
| `KTX2Loader` | Exists |
| `AgXToneMapping` | Exists, constant `6`. `NeutralToneMapping` (`7`) also exists and is worth comparing |
| `Scene.environmentIntensity` | Exists, along with `environmentRotation` |
| `RenderPipeline` | Exists: `src/renderers/common/RenderPipeline.js` |
| Node classes | `GTAONode`, `SSRNode`, `DepthOfFieldNode`, `BloomNode`, `DenoiseNode` all in `examples/jsm/tsl/display/` |
| `three-gpu-pathtracer` on r185 | Peer dependency `three >= 0.180.0` — satisfied |

### Corrections

**`pipeline.get(GTAONode)` is not the API.** `RenderPipeline`'s constructor is
`(renderer, outputNode = vec4(0,0,1,1))`, with `render()` and `dispose()`.
There is no `get()`. Nodes compose functionally and the result is assigned to
`outputNode`; `GTAONode.js` exports
`ao( depthNode, normalNode, camera )` for exactly this. Derive the real
signatures from the r185 examples, not from this sketch.

**`TAANode` does not exist.** The temporal antialiasing nodes are `TRAANode`
and `TAAUNode`. Also: temporal AA on a *moving* camera smears, and this
product's core mode is walking. Evaluate it for the dollhouse and photo-spot
views before the walk.

**`RenderPipeline` lives in the node renderer path.** Committing to it means
committing to `WebGPURenderer` or its WebGL2 fallback backend — a larger
decision than "newer three": browser support, two render paths to maintain,
and everything in `post.js`, `doll.js` and `app.js` that assumes a classic
`WebGLRenderer`. **This is the first fork your plan must resolve, and it
should be resolved with a measurement, not a preference.**

### Assessment of the tiers, against what phase A measured

**Tier 1 is correctly prioritised, with one omission.** HDRI plus
`PMREMGenerator` is right and already spec'd. Keep phase A's local cube
capture alongside it: the HDRI supplies sky and tone through the windows, the
local capture supplies reflections of the actual room, and they compose.

AgX is a reasonable default for interiors but **do not adopt it on
assumption** — render the same 11 spots under ACES, AgX and Neutral and
compare. Phase A learned that a plausible rendering change can move the score
for a reason nobody checked.

GTAO is the highest-value item in this tier *for this project specifically*,
and the original list undersells why: our walls have no baked AO at all and
our AO floor clamps at 0.35. GTAO addresses exactly the corners, skirtings
and wall joins that fact 3 identifies as the visible gap.

**The omission: replacing the box furniture.** Nothing in Tiers 1–3 touches
what `tools/residual.py` identifies as the dominant residual. A sofa built
from six boxes cannot be lit into a real sofa. This belongs at the top of
Tier 1, not implied.

**Tier 2 is right.** `transmission` on windows is a genuine step change r128
could not do properly; watch its cost, since it needs its own render pass.
`clearcoat`, `sheen` and `anisotropy` are real and appropriate to the listed
surfaces. KTX2 is already spec'd.

**Tier 3, one warning.** A bloom threshold of 0.9 walks straight into fact 2 —
a constant tuned against an exposure the migration will change. Set it after
the exposure re-fit and measure that it actually fires.

**Tier 4 holds the biggest single win, and it is not the dollhouse.** Path
tracing is more valuable as an **offline lightmap baker** than as a runtime
viewer: bake multi-bounce GI to textures, ship them as images, pay nothing at
runtime, and fix fact 3's lifted blacks at the root. `three-gpu-pathtracer`
depends on `xatlas-web`, a UV atlas generator — the lightmap workflow is
anticipated by its authors. Path tracing at photo spots is the second use,
and it makes the render-versus-photograph comparison genuinely photoreal.

IES profiles are a real detail win, but note the interaction: this project's
light is baked, not dynamic, so IES matters to whatever computes the bake. It
lands naturally with a path-traced baker and not before.

---

## Suggested sequencing, to be argued with rather than followed

1. Port the measurement harness and re-baseline. Nothing else until it works.
2. Migrate to r185 with the existing feature set. Goal: **no regression**.
   Clear `serenity.exposure` as part of this.
3. Resolve the WebGL2-versus-WebGPU fork with a measurement.
4. Fix source radiance in `lightAt` rather than compensating output-side,
   re-fit exposure once, and compare tone mapping operators against the metric.
5. Real GLTF furniture for one apartment. **The big one** — expect it to move
   the score more than everything in Tier 1 combined. Asset curation is not
   code work and can start in parallel with steps 2–4.
6. PBR texture sets, KTX2, `transmission` windows.
7. GTAO, or path-traced lightmaps, or both — measure which earns its cost.
8. Re-validate every hand-tuned constant chosen during the phase.
9. Rewrite `CLAUDE.md` and `docs/PROMPT.md`. Re-derive every number and run
   every recipe once before committing.

---

## What "maximum quality" can and cannot be measured by

ΔE2000 over an 8×8 grid is the phase's yardstick and it has known blind
spots, all of them discovered the hard way:

- **It is direction-blind.** A uniformly too-bright and a uniformly too-dark
  render move it the same way. The 1.2-stop exposure gap sat undetected until
  mean linear luminance was measured separately.
- **It averages spatially.** Lifted blacks were invisible to it until the 5th
  percentile was measured. Anything that is wrong in a small part of the
  frame is diluted by the cell it sits in.
- **It cannot see geometry.** A correct colour in the wrong place scores the
  same as a wrong colour in the right place.

So carry at least three measurements, not one: mean ΔE2000 for colour, mean
and 5th-percentile linear luminance for exposure and contrast, and human
screenshots against the photographs for everything the first two cannot see.
And never fit toward ΔE — fit toward a physical target and report ΔE as a
consequence.

---

## The failure catalogue phase A produced

Every entry below is a real defect that shipped into a review, and **not one
was caught by the layout validator, the draw-call budget or the ΔE metric**.
This is the material for `docs/PROMPT.md`'s verification section.

| What happened | The check that would have caught it |
|---|---|
| A metric improved 25% because of a colour-space bug that darkened the whole frame, compensating for a separate over-brightness | When a number improves, decompose *why* before accepting it. A gain with no mechanism is a bug |
| A tuning constant went inert when a later task changed exposure, while the trend table still credited it | Re-validate every hand-tuned constant at the end of a phase |
| A palette feature was wired correctly and reached nothing: the visible walls, floors and ceilings are drawn by bake-time materials that ignore it. Three separate wirings were needed | Probe the extreme: set the value to pure red and confirm something changes |
| A verification compared rendered frames byte-for-byte to prove a refactor changed nothing — but 41 `Math.random()` calls make identical code render differently | A check that cannot fail proves nothing. Confirm the check fails on known-bad input |
| A count of "meshes with a colour attribute" passed while half the furniture had an attribute full of 1.0 | Verify the value, not its presence |
| A missing-file guard covered 2 of 6 vendored files; the other four aborted init and produced a black screen | Enumerate every failure input, not the convenient one. Test the case the guard does *not* name |
| An environment capture was polluted by lights that were about to be removed, baking their contribution in permanently | Check the ordering of setup and teardown around any capture |
| An assertion expected a degenerate-geometry guard to fire on a 10 mm cube, but the clamp meant only a 2 mm cube reaches it — the test failed on correct code | Derive test inputs from the code path, not by eye. Test both sides of a guard |
| Documentation claimed walls receive baked AO. They receive none. Written from memory of the work rather than from the code | Re-derive every documented number and claim from source before committing |
| A debug recipe quoted one apartment's number while using another's coordinates | Run every recipe once, as written, before committing it |
| A recipe added so a number could be reproduced was itself unrunnable — wrong splice point, duplicate call, unbalanced braces | Prefer instrumentation in the code over instructions to edit it. `window.__bakeMs` replaced that recipe |
| A config read accepted `null`, `0` and `"0.33"` and rendered black with no warning | Validate types at every config boundary, not just the ones you remember |
| The measurement harness captured a quarter-frame crop on HiDPI displays | Verify the captured artifact's dimensions, not just that capture succeeded |

---

## Things phase A got right, worth keeping

- **Build the measurement first, capture the baseline before any change.**
  Every honest result came from this.
- **Commit disconfirming evidence.** `serenity-a5-palette-direct-test.json`
  records the measurement that killed its own task's approach.
- **A null result is a result.** The palette task moved nothing and said so;
  `residual.py` then proved why, which is more useful than a flattering
  number would have been.
- **Let the implementer disagree.** Three times an implementer measured that
  the controller's diagnosis was wrong and said so with evidence; each time
  the implementer was right. Ask for verification of a hypothesis, not
  compliance with it.
