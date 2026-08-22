# Phase B plan 4e — the camera pitch sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Derive the real downward camera tilt of every `compare`-flagged photo spot in serenity and kings-court, ship the values a named landmark and a human reviewer both support, and re-open the `poseVerified` stamps that were awarded under a harness that could not tilt.

**Architecture:** An offline numpy tool **proposes** a tilt per spot by correlating the two frames' row profiles of horizontal-edge energy, with the lens pinned at the gate camera's 72°. A human then **names a horizontal landmark** visible in both frames, measures its row in each, and sweeps the tilt until they agree — plan 4c task 1b's method, generalised from its water band. The proposal narrows the sweep; it never decides. Every value is confirmed by re-capture and looked at in the divider before it reaches a config file.

**Tech Stack:** Python 3.11.9, numpy 1.26.4, Pillow 11.3.0, pytest 8.3.3. **No scipy — it is not installed.** Vanilla ES modules in the browser, no bundler. `tools/serve.py` for capture.

## Read this before task 1

**The obvious method was tried and rejected by measurement**, in a pre-flight run
before this plan was finalised and before it spent a single browser capture.
Working: `docs/superpowers/metrics/b4e-preflight-method-rejection.json`. It ran
against the frames plan 4c task 5's closing gate left in `tools/shots/`, where
serenity's `2.webp` had been captured at pitch 40 and `10.webp` at 22 — the only
ground truth in this repository.

- **Fitting tilt and lens together is degenerate.** The fitted field of view ran
  to the search grid's floor on **4 of 24** spots and scattered between 28° and
  108° on the rest, with no clustering.
- **Fitting tilt alone is well posed and can be exactly right.** `10.webp`
  returns **21.50°** against a known 22.0°.
- **The confidence score does not predict correctness.** That correct answer
  carries the **lowest** sharpness of all 24 spots, 0.003, against a spread
  reaching 0.568. Meanwhile kings-court `11.webp` proposes 27.5° of downward
  tilt in a bedroom photograph, at four times that confidence. **Nothing in this
  plan may branch on that score.**
- **`2.webp` misses (21.25 against 40) and is expected to.** It is
  `poseVerified: false` on a furniture-placement reason routed to plan 5, so
  render and photograph do not show the same subject there. That is not evidence
  against the observable — it is evidence the tool cannot tell a wrong scene
  from a wrong tilt.

**So the tool proposes and a landmark decides.** Any step whose only input is the
tool's output is a step that has forgotten this section.

## Global Constraints

- **This is a data plan. Do not edit `tour/measure.js`, `tour/compare.js`, `tour/main.js`, `tour/builder.js`, `tour/bake.js`, `tour/app.js`, or any apartment's geometry, furniture, palette or `exposure`.** The `pitch` instrument shipped in plan 4c task 1b and is correct. If you find yourself editing a renderer file, you have left this plan's scope — stop and say so.
- **ΔE chooses nothing.** Record it at every step; never select a tilt because it improved. Same rule as `exposure`, same rule task 1b followed.
- **Start `python tools/serve.py` with the sandbox disabled.** Its `POST /save/` returns HTTP 200 and writes nothing when sandboxed. **Probe the disk AND check the file is non-empty** — `serve.py:90` truncates the file open before decoding the body, so a bad capture leaves a zero-byte file that a presence check passes.
- **Capture under `?measure=1&fov=legacy`.** Every proposal, landmark measurement and gate reading in this plan uses the fixed 72° camera.
- **Check the loaded `?v=` rather than assuming it.** `tools/serve.py` sends no cache headers, so a stale `index.html` pins every classic script to the old version. Run `[...document.querySelectorAll('script')].map(s => s.src.split('?').pop())` and reload with a document cache-buster (`&cb=1`) if the numbers are old.
- **`?v=` bumps only when a file under `tour/` changes, and only after the last such edit.** `docs/`, `tools/` and `CLAUDE.md` never bump.
- `window.__issues` must be empty on serenity, kings-court and horkyone-10 before any commit that touches `tour/`.
- **Commit your own files explicitly. Never `git add -A`.**
- Branch is `phaseB-plan4e-pitch-sweep`, off `main` at `705ac42`.
- **Every number that lands in a document comes from a command run in that task**, not from this plan, not from an older document, not from memory.

## File structure

| File | Responsibility |
|---|---|
| `tools/pitch_fit.py` | The instrument. Proposes a tilt (`fit`) and lists candidate landmark rows in a column (`probe`). Task 1 |
| `tools/tests/test_pitch_fit.py` | Synthetic tests of the projection algebra — **not** validation on photographs. Task 1 |
| `docs/superpowers/harnesses/2026-08-22-b4e/` | Captured frames, one directory per capture run |
| `docs/superpowers/metrics/*-b4e-*.json` | Proposals, landmark measurements, the noise band, gate baselines |
| `tour/apartments/serenity.json` | `pitch` and `poseVerified` on its 11 compare spots. Task 3 |
| `tour/apartments/kings-court.json` | `pitch` and `poseVerified` on its 13 compare spots. Task 4 |
| `tour/index.html:254` | `?v=` 136 → 137, once, after the last JSON edit. Task 4 |
| `CLAUDE.md`, `docs/PHASE-B-RESUME.md`, `docs/superpowers/metrics/README.md` | The record. Task 5 |

## The model, once, so no task re-derives it

A pinhole camera with vertical field of view `f` and downward tilt `θ` maps a
world ray lying `α` below the horizontal to the normalised frame row

```
v = 0.5 + 0.5 * tan(α - θ) / tan(f / 2)          # v = 0 top, v = 1 bottom
```

`f` is **72.0°** everywhere in this plan, because every capture runs under
`?fov=legacy`. **The lens is pinned, not fitted** — and the consequence is stated
rather than hidden: every tilt this plan ships is conditional on that 72°,
`meta.photoFovLong` (120 in both configs, measured ~57–58° in kings-court) has
never been audited, and **the tilts cannot be converted to another lens by a
single coefficient** — the measured sensitivity runs from −0.62 to +1.22 degrees
of tilt per degree of assumed lens, median 0.15.

**Do not linearise the model.** A shift-and-stretch on `v` is only the
small-angle approximation, and serenity's `2.webp` already sits at 40°.

**Overlap shrinks with tilt, by geometry.** The fraction of a tilted
photograph's rows that fall inside a *level* render, at 72°: 1.000 at 0°, 0.836
at 10°, 0.697 at 20°, 0.572 at 30°, 0.452 at 40°, 0.303 at 52°. Proposals
therefore degrade exactly where the tilt is largest, and `MIN_OVERLAP` is 0.25
for that reason — at 0.55 the tool could not have proposed serenity's shipped
40° at all.

---

### Task 1: Build the instrument, and be clear about what its tests prove

**Files:**
- Create: `tools/pitch_fit.py`
- Create: `tools/tests/test_pitch_fit.py`

**Interfaces:**
- Produces, and every later task consumes:
  - `row_profile(path_or_array, rows=512, cols=256) -> np.ndarray`, length 511, z-scored.
  - `remap_rows(render_profile, theta_p_deg, fov_deg, theta_r_deg=0.0) -> (values, valid_mask)`.
  - `fit(photo_profile, render_profile, theta_r_deg=0.0, fov_deg=72.0) -> dict` with `pitch`, `score`, `overlap`, `sharpness`. **A proposal.**
  - `probe(path_or_array, col=0.5, top=8, band=0.06) -> (height, [(row, strength), ...])`.
  - CLI: `--probe <image> --col <f>` for landmarks; `--apt/--renders/--out` for proposals.

- [ ] **Step 1: Write the failing tests**

Create `tools/tests/test_pitch_fit.py`:

```python
"""Tests for tools/pitch_fit.py.

READ THIS BEFORE TRUSTING A GREEN RUN. These tests check the ALGEBRA of the
projection the tool inverts, using synthetic profiles generated by that same
projection. They say nothing about whether the tool gets a photograph right --
the pre-flight measured that it does not, reliably, which is why the tool only
proposes. See docs/superpowers/metrics/b4e-preflight-method-rejection.json.

A green run here means the code does what it claims. It does NOT mean a
proposal may be shipped without a named landmark behind it.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

import pitch_fit


def synth_profile(theta_deg, fov_deg, angles_deg, rows=512):
    """A frame whose horizontal edges sit at the given world angles."""
    v = np.zeros(rows - 1)
    half = math.tan(math.radians(fov_deg) / 2.0)
    for a in angles_deg:
        row = 0.5 + 0.5 * math.tan(math.radians(a - theta_deg)) / half
        if 0.0 <= row < 1.0:
            i = int(row * (rows - 1))
            for off, amp in ((-1, 0.5), (0, 1.0), (1, 0.5)):
                if 0 <= i + off < len(v):
                    v[i + off] += amp
    return (v - v.mean()) / (v.std() + 1e-9)


EDGES = [-24.0, -18.0, -11.0, -6.0, -2.0, 3.0, 8.0, 14.0, 19.0, 26.0, 33.0]


def test_recovers_zero_tilt():
    r = pitch_fit.fit(synth_profile(0.0, 72.0, EDGES),
                      synth_profile(0.0, 72.0, EDGES))
    assert abs(r['pitch']) <= 0.5, r


def test_recovers_a_known_tilt():
    r = pitch_fit.fit(synth_profile(22.0, 72.0, EDGES),
                      synth_profile(0.0, 72.0, EDGES))
    assert abs(r['pitch'] - 22.0) <= 0.5, r


# At 40 degrees of tilt a 72-degree frame keeps only world angles 4..76, so
# the EDGES set above leaves the frame and the scenario stops being a test of
# the projection. This set stays visible on BOTH sides. The narrowing itself
# is a real property of the problem, not an artefact: the bigger the tilt, the
# less content a level render and a tilted photograph share -- which is one
# reason a proposal degrades exactly where the tilt is largest.
# Irregularly spaced ON PURPOSE: a uniform ladder is periodic, and a
# correlation against a periodic signal aliases by exactly one period. A
# uniform version of this set returned 30.0 for a true 40.0.
DEEP_EDGES = [5.0, 9.0, 16.0, 22.0, 25.0, 34.0]


def test_recovers_a_large_tilt_outside_the_small_angle_regime():
    """serenity's 2.webp already ships 40 degrees, so the exact projection --
    not a linearised shift -- has to hold out there."""
    r = pitch_fit.fit(synth_profile(40.0, 72.0, DEEP_EDGES),
                      synth_profile(0.0, 72.0, DEEP_EDGES))
    assert abs(r['pitch'] - 40.0) <= 0.5, r


def test_confirmation_pass_returns_the_tilt_the_render_was_captured_at():
    r = pitch_fit.fit(synth_profile(22.0, 72.0, EDGES),
                      synth_profile(22.0, 72.0, EDGES), theta_r_deg=22.0)
    assert abs(r['pitch'] - 22.0) <= 0.5, r


def test_refuses_when_nothing_overlaps():
    """A tilt so large the frames share no rows must return no proposal."""
    photo = synth_profile(0.0, 72.0, [-30.0])
    render = np.zeros(511)
    r = pitch_fit.fit(photo, render)
    assert r['pitch'] is None or r['overlap'] >= pitch_fit.MIN_OVERLAP, r


def test_row_profile_is_zero_mean_unit_scale():
    img = np.zeros((200, 120), dtype=np.uint8)
    img[80:, :] = 255
    p = pitch_fit.row_profile(img)
    assert p.shape == (511,)
    assert abs(float(p.mean())) < 1e-6
    assert abs(float(p.std()) - 1.0) < 0.05


def test_probe_finds_a_planted_edge():
    img = np.zeros((400, 200), dtype=np.uint8)
    img[260:, :] = 255                       # one edge at row 260 -> 0.651
    h, rows = pitch_fit.probe(img, col=0.5)
    best = max(rows, key=lambda rs: rs[1])
    assert abs(best[0] / (h - 1.0) - 260 / 399.0) < 0.01, rows


def test_probe_returns_rows_in_order():
    img = np.zeros((400, 200), dtype=np.uint8)
    img[100:, :] = 120
    img[300:, :] = 255
    h, rows = pitch_fit.probe(img, col=0.5)
    assert rows == sorted(rows), rows
```

- [ ] **Step 2: Run the tests and watch them fail for the right reason**

```bash
python -m pytest tools/tests/test_pitch_fit.py -v
```

Expected: a collection error, `ModuleNotFoundError: No module named 'pitch_fit'`.
Anything else — an import resolving, a different failure — means something is on
the path that should not be. Find out why before writing code.

- [ ] **Step 3: Write the instrument**

Create `tools/pitch_fit.py`:

```python
"""Propose a camera tilt for a photo spot, and help a human measure one.

WHAT THIS TOOL IS NOT. It does not derive shippable values. That was tried --
a two-parameter fit of tilt AND lens against the row profile of horizontal-edge
energy -- and it was rejected by measurement before plan 4e spent a single
browser capture. See docs/superpowers/metrics/b4e-preflight-method-rejection.json.
The short version, because the rejected design is plausible enough to be
proposed again:

  * Two free parameters are degenerate on real frames. The fitted field of view
    ran to the search grid's floor on 4 of 24 spots and scattered from 28 to
    108 degrees on the rest, with no clustering.
  * One free parameter is well posed and can be right: with the lens pinned at
    the gate camera's 72 degrees, serenity's 10.webp returns 21.50 against a
    known 22.0.
  * But the confidence score does not predict correctness. That correct answer
    carries the LOWEST sharpness of all 24 spots, 0.003, against a spread
    reaching 0.568. Nothing may branch on this score.

So `fit` PROPOSES a neighbourhood and `probe` helps a human MEASURE a named
landmark. The human decides. That is plan 4c task 1b's method, which is the
only one with a record of working in this repository.

Run:
  # propose a tilt for every compare spot of an apartment
  python tools/pitch_fit.py --apt serenity --renders <dir> --out <json>

  # list the strongest horizontal-gradient rows in one column of one image,
  # as fractions of frame height, so a reviewer can pick their landmark
  python tools/pitch_fit.py --probe tour/photos/serenity/10.webp --col 0.35

Renders are <dir>/render_<apt>_<n>.jpg, the names tools/serve.py's save
endpoint writes.
"""
import argparse
import json
import math
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ROWS = 512
COLS = 256
# Every capture in plan 4e runs under ?fov=legacy, whose vertical field of view
# is a fixed 72 degrees. The lens is PINNED here, never fitted -- see the
# module docstring.
LEGACY_VFOV = 72.0

PITCH_MIN, PITCH_MAX, PITCH_STEP = -12.0, 52.0, 0.25
# A candidate must keep this fraction of the photograph's rows inside the
# render's frame, or a wildly wrong tilt scores well on a sliver.
MIN_OVERLAP = 0.25
SHARP_SEPARATION_DEG = 3.0


def row_profile(src, rows=ROWS, cols=COLS):
    """Per-row horizontal-edge energy, z-scored, length rows-1.

    `src` is a path or a 2-D uint8 array. Both frames are resampled to one
    fixed grid so a photograph and a render of different pixel sizes share a
    normalised row axis. Aspect distortion is harmless: it does not move a
    horizontal edge's ROW, which is the only thing read. Colour is never read,
    so this criterion cannot quietly become dE2000 -- which chooses nothing in
    this repository, by rule.

    The 5-tap smoothing is deliberate and narrow. A 17-tap version was tried
    and measured WORSE: it took 10.webp from 21.50 (truth 22.0) to 7.2.
    """
    im = Image.fromarray(src) if isinstance(src, np.ndarray) else Image.open(src)
    g = np.asarray(im.convert('L').resize((cols, rows), Image.BILINEAR),
                   dtype=np.float64)
    energy = np.abs(np.diff(g, axis=0)).sum(axis=1)
    energy = np.convolve(energy, np.ones(5) / 5.0, mode='same')
    return (energy - energy.mean()) / (energy.std() + 1e-9)


def remap_rows(render_profile, theta_p_deg, fov_deg,
               theta_r_deg=0.0):
    """Resample a render profile onto the photograph's row axis.

    For each photograph row: recover the world angle it sees under
    (theta_p, fov), then ask which render row sees that angle under
    (theta_r, fov). Exact -- deliberately not a small-angle shift-and-stretch,
    because serenity's 2.webp already sits at 40 degrees.
    """
    n = len(render_profile)
    v_p = (np.arange(n) + 0.5) / n
    half = math.tan(math.radians(fov_deg) / 2.0)
    alpha = np.arctan((2.0 * v_p - 1.0) * half) + math.radians(theta_p_deg)
    v_r = 0.5 + 0.5 * np.tan(alpha - math.radians(theta_r_deg)) / half
    valid = (v_r >= 0.0) & (v_r < 1.0)
    idx = np.clip(v_r * n, 0, n - 1)
    return np.interp(idx, np.arange(n), render_profile), valid


def _score(photo_profile, resampled, valid):
    """Normalised cross-correlation over the overlapping rows only."""
    if valid.sum() < MIN_OVERLAP * len(photo_profile):
        return None
    a = photo_profile[valid] - photo_profile[valid].mean()
    b = resampled[valid] - resampled[valid].mean()
    denom = math.sqrt(float((a * a).sum()) * float((b * b).sum()))
    if denom < 1e-9:
        return None
    return float((a * b).sum() / denom)


def fit(photo_profile, render_profile, theta_r_deg=0.0, fov_deg=LEGACY_VFOV):
    """Search tilt only, exhaustively. Returns a PROPOSAL, not an answer.

    `sharpness` is reported because a reader deserves to see it. It is not a
    gate: it was measured not to predict correctness.
    """
    scores = {}
    for th in np.arange(PITCH_MIN, PITCH_MAX + 1e-9, PITCH_STEP):
        res, valid = remap_rows(render_profile, float(th), fov_deg, theta_r_deg)
        s = _score(photo_profile, res, valid)
        if s is not None:
            scores[float(th)] = (s, float(valid.mean()))
    if not scores:
        return {'pitch': None, 'score': 0.0, 'overlap': 0.0, 'sharpness': 0.0,
                'refused': 'no candidate kept enough overlap'}
    best_p = max(scores, key=lambda k: scores[k][0])
    best_s, best_o = scores[best_p]
    rival = max((v[0] for p, v in scores.items()
                 if abs(p - best_p) >= SHARP_SEPARATION_DEG), default=-2.0)
    return {'pitch': best_p, 'score': best_s, 'overlap': best_o,
            'sharpness': max(0.0, best_s - rival)}


def probe(src, col=0.5, top=8, band=0.06):
    """Strongest horizontal-gradient rows in one vertical strip.

    Returns (height, [(row_index, strength), ...]) sorted by row. The caller
    reads these as candidate landmarks -- a floor/wall junction, a counter
    edge, a sill -- and NAMES the one they are matching. Checked against plan
    4c task 1b's independent hand measurements of serenity 10.webp: at column
    0.35 this finds 0.392 in the photograph and 0.374 in the render captured
    at pitch 22, which are exactly the rows task 1b recorded.
    """
    im = Image.fromarray(src) if isinstance(src, np.ndarray) else Image.open(src)
    g = np.asarray(im.convert('L'), dtype=np.float64)
    h, w = g.shape
    x0 = int(max(0, (col - band / 2) * w))
    x1 = int(min(w, (col + band / 2) * w))
    strip = g[:, x0:x1].mean(axis=1)
    d = np.abs(np.diff(np.convolve(strip, np.ones(5) / 5.0, mode='same')))
    picked = []
    for i in np.argsort(d)[::-1]:
        if len(picked) >= top:
            break
        if all(abs(int(i) - r) > h * 0.02 for r, _ in picked):
            picked.append((int(i), float(d[i])))
    picked.sort()
    return h, picked


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--probe', help='image to list candidate landmark rows for')
    ap.add_argument('--col', type=float, default=0.5,
                    help='column to probe, as a fraction of width')
    ap.add_argument('--apt')
    ap.add_argument('--renders', help='directory of render_<apt>_<n>.jpg frames')
    ap.add_argument('--render-pitch-json', default=None,
                    help='JSON map {"3.webp": 12.5} of the tilt each render was '
                         'CAPTURED at. Absent means every render is level.')
    ap.add_argument('--out')
    args = ap.parse_args()

    if args.probe:
        h, rows = probe(args.probe, args.col)
        print('%s  height %d  column %.2f' % (args.probe, h, args.col))
        for r, s in rows:
            print('  row %5d   %.4f of height   strength %8.1f' % (r, r / (h - 1.0), s))
        return

    if not (args.apt and args.renders and args.out):
        ap.error('--apt, --renders and --out are required unless --probe is used')

    cfg = json.load(open(os.path.join(ROOT, 'tour', 'apartments', args.apt + '.json'),
                         encoding='utf-8'))
    base = cfg['meta']['photoBase']
    captured = {}
    if args.render_pitch_json:
        captured = json.load(open(args.render_pitch_json, encoding='utf-8'))

    rows = []
    for s in cfg['photoSpots']:
        if not s.get('compare'):
            continue
        photo = os.path.join(ROOT, 'tour', base, s['file'])
        render = os.path.join(ROOT, args.renders, 'render_%s_%s'
                              % (args.apt, s['file'].replace('.webp', '.jpg')))
        if not os.path.exists(render):
            rows.append({'file': s['file'], 'refused': 'render missing: ' + render})
            continue
        if os.path.getsize(render) == 0:
            rows.append({'file': s['file'],
                         'refused': 'render is zero bytes -- sandboxed serve.py '
                                    'or a malformed save body'})
            continue
        th = float(captured.get(s['file'], 0.0))
        r = fit(row_profile(photo), row_profile(render), theta_r_deg=th)
        r.update({'file': s['file'], 'capturedAtPitch': th,
                  'configPitch': s.get('pitch'), 'poseVerified': s.get('poseVerified')})
        rows.append(r)

    out = {'apartment': args.apt, 'lensPinnedAt': LEGACY_VFOV,
           'renderDir': args.renders,
           'status': 'PROPOSALS ONLY -- a named landmark decides the value. '
                     'sharpness is reported and is NOT a gate.',
           'spots': rows}
    with open(os.path.join(ROOT, args.out), 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=1)
    for r in rows:
        if 'refused' in r:
            print('%-10s REFUSED %s' % (r['file'], r['refused']))
        else:
            print('%-10s proposes %6.2f   score %.4f  sharp %.4f  overlap %.2f'
                  % (r['file'], r['pitch'], r['score'], r['sharpness'], r['overlap']))


if __name__ == '__main__':
    main()
```

- [ ] **Step 4: Run the tests and require all eight to pass**

```bash
python -m pytest tools/tests/test_pitch_fit.py -v
```

Expected: `8 passed`, in roughly 3 seconds.

**Do not loosen a tolerance to make a test pass.** Two of these tests were
written wrong the first time, and fixing the *scenario* rather than the tolerance
is what found two real defects: a uniformly spaced synthetic ladder aliases by
exactly one period (a true 40 returned 30), and `MIN_OVERLAP` at 0.55 made a 40°
answer unreachable by construction. Both are recorded in
`docs/superpowers/metrics/b4e-preflight-method-rejection.json`.

- [ ] **Step 5: Check the probe against an independent prior measurement**

This is the only validation on real data available anywhere in this repository,
and it costs one command:

```bash
python tools/pitch_fit.py --probe tour/photos/serenity/10.webp --col 0.35
```

Expected: among the rows printed, one at **0.392** of frame height. That is
exactly the `photoWaterBand` start plan 4c task 1b measured by hand, recorded in
`docs/superpowers/metrics/serenity-b4c-task1b-pitch-derivation.json`. The probe
rediscovering it, never having been told it, is what earns the tool its place in
tasks 3 and 4. **If that row is absent, stop** — the probe is not reproducing a
known measurement, and nothing downstream can be trusted.

- [ ] **Step 6: Commit**

```bash
git add tools/pitch_fit.py tools/tests/test_pitch_fit.py
git commit -m "Plan 4e task 1: a tilt proposer, and a landmark probe that checks out against task 1b"
```

---

### Task 2: Capture the level baseline, the gate BASE, and the noise band

**Files:**
- Create: `docs/superpowers/harnesses/2026-08-22-b4e/renders-pitch0-{serenity,kings-court}/`
- Create: `docs/superpowers/harnesses/2026-08-22-b4e/renders-pitch0-repeat-{serenity,kings-court}/`
- Create: `docs/superpowers/metrics/{serenity,kings-court}-b4e-BASE-legacy-allspots.json`
- Create: `docs/superpowers/metrics/{serenity,kings-court}-b4e-proposals-pitch0.json`
- Create: `docs/superpowers/metrics/{serenity,kings-court}-b4e-proposals-pitch0-repeat.json`
- Create: `docs/superpowers/metrics/b4e-noise-band.json`

**Interfaces:**
- Consumes: `pitch_fit.fit`, `pitch_fit.probe` and the CLI from task 1.
- Produces: `b4e-noise-band.json`, `{bandRows, bandDegrees, method, perSpot}`. **Tasks 3 and 4 quote this and never invent a number.** `bandRows` is the repeatability of a landmark row measurement across two identical captures, as a fraction of frame height; `bandDegrees` is that converted at 72°.

- [ ] **Step 1: Start the server, sandbox disabled, and prove it writes**

```bash
python tools/serve.py
```

From another shell, prove the save endpoint reaches disk — **presence is not
enough, check the size**:

```bash
curl -s -X POST --data "data:image/jpeg;base64,/9j/4AAQSkZJRg==" http://localhost:8742/save/probe.jpg > /dev/null && ls -l tools/shots/probe.jpg && rm tools/shots/probe.jpg
```

Expected: a non-zero byte count. **A zero-byte file means the capture path is
broken and every measurement after this point is void.**

- [ ] **Step 2: Record the gate BASE, both apartments, before anything changes**

Open `http://localhost:8742/index.html?apt=serenity&measure=1&fov=legacy&cb=1` and
confirm the loaded version first:

```js
[...document.querySelectorAll('script')].map(s => s.src.split('?').pop())
```

Then:

```js
await window.__bakeReady;
await window.__measure();
```

```bash
python tools/delta_e.py --apt serenity --phase b4e-BASE --all-spots
```

Repeat for `?apt=kings-court`. Save both as `{apt}-b4e-BASE-legacy-allspots.json`.
**`--all-spots` is required** — it is the population every gate in this record
uses.

- [ ] **Step 3: Capture the level render set**

Still under `?measure=1&fov=legacy`, zero every spot's tilt in memory and
capture. This changes no file: `measure.js:45` reads `spot.pitch` off the
in-memory config, already converted to negated radians by `main.js`, so setting
it directly is exactly what a config value would do.

```js
await window.__bakeReady;
APT.photoSpots.forEach(s => { if (s.compare) s.pitch = 0; });
await window.__measure();
```

This deliberately zeroes serenity's `2.webp` and `10.webp` too — the level set is
the common starting point for all 24 spots, including the two already carrying
values.

```bash
mkdir -p docs/superpowers/harnesses/2026-08-22-b4e/renders-pitch0-serenity
mv tools/shots/render_serenity_*.jpg docs/superpowers/harnesses/2026-08-22-b4e/renders-pitch0-serenity/
```

Repeat for kings-court. **Count the files before moving on**: serenity must have
11, kings-court 13. A short count means a capture was silently lost.

- [ ] **Step 4: Generate the proposals**

```bash
python tools/pitch_fit.py --apt serenity \
  --renders docs/superpowers/harnesses/2026-08-22-b4e/renders-pitch0-serenity \
  --out docs/superpowers/metrics/serenity-b4e-proposals-pitch0.json
python tools/pitch_fit.py --apt kings-court \
  --renders docs/superpowers/harnesses/2026-08-22-b4e/renders-pitch0-kings-court \
  --out docs/superpowers/metrics/kings-court-b4e-proposals-pitch0.json
```

These are **starting points for tasks 3 and 4's sweeps, not answers.** The JSON
says so in its own `status` field.

- [ ] **Step 5: Derive the noise band from a repeat capture, do not choose it**

Reload each apartment — a fresh page load, so the bake and the environment
capture re-run; this record has measured that nothing here is byte-identical
across two loads — and capture the level set again into
`renders-pitch0-repeat-<apt>/`, then re-run the proposals into
`{apt}-b4e-proposals-pitch0-repeat.json`.

Now measure the band on what tasks 3 and 4 actually read — **landmark rows**, not
proposals. For each of the 24 spots, probe the same column in both repeat renders
and record how far the strongest shared row moved:

```bash
python tools/pitch_fit.py --probe docs/superpowers/harnesses/2026-08-22-b4e/renders-pitch0-serenity/render_serenity_3.jpg --col 0.5
python tools/pitch_fit.py --probe docs/superpowers/harnesses/2026-08-22-b4e/renders-pitch0-repeat-serenity/render_serenity_3.jpg --col 0.5
```

Write `b4e-noise-band.json` with the per-spot row differences, `bandRows` set to
the **maximum** across both apartments, and `bandDegrees` its conversion at 72°:

```
degrees = atan(2 * bandRows * tan(36°)) in the small-row limit;
compute it exactly with pitch_fit.remap_rows rather than by hand.
```

Record the per-spot spread as well. This record has measured that per-load
variation is **not** uniform across apartments — horkyone-10's spawn-view spread
is roughly eight times kings-court's — so a single band is a deliberately
conservative summary, and the JSON should say so.

**Naming a band instead of measuring it is the specific mistake this repository
has on file** — a plausible figure that entered through a document and survived
three review rounds.

- [ ] **Step 6: Commit the measurements**

```bash
git add docs/superpowers/harnesses/2026-08-22-b4e docs/superpowers/metrics/serenity-b4e-BASE-legacy-allspots.json docs/superpowers/metrics/kings-court-b4e-BASE-legacy-allspots.json docs/superpowers/metrics/serenity-b4e-proposals-pitch0.json docs/superpowers/metrics/kings-court-b4e-proposals-pitch0.json docs/superpowers/metrics/serenity-b4e-proposals-pitch0-repeat.json docs/superpowers/metrics/kings-court-b4e-proposals-pitch0-repeat.json docs/superpowers/metrics/b4e-noise-band.json
git commit -m "Plan 4e task 2: level baseline, gate BASE and a measured noise band"
```

---

### Task 3: serenity — name a landmark, sweep it, confirm it, ship it

**Files:**
- Create: `docs/superpowers/harnesses/2026-08-22-b4e/renders-confirm-serenity/`
- Create: `docs/superpowers/harnesses/2026-08-22-b4e/serenity-captured-pitch.json`
- Create: `docs/superpowers/metrics/serenity-b4e-derivation.json`
- Modify: `tour/apartments/serenity.json` — `pitch` and `poseVerified` on `photoSpots`

**Interfaces:**
- Consumes: `b4e-noise-band.json`'s `bandRows`/`bandDegrees`, and `serenity-b4e-proposals-pitch0.json`.
- Produces: `serenity-b4e-derivation.json`, an array of `{file, landmark, column, photoRow, renderRowAtZero, proposal, sweptValues, chosen, renderRowAtChosen, residualRows, outcome, poseVerifiedBefore, poseVerifiedAfter, reason}` where `outcome` is one of `tilt-confirmed`, `level-confirmed`, `no-usable-landmark`, `will-not-converge`. **Task 5 reads this file for its counts and never recounts by hand.**

- [ ] **Step 1: Name a landmark for each of the 11 spots, and write the name down**

Open the photograph and the level render side by side. Choose **one horizontal
architectural feature visible in both** — a floor/wall junction, a counter edge,
a window sill or head, a ceiling line. Prefer architecture over furniture: the
render's sofa is not the photograph's sofa, and that mismatch has already
produced a confident wrong fit on `2.webp`.

Use the probe to read candidate rows rather than eyeballing pixels:

```bash
python tools/pitch_fit.py --probe tour/photos/serenity/3.webp --col 0.5
python tools/pitch_fit.py --probe docs/superpowers/harnesses/2026-08-22-b4e/renders-pitch0-serenity/render_serenity_3.jpg --col 0.5
```

Pick the column where the feature is cleanest and unobstructed — task 1b used
0.35 and 0.1 for its two spots, not the centre.

Record for each spot, **in words**: the feature's name ("the pool coping's far
edge", "the kitchen counter's front lip"), the column, its row in the photograph
and its row in the level render.

**A spot where no feature can be named in both frames is `no-usable-landmark`**,
ships `pitch: 0`, and the reason is written out. That is a legitimate outcome,
not a failure to try harder — and deciding it here, before any sweep, stops a
sweep from inventing a landmark to justify itself.

- [ ] **Step 2: Classify the obvious cases before sweeping anything**

If the photograph's row and the level render's row already agree within
`bandRows`, the spot is **`level-confirmed`**: no key is written, and its
`poseVerified` stamp is now tested rather than assumed. Write these into
`serenity-b4e-derivation.json` now.

Everything else goes to the sweep.

- [ ] **Step 3: Sweep each remaining spot around its proposal**

Start from the proposal in `serenity-b4e-proposals-pitch0.json` and capture that
spot at the proposal and at proposal ±3° and ±6°. Five values, not two hundred —
that is what the proposal buys.

```js
await window.__bakeReady;
const SWEEP = { '3.webp': 8.0 };          // one spot, one value, per capture run
APT.photoSpots.forEach(s => {
  if (!s.compare) return;
  const deg = SWEEP[s.file] || 0;
  s.pitch = -deg * Math.PI / 180;          // negated, exactly as main.js:105 does
});
await window.__measure();
```

After each run, probe the spot's chosen column in the new render and record the
landmark's row. **Choose the tilt whose landmark row lands closest to the
photograph's** — not the one with the best score, and never the one with the best
ΔE.

If the landmark row moves the wrong way as tilt increases, the sign is being
applied backwards somewhere: `main.js:105` negates, so a positive config value
means *tilted down*, and a downward tilt moves a fixed world feature **up** the
frame. Check that before sweeping further.

**A spot where no swept value brings the rows within `bandRows` is
`will-not-converge`**: it ships `pitch: 0`, and every swept value is recorded so
nobody repeats the sweep. This outcome is also the plan's lens evidence — a
landmark that no tilt can reconcile is saying something is wrong that is not
tilt, and `meta.photoFovLong` is the leading candidate.

- [ ] **Step 4: Capture the confirmation set in one run**

With every chosen value applied at once:

```js
await window.__bakeReady;
const DERIVED = { /* the chosen degrees, per file */ };
APT.photoSpots.forEach(s => {
  if (!s.compare) return;
  const deg = DERIVED[s.file] || 0;
  s.pitch = -deg * Math.PI / 180;
});
await window.__measure();
```

```bash
mkdir -p docs/superpowers/harnesses/2026-08-22-b4e/renders-confirm-serenity
mv tools/shots/render_serenity_*.jpg docs/superpowers/harnesses/2026-08-22-b4e/renders-confirm-serenity/
```

Write the same map to
`docs/superpowers/harnesses/2026-08-22-b4e/serenity-captured-pitch.json`, then
re-probe every spot's landmark in the confirmation render and record
`residualRows`. **A spot whose residual exceeds `bandRows` here is demoted to
`will-not-converge` and ships `pitch: 0`.** Do not nudge the value to chase the
residual — that turns a confirmation back into the sweep it was meant to check.

- [ ] **Step 5: Look at the dividers, and let the reviewer overrule the tool**

```
http://localhost:8742/index.html?apt=serenity&compare=1&cb=1
```

The divider runs at the **per-spot** field of view (88.5° for serenity's eight
16:9 landscape spots, 120° for its three portrait ones), not the gate's 72°. So
expect the framing to differ from the capture you just measured, and judge the
**alignment of horizontal structure**, not the framing.

Record per spot whether the reviewer accepts. **The instrument proposes; the
reviewer disposes.** A spot whose landmark rows agree but whose divider is
visibly wrong is not shipped, and the reason goes in the JSON in words.

- [ ] **Step 6: Cross-check the two shipped values**

serenity's `2.webp` (40) and `10.webp` (22) came from plan 4c task 1b's water
band. Record this task's derived values beside them under `priorValue` and
`priorMethod`.

**Change them only if the new derivation disagrees materially AND its confirming
capture is the better frame under step 5's review.** If the two independent
methods agree, say so — that is the strongest evidence available that the method
works, and it costs nothing to write down.

Carry `2.webp`'s known context in rather than rediscovering it: it is
`poseVerified: false` on a furniture-placement reason routed to plan 5, its
render does not show the photograph's scene, and the pre-flight already measured
that the tool proposes 21.25 there against a shipped 40. **A disagreement at
`2.webp` is expected and is not evidence to change the shipped value.**

- [ ] **Step 7: Write the values into the config**

Edit `tour/apartments/serenity.json`. For each `tilt-confirmed` spot add
`"pitch": <degrees>`; leave every other spot's key absent.

Then re-open every spot whose pitch changed and decide `poseVerified` **against
the new divider**. That stamp was previously awarded under a camera that could
not tilt, so it was answering a question about the wrong frame.

**A count going down is an acceptable outcome of this plan and must be reported,
not avoided.** Record `poseVerifiedBefore` and `poseVerifiedAfter` per spot.

- [ ] **Step 8: Validate and commit**

```bash
python tools/delta_e.py --apt serenity --phase b4e-task3 --all-spots
```

Record the reading. **It decides nothing** — it is recorded because task 5's gate
needs the intermediate point to attribute movement, and because a number that
moved the "wrong" way is information this record keeps rather than hides.

In the browser, on serenity: `window.__issues` must be `[]`.

```bash
git add tour/apartments/serenity.json docs/superpowers/harnesses/2026-08-22-b4e docs/superpowers/metrics/serenity-b4e-derivation.json
git commit -m "Plan 4e task 3: serenity's cameras get the tilt the photographs were shot at"
```

**No `?v=` bump yet** — task 4 edits `tour/` again, and the rule is to bump after
the last edit.

---

### Task 4: kings-court — the same, plus the lens evidence

**Files:**
- Create: `docs/superpowers/harnesses/2026-08-22-b4e/renders-confirm-kings-court/`
- Create: `docs/superpowers/harnesses/2026-08-22-b4e/kings-court-captured-pitch.json`
- Create: `docs/superpowers/metrics/kings-court-b4e-derivation.json`
- Create: `docs/superpowers/metrics/b4e-lens-evidence.json`
- Modify: `tour/apartments/kings-court.json` — `pitch` and `poseVerified`
- Modify: `tour/index.html:254` — `?v=` 136 → 137, **after** the JSON edits

**Interfaces:**
- Consumes: `b4e-noise-band.json`, `kings-court-b4e-proposals-pitch0.json`.
- Produces: `kings-court-b4e-derivation.json` in the identical shape as task 3's, and `b4e-lens-evidence.json`, `{spots: [{apt, file, frameShape, landmark, bestResidualRows, sweptRange}], documented: 120, priorMeasurements: [57, 58], sensitivityDegPerDeg: {median: 0.15, min: -0.62, max: 1.22}}` — **handed to plan 5, acted on by nobody here.**

- [ ] **Step 1: Name a landmark for each of the 13 spots**

Identical procedure to task 3 step 1, with two spots whose context must be
carried in rather than rediscovered:

- **`14.webp`** — under the legacy gate camera this spot renders a close-up of
  bare marble in *both* trees, so a row profile there is measuring a wall, not a
  bathroom. Expect `no-usable-landmark` and record it as such. Its
  `poseVerified: false` also rests on the Bathroom 2 mirroring, which is plan
  5's and is not touched here.
- **`11.webp`** — the per-spot ΔE noise floor is worst at this spot (0.32 and
  0.30 in two independent same-state groups, against ≤0.16 everywhere else).
  Treat a small ΔE movement there as noise. Note also that the pre-flight's
  proposal for this spot was **27.5° of downward tilt in a bedroom photograph**,
  at high confidence — a good illustration of why the proposal is not the answer.

- [ ] **Step 2: Classify the obvious cases**

Identical to task 3 step 2: rows already agreeing within `bandRows` are
`level-confirmed`, no key written, stamp now tested rather than assumed.

- [ ] **Step 3: Sweep each remaining spot around its proposal**

Identical to task 3 step 3 — proposal, ±3°, ±6°, chosen by landmark row, never
by score and never by ΔE:

```js
await window.__bakeReady;
const SWEEP = { '12.webp': 6.0 };
APT.photoSpots.forEach(s => {
  if (!s.compare) return;
  const deg = SWEEP[s.file] || 0;
  s.pitch = -deg * Math.PI / 180;
});
await window.__measure();
```

Expect more `will-not-converge` here than in serenity. `meta.photoFovLong` is
documented as 120 and was measured at ~57–58° by two independent methods on two
photographs, so a lens error is likelier in this apartment. **That is a result,
not a failure of this task.**

- [ ] **Step 4: Capture the confirmation set**

```js
await window.__bakeReady;
const DERIVED = { /* the chosen degrees, per file */ };
APT.photoSpots.forEach(s => {
  if (!s.compare) return;
  const deg = DERIVED[s.file] || 0;
  s.pitch = -deg * Math.PI / 180;
});
await window.__measure();
```

```bash
mkdir -p docs/superpowers/harnesses/2026-08-22-b4e/renders-confirm-kings-court
mv tools/shots/render_kings-court_*.jpg docs/superpowers/harnesses/2026-08-22-b4e/renders-confirm-kings-court/
```

Write the map to `kings-court-captured-pitch.json`, re-probe every landmark, and
apply the same residual rule as task 3 step 4.

- [ ] **Step 5: Look at the dividers**

```
http://localhost:8742/index.html?apt=kings-court&compare=1&cb=1
```

kings-court's divider runs at **98.2°** for its eight 3:2 landscape spots
(2, 3, 8, 11, 12, 13, 18, 20) and **120.0°** for its five portrait ones
(7, 10, 14, 17, 19). Judge horizontal alignment, not framing.

- [ ] **Step 6: Write the lens evidence out, and change no lens**

Collect every `will-not-converge` spot from **both** apartments into
`docs/superpowers/metrics/b4e-lens-evidence.json` with its named landmark, the
range swept and the best residual reached, next to the documented 120, the prior
~57 and ~58 measurements, and the pre-flight's measured sensitivity.

Say plainly what this evidence is and is not: it is a **list of frames no tilt
could reconcile**, which is a symptom. It is **not** a per-frame lens
measurement — the pre-flight measured that fitting the lens is degenerate, so
this plan has none to give, and it cannot offer plan 5 a single conversion
coefficient either.

**Do not edit `meta.photoFovLong`.** It is one per-apartment constant governing
all thirteen frames, correcting it is plan 5's row, and doing it here would put
two instrument changes in one branch — the exact compounding plan 4b task 4
recorded as a defect.

- [ ] **Step 7: Write the values, re-decide poseVerified, bump `?v=`**

Edit `tour/apartments/kings-court.json` as in task 3 step 7.

Then, and **only after the last edit under `tour/`**, bump the single module tag
in `tour/index.html:254` from `?v=136` to `?v=137`. Verify the bump landed by
comparing a field of `APT` in the console against the file, and check the loaded
script versions — a cached `index.html` produces exactly the symptom of a missing
bump:

```js
[...document.querySelectorAll('script')].map(s => s.src.split('?').pop())
```

- [ ] **Step 8: Validate and commit**

```bash
python tools/delta_e.py --apt kings-court --phase b4e-task4 --all-spots
```

`window.__issues` empty on kings-court.

```bash
git add tour/apartments/kings-court.json tour/index.html docs/superpowers/harnesses/2026-08-22-b4e docs/superpowers/metrics/kings-court-b4e-derivation.json docs/superpowers/metrics/b4e-lens-evidence.json
git commit -m "Plan 4e task 4: kings-court's tilts, and the lens evidence plan 5 asked for"
```

---

### Task 5: Closing gate, the record, and the routing

**Files:**
- Create: `docs/superpowers/metrics/{serenity,kings-court}-b4e-gate-legacy-allspots.json` and `-repeat.json`
- Modify: `CLAUDE.md` — the `pitch` row
- Modify: `docs/PHASE-B-RESUME.md` — the 4d rows, the `poseVerified` counts, a new 4e row
- Modify: `docs/superpowers/metrics/README.md` — baselines, populations, the two-camera finding, the rejected method

**Interfaces:**
- Consumes: both derivation JSONs from tasks 3 and 4. **Every count in this task is read from those files or produced by a command run in this task. None is recounted by hand or recalled.**

- [ ] **Step 1: Serve BASE and HEAD simultaneously and gate both apartments**

```bash
git worktree add ../airbnb-base 705ac42
```

Serve both trees at once and capture from each in the same session, so the two
readings share a machine and a browser state. This is the established shape, and
it exists because this record has two defensible bake-time ratios for one change
measured on two machines.

For each of BASE and HEAD, on both apartments, under `?measure=1&fov=legacy`:

```js
await window.__bakeReady;
await window.__measure();
```

```bash
python tools/delta_e.py --apt serenity --phase b4e-gate --all-spots
python tools/delta_e.py --apt kings-court --phase b4e-gate --all-spots
```

Then run the whole thing a **second** time and save as `-repeat.json`. A single
reading is not a measurement in this record.

- [ ] **Step 2: Write the gate up as an instrument correction**

Whatever the numbers are, the sentence beside them is fixed by what this plan
did: **nothing about how the scene is lit, shaded or drawn changed.** The harness
stopped capturing a camera the photographer never used. Say that wherever the
number appears, in task 1b's own words.

If a spot's ΔE rose while its divider got better, say that too — saturated colour
in a misaligned cell scores worse than the flat grey it replaced, and this record
already documents that the instrument cannot arbitrate it.

- [ ] **Step 3: Structural sweep**

`window.__issues` empty on serenity, kings-court **and** horkyone-10 — which this
plan never touched; check it anyway, that is the point of a sweep.

Draw calls through the post chain at serenity's own entrance, `info.autoReset`
disabled and reset by hand:

```js
const a = window.__app, c = a.controls;
c.pos.x = 3.6; c.pos.z = 0.75; c.ground = 0; c.yaw = 178 * Math.PI / 180; c.update(0.001);
a.renderer.info.autoReset = false;
a.renderer.info.reset();
if (a.post && a.post.enabled) a.post.render(0); else a.renderer.render(a.scene, a.camera);
console.log(a.renderer.info.render.calls);
a.renderer.info.autoReset = true;
```

This plan adds no geometry, so the expected answer is serenity's current **78**.
Measure it rather than asserting it.

Console clean of errors on all three apartments.

- [ ] **Step 4: Update `CLAUDE.md`**

Only the `pitch` row, and only what this branch measured. Its current closing
sentence — *"Only serenity's `2.webp` (40) and `10.webp` (22) set it; the other
nine serenity spots and all thirteen kings-court spots are still captured at 0
and were pose-verified under that constraint, which is an open item, not a clean
bill"* — becomes false the moment this plan ships. Replace it with the counts
from the derivation JSONs, and add, one sentence each:

- that the derivation is geometric — a **named horizontal landmark** measured in
  both frames, with an automatic proposal only narrowing the sweep — and never
  ΔE;
- **that automatic fitting of tilt and lens together was tried and rejected by
  measurement**, with a pointer to
  `docs/superpowers/metrics/b4e-preflight-method-rejection.json`, so the next
  reader does not re-propose it;
- the two-camera finding — the divider runs at 88.5–120° vertical while the gate
  runs at 72°, so a value that merely aligns rows means two different things in
  the two places `pitch` is read;
- that every shipped tilt is **conditional on the assumed 72° lens** and cannot
  be converted by a single coefficient if `meta.photoFovLong` moves.

**Do not restate a number you did not measure this session.**

- [ ] **Step 5: Update `docs/PHASE-B-RESUME.md`**

- **Line 598's row** — strike its `4d` owner and replace with `4e`, with a dated
  inline marker **in the row itself**. `tools/checks/stale_claims.py` scopes a
  claim to the smallest unit that renders on its own, so a blockquote above the
  table does not cover it. The conflict between that rule and this repo's
  narrated-marker convention is plan 5's to settle; until it is, satisfy the
  checker.
- **Line 33's 4d row** — remove "the pitch sweep over every remaining spot" from
  4d's list and say where it went. Leave HDRI, GLTF, PBR/KTX2, the `18.webp`
  rattan set and the `sky` key on the other two apartments with 4d, untouched.
- **A new 4e row** in the plan table: what this branch did, its branch name, its
  `?v=` range, its gate readings, its `poseVerified` counts, and the rejected
  method.
- **The `poseVerified` counts, by search rather than from memory.** This document
  has had the same figures corrected four times and each earlier sweep missed
  sites:

```bash
grep -rn "poseVerified\|of 11\|of 13" docs/ CLAUDE.md
```

- [ ] **Step 6: Update `docs/superpowers/metrics/README.md`**

The new baselines with their populations, the measured noise band with its
per-spot spread, the two-camera finding with its table of frame shapes, and a
narrated entry for the rejected method — including that its synthetic tests pass
and prove only the algebra. State plainly that the branch's movement is an
instrument correction.

- [ ] **Step 7: Run the checkers**

```bash
python tools/checks/stale_claims.py
python -m pytest tools/tests/test_pitch_fit.py -v
```

`stale_claims.py` fails open in seven known places, all recorded in its own
docstring, and plan 5 owns fixing them. **A green run is weak evidence — read
your own edits as well.** In particular it will not look at any file outside its
five hardcoded `FILES`, so nothing it prints says anything about the new metrics
JSONs.

- [ ] **Step 8: Clean up and commit**

```bash
git worktree remove ../airbnb-base
git add CLAUDE.md docs/PHASE-B-RESUME.md docs/superpowers/metrics/
git commit -m "Plan 4e closing gate, the record, and the 4d routing corrected"
```

---

## Self-review notes

**Spec coverage.** The instrument and its honest limits → task 1. The measured
noise band, the level baseline and the gate BASE → task 2. serenity's 11 spots,
the four outcomes, the `poseVerified` re-review and the cross-check of the two
shipped values → task 3. kings-court's 13 spots and the lens evidence → task 4.
Gate, docs, counts and routing → task 5. The spec's degradation table is enforced
by construction: no `pitch` key is written for any outcome other than
`tilt-confirmed`, and the shipped absent-key and non-finite paths are never
edited.

**Deliberately not here.** `meta.photoFovLong` — evidence gathered, constant left
alone (task 4 step 6). `mainCeilH`, serenity's sofa and bedroom, kings-court's
Bathroom 2 mirroring and entry-hall wardrobe, the ΔE noise floor,
`stale_claims.py`'s seven gaps, the cache headers — all plan 5's. HDRI, GLTF,
PBR/KTX2, the `18.webp` rattan set and the `sky` key on the other two apartments
— all still 4d's. The wall lightmap atlas stays unowned.

**Where this plan is most likely to go wrong.**

1. **Trusting the proposal because a script printed it.** It has been measured
   wrong at high confidence and right at low confidence. Every task that consumes
   it pairs it with a named landmark, and no step in this plan takes the
   proposal's output as its only input. If a task finds itself skipping the
   naming, it has turned a measurement into an automation.
2. **Furniture that differs between render and photograph.** Already demonstrated
   on `2.webp`. The defence is that the landmark must be *named* — a reviewer
   says which physical feature they are matching — and a feature nobody can name
   in both frames is the `no-usable-landmark` outcome, not a value.
3. **Scope.** Twenty-four spots across two apartments, every one in a file the
   gate reads. Task 2 captures BASE before a single value is written, and every
   reading is paired same-session, because the alternative is a number nobody can
   attribute.
