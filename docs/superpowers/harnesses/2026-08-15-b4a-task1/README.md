# Harness — plan 4a task 1, the wall winding sign test

Reproduces the winding defect in `tour/bake.js`'s `grid()` before the fix and
proves it gone after. Console-only; no Playwright dependency, no npm.

## Running it

```bash
python tools/serve.py          # NOT `python -m http.server` -- the /save/ endpoint is this server's
```

Open `http://localhost:8742/?apt=<id>`, paste `faces.mjs` into the console, then:

```js
await window.__bakeReady; window.__faces()      // the plan's probe, verbatim
await window.__bakeReady; window.__facesLvl()   // the elevation-aware probe -- see below
```

Both return `{apt, walls:[{i, alongX, near, far, none}], totals:{near, far, none}}`;
`__facesLvl` adds `lvl` per wall. Results are committed as
`docs/superpowers/metrics/faces-b4a-task1-{before,after}.json`.

## What it measures

Each config wall is sampled at five points along its length and up to three
heights, from both sides. The probe stands **1 m off the centreline** and
casts at it. Wall thickness is 0.14, so:

| hit distance | meaning |
|---|---|
| 0.93 | the **near** face — the surface actually facing the probe. Correct. |
| 1.07 | the **far** face — the probe saw *through* the near face because it was culled. The defect. |
| anything else | classified `none`; every instance is accounted for below. |

`userData.doll === 'walls1'|'walls2'` is what keeps floors and furniture out
of the count.

## Result

Both probes, all three apartments — no wall is mixed, the split is total:

| | serenity | kings-court | horkyone-10 |
|---|---|---|---|
| **before** — along-x walls showing near / showing far | 4/4 · 0/4 | 19/19 · 0/19 | 6/6 · 0/6 |
| **before** — along-z walls showing far / showing near | 5/5 · 0/5 | 23/23 · 0/23 | 9/9 · 0/9 |
| **after** — every wall showing near / any showing far | 9/9 · 0 | 42/42 · 0 | 15/15 · 0 |

**The older figures on record — along-x near 6/6 and 14/16, along-z far 8/8
and 17/18 — are superseded.** They count a population this probe does not
reproduce: serenity has 9 config walls (4 along-x, 5 along-z), not 14, and
kings-court has 42, not 34. The *direction* they record is exactly right and
is reproduced here without a single counter-example; only the denominators
differ. The "two kings-court walls unexplained" that plan 3 left open do not
exist in this population — see below, where all 42 are accounted for.

## Two probes, because the plan's one cannot see the upper storey

`__faces()` probes at **world** y 0.4/1.5/2.2. kings-court's `upperFloorY` is
**3.1**, so every `lvl:"upper"` wall sits entirely above the probe and can
never be hit: 11 of kings-court's 42 walls returned nothing but `none` for
that reason alone, and three more (20, 21, 31) returned a *false* `near` off
the ground-floor wall stacked directly beneath them.

`__facesLvl()` lifts each ray by the wall's own base (`builder.js:201`:
`mainFloorY` or `upperFloorY`) and additionally requires the hit to lie on the
probed wall's own centreline plane. That is the probe with full coverage, and
it is the one the table above and the committed metrics are read from.
`__faces()` is kept unchanged so the plan's stated interface still exists.

## Every `none` accounted for (step 5)

Under `__facesLvl`, after the fix:

| apartment | `none` | by an opening | other |
|---|---|---|---|
| serenity | 46 | 46 | 0 |
| kings-court | 133 | 96 | 37 |
| horkyone-10 | 101 | 44 | 57 |

**By an opening** — the probe line passes through a door, passage or window.
Checked mechanically against each wall's `openings[]` and the height bands in
`builder.js:186` (`DOOR_H 2.05`, `PASS_H 2.2`, `WIN_SILL 0.85`/`WIN_HEAD 2.45`).
All of serenity's 46 are this: e.g. wall 4's door spans x 3.35–4.75, so t=0.15,
0.35 and 0.50 at y 0.4 and 1.5 pass straight through, and y 2.2 clears the head
and hits.

**Other** — every one is a real wall surface standing inside the 1 m standoff.
Four causes, all identified:

1. *A parallel wall closer than 1 m.* kings-court walls 1 (x 23.8) and 9
   (x 23.0) are 0.80 m apart, so each probe origin lands past the other wall
   and hits it at 0.27 — 21 probes. horkyone-10 is the extreme case: walls 3,
   4 and 7 sit at x 4.86, 4.62 and 5.01, within 0.15–0.39 m of each other, and
   account for 33 of its 57.
2. *A taller ground-floor wall in front of an upper one.* kings-court wall 24
   (upper) is screened at t=0.15 by wall 28 (`lvl:"main"`, `h 3.9`), which
   reaches y 3.9 and so is still present at the upper storey's probe height.
3. *A neighbouring wall's end quad.* An along-x wall's end reveal is a plane at
   constant x and is hit head-on by a probe travelling along x. kings-court
   wall 18 is screened at t=0.15 by such a quad at x 4.80 belonging to the
   upper along-x wall at z 0.50; horkyone-10 wall 11 by wall 12's end quad at
   z 6.41. Confirmed by reading the hit triangle's own vertices, not inferred.
4. *Above the attic slope.* The eight probes that hit **nothing at all** are
   all kings-court, all at dy 2.2, all on walls 18, 19, 24 and 32. Computing
   the attic height at each probe's z from `APT.attic`
   (`northZ -2.6/northH 1.8 → ridgeZ 0.8/ridgeH 3.0 → southZ 6.6/southH 1.4`)
   puts every one of them **above** the slope — 2.2 against 1.70, 1.96 and
   1.91. The roof has cut the wall away there and there is correctly no
   geometry. **This is the only class that returns no hit, and it is not a
   hole in the shell.**

Nothing is left unexplained. The one residual is cosmetic: for two of the
class-3 quads the exact `wallPieces` boundary that produced them was not
traced back to a config key. The surface itself was read off the geometry
buffer and is unambiguously wall, so the classification does not depend on it.

## Known limitation

The 1 m standoff is a fixed constant and several walls in these flats are
closer together than that. That inflates `none` (see cause 1) but cannot
produce a false `far`, so it does not weaken the result. `__facesLvl`'s
centreline-plane test is what stops a neighbouring wall being *miscounted* as
the probed wall's face.

## Before/after frames

`b4a-task1-{serenity,kings-court}-{before,after}.webp` — the same first-person
view either side of the fix, 1280×820, through the post chain. Captured as JPEG
via `tools/serve.py`'s save endpoint and converted, because `*.jpg` is
gitignored repo-wide for source photographs and this evidence has to ship.

serenity's is the one to look at. The left-hand wall renders **dark grey
before and correctly light after**: that is the defect's whole visual
signature — before the fix the visitor was looking at the face shaded from a
sample point on the *outside* of the building.

The same frame also shows two paintings present before and **missing after**.
That is not a rendering fault. They sit at x 5.71 against wall 2, whose
centreline is x 5.75, i.e. 0.04 from the centreline and so *inside* the 0.14
slab. They were only ever visible because the wall was inside-out and
presenting its far face at 5.82. This is a pre-existing config error of exactly
the class CLAUDE.md rule 2h describes, newly exposed — not introduced — by the
fix. Enumerated across all three apartments, it is these two paintings and
nothing else (kings-court 0 of 25 wall-mounted items, horkyone-10 0 of 6).
Left for plan 4b, which owns config geometry; the correction is x 5.71 → 5.65.
