# Harness — serenity photorealism pass, 2026-08-26

Everything here reproduces the measurements in
`docs/superpowers/plans/2026-08-26-serenity-photorealism.md`.

## Running it

`python tools/serve.py` first (port 8742). For the BASE side, unpack the
pre-branch tree and serve it beside the working one:

```bash
mkdir -p /tmp/base && git archive <base-sha> | tar -x -C /tmp/base
sed -i s/8742/8743/g /tmp/base/tools/serve.py
(cd /tmp/base && python3 tools/serve.py &)
```

Playwright needs `executablePath` pointing at whatever Chromium is installed;
`lib.mjs` carries the one this session used. **`capture.mjs` and the
render-comparing scripts spoof `UNMASKED_RENDERER_WEBGL`** — headless
Chromium reports SwiftShader, `post.js`'s `capable()` correctly rejects it,
and without the spoof every capture silently measures with no post chain and
is not comparable to anything in `metrics/`. With the spoof this machine
reads serenity's documented 78–80 draw calls on the unmodified tree, which is
how the spoof was checked rather than assumed.

| script | what it does |
|---|---|
| `capture.mjs <apt> [extra-query]` | loads `?measure=1`, runs `window.__measure()`, POSTs every `compare` spot to `tools/shots/`. Pass `'&fov=legacy'` for the scoring camera |
| `checks.mjs` | `__issues`, draw calls at `APT.start` through the post chain, PointLight count, seven walk simulations, top-down cutaway |
| `perspot.py <dir>...` | per-spot ΔE2000 of one or more render directories against the photographs, side by side |
| `mirrortest.py <dir>` | scores each render against its photograph **and** against the horizontally flipped photograph. This is what established that the living room was mirrored, before anything was moved |
| `geomcmp.mjs <apt>` | BASE-vs-HEAD scene topology: the multiset of per-mesh (type, material type, vertex count, index count). **This is the invariance test that matters** — see below |
| `geomdump.mjs <apt> <port>` | full geometry fingerprint including world matrices; exact for horkyone-10, not for kings-court (see below) |
| `pixnoise.mjs <apt> <n>` | n BASE and n HEAD renders from one camera, for the within-tree vs cross-tree noise comparison |
| `sbs.py`, `ruler.py` | photo-vs-render sheets, and a normalised 0–1 grid overlay for reading positions off a frame |

## Why topology and not pixels

Every procedural texture in this project draws with `Math.random()`, so two
loads of the **same** tree never produce the same image: kings-court's
within-tree mean absolute pixel difference is 1.26–1.68 out of 255. A
BASE-vs-HEAD pixel diff therefore cannot prove anything on its own, and a
naive threshold flags noise as a regression — it did, twice, during this pass.

Scene *topology* is deterministic (the randomness in this project varies
positions and sizes, never triangle counts), so `geomcmp.mjs` is an equality
test. It is also strictly more sensitive than a pixel diff: it caught
`F.shower` gaining 24 vertices per shower — five showers in kings-court —
which no visual comparison would ever have shown.

`geomdump.mjs`'s whole-scene hash **is** stable for horkyone-10 and serenity
but **not** for kings-court, which builds objects whose sizes are randomised
(`F.books` spine heights among them). Two BASE loads of kings-court hash
differently. Use it for equality only where it is stable; use `geomcmp.mjs`
everywhere.

## Directories

- `renders-BASE/` — the pre-branch `serenity.json` on this branch's engine,
  captured under `?fov=legacy`. ΔE 14.34.
- `renders-HEAD/` — the shipped config, same camera. ΔE 13.14.
- `sbs/` — photograph | before | after, per room.
