# Phase B step 0 — what is actually wrong with the product

`docs/PHASE-B-HANDOFF.md` opens its sequencing with:

> 0. **Walk both tours and produce the observation table above.** Everything
>    below is a hypothesis until that table exists.

This is that table. Nothing here was planned, coded or fixed — this document
only records what a visitor sees, measured where measuring was possible.

---

## Method

All three apartments were opened on a local server at 1280×820, at the tip of
`main` (4bbfce8), and walked from every `spawn`, plus the dollhouse on its
cutaways, the terraces, and photo-spot cameras compared against the
photographs themselves. Renders go through the post chain, exactly as a
visitor gets them.

Evidence images are in `docs/superpowers/observations/`, referenced per row.
Every one is a contact sheet rendered offscreen at a fixed size, so the frames
are comparable to each other.

Two caveats on the evidence, stated up front:

- **The photo-vs-render sheets render at a corrected field of view, not the
  harness's.** See observation **C1** — the shipped harness compares at a
  field of view the photographs do not have, so a like-for-like sheet had to
  correct it. Sheets 03 and 04 are the working for that finding.
- Machine: 12 logical cores, DPR 1 capture. Timing numbers below are medians
  of three page loads.

---

## Corrections to `PHASE-B-HANDOFF.md`

Both were found by trying to reproduce the document's own numbers, which is
what it asks the reader to do.

**1. kings-court now has 14 `compare` spots and a committed baseline.** The
handoff says it has "**no `compare` spots at all**" and that "nothing in phase
A measured it". That was true when it was written and stopped being true one
commit later: `b147e2e` (PR #26, merged as `4bbfce8`) flags all 14 photo spots
`compare` and commits `docs/superpowers/metrics/kings-court-baseline.json`,
mean ΔE2000 **22.44**. The handoff's advice to walk kings-court carefully
still stands — the walk below found plenty — but it is no longer unmeasured.

> **The count in this correction's own headline is now stale, 2026-08-19
> (plan 4b task 4).** kings-court has **13** `compare` spots, not 14: the
> merge owner ruled `4.webp`'s coffee corner would not be modelled and its
> `compare` flag was removed (see the **B4** note below). The correction is
> otherwise intact and is left as written — the handoff really did say
> "no `compare` spots at all", and 14 really was the number when this
> document was written.

**2. The 10-second kings-court bake does not reproduce.** Handoff fact 4 gives
medians of three: serenity 318 ms, horkyone-10 1555 ms, kings-court 10094 ms.
Measured here, same method (`window.__bakeMs`, median of three loads):

| Apartment | Handoff | Measured here | Ratio |
|---|---:|---:|---:|
| serenity | 318 ms | **309 ms** | 0.97 |
| horkyone-10 | 1555 ms | **669 ms** | 0.43 |
| kings-court | 10094 ms | **1937 ms** | 0.19 |

Serenity reproduces to within 3%, so this is not a faster machine — a machine
effect would move all three together. Something else differs, and until it is
explained, "kings-court bakes in about 10 seconds" cannot be used as the
justification for moving the bake into a Worker. **Re-derive this number
before planning around it.** (Individual kings-court loads: 2469 cold, then
1944, 1902.)

Handoff facts 1 and 3 **do** check out against the source, line by line:
`EXP = 1.7` (`bake.js:61`), indoor ambient base `0.40/0.385/0.36` (`:128`),
point coefficient `2.1` (`:143`), window coefficient `0.26` (`:166`), sun
`0.62` (`:175`), `WEXP = 1.25` (`:250`), and `aoAt` returning
`0.35 + 0.65 * (open / n)` (`:120`) — an occlusion floor no corner can go
below. `bakeWalls` calls `lightAt` and never `aoAt` (`:264`), so the claim
that **walls receive no ambient occlusion at all** is correct.

---

## The three tours as they ship today

Measured over every `spawn` of each apartment, 480×300, through the post
chain. Luminance is sRGB-encoded 0–255 (not the linear domain
`tools/luminance.py` reports — these numbers are internally comparable, not
comparable to that tool's).

| Apartment | `exposure` | mean L | 5th pct L | mean/p05 | pixels ≥250 | ΔE2000 | validator |
|---|---:|---:|---:|---:|---:|---:|---|
| serenity | **0.33** | 144.6 | 80.9 | 1.83 | 0.00% | 16.58 | clean |
| kings-court | 1.05 | 189.8 | 135.9 | 1.44 | 1.37% | 22.44 | clean |
| horkyone-10 | 1.05 | 193.1 | 155.7 | 1.25 | — | — | clean |

Serenity is the only apartment whose exposure was ever fitted. The other two
ship at the renderer default and sit some 45 luminance points brighter with
measurably less shadow range. And even in serenity — the darkest of the three
— the **darkest 5% of the frame never falls below 32% grey**.

Draw calls, kings-court (the heaviest), 1280×820: entry hall **144**, dining
121, upper living 97, bedroom 1 79, terrace 64 — against a documented ceiling
of 150, for a scene of **32,164 triangles**. The budget is bound by material
count, not geometry; there is a great deal of triangle headroom under it.

---

## The observation table

Column 3 is the point of the exercise, per the handoff: ΔE2000 over an 8×8
grid is direction-blind, spatially averaging and geometry-blind. Where it
cannot see an observation, column 4 gives that observation its own acceptance
criterion **now**, before any work starts, so it cannot later be declared
fixed on the strength of a number that never described it.

### A — Light and tone

| # | What looks wrong | Which feature would fix it | Can the metric see it? | Acceptance criterion if not |
|---|---|---|---|---|
| A1 | kings-court and horkyone-10 ship at the default `exposure` 1.05 and render ~45 L points brighter than serenity: whites at 190+, no dark end. Two of the three properties in the catalogue are visibly over-exposed. Sheets 06, 07, 09 | Per-apartment exposure fit against that flat's photographs, after the migration's lighting-unit change | **kings-court: yes** — 14 compare spots exist. **horkyone-10: no** — 2 photo spots, 0 flagged `compare` | horkyone-10 has no photographs to fit against. Either flag its spots `compare` first, or accept it on mean L landing within ±10 of the two fitted flats and say so in the commit |
| A2 | No shadow range anywhere. p05 luminance runs 81 (serenity) to 156 (horkyone-10); corners, skirtings and wall joins do not darken. Every sheet | GTAO, or path-traced lightmaps; removing `lightAt`'s unconditional ambient base and `aoAt`'s 0.35 floor at the source | **No.** ΔE averages spatially — this is exactly the blind spot the handoff records for lifted blacks | p05 sRGB luminance must fall, and the linear-domain contrast from `tools/luminance.py` must move toward the photographs' 7.6. Both reported per apartment, before and after |
| A3 | A floor-to-wall corner darkens on the floor side only: `bakeWalls` (`bake.js:264`) calls `lightAt` and never `aoAt`. Verified in source | GTAO, which covers walls and floors alike | **No** — a half-lit corner is a small fraction of any grid cell | A rendered corner at 1 m must show a continuous gradient across the joint. One screenshot per apartment, A/B against today |

### B — Content and geometry

| # | What looks wrong | Which feature would fix it | Can the metric see it? | Acceptance criterion if not |
|---|---|---|---|---|
| B1 | **[SUPERSEDED IN PART — see the note under this table]** **serenity's living room does not match its own photograph.** The flat has a floor-to-ceiling sliding door with sheer curtains; the model has a punched window (sill 0.85, head 2.45). No curtains, no rug, no air-conditioner, and the artwork is a radial-gradient blob. A yaw sweep at spot 3 finds *no* camera angle that reproduces the photograph. Sheets 03, 04 | Fix the opening in `serenity.json`; add curtains, rug and A/C as furniture; real artwork textures | **No.** Spot 3 scores 16.25 — mid-pack, better than average — while the two frames are visibly of different rooms | A human A/B at spot 3 must show the same opening shape and the same three objects present. This is a geometry bug found by eye and only fixable by eye |
| B2 | serenity's outdoors is three flat bands — sky, hedge, pool — with a smeared blob on the water. Spot 10 is the worst frame in the catalogue at **ΔE 29.02** and the pool is the property's headline feature. Sheets 01, 05 | HDRI sky, real planting and pool geometry, a water material | **Yes** — spot 10 is the largest single outlier in serenity's residual table | — |
| B3 | **[SUPERSEDED IN PART — see the B3 note under this table]** kings-court's black-marble bathrooms render as near-white blank walls; the feature material is simply absent. Spots 13 and 14, **ΔE 33.22 and 33.38** — the two worst in that flat. Sheet 08 | PBR texture sets (albedo + normal + roughness) | **Yes** | — |
| B4 | **[DECIDED AND CARRIED OUT — see the B4 note under this table]** kings-court spot 4, "Coffee corner", **ΔE 33.21**, is a product detail photograph — a coffee machine on marble. The model has no coffee corner; the render is a blank wall. Sheet 08 | Either model the props, or remove the spot from the compare set | **Yes, but it measures the wrong thing** — a missing object, not a material or a light | Decide explicitly whether detail-shot photographs belong in a resemblance metric at all. Whichever way, record the decision, because dropping it moves the mean and that must not read as an improvement |
| B5 | Every window in kings-court and horkyone-10 is a white or flat-blue void — there is no exterior geometry. The dollhouse shows the building floating in blue nothing, with no ground plane and casting no shadow. Sheets 06, 07, 09 | HDRI environment, a ground plane, a sun that casts | **Partially** — windows occupy grid cells, so the ΔE will move, but it cannot tell "sky through a window" from "white wall" | A dollhouse screenshot must show the building standing on ground with a cast shadow |
| B6 | Furniture is boxes throughout — the residual the phase A decomposition already identified as dominant | Real GLTF furniture | **Yes** | — |
| B7 | Procedural textures read as artefacts up close: marble is white scribbles, the bedroom feature wall is camouflage blobs, the quilted headboard is a flat grid of rectangles, string lights are dots on a straight line, artwork is a radial gradient. Sheets 02, 06, 07, 09 | Scanned CC0 PBR texture sets (Poly Haven, ambientCG) | **Weakly.** They carry roughly the right average colour, which is all an 8×8 cell mean sees | A screenshot at 1 m from each named surface must read as the material it claims to be, A/B against the photograph |

> **B1 is superseded in part, 2026-08-18 (phase B plan 4b, task 1).** Kept in
> place rather than deleted, because the parts of it that still stand are what
> 4b and 4c are executed against.
>
> **Dead — both halves of "punched window vs. floor-to-ceiling slider".** The
> model had already stopped being a punched window before 4b started: it is a
> `type: "door"` opening in `serenity.json` wall 4 (plan-4b spec, Correction 1).
> And the photograph was never a floor-to-ceiling slider either. Task 1
> measured `9.webp` — the only frame with the leaf slid open — and it shows,
> reading upward from the opening: head line, wall, curtain rod, wall,
> air-conditioner. Using that air-conditioner as a ruler inside that one
> photograph (235 px wide against 545 px head-to-floor; a wall-split indoor
> unit is 0.78–0.92 m), the **head is at 1.95–2.10 m**, which `DOOR_H` 2.05
> already builds. B1's premise inverted the error: the opening was never too
> short, only too narrow. Task 1 widened it 1.4 → 1.8 m and left the height
> alone; the review upheld that and re-derived the head independently.
>
> **Still live:** no curtains (`builder.js` builds `o.curtain` only for
> `type: "win"`, so the key on this opening is inert), no rug, no
> air-conditioner, radial-gradient artwork, and B1's acceptance criterion —
> a human A/B at spot 3 — which task 1 could not meet because spot 3's camera
> faces the wrong wall. That is a pose defect (spec Correction 2) and belongs
> to task 2; the missing objects belong to 4c.
>
> **New, found while disproving B1:** `mainCeilH: 2.6` is ~0.3–0.4 m too short.
> Deferred with an owner — `docs/PHASE-B-RESUME.md`, "Deferred, with owners".
> (Re-routed 2026-08-19 by task 5 from plan 4c to **plan 5**; see that table.)

> **B1's pose half is closed, 2026-08-19 (plan 4b task 2, `1e0d4e5`); its
> object half is not.** Kept in place; this is what changed under it.
>
> **Dead — "a yaw sweep at spot 3 finds *no* camera angle that reproduces the
> photograph."** That sentence was true of the camera position it was swept
> from and false as a claim about the room. Task 2 moved spot 3 as well as
> turning it, and the divider at the shipped pose shows the photograph's
> composition. Six serenity spots were re-pointed and `8.webp` — a bathroom
> photograph attached to a spot standing in the bedroom — was moved into the
> bathroom. **serenity's `poseVerified` went 2 of 11 → 9 of 11.** So B1's
> acceptance criterion ("a human A/B at spot 3") is now *meetable*, where task
> 1 could not meet it; the note above says exactly that and it came true.
>
> **Still live, and now better understood.** No curtains, no rug, no
> air-conditioner, radial-gradient artwork — all 4c. And task 2 found a defect
> B1 never named, which is the real reason a living-room A/B still does not
> pass: **the sofa is on the wrong wall.** The photographs put sofa and dining
> table against the same long wall; `serenity.json` puts them on opposite
> walls, so a camera that frames the terrace door correctly puts the sofa on
> the wrong side of the frame. Its sibling in the bedroom — bed head and
> window sharing one wall where the photographs show them perpendicular —
> is what makes `6.webp`/`11.webp` imperfect at correct poses. Both are in
> `docs/PHASE-B-RESUME.md`, "Deferred, with owners", routed to **4c**.
>
> **What this did to the metric, said the way it must be said.** serenity's
> all-spot legacy ΔE moved **16.00 → 15.49** across this branch. **No
> renderer, bake, post-processing, material or shader code changed anywhere in
> plan 4b.** The number moved because seven cameras started photographing what
> their photographs photograph — the metric began comparing like with like.

> **B3 is superseded in part, 2026-08-19 (plan 4b task 3, `c1a7329`).** Kept in
> place. The observation said the black-marble feature material "is simply
> absent". In **Bathroom 2** it was not absent — it was **inverted**: the
> fixture wall was black where the photograph is white and the bath wall white
> where the photograph is black. Task 3's fix round swapped them (south panel
> `z 2.5` black→white, east panel `x 11.3` white→black). Task 3 also **built
> the Bathroom 2 shower, which had never existed at all** — all four
> `type: "shower"` entries in the config sat outside the room's bounds. Spot
> 14 moved **25.78 → 21.75**, the largest single-spot movement on the branch.
>
> **Two warnings this fix earned.** (1) The marble swap is unambiguously
> correct per wall and it made spot 14's ΔE *worse* by ~5 points at the
> candidate poses, because the model's shower and bath are the photograph's
> mirror image, so correct colours landed on the wrong side of the frame. Two
> errors had been cancelling. (2) **B3's PBR half is untouched** — spot 13
> (Upper bathroom) is still the worst frame in the flat at 26.48, and that is
> the texture-set work B3 actually asks for, owned by **4c**. Bathroom 2's
> remaining defects — the mirrored layout and the missing divider glass — are
> a `builder.js` `F.shower` change and are **genuinely blocked** for 4b.

> **B4 was decided and carried out, 2026-08-19 (plan 4b task 4, `d7a643b`).**
> Kept in place, because the row's fourth column is the instruction that
> governed the decision and it was followed to the letter.
>
> **The merge owner ruled: do not model the props.** `4.webp`'s `compare` flag
> was removed; the spot keeps its coordinates, name, `poseVerified: false` and
> `poseNote`, so nothing a visitor sees changed. **kings-court's compare
> population is 13, not 14, from that commit on** — a before/after pair that
> straddles it is not a like-for-like comparison.
>
> **And the row's own warning, honoured.** Dropping a spot that scores 25.5
> from a 14-spot mean of 18.17 moves the mean by `(25.55 − 18.19)/13 = 0.566`
> and `(25.46 − 18.15)/13 = 0.562` on this task's two closing-gate rounds —
> **−0.56, arithmetic alone.** It is not a rendering improvement and must
> never be reported as one. The 14-spot pair, which is the like-for-like one,
> is **18.59 → 18.17**; the shipped 13-spot figure is **17.59**.


### C — The measurement harness itself

| # | What looks wrong | Which feature would fix it | Can the metric see it? | Acceptance criterion if not |
|---|---|---|---|---|
| C1 | **The comparison camera has the wrong field of view, and nothing has ever checked it.** `camera.fov` is 72° vertical and `measure.js` sets `camera.aspect` per photograph but never touches `fov`. A 16:9 photograph is therefore compared against a **104.5° horizontal** render; the three portrait photographs against a **55°** one. Every cell of the 8×8 grid looks at a different part of the room from the photograph's corresponding cell. Sheet 03 | Store a per-photograph field of view (or focal length) in the config and set `camera.fov` in the harness before each capture | **This *is* the metric.** It changes what every number in the phase A trend table means | Re-baseline after the fix. The absolute numbers will move, and phase A's trend cannot be compared across the change — say so in `metrics/README.md` rather than quietly restating the series |
| C2 | `validate.js` reports **zero issues on all three apartments** while everything above is true | Nothing — this is a scope statement, not a bug. The validator checks navigation, not appearance | n/a | Phase B must never cite a clean validator as evidence about quality. Worth one line in the rewritten `CLAUDE.md` |

### D — Product surface

| # | What looks wrong | Which feature would fix it | Can the metric see it? | Acceptance criterion if not |
|---|---|---|---|---|
| D1 | Photo-spot markers are large black camera discs that land in the middle of first-person frames — four at once in serenity's living room, and one floating against open sky on the terrace. Sheets 01, 02 | UI, not rendering: scale with distance, fade, or reveal on proximity | **No** — and worse, they are *in* the captured comparison frames, so they contribute to ΔE as pure noise | Markers must not occlude the subject at any spawn. Also: exclude markers from measurement captures, or they are scored as part of the room |

---

## Ruled out — two things that looked like bugs and are not

Recorded so the next session does not re-chase them.

**Area labels leaking into the first-person view.** A dollhouse area badge
("Upper hall 11 m²") appeared in an early first-person capture. It is an
artifact of the capture harness, not the product: the sheet builder set
`doll.on = false` directly to freeze the orbit camera, which then skipped
`doll.exit()`. Checked directly — 18 label sprites exist, 5 visible in the
dollhouse, and **0 visible after `exit()`**, on both the plain and the
teleport exit paths. The product is correct.

**A sky leak in kings-court's upper bathroom.** Blue appeared above the walls
in a render at spot 13. Rays cast straight up from four points around that
spot all hit a ceiling mesh at 0.84–1.26 m, and the four horizontal rays all
hit walls at 1.1–6.1 m. There is no hole. The blue is a window with nothing
modelled behind it — observation **B5**, not a shell defect.

---

## What this implies for the plan

Three things the walk changes about the handoff's suggested sequencing.

1. **C1 comes before step 1, not inside it.** The handoff's step 1 is "port
   the measurement harness and re-baseline". Porting it as-is carries a
   field-of-view error into phase B's safety net. Fix the FOV, re-baseline
   all three apartments, and treat that as the new zero — phase A's trend line
   ends there.

2. **A1 is nearly free and affects two of three properties.** The handoff
   frames exposure as something to re-fit at the end (its step 4). But
   kings-court and horkyone-10 have never been fitted at all, and exposure was
   worth 6.6 of phase A's 7.8 points on serenity. Whatever the migration does
   to lighting units, these two flats are over-exposed today and will be
   over-exposed differently tomorrow.

3. **B1 is the observation nothing on the feature list fixes**, and the
   handoff says that is the most important kind: "A defect nothing on the
   feature list fixes is more important than anything on it." No amount of
   HDRI, GTAO, PBR or GLTF makes a punched window into a sliding door. It is a
   config-geometry error, it is invisible to every automated gate the project
   owns, and the only reason it surfaced is that someone put the render and
   the photograph side by side. That argues for making the render-versus-
   photograph comparison a routine step with a fixed camera, rather than a
   feature to ship later.

   **2026-08-18:** the "punched window into a sliding door" framing here is
   superseded along with B1 itself — see the note under the B table. The
   opening was already a door and the photograph is not a floor-to-ceiling
   slider; what was actually wrong was its width, fixed by plan 4b task 1.
   **The paragraph's argument survives its own example intact**, and this is
   the part worth keeping: the error was still config geometry, still
   invisible to every automated gate (`window.__issues` was empty throughout,
   before the fix and after it), and it still surfaced only because someone
   put the render and the photograph side by side. What the correction adds is
   that the side-by-side is not sufficient either — B1 read the door's *height*
   off the same photographs by eye and got it backwards. It took pixel
   measurement against a known-size object in the frame to settle.
