# GTAO — implemented, measured, rejected (phase B plan 3, task 3)

This directory preserves the working code for a change that was **built and
deliberately not shipped**, so that reconsidering it costs a copy rather than a
redo.

- `gtao-implementation.diff` — the 117-line wiring, against BASE `b06730e`:
  two lines in `tour/main.js` (import + `Object.assign(window, …)`), and the
  guarded `GTAOPass` construction plus its rationale comment in `tour/post.js`.
- `vendored-gtao-set/` — the four addon files three.js **0.185.0** needs for
  `GTAOPass` that are not already in `tour/lib/three-0.185.0/`, verbatim.
- `vendor_gtao.py` — the script that fetched them from unpkg at the pinned
  version and closure-checked the import graph.
- `cost.mjs` + `lib.mjs` — the draw-call and frame-time harness, and
  `cost-rerun.jsonl`, its verbatim stdout from the fix-round re-run. The
  measurement it produces is one of the two rejection grounds, so the script
  outlives the workspace along with the numbers. Run it from any directory with
  `playwright` installed, against `python tools/serve.py`, with the wiring
  above temporarily applied. The three
  `../../metrics/*-b3-task3-cost.json` files are built from that stdout.

**Why it was rejected, and where the evidence is.** Two grounds, of unequal
reach: it blackens walls on every device (it is the first thing in this
pipeline to read scene normals, and the walls present their far face — the
deferred winding defect in `bake.js grid()`), and its G-buffer prepass takes
kings-court past the ≤250 mobile draw-call budget at 282. The first is what
closes it today. Full write-up: the `OUTCOME` block under task 3 in
[`../../plans/2026-08-13-phase-b3-light.md`](../../plans/2026-08-13-phase-b3-light.md);
numbers in `../../metrics/*-b3-task3-*.json`.

## Restoring it, if it is ever reconsidered

```bash
# from the repo root
cp docs/superpowers/rejected/2026-08-13-b3-task3-gtao/vendored-gtao-set/GTAOPass.js \
   tour/lib/three-0.185.0/examples/jsm/postprocessing/
cp docs/superpowers/rejected/2026-08-13-b3-task3-gtao/vendored-gtao-set/GTAOShader.js \
   docs/superpowers/rejected/2026-08-13-b3-task3-gtao/vendored-gtao-set/PoissonDenoiseShader.js \
   tour/lib/three-0.185.0/examples/jsm/shaders/
mkdir -p tour/lib/three-0.185.0/examples/jsm/math
cp docs/superpowers/rejected/2026-08-13-b3-task3-gtao/vendored-gtao-set/SimplexNoise.js \
   tour/lib/three-0.185.0/examples/jsm/math/
git apply docs/superpowers/rejected/2026-08-13-b3-task3-gtao/gtao-implementation.diff
# then bump ?v= in tour/index.html — rule 3
```

`GTAOPass.js` imports `../shaders/CopyShader.js` and `./Pass.js`, which are
already vendored; `vendor_gtao.py` verified both byte-identical to what unpkg
serves for 0.185.0, which is also a free check that the vendored tree really is
at the pinned version.

## Notes for whoever reads these files

- **These four files are here, not under `tour/`, on purpose.** `tour/` is the
  Vercel site root (`vercel.json`), so anything placed there ships to
  production. This is dead code being kept for reference; it must not be
  served.
- **`vendor_gtao.py` writes into `tour/lib/three-0.185.0/`.** It is a
  re-vendoring step, not a diagnostic — running it puts the files back into the
  shipping tree. Copying from `vendored-gtao-set/` is the safer route; the
  script is preserved so the copies can be independently re-derived and
  diffed against upstream. It is kept **verbatim as run**, which means its
  `ROOT` is a hardcoded absolute Windows path — edit that line before running
  it anywhere else.
- **`cost.mjs` needs `playwright` resolvable from whatever directory it runs
  in**, and `tools/serve.py` up on port 8742. The GPU flags in `lib.mjs` are
  not optional: without them headless Chromium falls back to SwiftShader,
  `post.js`'s `capable()` rejects it, and the run silently measures a scene
  with no post chain at all.
- **Integrity.** sha256 of the four files as preserved:

  | file | sha256 | bytes |
  |---|---|---:|
  | `GTAOPass.js` | `855fd7953e81c1050a4abea8af4bfeb5ad9b6d879f793a9c650e3768aaec62a3` | 19 890 |
  | `GTAOShader.js` | `cdea7be60452f61105375d2c18e4da2e8ce7b39a89246b1bb8fbf79319d58cfd` | 12 166 |
  | `PoissonDenoiseShader.js` | `61da074a9ad8b2139dd164c96b8b62c299f056ce06c216e1f707c5151d997602` | 7 080 |
  | `SimplexNoise.js` | `4b1455617135e6b477de76244de07547d95570643379b72f4758e50161b06072` | 15 148 |

  The task 3 report's own table lists SimplexNoise.js at 15 146; that column
  is the *character* count `vendor_gtao.py` prints, and the file carries two
  multi-byte characters. Same file — the hash is the thing to compare.

- **Licence.** three.js MIT, already covered by
  `tour/lib/three-0.185.0/LICENSE`, which sits at the root of the tree these
  four files belong to. They are additional files from the same package at the
  same version, not a new dependency.
