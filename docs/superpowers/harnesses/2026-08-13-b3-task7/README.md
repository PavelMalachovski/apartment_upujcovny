# Phase B3 plan 3 task 7 — the gate

Task 7 measures what plan 3 did. Preserved so every number in
`docs/superpowers/metrics/README.md`'s task 7 section can be re-derived
rather than taken on trust. Nothing here ships; nothing in `tour/` imports
it.

## The thing that makes this task different: two trees at once

"Before plan 3" is commit **`c2bb0bd`** (the PR #27 merge). Every
before/after number here was taken with **both trees served simultaneously**
and **the same script pointed at each**, so the two sides cannot differ by
method:

```bash
# HEAD (736a867), from the repo root, sandbox disabled
python tools/serve.py                              # :8742

# BASE (c2bb0bd), a DETACHED worktree so the branch is never disturbed
git worktree add <scratch>/t7base c2bb0bd --detach
python serve_base.py <scratch>/t7base 8743         # :8743, sandbox disabled
```

`serve_base.py` execs `tools/serve.py`'s own source with the last three
server-start lines dropped and only `directory=` redirected at the worktree,
so `do_POST` — and therefore the save target, the **main** repo's
`tools/shots/` — is inherited rather than reimplemented. That matters:
`?measure=1&fov=legacy` POSTs every frame back to the origin it was loaded
from, and a plain `http.server` 404s them silently.

Both servers need the sandbox disabled. Sandboxed, `POST /save/` returns 200
while writing nothing and captures vanish without a trace. Probe it before
trusting a run:

```bash
curl -X POST --data "data:image/jpeg;base64,<...>" http://localhost:8742/save/probe.jpg
ls tools/shots/probe.jpg && rm tools/shots/probe.jpg
```

Node needs `playwright` resolvable; this repo has no `package.json`, so
either `npm i playwright` here or point a `node_modules` junction at an
install that has one. **Remove it afterwards.**

## The two traps this branch has already fallen into

- **`window.APT.spawns[].yaw` is already radians.** `main.js` converts the
  JSON degrees on load. A prior session converted them a second time and
  pointed every camera at 1/57th of the intended angle. `spawnlum.mjs`
  asserts single conversion against the raw JSON on every run (`yawOk`);
  `structural.mjs`'s walk routes are the only degrees in this directory and
  are converted exactly once, at the point of use.
- **`tools/luminance.py` hard-codes the `poseVerified` filter.** It scores
  **2 of 11** on serenity, **8 of 14** on kings-court, and refuses
  horkyone-10 outright — that apartment has **no** `compare`-flagged spots,
  so the linear domain does not exist for it. Never quote a linear number
  without its population.

And one that is not a trap so much as a standing rule: the **spawn-pooled
sRGB 0–255** numbers and the **linear-light** numbers are different domains
over different populations. They never go in the same table.

## The scripts

| file | what it answers |
|---|---|
| `serve_base.py` | serves the BASE worktree on :8743 with `tools/serve.py`'s own save endpoint |
| `structural.mjs` | step 1: `__issues`, `__ambSampled`, `Sampler.selfTest()`, console errors, draw calls naive **and** through the post chain at **both** `APT.start` and `spawns[0]`, on **both** the desktop (≤400) and mobile (≤250) profile, plus sky-leak raycasts from every spawn with photo-spot markers hidden, plus the standing walk routes. Writes `structural.json` |
| `spawnlum_exp.mjs` | the exposure isolation: task 5's `spawnlum.mjs` with `renderer.toneMappingExposure` overridden at runtime, so task 2's geometric effect can be read at constant exposure. **No apartment's `exposure` key is touched** |
| `check_run_identical.py` | asserts `spawnlum_exp.mjs`'s `RUN()` body is byte-identical to `../2026-08-13-b3-task5/spawnlum.mjs`'s apart from the three marked lines. The isolation number is only worth anything if the pixels were gathered the same way |
| `linear7.py` | task 6's `linear.py` generalised to `--apt`: linear-light mean, p5 and contrast at full precision, contrast being the ratio of the **unrounded** aggregates. Cross-checks to 4 dp against `tools/luminance.py` |
| `fullprec.py` | all-spot mean CIEDE2000 without `delta_e.py`'s per-spot 2-dp rounding — the noise floor is quoted at full precision (±0.039), so the margin has to be readable there too. Reads `tools/shots/<label>/`, so it survives the root captures being overwritten |
| `look.mjs` | step 4: one frame per spawn through the post chain, the top-down cutaway rendered **raw**, and the `?compare=1` render-vs-photograph divider on every compare spot, asserting the pane actually laid out. `FRAMES_ONLY=1` stops before the divider (used for the BASE side) |
| `framediff.py` | BASE-vs-HEAD per-frame difference **against a HEAD-vs-HEAD control**. `materials.js` randomises procedural textures per load, so the control is what separates plan 3's effect from that randomisation. Writes `framediff-t7.json` |
| `baketime7.mjs` | `window.__bakeMs`, both sides, all three apartments, appended as a new batch each run. **Both committed batches are idle-machine batches**, taken about five minutes apart; the loaded-machine runs were ad-hoc invocations of task 5's `baketime.mjs`, are not committed and are cited as evidence nowhere. Task 7 takes **one** claim from this file (kings-court ~3×, raw loads disjoint between the sides in both batches) and **refuses two** (serenity and horkyone-10 — overlapping ranges, and the two batches disagree by up to 3× on the same figure). The JSON's own `reading` field says the same thing; keep the two in step if you re-run |
| `write_metrics7.py` | assembles the three `<apt>-b3-task7-luminance.json` files from the raw outputs beside it. `--check` rebuilds them in memory and compares against the committed files, so "derived, not transcribed" is verified rather than asserted |

## Reproducing the whole task

```bash
# step 1
node structural.mjs

# step 3, spawn-pooled, both sides, same script
cd ../2026-08-13-b3-task5
for a in serenity kings-court horkyone-10; do
  TOUR_BASE=http://localhost:8743/ node spawnlum.mjs t7-before-$a $a
  TOUR_BASE=http://localhost:8742/ node spawnlum.mjs t7-after-$a  $a
done          # outputs land here; they were moved into task 7's directory

# step 3, the exposure isolation (HEAD tree at the BASE tree's exposure)
cd ../2026-08-13-b3-task7
TOUR_BASE=http://localhost:8742/ node spawnlum_exp.mjs t7-after-iso-serenity serenity 0.326

# step 2 + step 3's linear domain: capture, then score
rm -f ../../../../tools/shots/render_serenity_*
TOUR_BASE=http://localhost:8742/ node ../2026-08-13-b3-task5/shots.mjs t7-gate-serenity any serenity
python ../../../../tools/delta_e.py --apt serenity --phase b3-task7-gate-legacy-allspots --all-spots
python linear7.py --apt serenity --sets t7-base-serenity t7-gate-serenity

# step 4
node look.mjs serenity <scratch>/head-serenity
python framediff.py serenity <scratch>/base-serenity <scratch>/head-serenity <scratch>/head2-serenity
```

`shots.mjs` clears stale `render_<apt>_*` itself and throws if the number of
frames on disk does not match the number the page reported capturing — that
assertion is the only reason a silently-empty capture cannot reach the
scorer.

## What is committed here, and what is not

Committed: the nine scripts, `structural.json`, the fifteen `spawnlum-t7-*`
outputs, `linear-serenity.json`, `linear-kings-court.json`,
`framediff-t7.json` and `baketime-t7.json`.

Not committed: the frame sets (four per apartment — BASE, HEAD, a second
HEAD for the control, and the compare panes), the contact sheets and the
difference maps. That is ~50 MB of PNG and every one of them regenerates
from `look.mjs` and `framediff.py`. The **numbers** taken off them are in
`framediff-t7.json`.

Also not committed: the BASE worktree, and the `node_modules` junction.
