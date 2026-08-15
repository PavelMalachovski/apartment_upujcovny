# Phase B3 plan 3 task 6 — the exit criterion, and the blind A/B

Task 6 judges whether task 5's offline lightmap pack earned its cost. The
criterion, agreed before the work and held literally by the human partner:

> **Go if the linear-domain contrast reaches ≥ 4.9 AND the blind A/B is
> visible.**

The comparison actually run is **the offline lightmap pack against the
runtime bake** — pack on against pack off. The brief says "against
GTAO-only"; there is no GTAO. Task 3 vendored `GTAOPass`, measured it and
rejected it, no `tour/` file adopted it, and its artifacts are at
`docs/superpowers/rejected/2026-08-13-b3-task3-gtao/`.

Preserved so the verdict can be re-derived rather than taken on trust.
Nothing here ships; nothing in `tour/` imports it.

## Running these

Three things are needed, and the third catches people out:

1. `python tools/serve.py` from the repo root, **with the sandbox
   disabled** — sandboxed, its `POST /save/` returns 200 while writing
   nothing.
2. `playwright` resolvable from Node. This repo has no `package.json`, so
   either `npm i playwright` here or point a `node_modules`
   symlink/junction at an install that has it. Remove it afterwards.
3. The task 5 harness next door at `../2026-08-13-b3-task5/` —
   `capture.mjs` imports its `lib5.mjs` for the GPU flags, and `linear.py`
   scores sets that `shots.mjs` captures.

Every script resolves the repo root from its own location; run them from
this directory.

## The two measurements

| file | what it answers |
|---|---|
| `linear.py` | the gated quantity: linear-domain mean, p5 and contrast over serenity's poseVerified `compare` spots, at full precision. `tools/luminance.py` prints four decimals, and contrast has to be the ratio of the **unrounded** aggregates — the derivation `../2026-08-13-b3-task5/README.md` names. Writes `linear.json` |
| `capture.mjs` | six fixed poses through the full post chain, one PNG each, asserting the post chain is live and the pack is in the expected state. Run twice: `packon` and `packoff` |
| `pair.py` | composites each pose into one side-by-side image with an **unseeded** `SystemRandom` coin deciding which half is which, and seals the answer in `reveal/mapping.json`. Prints nothing about the assignment |
| `patches.py` | the supplementary blind aid: magnified flat-surface patches butted A against B, on floors and ceilings only — walls carry no lightmap and their pixels cannot move |
| `score.py` | **post-reveal only.** Per-pose mean/p5/ratio/tail of the pack-on minus pack-off difference, plus the two false-colour difference maps in `diff/` |

## Toggling the pack

Both sides are the same build at `?v=104`; the only difference is whether
`tour/lightmaps/serenity/` is on disk. Move it aside, capture, move it
back:

```powershell
Move-Item tour\lightmaps\serenity <somewhere outside the repo>
# ... capture the packoff side; window.__lightmaps.status is "missing" ...
Move-Item <somewhere outside the repo> tour\lightmaps\serenity
```

The shipped pack is 11 files / 13,626 bytes, manifest hash
`53377a08…`. In the moved-aside state the page logs one console error and
one `window.__issues` entry, both the deliberate 404 for the absent
manifest — expected in that state and in no other. Do **not** use
`../2026-08-13-b3-task5/make_fixture.py` for this: it overwrites the
shipped pack with flat grey fixtures.

## What is committed here, and what is not

Committed: the five scripts, `linear.json`, `calls.json`,
`reveal/mapping.json`, `abdelta.json`, and two difference maps.

Not committed: `frames/`, `pairs/`, `patch/`. Twelve 900×560 PNGs and six
composites are ~10 MB and every one of them is regenerable from the two
scripts above. `reveal/mapping.json` records the exact randomisation that
was used, so re-running `capture.mjs` twice and re-pasting the halves in
that order reconstructs the composites that were actually judged.

## The blind protocol, and why it is written down

`calls.json` holds the six calls, each with its confidence and what it was
based on, **written before `reveal/mapping.json` was opened**, together
with the decision rule fixed before any pair was viewed: visible only at
6/6, because P(6/6) under guessing is 1/64 = 0.016 while P(≥5/6) is
7/64 = 0.109 and does not clear it at n = 6.

The result was **5 of 6** — better than chance-looking, short of the
pre-registered bar, and not distinguishable from chance at this n. The
part that matters more than the hit rate is recorded in `calls.json`
itself: at full viewing size none of the six pairs could be separated, and
every call leans on a 3–4× magnified patch of a flat floor or ceiling.

One call is worth reading before trusting anyone's eye here, this one
included: on pair 3 the full-frame impression was **the opposite** of the
patch reading, and the patch was right. `calls.json` records the reversal
rather than quietly keeping the correct half.

## What `score.py` and `diff/` add

The pack is not a no-op and the difference is not a flat offset. Per pose
the mean rises 0.8–1.7%, 24–58% of pixels move, and 3–8% move by ≥10 of
255. `diff1.png` and `diff6.png` show where: a bright band along the
ceiling/wall perimeter and the floor next to obstructions — the near-field
crevice fill the integrator was built to produce, landing exactly where a
0.65 m gather on lightmapped surfaces predicts.

That is worth holding next to the verdict rather than against it. The
effect is real and structured; the **gated statistic cannot see it**,
because a mean/p5 ratio over two poseVerified spots is blind to it, and
the criterion is applied to that statistic.
