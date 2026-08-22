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
