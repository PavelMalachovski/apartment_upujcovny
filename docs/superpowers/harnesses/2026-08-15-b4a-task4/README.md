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
| `session.json` | every reading verbatim: all twelve round readings with their `scored`/`compareTotal`/`skippedPoseVerification` fields, both probes, the draw-call and `__issues` results, the environment |
| `*-b4a-task4-run{2,3}-{HEAD-f0315ea,BASE-b39a99a}-legacy-allspots.json` | rounds 2 and 3 of both arms, exactly as `delta_e.py` wrote them |
| `*-b4a-task4-probe-HEAD-f0315ea-e{0.306,0.56}-legacy-allspots.json` | the two counterfactual-exposure probes — see below |

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

Task 3 found something counter-intuitive: **most of kings-court's exposure move
was the mandated all-spot fit-population switch (≈0.032 of exposure), not task
1's render change (≈0.020)**. It established that from luminance slopes.

Rather than propagate that ratio into the ΔE movement, this task measured it.
On the HEAD tree, `renderer.toneMappingExposure` was overridden at runtime to
the exposure each apartment's *poseVerified* fit would have chosen — 0.56 for
kings-court, 0.306 for serenity — and the gate was re-read. That splits the
movement at a real, measured point:

| apartment | BASE → probe (**render**) | probe → shipped (**convention**) | total | convention share |
|---|---:|---:|---:|---:|
| serenity | −0.5273 | −0.0863 | −0.6136 | 14% |
| kings-court | −0.1209 | −0.1822 | −0.3031 | **60%** |

kings-court's 60% reproduces task 3's ≈62% prediction by an independent route.

**No apartment JSON was touched for this** — the override is runtime-only, the
same technique plan 3 task 7 used for its "at BASE's exposure" rows.

**Caveat, stated because it is the load-bearing assumption:** 0.56 and 0.306
are task 3's *estimates* of the counterfactual fit, not values re-fitted here.
The split is exact conditional on those two numbers being the right
counterfactual, and no more precise than they are.

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
