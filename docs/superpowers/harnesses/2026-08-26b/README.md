# Harness — engine defects and camera poses, 2026-08-26 (second pass)

Companion to `docs/superpowers/plans/2026-08-26b-engine-defects-and-poses.md`.
The general-purpose scripts live in `../2026-08-26-serenity/`; only what this
pass added is here.

| script | what it does |
|---|---|
| `posesweep.mjs <file.webp> <json>` | renders one photo spot from a list of candidate `[x, z, yawDeg, pitchDeg, tag]` poses, at that photograph's own aspect and `__spotFov`, straight to disk. **No scoring** — the poses are judged beside the photograph, which is the only method this repository accepts for camera work |
| `posesweep-legacy.mjs` | the same, forced to the scoring gate's fixed 72° vertical. Exists because the gate and the divider look through different lenses, so a pose can be right for one and wrong for the other |
| `capture2.mjs <apt> <port> [extra]` | `capture.mjs` with a port argument, for BASE-vs-HEAD runs against two servers |
| `diag.mjs` | prints `window.__issues` for all three apartments — the check the new builder diagnostics feed |
| `geomcmp.mjs <apt>` | BASE-vs-HEAD scene topology (copy of the previous pass's, kept here so this directory runs on its own) |
| `shot.mjs <apt> <port> <x> <z> <yaw> <out> [w h]` | one free-camera frame, for looking at a specific defect |

## Evidence

- `hk-curtain.jpg` — horkyone-10's second living-room window, before and
  after. Before, 0.445 m of a 1.02 m opening sat behind a drape the clamp had
  slid across the glass.
- `kc-occh.jpg` — kings-court 12.webp and 11.webp, before and after giving
  `shelfTower` and `tvWallUnit` their real occlusion heights. The dark smear
  across 12.webp's ceiling is light leaking over the old 0.8 m occluder.
- `legacy-pose-check.jpg` — **the important one.** 6.webp and 2.webp rendered
  through the *scoring gate's own* camera, old pose against new. The old
  6.webp frame is a window and a blank wall and scores 9.23; the new one holds
  the seat, the cushions, the lamp and the bed and scores 12.32. The metric
  prefers the empty frame.
- `pose-final.jpg` — the candidate sweeps the shipped poses were chosen from,
  including the two 1.webp candidates that were built and rejected.

## Reproducing the two lens columns

```bash
python tools/serve.py                                   # HEAD on 8742
mkdir -p /tmp/base && git archive <base-sha> | tar -x -C /tmp/base
sed -i s/8742/8743/g /tmp/base/tools/serve.py && (cd /tmp/base && python3 tools/serve.py &)

node capture2.mjs serenity 8742 '&fov=legacy'   # scoring gate, fixed 72 vertical
node capture2.mjs serenity 8742 ''              # true lens, meta.photoFovLong
python tools/delta_e.py --apt serenity --phase <label> --all-spots
```

The two runs answer different questions and this pass is the first place they
disagree by more than noise. Report both.
