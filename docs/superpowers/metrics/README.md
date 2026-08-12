# Phase A photorealism — resemblance metrics

Mean CIEDE2000 (ΔE2000) between the render and the real photograph, over
an 8×8 grid of cell-mean colours, at the 11 Serenity photo spots flagged
`compare`. Raw data for every run is the sibling `*.json` files in this
directory; `tools/delta_e.py` produces them, `tools/residual.py` produces
the decomposition below.

**Absolute values are meaningless.** Render and photograph differ in
lens, exposure and furniture model — an 8×8 grid mean will never reach
zero, and it isn't supposed to. Only the *trend* between phases carries
information.

## The trend

| Stage | mean ΔE2000 |
|---|---:|
| Baseline, before any work | 24.36 |
| Environment captured from the apartment | 24.81 |
| Chamfered furniture edges | 24.81 |
| Baked ambient occlusion | 24.54 |
| Post-processing chain | 23.15 |
| **Exposure matched to the photographs** | **16.57** |
| Palette sampled from the photographs | 16.58 |

**The trend went down, from 24.36 to 16.58 — a drop of 7.78 points
(32%).** It is not monotonic: **environment capture raised the score**,
from 24.36 to 24.81 (+0.45), and chamfering then left it unchanged at
24.81. Both were kept anyway. The environment capture's +0.45 is small
next to the 6+ point moves later in the table and is plausibly within
run-to-run noise from the 8×8 grid; more importantly, it buys real
reflections of the apartment's own space instead of a stock studio —
a correctness change with a visual justification independent of this
metric, not something this metric was ever going to reward directly
(reflections shift a handful of glossy pixels; they don't touch the
diffuse colour of the other 63 grid cells). Chamfering is the same shape
of argument: edges that catch a highlight instead of showing a razor
silhouette, kept for how the render looks, not because ΔE2000 asked for
it. Both are cheap to keep and this is the only task in the table that
raised the score; every one after it (AO, post, exposure) brought it
back down and past baseline.

## Every file in this directory

The trend table above cites one canonical file per stage. This directory
also holds every intermediate and exploratory run behind the post-
processing and palette stages — kept deliberately, not clutter, because
several of them are the actual evidence for findings stated elsewhere in
this document. Canonical files (the ones the trend table's numbers come
from) are marked **canonical**; everything else is a waypoint, a control,
or a ruled-out alternative, in chronological order.

**Ambient occlusion (stage: "Baked ambient occlusion," trend-table value 24.54)**

| File | mean | What it is |
|---|---:|---|
| `serenity-a3-ao.json` | 24.54 | **Canonical.** The baked-AO stage's trend-table result. |
| `serenity-a3-ao-fix1.json` | 24.51 | Rerun after AO review round 1 (occluder plane-culling, floor-relative height, dropping a biased ray override). Near-identical to the canonical run — the fixes were correctness fixes to the AO sampler, not attempts to move this metric. |

**Post-processing (stage: "Post-processing chain," trend-table value 23.15)**

| File | mean | What it is |
|---|---:|---|
| `serenity-a4-post.json` | 23.15 | **Canonical.** The post-processing chain's trend-table result. |
| `serenity-a4-post-fix.json` | 23.15 | Rerun after the post-processing correctness fixes (sRGB encoding on the composer's render targets, dropping a DPR-mismatched bloom resize). Same score as the canonical run — expected, since those fixes corrected *how* the chain rendered, not anything this metric measures; recorded to confirm the fixes hadn't regressed resemblance, not to move it. |

**Palette (stage: "Palette sampled from the photographs," trend-table value 16.58)**

| File | mean | What it is |
|---|---:|---|
| `serenity-a5-nopalette-check.json` | 16.57 | **Control.** Score with no palette applied at all — matches the exposure-only baseline exactly, and is the number every palette variant below is measured against. This is the file that makes the null result checkable rather than asserted. |
| `serenity-a5-palette-direct-test.json` | 16.79 | **Ruled out.** An early approach: sample photograph colours and apply them directly. This is *worse* than doing nothing (16.79 vs. the 16.57 control) — the measured evidence that direct sampling actively hurts resemblance, which is what justified building the closed-loop approach below instead of shipping this one. |
| `serenity-a5-palette-closedloop-test.json` | 16.59 | The closed-loop sampling approach that replaced direct sampling. Roughly flat against the 16.57 control — the approach that was actually adopted and committed. |
| `serenity-a5-palette.json` | 16.62 | First committed wiring of the adopted approach: palette values reached only the live (non-baked) materials via `Materials.init()`. Baked floors, ceilings and walls still ignored `APT.palette` entirely at this point, which is why this number is *worse* than the 16.57 control rather than better. |
| `serenity-a5-palette-fix1.json` | 16.60 | After wiring `bake.js`'s merged wall tint to the palette (fix round 1). Still worse than the control — the floor/ceiling lightmap tint was still unwired. |
| `serenity-a5-palette-fix2.json` | 16.58 | **Canonical.** After wiring `builder.js`'s floor/ceiling overlay tint too (fix round 2) — palette now reaches every surface. This is the trend-table's "Palette sampled from the photographs" result, and it is where the null result becomes trustworthy: with every surface genuinely wired, the score (16.58) still lands within noise of the no-palette control (16.57). |

## Two results worth stating plainly, not smoothing over

**The exposure task did almost all of the work.** A reviewer decomposed
it: the CIEDE2000 lightness term fell from 15.9 to 0.6, and the predicted
post-fit score of ~16.8 matched the measured 16.57. The gain is entirely
lightness, with no unexplained remainder — one wrong global number
(display-referred exposure, never previously measured against the source
photographs) was responsible for most of the phase's total improvement.
Every other task in this phase — environment, chamfering, AO, post,
palette — together moved the score less than exposure alone.

**The palette task returned a null result, and it is a real one.** Task 8
sampled six material colours out of the photographs into `APT.palette`.
The first wiring only reached `Materials.init()`'s live materials; baked
surfaces (floor/ceiling lightmap tint in `builder.js`, the merged wall
mesh in `bake.js`) ignored the palette entirely, so two follow-up fixes
wired the palette into all three baked paths before the null result could
be trusted. With walls, floors, ceilings and furniture all genuinely
reachable, the score still went from 16.57 to 16.58 — not an improvement,
within noise of a regression. A reviewer confirmed the null was honest
rather than concealed tuning: see the residual decomposition below for
*why* a colour correction had nothing left to correct.

## Where the residual ~16.5 actually lives

`tools/residual.py` asks a different question than the trend table: is
what's left a **global colour cast** — the same shape of problem exposure
turned out to be — or **distributed content error** that no global
correction can reach? Run from the repo root against the current
(post-palette) renders:

```bash
python tools/residual.py
```

```
file      room                 dL      da      db      dE dE_noAB
1.webp    Bathroom          +7.85   -1.02   +1.15   17.88   17.79
2.webp    Pool Terrace      +3.76   +2.38   +6.73   17.36   16.23
3.webp    Living Room       +2.89   +2.04   +0.56   16.25   15.91
4.webp    Living Room       +3.26   +1.50   -0.09   13.91   13.68
5.webp    Kitchen & Hall    +0.66   +1.42   +1.41    9.81    9.32
6.webp    Bedroom           -2.79   -0.64   +2.66   15.95   15.62
7.webp    Bedroom           -4.78   +1.65   +7.82   19.31   18.05
8.webp    Bedroom           +6.48   +1.89   -1.78   11.74   11.01
9.webp    Living Room       +7.41   -3.10   +0.10   18.87   18.17
10.webp   Pool Terrace      +6.44   +2.00   -4.18   29.02   28.98
11.webp   Bedroom           -1.22   -0.13   +3.99   12.33   11.81

mean offsets across spots:  dL +2.72   da +0.73   db +1.67
spread (std):               dL  4.09   da  1.64   db  3.34

mean dE2000 now:                        16.58
after ONE global a/b shift (0.73, 1.67): 16.47
  -> a single global colour correction is worth 0.11 points
```

Reading this against exposure's result (worth 6.6 points as a global
lightness correction) is the whole point:

- **Removing the global a/b colour offset entirely is worth 0.11 ΔE
  points** (16.58 → 16.47). There is no global colour correction left to
  make — which is exactly why the palette task found nothing to fix.
- **Per-spot lightness still swings −4.78 to +7.85** even though the
  *mean* (dL +2.72) matches what exposure fitted. The light
  *distribution* differs room by room; only its average was corrected,
  because exposure is a single scalar and a per-room distribution is not
  a problem a single scalar can solve.
- **Spot 10, the Pool Terrace, is a huge outlier at 29.02 against a 16.6
  mean.** That photograph is mostly water, planting and real sky — this
  scene renders those as flat coloured boxes. Pure content mismatch, not
  a lighting or colour problem at all.

**The conclusion: the residual ~16.5 is content and geometry mismatch,
not calibration.** Box furniture where the photograph has real objects,
procedural textures approximating real materials, crude surroundings
outside the windows, and a per-room light distribution that doesn't match
the real one. None of it is reachable by any global correction — global
corrections were exhausted by exposure, down to the 0.11-point floor
measured above. It is what real GLTF furniture, PBR texture sets and
proper multi-bounce GI exist for, and that is the next phase (the engine
migration), not this one.
