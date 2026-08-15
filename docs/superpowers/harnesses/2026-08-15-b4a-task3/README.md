# Phase B plan 4a task 3 — the exposure and bloom re-fit harness

Preserved so every number in
`.superpowers/sdd/2026-08-15-phase-b4a-winding-walls/task-3-report.md` and in
the four committed `*-b4a-task3-*` metrics files can be re-derived rather than
taken on trust.

**What ships from this task:** three `exposure` values
(`serenity 0.329 → 0.295`, `kings-court 0.575 → 0.52`,
`horkyone-10 0.46 → 0.42`), an unchanged bloom pair (`threshold 1.8`,
`strength 0.1`) with its comment block re-written to record the third
re-measurement, and `?v=109 → 110`.

## The fit target, stated before anything was swept

**Minimise `| render mean linear-light relative luminance − photographs' mean
linear-light relative luminance |`, over the all-spot `compare` population,
with bloom disabled.** The photograph side is fixed before the first capture
and never moves. ΔE2000 is recorded on every row and was never optimised
against; where the two disagree, the report takes luminance and says what it
cost.

This matters because the trap has been sprung here once: a prior fit swept
serenity, picked the lowest-ΔE row, and described it as the closest luminance
match while comparing 0.0036 against 0.0048 backwards. Every table in this
task therefore carries a **signed** `diff = render − photographs` beside
`|diff|`. The signed column crosses zero exactly once, the chosen row is the
crossing, and the chosen row also has the smallest `|diff|` printed. Those are
two independent checks; a row picked backwards fails both, visibly, on the
same table.

## Files

| file | what it holds |
|---|---|
| `score.py` | the fit instrument. One pass over one captured set gives mean/p5 linear luminance **and** mean ΔE2000, for **both** populations. Luminance maths is `tools/luminance.py`'s `luminance_stats` verbatim; ΔE is `tools/delta_e.py`'s own `cell_means`/`ciede2000`, imported not re-implemented |
| `session.json` | every browser-probe reading, verbatim: spawn-pooled luminance, both strength sweeps, the render-target-size check, the shipped-tree verification, the gate readings |
| `write_metrics.py` | builds the four committed metrics files. Sweep rows are **re-derived from the frames on disk**, not typed; `--check` rebuilds them in memory and diffs against disk |
| `thresh-*.json` | the raw pre-tonemap-buffer probe dumps: serenity at 0.295, kings-court at 0.52, and serenity again at exposure 1.0 for the independence check |
| `serenity-bathroom-*.webp` | the three frames the strength judgement was made on |

`tools/shots/` is gitignored, so the three strength frames are committed here
as WebP; they were captured as JPEG under `tools/shots/b4a-task3/`.

## Why `score.py` exists rather than `tools/luminance.py`

`luminance.py` applies `delta_e.py`'s `scorable()` filter unconditionally, so
it can only ever report the **poseVerified** population — 2 of serenity's 11
spots, 8 of kings-court's 14. Task 3's binding constraint is that the fit and
the gate both run **all-spot**. `score.py` reports both, from the same bytes,
in one pass, so the population is a column rather than a property of which
tool you happened to run.

This reverses plan 3 task 4, which fitted on poseVerified deliberately (a spot
that fails pose verification photographs one subject and renders another, so
part of its luminance difference is framing error). The reversal is a binding
instruction, and what it costs is quantified in the report: at kings-court the
two populations want **0.52 and about 0.56** respectively.

## Running these

```bash
python tools/serve.py          # from the repo root, UNSANDBOXED
```

Sandboxed, `POST /save/` answers 200 and writes nothing — probe the file on
disk before trusting any capture. (`tools/serve.py:90` also calls
`base64.b64decode` unguarded, so a malformed body kills that handler thread; a
save POST failed outright once mid-batch during this session, which is why the
capture helper retries.)

Then drive `http://localhost:8742/?apt=<id>&measure=1` with any browser
automation and, per page load: `await window.__bakeReady`, assert
`window.__app.post.enabled`, set `renderer.toneMappingExposure`, disable the
bloom pass, and call `window.__measure()` with `window.fetch` patched to mirror
its save POST into `tools/shots/<label>/`. **Render through `measure.js`'s own
`renderAt`, never a re-implementation of it** — that is the whole reason for
the fetch patch.

```bash
python score.py --apt serenity --label t3r1-serenity-fixedfov-bloomOff-e0.295
python tools/delta_e.py --apt serenity --phase b4a-task3-final-legacy-allspots --all-spots
cd docs/superpowers/harnesses/2026-08-15-b4a-task3 && python write_metrics.py --check
```

## Cameras and populations are in the filenames, on purpose

This project's sharpest recorded lesson is an error that entered through a
filename — a file named `legacy` for a capture that was not — which survived
three review rounds because nobody opened the per-spot arrays. So:

* `…-exposure-sweep-fixedfov-allspot.json` — the fit. **Fixed-fov** camera
  (`?measure=1`, no `&fov=legacy`), the one where render and photograph frame
  the same subject, which is the only camera in which comparing their mean
  luminances is like-for-like.
* `…-final-legacy-allspots.json`, `…-BEFORE-e<value>-legacy-allspots.json` —
  the gate. **Legacy 72°** camera, bloom **on**, shipped chain, written by
  `tools/delta_e.py --all-spots` so `population`, `scored`, `compareTotal` and
  `skippedPoseVerification` are the tool's own fields, not prose.

The sweep filenames deviate from the brief's literal
`…-b4a-task3-exposure-sweep.json` / `…-final.json` for exactly this reason;
the deviation is recorded in the report.

## The noise floor, and why it is not zero

`materials.js` randomises its procedural canvas textures on every page load and
`bake.js`'s cosine sampling uses `Math.random()`, so two loads of identical code
are not bit-identical. Measured across independent loads this session:

| statistic | spread |
|---|---|
| all-spot mean linear luminance, at the chosen exposure | ±0.0003 (both apartments) |
| all-spot ΔE2000, legacy camera | ±0.02 |
| spawn-pooled sRGB mean luminance | ±0.32 |

Both apartments' chosen exposures sit at `|diff| ≤ 0.0003`, i.e. **at** the
noise floor rather than above it — which is the correct place for a crossing
to land and is why neither value is quoted to more precision than three
decimals.

## One earlier premise that no longer holds

Plan 2 task 7 and plan 3 task 4 both justified measuring horkyone-10 through
the full post chain with "every horkyone-10 spawn measures 0.00% over
threshold". That is no longer true: its Living room and Terrace spawns now
cross threshold 1.8 at **0.0015%** and **0.0048%** of frame area. The
conclusion survives, but it was re-established by measurement rather than
inherited: bloom on vs off leaves horkyone-10's spawn-pooled mean sRGB
luminance identical to 0.01 at every exposure tested, against a ±10 criterion
and a ±0.32 repeat spread.
