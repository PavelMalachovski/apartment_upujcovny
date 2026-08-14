# Phase B3 plan 3 task 5 — the measurement and guard harnesses

Preserved so every number and every quoted string in
`.superpowers/sdd/2026-08-13-phase-b3-light/task-5-report.md` can be
re-derived rather than taken on trust. Nothing here ships; nothing in
`tour/` imports it.

Run from a directory whose `node_modules` has `playwright`, with
`python tools/serve.py` up. `lib5.mjs` reads `TOUR_BASE` from the
environment (default `http://localhost:8742/`), which is how the BASE
worktree was served on port 8743 for the refactor-neutrality check.

| file | what it answers |
|---|---|
| `lib5.mjs` | the launcher: `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist`, then wait for `__bakeReady`. Without those flags headless Chromium runs SwiftShader, which `post.js`'s `capable()` rejects, and every measurement silently has no post chain |
| `make_fixture.py` | builds the **hand-made** lightmap pack for the guard proof: solid mid-grey WebP at the right pixel sizes plus a manifest whose hash is `wrong` (64 zeros) or `correct`. It reads `dump.json` and knows nothing about the baker — which is what let the guard be proved before the baker existed |
| `dump.mjs` | one page load → the config hash, the surface list, `window.__lightmaps`, `window.__issues`, and each surface's `lightMap` constructor name. `CanvasTexture` = baked at runtime, `Texture` = loaded from the pack. This is the whole guard proof's instrument |
| `hashprobe.mjs` | 21 probes: mutate one config field on a deep copy, re-hash, assert the hash held or moved as specified |
| `spawnlum.mjs` | spawn-pooled sRGB luminance, 480×300, full post chain, interpolated p5 — task 2's and task 3's measure, unchanged so the numbers stay comparable |
| `shots.mjs` | `?measure=1&fov=legacy` capture into `tools/shots/<label>/`, asserting the post chain is live and the pack is in the expected state before it captures |
| `verify.mjs` | the commit checklist: `Sampler.selfTest()`, `__issues`, `__ambSampled`, draw calls on both profiles, console errors, and that every `/lightmaps/` request carries the page's `?v=` |
| `runlen.mjs` | the spoiled-run length on every edge scan of every lightmapped surface, at 1× and 3× density. This is the measurement that reverted the dilation generalisation |
| `cost.mjs` | inside one page load: the texel loop a pack skips vs. the wall time of its eleven HTTP requests |
| `packcost.mjs` | per-request Resource Timing for `/lightmaps/` |
| `baketime.mjs` | `window.__bakeMs` over N fresh loads |
| `frames.mjs` | one frame per spawn plus the raw top-down cutaway — hard rule 1 |
| `blurcheck.mjs` | whether `bakeSurface`'s "light blur" does anything (it does not: 0 of 16384 bytes) |
| `write_metrics.py` | assembles `docs/superpowers/metrics/serenity-b3-task5-luminance.json` from the harness outputs, so no number in it is hand-copied |

## The four captured guard states

`dump.json`, `recap_wrong.json`, `recap_ok.json`, `recap_sig.json` are
`dump.mjs`'s raw output for the four states the report quotes: no manifest,
a manifest with a deliberately wrong hash, the same manifest with the hash
corrected, and a manifest whose surface-3 world position has been nudged
5 cm. Read the strings out of the JSON rather than off a console — a
Windows console mangles the em dash and ellipsis the loader's messages
contain.

**These four are a re-capture, taken at commit `800b8a3`, not the original
run.** The originals were taken before `tools/bake_lightmaps.mjs` existed
and were not preserved; that ordering rests on the report's account of it.
What is reproducible from here is the guard's behaviour, which is the part
that matters for trusting the pack.
