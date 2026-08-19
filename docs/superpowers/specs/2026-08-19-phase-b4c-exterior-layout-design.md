# Phase B plan 4c — exterior, layout, and the two flats' last content defects

Written 2026-08-19. Scope settled with the merge owner the same day.

This is the design for **plan 4c**, the third split of what was once one line
called "plan 4". It is deliberately **not** the 4c that
`docs/superpowers/specs/2026-08-15-phase-b4a-winding-walls-design.md` sketched
("HDRI and exterior, GLTF furniture, PBR/KTX2 texture sets"). That 4c has been
on record as *deliberately not written* since 2026-08-15 for one reason: its
critical path is **human asset curation** — finding, licensing and committing
CC0 models, HDRIs and KTX2 texture sets — which nobody has scheduled. This
document keeps that reason and acts on it rather than around it.

## The decision this document makes

**Split 4c the same way plan 4 was split, and for the identical reason.**

The asset-dependent half (HDRI, GLTF furniture, PBR/KTX2) is **out of this
plan** and is renamed **4d**. Everything routed to 4c that needs no asset —
and it is most of what actually still fails — is **in**.

This repeats an argument this project has already accepted twice. On
2026-08-19 the plan 4b whole-branch review re-routed `mainCeilH` and the
kings-court entry-hall wardrobe **off** 4c and into plan 5, writing:

> 4c is on record in this document as *deliberately not written* because its
> critical path is human asset curation, so owning this row with it meant a
> shipped geometry defect sat blocked indefinitely.

The same sentence applies to what 4c still owns. serenity's pool vista,
serenity's furniture walls and kings-court's mirrored Bathroom 2 are all
**shipped, confirmed, visible defects that need no photographer** — they need
box geometry, JSON coordinates, and the photographs already in the repo. There
is no reason for them to wait on a curation effort that has no date.

## What is in

Four content defects and the two housekeeping tasks any measured branch here
needs. The photographs are the ground truth for every one of them; where this
document quotes a measurement it is a starting point to be re-derived, never a
number to be applied.

### 1. serenity's exterior — the pool, the planting, the sky

`2.webp` and `10.webp` are the only two of serenity's eleven `compare` spots
that still fail pose verification, and they fail on the same thing. Plan 4b
left both `poseVerified: false` with a note that no camera fixes them:

> Renders hedge blocks and a sliver of pool at every fov 50–170 deg; the
> photo's open pool vista never appears.

What the photographs actually show, read this session:

- **`10.webp`** — turquoise pool water filling roughly the lower two thirds of
  the frame with visible surface ripple, a raised planting island with a low
  kerb, dense tropical planting and palms behind it, a white slatted boundary
  fence, a hanging chair, and roughly the top 15% of the frame is **real sky
  with cloud**.
- **`2.webp`** — the terrace looking down and west: the pool's stone coping and
  water at the left edge, the building's white column mid-frame, the sliding
  door's glass at the right, and terrace furniture in the foreground.

The model has none of that as geometry. `serenity.json`'s `surroundings` is
seven flat boxes — a stone slab, a water slab 0.1 m thick, three hedge slabs
and two neighbour blocks — and `builder.js buildSurroundings` renders each as a
single `box()`. There is no basin, no coping, no submerged wall, no planting
mass, no boundary fence, and no sky: `app.js` sets
`scene.background = new THREE.Color(0xbcd5e8)`, one flat colour, with
`scene.fog` matched to it.

**Deliverable.** A pool built as a real basin — coping ring, submerged walls,
a water surface at the correct level below the coping — with a planting mass
and a boundary fence behind it, all positioned by measurement against `2.webp`
and `10.webp`, plus a gradient sky. Everything through `surroundings`-style
config and `F.*` constructors, so it merges and costs draw calls the way the
rest of the scene does.

**The sky is opt-in per apartment.** A new config key `sky`; when it is absent
the current flat `0xbcd5e8` background and its matching fog are what render,
byte-identical to today. It is enabled for **serenity only** in this branch.
kings-court and horkyone-10 therefore do not move at all, their fitted
exposures stay valid, and this branch's attribution stays clean. A global
background change would have forced re-fitting three exposures and
re-baselining two photographed apartments for the sake of one flat's two
spots; that trade was considered and declined.

### 2. serenity's furniture is on the wrong walls in two rooms

Found by plan 4b task 2 and deferred with a full write-up, because it is a
layout rewrite and not a camera fix. Confirmed independently this session by
reading the photographs:

- **Living room.** `9.webp` shows the sofa with its back against the side wall
  and the terrace sliding door on the far wall directly beyond it, with the
  dining table in the near foreground. `serenity.json` puts the sofa against
  the west wall and the dining table against the east, so a camera framing the
  door correctly puts the sofa on the opposite side of the frame from the
  photograph. `3.webp`, `4.webp` and `9.webp` all carry this.
- **Bedroom.** `6.webp` shows the window wall and the bed-head wall
  **perpendicular**, with a **built-in window bench** under the window —
  cushioned, with drawers below — which the model does not have at all. The
  config puts bed head and window on the same wall (z 6.65), where `F.bed`
  draws a headboard `w + 0.5` = 2.1 m wide against a window opening spanning
  x 1.6–2.9, burying roughly 0.45 m of the window.

**Deliverable.** Both rooms re-laid against the photographs, including the
window bench. Poses are **not** re-derived here — plan 4b re-pointed these
cameras and they stay where they are; if a re-laid room needs a different
camera that is evidence the layout is wrong, not the pose.

### 3. kings-court's Bathroom 2 is the photograph's mirror image

`14.webp` is kings-court's largest single-spot movement on the 4b branch
(25.78 → 21.75, 69% of that apartment's total ΔE movement) and it still fails
pose verification. Its own `poseNote` names three causes, none of which a
camera fixes:

1. the shower and the bath are swapped left-to-right against the photograph;
2. `F.shower` builds no glass divider between shower and bath — the
   photograph's defining element, a frameless floor-to-ceiling panel with a
   ceiling brace;
3. `F.shower` builds no thermostatic valve plate and no handheld, both
   prominent in the photograph — one pair on the white marble wall, a second
   pair over the bath.

**All three are in this plan, including (2) and (3).** This re-routes the
divider glass **back from plan 5**, where the 4b whole-branch review sent it on
2026-08-19. That routing was correct when it was made and is wrong now, for a
reason that changed under it: it was sent to plan 5 to stop a constructor
change sitting blocked behind 4c's unscheduled asset curation, and this plan
removes that blockage. Leaving it in plan 5 would now mean fixing one frame's
three defects in two branches and measuring the same spot twice, and `14.webp`
could not flip to `poseVerified` in either of them alone.

**Deliverable.** The room un-mirrored against `14.webp`, and `F.shower`
extended with an optional divider panel, valve plate and handheld. The
constructor's existing two-sided glass behaviour must keep working unchanged
for every other apartment that calls it — the new parts are opt-in.

### 4. serenity's exposure, re-fitted

A bright sky and real water raise the terrace frames' luminance, and if `2` and
`10` flip to `poseVerified` they enter `tools/luminance.py`'s population, which
filters through `delta_e.scorable` and has no `--all-spots` escape hatch.
serenity's luminance-fitting population would go 9 → 11 and gain two of the
brightest frames in the set.

**Deliverable.** A re-fit of serenity's `exposure` against the post-change
render, and a re-baseline of all eleven spots — as its own task, measured
separately, exactly as plan 4a task 3 did after the winding fix. Fit toward
luminance, never toward ΔE.

horkyone-10's ±10 luminance criterion is **derived from serenity's mean scene
luminance**, so it moves when serenity's does. Re-derive it; do not carry the
old band across. Whether horkyone-10's own `exposure` then needs to move is a
finding of that task, not a premise of it.

### 5. The closing gate

Both photographed apartments measured BASE and HEAD **in one session**, per the
gate restated on 2026-08-15: never pair readings across sessions. Structural
checks (`window.__issues` empty, walk routes, sky-leak raycasts, draw calls
against ≤400 desktop / ≤250 mobile through the post chain), the resemblance
run, and the documentation and routed-item record.

## What is out, and where it went

| Item | Where | Why |
|---|---|---|
| HDRI environment, GLTF furniture library, PBR/KTX2 texture sets | **4d**, unwritten | Critical path is human asset curation with no date. The same argument that split plan 4 in the first place |
| kings-court's `18.webp` rattan seating set | **4d** | It is buildable without assets, but it is a *second* kings-court content item and the frame is ~20% sky. Taking it would pull kings-court's sky, exposure and luminance population into a branch scoped to serenity's exterior, and would cost a second apartment's re-fit to close one spot |
| The sky on kings-court and horkyone-10 | **4d** | The `sky` key this plan adds makes it a one-line config change whenever someone is willing to pay for the exposure re-fit it forces |
| serenity's `mainCeilH`, kings-court's entry-hall wardrobe, `meta.photoFovLong`, the noise floor, the stale-claim checker's gaps | **plan 5** | Already routed there by plan 4b; unchanged by this document. The **only** plan-5 row this document moves is the shower divider glass, re-routed back to 4c above with its reason |
| The per-texel wall lightmap atlas | Still **unowned** | Unblocked by plan 4a task 1, costs a from-scratch atlas rasteriser. This plan does not adopt it |

## Rules this branch works under

1. **The photographs are the ground truth.** Every coordinate this branch
   changes is derived from a photograph in `tour/photos/`, and the derivation
   is written down where the reviewer can check it. No number is carried over
   from a prose summary — including from plan 4b's own write-ups, which are
   starting points and are re-derived.
2. **Code changes are additive and opt-in.** New `F.*` constructors, new
   optional constructor arguments, and one new optional config key. **No change
   to `bake.js`, `post.js`, `sampler.js`, `materials.js`'s existing palette
   entries, or to any existing shading path.** This keeps the branch's
   movement attributable to content, which is what plan 4b established as this
   metric's dominant term.
3. **One apartment's numbers move.** kings-court's interior changes are
   confined to one room; its exposure is not re-fitted here and its render is
   otherwise untouched. horkyone-10 does not change at all.
4. **Every measurement pairs same-session.** BASE and HEAD served
   simultaneously, the same scripts pointed at each, as plan 3 task 7 and plan
   4b task 5 did.
5. **The layout self-check must be empty before every commit**, and every
   visual change is verified with a screenshot. Both are hard rules in
   `CLAUDE.md`; this branch moves furniture near doorways and reshapes the
   ground outside a walkable terrace, which is exactly the class those rules
   exist for.

## Error handling and degradation

Unchanged from the phase A rule, and this plan adds two cases to it:

| Failure | Behaviour |
|---|---|
| `sky` key absent | Current flat `0xbcd5e8` background and matching fog — today's render exactly |
| `sky` key present but malformed (wrong type, bad colour) | Named console warning, fall back to the flat background. Never a black screen |
| `F.shower` called without the new optional arguments | The existing two-sided glass cabin, unchanged |

That second row is the phase A defect made a rule and restated for every new
config boundary: a config read that accepted `null`, `0` and `"0.33"` once
rendered black with no warning.

## Success criteria

- `serenity`'s `2.webp` and `10.webp` flip to `poseVerified: true`, or the plan
  records precisely what still prevents it and routes it.
- kings-court's `14.webp` flips to `poseVerified: true`, or the same.
- serenity's all-spot legacy ΔE does not regress against a same-session BASE.
  **It is not a target.** `metrics/README.md` is explicit that this instrument
  cannot arbitrate a rendering change at this resolution, and adding real sky
  and real water to two frames that currently show flat bands may move it in
  either direction while unambiguously improving the render. A regression is a
  thing to explain and attribute, not automatically a thing to revert.
- kings-court's all-spot legacy ΔE moves only at `14.webp`, within the noise
  floor everywhere else.
- Structural checks clean; draw calls inside budget on both apartments.
- The routed record in `docs/PHASE-B-RESUME.md` reflects what this branch
  closed, what it opened, and where 4d's items sit.
