# Phase B plan 4a task 2 — the measurement harness for a No-Go

Preserved so every number in
`.superpowers/sdd/2026-08-15-phase-b4a-winding-walls/task-2-report.md` and in
the three committed `*-b4a-task2-luminance.json` metrics files can be
re-derived rather than taken on trust.

**Nothing here ships. `tour/` was reverted in full — `git diff` against task
1's tip is empty for `tour/` and the cache version stays at `?v=109`.**

## What the task asked and what happened

Walls were switched to the visibility-scaled ambient (`lightAt`'s sixth
positional argument, `sampled`, `false` → `true` inside `grid()`), and `SEG`
was swept over 0.45 / 0.30 / 0.22 / 0.15. The exit criterion was **serenity's
linear-domain contrast ≥ 4.32**. The best of eight readings was **3.9347**.
No-Go, and the change was reverted.

## Files

| file | what it holds |
|---|---|
| `sweep.json` | every raw reading, verbatim: the two before runs per apartment, all four SEG rows on all three apartments, the same-state repeats, the sampler-liveness proof, and the post-revert verification |
| `write_metrics.py` | builds the three committed metrics files FROM `sweep.json`. `python write_metrics.py --check` rebuilds them in memory and diffs against disk — that is how "derived, not typed" is verified rather than asserted |
| `contrast.py` | the criterion's own instrument: linear-domain mean, p5 and contrast on serenity's poseVerified `compare` spots, at full precision. Phase B3 task 6's `linear.py`, unchanged in method |
| `contrast.json` | its output for all six captured sets plus the photographs |
| `meas.js` | the three browser-side functions every reading came from, with the reasons the awkward parts are the way they are |

## Running these

```bash
python tools/serve.py          # from the repo root, UNSANDBOXED — see meas.js
```

Then drive `http://localhost:8742/?apt=<id>` with any browser automation you
have and paste one function from `meas.js` per page load. This repo has no
`npm install`, so task 5's `node`+`playwright` launchers cannot run here;
these readings were taken through the Playwright MCP server instead, on a
real GPU (ANGLE / Intel UHD 630 / D3D11). **Confirm `a.post.enabled` before
believing any number** — every function in `meas.js` throws if the post chain
is absent, because a measurement without it is void.

Capture sets, then score:

```bash
python tools/delta_e.py --apt serenity --phase b4a-task2-<label>-legacy-allspots --all-spots
cd docs/superpowers/harnesses/2026-08-15-b4a-task2
python contrast.py b4a-task2-<label>-serenity-legacy
python write_metrics.py --check
```

`tools/delta_e.py` reads `tools/shots/render_<apt>_<file>.jpg` at the shots
root; `contrast.py` (via `tools/luminance.py`) reads
`tools/shots/<label>/render_…`. Copy the root frames into a label folder
after each capture — that is why both a root set and a label set exist.

## Two readings, two populations — do not merge them

The metrics filenames were fixed by the brief and name neither camera nor
population, so both are carried as fields on every block instead:

* **`spawnPooled`** — all `spawns[]` entries, in-page camera, 480×300,
  full post chain. Includes serenity's **Entrance**, the darkest spawn.
* **`linearContrast`** — the criterion. **poseVerified `compare` spots
  only: 2 of serenity's 11**, both bright rooms, captured under
  `?measure=1&fov=legacy`. `contrast.py` prints that population before it
  prints a number, on purpose.

The ΔE files do name both in the filename: `…-legacy-allspots.json`.

## The noise floor, and why it is not zero

The bake's sampled ambient draws cosine-weighted directions with
`Math.random()`, so two loads of identical code are not bit-identical.
Measured same-state spread: spawn-pooled p5 within about ±0.9, the contrast
statistic within about ±0.07. The criterion's shortfall (0.3853) is roughly
five times the latter, so the verdict does not rest on the noise.

## The artefact screenshots

`tools/shots/` is gitignored (build output), so the seven frames the report
argues from are committed here as WebP instead:

| file | shows |
|---|---|
| `serenity-entrance-before.webp` | the shipped build: reveals read as light wall |
| `serenity-entrance-seg045.webp` | sampled, SEG 0.45 — the door reveal and the pillar face beyond it go flat dark grey |
| `serenity-entrance-seg015.webp` | sampled, SEG 0.15 — **the same bands, essentially unchanged**; reveals are 1×1 quads, so `SEG` cannot refine them |
| `serenity-lookup-before.webp` | pitched up at the Entrance, shipped build: no black faces |
| `serenity-lookup-seg015.webp` | the same view at the finest `SEG` in the sweep: a hard **black** wall face at a junction, top right |
| `kings-court-bedroom1-before.webp` / `…-seg045.webp` | the same dark-reveal signature on the corridor doorway — not a serenity peculiarity |

The full sets are, on disk during the session,
`tools/shots/b4a-task2/` — `before`, `seg045`, `seg015` for serenity
(every spawn plus a pitched look-up and look-down at the Entrance), and
`before-*` / `seg045-*` for kings-court and horkyone-10. `seg015` matters:
**refining `SEG` does not touch the dark reveals**, because each end reveal,
top and bottom is emitted as a single 1×1 quad whatever `SEG` says
(`bake.js`, the six `grid(…, 1, 1, occ, …)` calls per wall piece). The
darkened door reveals are still there at 0.15, and `entrance-lookup.jpg`
still carries a hard black wall face at a junction.
