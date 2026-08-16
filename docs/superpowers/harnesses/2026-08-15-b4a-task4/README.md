# Phase B plan 4a task 4 — the closing gate, measured on two trees at once

Preserved so every number in
`.superpowers/sdd/2026-08-15-phase-b4a-winding-walls/task-4-report.md`, in the
two committed `*-b4a-task4-*` metrics files and in the baseline table in
`docs/PHASE-B-RESUME.md` can be re-derived rather than taken on trust.

**What ships from this task:** no code change at all. `tour/` is byte-identical
to `f0315ea`, so `?v=` was **not** bumped — there is nothing new for a browser
to cache. What ships is a measurement, two new recorded baselines and their
attribution.

## The method, and why it is this one

Both trees were measured **in the same session**, which is plan 3 task 7's
method:

| arm | commit | served on | `?v=` | serenity / kings-court `exposure` |
|---|---|---|---:|---|
| BASE | `b39a99a` — the branch's merge-base, confirmed with `git merge-base HEAD main` | `:8743`, from a detached worktree | 107 | 0.329 / 0.575 |
| HEAD | `f0315ea` — the branch tip after tasks 1–3 | `:8742` | 110 | 0.295 / 0.52 |

Three rounds per arm, **interleaved** (HEAD round 1, BASE round 1, HEAD round
2, …) so that any drift over the session lands on both arms rather than on one.

Two facts make the comparison like-for-like, and both were checked rather than
assumed:

* `git diff --stat b39a99a HEAD -- tools/` is **empty**. Both arms ran the same
  `delta_e.py`; each was scored by its own tree's copy of it, against its own
  tree's config and photographs.
* `tour/measure.js` is unchanged between the two commits, and the `compare`
  populations are identical — serenity 11 spots, kings-court 14, the same
  files. The whole diff is `exposure` on three apartments, two serenity
  painting `x` values, `bake.js`, `post.js` and the `?v=` tag.

The **only** edit made to the BASE worktree was its `tools/serve.py` port,
8742 → 8743, so two servers could run at once. It is uncommitted and touches
nothing the renderer reads.

Both halves of the gate were verified present on **both** trees before anything
was measured — `?fov=legacy` in `measure.js`, `--all-spots` in `delta_e.py`.
Both have been deleted once in this project's history.

## Files

| file | what it holds |
|---|---|
| `session.json` | every reading verbatim: all twelve round readings with their `scored`/`compareTotal`/`skippedPoseVerification` fields, both probe generations, the draw-call and `__issues` results, the environment |
| `*-b4a-task4-run{2,3}-{HEAD-f0315ea,BASE-b39a99a}-legacy-allspots.json` | rounds 2 and 3 of both arms, exactly as `delta_e.py` wrote them |
| `*-b4a-task4-fix1-HEAD-f0315ea-L{1,2}-{control,probe}-e<value>-legacy-allspots.json` | **the live split measurement** — same-load paired control/probe, two loads per apartment |
| `*-b4a-task4-probe-HEAD-f0315ea-e{0.306,0.56}-legacy-allspots.json` | the **superseded** first-generation probes. Kept, not deleted; nothing computes from them — see "What the first version got wrong" |

Round **1** of each arm is the committed pair and lives in
`docs/superpowers/metrics/` as `*-b4a-task4-{BASE,gate}-legacy-allspots.json`.
Rounds 2–3 and the probes are raw probe dumps and stay here, which is the split
task 3 used for its `thresh-*.json`.

Every filename here names **both** the camera (`legacy`) and the population
(`allspots`), and the arm's commit. `delta_e.py` writes no camera field, so the
filename is the only place the camera is recorded, and this project's sharpest
recorded failure is an error that entered through a filename and survived three
review rounds.

## The probes, and what they are for

Task 3 established from luminance slopes that a large part of kings-court's
exposure move was the mandated all-spot fit-population switch rather than task
1's render change. Rather than propagate that ratio into the ΔE movement, this
task measured it: on the HEAD tree, `renderer.toneMappingExposure` was
overridden at runtime to the exposure each apartment's *poseVerified* fit would
have chosen, and the gate was re-read.

**The measurement below is fix round 1's. The first version of it was wrong
twice and is preserved further down rather than deleted.**

### Where the counterfactual exposures come from — one method, both apartments

The zero crossing of the **`poseVerified`** population's luminance diff in task
3's own committed sweep, `<apt>-b4a-task3-exposure-sweep-fixedfov-allspot.json`:

| apartment | bracket in the sweep | crossing | probed at |
|---|---|---:|---:|
| kings-court | 0.53 (−0.0148) → 0.56 (+0.0002) | **0.5596** | 0.5596 |
| serenity | 0.29 (−0.0078) → 0.30 (+0.0018), refined twice | **0.2974–0.2981** | 0.298 |

serenity's crossing is confirmed by three independent batches (coarse 0.2981,
refine 1 0.2978, refine 2 0.2974). Its two refine batches stop just short of
the crossing, so those two are extrapolated from their last two points.

### The design: same-load paired, two loads each

Per page load: `await window.__bakeReady`, set the exposure to the **shipped**
value, `__measure()`, score; then set it to the **counterfactual** on the same
load, `__measure()`, score. The convention part is the *within-load*
difference, so between-load variation cancels rather than entering the
estimate. That matters more than it sounds: the loads' absolute readings
disagree by up to 0.074, while the paired differences agree to 0.0036.

| apartment | convention per load | mean | spread | render (= total − convention) | convention share |
|---|---|---:|---:|---:|---:|
| serenity | −0.0227, −0.0245 | **−0.0236** | 0.0018 | **−0.5900** | **3.9%** |
| kings-court | −0.1536, −0.1500 | **−0.1518** | 0.0036 | **−0.1513** | **50.1%** |

**serenity's improvement is essentially all render. kings-court's is a dead
heat** — its two halves are 0.0005 apart, so which is larger is not resolved
and is not claimed. What *is* resolved is that about half of kings-court's
headline improvement is measurement convention.

The fresh controls also reproduce the original session's HEAD arm — 15.9832
against 15.9973, 18.5682 against 18.5757, both inside the ±0.039 floor — which
is what licenses using a total measured in one session with a convention part
measured in another.

### Sensitivity

Measured ΔE slopes near the operating point: **7.879** (serenity) and **3.833**
(kings-court) per unit exposure. The counterfactual at which each split would
read exactly 50/50 is therefore:

| apartment | crossing used | 50/50 break-even | margin |
|---|---:|---:|---:|
| serenity | 0.2980 | 0.3339 | **0.036 below** — robust |
| kings-court | 0.5596 | 0.5595 | **0.0001** — a dead heat |

serenity's break-even is further from its crossing than the whole 0.329 → 0.295
exposure change, so its render-dominated conclusion cannot be moved by any
plausible re-reading of the sweep. kings-court's sits on top of its crossing,
which is the quantitative content of "the ordering is not recoverable".

**No apartment JSON was touched for any of this** — the override is
runtime-only, the same technique plan 3 task 7 used for its "at BASE's
exposure" rows.

### What the first version got wrong

The original probes (`*-probe-HEAD-f0315ea-e{0.306,0.56}-*`) are still
committed here. Do not compute from them; nothing in the record does any more.

1. **serenity's counterfactual was wrong.** 0.306 came from task 3's *finding
   2* slope arithmetic, `0.295 + 0.011`, and that 0.011 was computed on the
   **pre-winding** tree — the wrong tree for a probe run on HEAD. It appears
   nowhere in task 3's outputs as a fitted value, and the sweep it was
   attributed to says 0.2974–0.2981.
2. **Both probes were unpaired** — a single load compared against a mean of
   *other* loads. kings-court's probe load happened to sit high, which inflated
   its slope from 3.833 to 4.554 and its convention share from 50.1% to 60.1%.
3. **The method attribution was wrong in `session.json`**, which said both
   counterfactuals came from the slope decomposition. Only serenity's did —
   and that was the one that was wrong. kings-court's 0.56 was the sweep
   crossing all along, 0.0004 from it.

**And one claim was withdrawn rather than repaired.** The original text said
the split "confirms task 3's own prediction from luminance slopes (~62%) by an
independent route". It does not: 62% is a share of the **exposure** move and
this is a share of the **ΔE** move, which need not agree even when both are
right. Task 3's slope table and this sweep also disagree about the exposure
worth of the population switch — 0.032 against a measured 0.560 − 0.520 =
**0.040**, 25% apart. There was no corroboration to claim, and the near-match
of 60% and 62% was a coincidence between a wrong number and an unrelated one.

## Which spots the movement comes from

All-spot means by mandate, but the movement is concentrated, and on serenity
the concentration cuts against the headline:

| apartment | fact |
|---|---|
| serenity | the whole −0.61 is carried by `7.webp` (−4.96) and `6.webp` (−4.11), **both `poseVerified: false`** — together −0.825 of a −0.614 movement. Its **only two** pose-verified spots moved the other way: `1.webp` +0.37, `11.webp` +0.16 |
| kings-court | the reverse — **seven of its eight** pose-verified spots improved. The exception, `19.webp` (Laundry), regresses **+1.55**, the largest single-spot movement on the branch, reproduced in all three rounds (19.63/19.63/19.62 → 21.18/21.18/21.17) |

`19.webp` is mostly the exposure, not the render: at 0.56 it reads 19.95, at
the shipped 0.52 it reads 21.18, having been 19.63 on the old tree at 0.575.
Neither fact changes a baseline — the gate is all-spot by rule 5 — but neither
should be left for a later reader to find.

## Reproducing

```bash
python tools/serve.py                       # repo root, UNSANDBOXED, :8742
git worktree add ../airbnb-base b39a99a
#   then sed 8742 -> 8743 in ../airbnb-base/tools/serve.py and run that too
```

Sandboxed, `POST /save/` answers 200 and writes nothing — probe for the file on
disk before trusting any capture. This session probed both ports with a
throwaway body first and confirmed real bytes landed in both trees.

Then, per page load, at `http://localhost:<port>/?apt=<id>&measure=1&fov=legacy`:

```js
await window.__bakeReady;
await window.__measure();          // POSTs each spot to that tree's tools/shots/
```

```bash
python tools/delta_e.py --apt serenity --phase b4a-task4-gate-legacy-allspots --all-spots
python docs/superpowers/harnesses/2026-08-15-b4a-task2/check_metrics_readme.py
python docs/superpowers/harnesses/2026-08-15-b4a-task2/check_metrics_readme_selftest.py
```

`tools/shots/` is gitignored and each capture overwrites the last, so the
scoring for every round was run **before** the next capture started. The JSONs
here and in `metrics/` are the surviving record; the frames are not kept.

## The noise floor this session measured

Within-arm spread across three loads, all-spot ΔE2000 in the legacy camera:

| arm | serenity | kings-court |
|---|---:|---:|
| BASE | 0.0209 | 0.0557 |
| HEAD | 0.0164 | 0.0221 |

All four sit inside the ±0.039 full-precision floor `r128-reference.md` defines,
and the smallest movement being attributed (−0.30) is five times the largest of
them. Repeats are not bit-identical because `bake.js`'s cosine sampling and
`materials.js`'s procedural textures both use `Math.random()`.

## The checker was extended, not worked around

Adding four files to `metrics/` moved a count that
`docs/superpowers/harnesses/2026-08-15-b4a-task2/check_metrics_readme.py`
asserts against the README's prose (nineteen → twenty-three), and
"twenty-three" is the first of those counts to contain a hyphen — which `\w+`
does not match. The checker's number-word patterns were widened to `[\w-]+`
and its word table extended, and the self-test gained a mutation
(`twenty-three` → `twenty-two`) that proves the hyphenated count is still
**compared** rather than merely matched.

The new README figures are not exempt from that checker either: it gained
twenty-four assertions covering the task-4 table, all twelve round readings,
the spread range, the two headline movements and both probe splits, and the
self-test gained seven mutations across those classes — including one that
perturbs a **harness** JSON, since the harness is now a data source the checker
reads.
