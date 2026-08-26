# Engine defects and camera poses — 2026-08-26 (second pass)

Follow-up to `2026-08-26-serenity-photorealism.md`, which closed leaving four
open items. This pass works all four. Branch restarted from `main` after that
plan merged as PR #39.

## 1 — A curtain panel could be parked across its own glass

`builder.js` placed a fixed 0.55 m drape centred 0.14 m outside the opening
edge — so its inner edge sat 0.135 m inside the reveal, which is what a
bunched curtain does — and then clamped the **centre** into `[0.33, L − 0.33]`
so it could not poke past the end of the wall run. The clamp moves the panel
without narrowing it, so a window near the end of a short wall gets its drape
slid across the glass.

Enumerated over every curtained opening in all three apartments **before**
anything was touched:

| apartment | panels clamped | glass covered |
|---|---|---|
| kings-court | **0** — its window wall is 28.4 m | 0.135 everywhere, i.e. by design |
| serenity | 1 | 0.155 |
| horkyone-10 | 1 | **0.445 of a 1.02 m opening — 44% of the glass** |

So this was never a "risk of moving another apartment": kings-court cannot
trigger it at all, and horkyone-10 has been shipping a window 44% hidden
behind a curtain.

The fix keeps the inner edge exactly where it always was and **narrows** the
panel to whatever room is left between the opening and the end of the run —
which is what a real curtain does when the window is 0.16 m from a corner —
and skips it entirely below 0.12 m. With room to spare every number reduces
to the old ones exactly, which is why kings-court moves by zero.

Result: horkyone-10 0.445 → 0.135, serenity 0.155 → 0.135, kings-court
unchanged. Evidence frame: `harnesses/2026-08-26b/hk-curtain.png`.

## 2 — `buildFurniture` skipped unknown types silently

`if (!fn) continue`. A typo in a config produced a missing object and no
diagnostic; CLAUDE.md rule 3 records an hour lost to exactly this class.

Now collected into `Builder.configIssues` and folded into `window.__issues` by
`validate.js`, so `?check=1` shows them and the standing "the list must be
empty before commit" rule covers them.

## 3 — `OCC_H` had a silent 0.8 m default

A colliding furniture type absent from the occlusion-height table took 0.8 m
without saying so. Same treatment: reported into `window.__issues`, once per
type, and only where an occluder is actually added.

**It fired on its first run and found two real defects**, both in kings-court:
`shelfTower` (a 2.45 m carcass) and `tvWallUnit` (a 2.35 m media wall) were
baking their shadows at 0.8 m. Entries added at their measured heights, which
is a change to kings-court's baked light, so it was measured rather than
assumed:

- all-spot legacy ΔE **17.58 → 17.53**, i.e. neutral overall.
- The change is concentrated exactly where those objects are: 12.webp
  (Bedroom 2) has a BASE-vs-HEAD mean pixel difference of **10.7** against a
  ~3 baseline, and its ΔE goes **18.76 → 17.99**. 11.webp moves 4.9 pixels
  and +0.30. Every other spot moves ~3 pixels, which is the noise floor.
- Looking at 12.webp before and after: the old frame carried a large dark
  smear across the ceiling and upper wall where light leaked over the 0.8 m
  occluder; the new one is clean.
  Evidence: `harnesses/2026-08-26b/kc-occh.png`.

serenity and horkyone-10 report nothing.

## 4 — Camera poses at the corrected 85° lens

The previous pass changed `meta.photoFovLong` 120 → 85 and left the poses,
noting several no longer framed their photograph. Worked here **by looking**,
which is the only method this repository accepts for camera work, and with
each change stated as a choice rather than a derivation.

| spot | before | after | verdict |
|---|---|---|---|
| 6.webp | (2.15, 5.30) yaw 172 pitch −6 | **(1.85, 4.45) yaw 174 pitch 7** | re-posed; the old camera stood 1.35 m from the window and framed neither the seat nor the bed |
| 7.webp | (2.55, 5.15) yaw 46 pitch 13 | **(2.66, 6.00) yaw 27 pitch 10** | re-posed; the photograph looks along the bed from its HEAD end toward the wardrobe |
| 2.webp | (5.45, 6.60) yaw 108 pitch 40 | **(5.50, 7.20) yaw 112 pitch 32** | re-posed; pitch 40 pointed almost at the deck. `poseVerified` stays false |
| 1.webp | (2.70, 1.25) yaw 55 | **unchanged** | `poseVerified` **withdrawn** — see below |

### 1.webp: a finding, not a number

Cropping both edges of the photograph shows a sliding-door leaf with a
recessed flush pull at close range on the right and its jamb on the left, with
the shower, toilet, vanity and round mirror seen **through the gap**. The
photographer stood outside the bathroom and shot through the doorway; the
shipped camera is 0.10 m inside the room. Both alternatives were built and
rendered: the bedroom-door line puts the camera inside the wardrobe, and from
the hall door the vanity and the shower cannot both be in frame at the
photograph's angular span. **No pose in the modelled bathroom reproduces this
photograph**, which is evidence that the modelled bathroom is not the
proportions of the real one. The camera was left where it is — a wrong number
is worse than an acknowledged unknown — and the flag that asserted a
verification the photograph contradicts was withdrawn. serenity's
`poseVerified` population goes 10 → 9.

### A bedroom furniture correction the pose work surfaced

6.webp and 11.webp both put the lamp table **between** the window seat and the
bed; the config had bed, seat, table. Re-ordered to bed (1.38) | table (0.50)
| seat (1.00) across the 2.96 m room, and the window moved over the seat.

## The metric went up, and that is the metric being wrong

| | legacy gate (72°) | true lens (85°) |
|---|---|---|
| BASE (`main`) | **13.13** | **13.20** |
| this pass's config, old poses | 13.27 | 13.14 |
| this pass, shipped | **13.52** | **13.18** |

At the lens that actually models the photographs the whole pass is flat —
13.20 → 13.18, inside the ±0.1 run-to-run spread. At the legacy gate it costs
+0.39, and 6.webp alone accounts for +3.1 of it (9.23 → 12.32).

That is not the poses being wrong. Rendered **through the legacy camera
itself**, the old 6.webp pose shows a window and a blank wall; the new one
shows the window, the seat with its cushions, the lamp and the bed — every
object the photograph contains. The old frame scored better because an 8×8
grid of cell mean colours rewards a featureless field of the right average
colour. `harnesses/2026-08-26b/legacy-pose-check.png` is that comparison.

This is the same lesson as the rejected mirrored-bedroom variant in the
previous plan, met from the other direction: there the metric preferred a
broken frame, here it prefers an empty one.

**Consequence for whoever measures serenity next:** its legacy gate figure is
no longer comparable across this branch, and the reason is structural — the
gate renders a fixed 72° *vertical* with aspect only, which for a 16:9
photograph is **104° horizontal**, while `photoFovLong` now says 85°. A pose
chosen for one is penalised by the other. The true-lens column is the one that
measures resemblance; the legacy column exists for continuity with PR #27's
thresholds and should be read as such.

## Verification

- `window.__issues` empty on **all three** apartments (it was not, before the
  new diagnostics were added — that is the point of them).
- serenity: 93 draw calls with the post chain live, 3 PointLights, bake ~4.7 s.
- Seven walk simulations, all reaching their target.
- Top-down cutaway inspected after the bedroom re-order: nothing floating, no
  blocked passage.
- Scene **topology identical** BASE-vs-HEAD for kings-court and horkyone-10
  (the horkyone-10 curtain is a plane resize, same vertex count; the
  kings-court change is occluders, which are not meshes).
- Mean linear luminance 0.3016 against the photographs' 0.2995 on the new
  9-spot pose-verified population — the 0.327 exposure still lands it, so it
  was not re-fitted. p5 0.1109 against 0.0402, the same standing gap.
- `?v=` bumped to 143 after the last code edit and confirmed loaded.

## Still open

- The modelled bathroom does not match 1.webp's proportions.
- kings-court's `meta.photoFovLong` still says 120 against two earlier
  measurements near 57–58°.
- Wall occlusion in the bake (the p5 gap).
- `F.vanity` still hard-codes a backlit rectangular mirror for its five other
  callers; this branch worked around it with `mirror: 'none'`.
