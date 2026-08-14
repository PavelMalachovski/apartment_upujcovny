"""Score renders against the real photographs.

Mean CIEDE2000 over an 8x8 grid of cell mean colours. The grid makes the
measure robust to small misalignment while staying sensitive to colour and
tonal distribution, which is what phase A actually changes.

The absolute value is meaningless: render and photograph differ in lens,
exposure and furniture model. Only the trend across phases carries
information.

Run: python tools/delta_e.py --apt serenity --phase baseline
Add --all-spots to bypass the poseVerified filter and score every
compare-flagged spot instead -- this is the population PR #27's merge gate
(serenity <=16.58, kings-court <=22.44) was actually set against, per
docs/superpowers/metrics/README.md, "What this means for the merge
condition". The default stays poseVerified-filtered.
"""
import argparse
import json
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRID = 8


def srgb_to_lab(rgb):
    """rgb: float array in [0,1], shape (..., 3) -> CIE Lab, D65."""
    m = rgb <= 0.04045
    lin = np.where(m, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    mat = np.array([[0.4124564, 0.3575761, 0.1804375],
                    [0.2126729, 0.7151522, 0.0721750],
                    [0.0193339, 0.1191920, 0.9503041]])
    xyz = lin @ mat.T
    white = np.array([0.95047, 1.0, 1.08883])
    t = xyz / white
    d = 6.0 / 29.0
    f = np.where(t > d ** 3, np.cbrt(t), t / (3 * d * d) + 4.0 / 29.0)
    L = 116 * f[..., 1] - 16
    a = 500 * (f[..., 0] - f[..., 1])
    b = 200 * (f[..., 1] - f[..., 2])
    return np.stack([L, a, b], axis=-1)


def ciede2000(lab1, lab2):
    """Mean CIEDE2000 between two arrays of Lab colours."""
    L1, a1, b1 = lab1[..., 0], lab1[..., 1], lab1[..., 2]
    L2, a2, b2 = lab2[..., 0], lab2[..., 1], lab2[..., 2]
    C1 = np.hypot(a1, b1)
    C2 = np.hypot(a2, b2)
    Cbar = (C1 + C2) / 2
    G = 0.5 * (1 - np.sqrt(Cbar ** 7 / (Cbar ** 7 + 25.0 ** 7 + 1e-12)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = np.hypot(a1p, b1), np.hypot(a2p, b2)
    h1p = np.degrees(np.arctan2(b1, a1p)) % 360
    h2p = np.degrees(np.arctan2(b2, a2p)) % 360
    dLp = L2 - L1
    dCp = C2p - C1p
    dhp = h2p - h1p
    dhp = np.where(dhp > 180, dhp - 360, np.where(dhp < -180, dhp + 360, dhp))
    dhp = np.where(C1p * C2p == 0, 0.0, dhp)
    dHp = 2 * np.sqrt(C1p * C2p) * np.sin(np.radians(dhp / 2))
    Lbp = (L1 + L2) / 2
    Cbp = (C1p + C2p) / 2
    hsum = h1p + h2p
    hdiff = np.abs(h1p - h2p)
    hbp = np.where(C1p * C2p == 0, hsum,
                   np.where(hdiff <= 180, hsum / 2,
                            np.where(hsum < 360, (hsum + 360) / 2, (hsum - 360) / 2)))
    T = (1 - 0.17 * np.cos(np.radians(hbp - 30))
         + 0.24 * np.cos(np.radians(2 * hbp))
         + 0.32 * np.cos(np.radians(3 * hbp + 6))
         - 0.20 * np.cos(np.radians(4 * hbp - 63)))
    dtheta = 30 * np.exp(-(((hbp - 275) / 25) ** 2))
    Rc = 2 * np.sqrt(Cbp ** 7 / (Cbp ** 7 + 25.0 ** 7 + 1e-12))
    Sl = 1 + (0.015 * (Lbp - 50) ** 2) / np.sqrt(20 + (Lbp - 50) ** 2)
    Sc = 1 + 0.045 * Cbp
    Sh = 1 + 0.015 * Cbp * T
    Rt = -np.sin(np.radians(2 * dtheta)) * Rc
    de = np.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2
                 + Rt * (dCp / Sc) * (dHp / Sh))
    return float(np.mean(de))


def cell_means(path):
    im = Image.open(path).convert('RGB').resize((GRID * 16, GRID * 16), Image.LANCZOS)
    arr = np.asarray(im, dtype=np.float64) / 255.0
    arr = arr.reshape(GRID, 16, GRID, 16, 3).mean(axis=(1, 3))
    return srgb_to_lab(arr)


def scorable(spot):
    """Spots whose render and photograph show the same subject.

    A spot that fails pose verification photographs one thing and renders
    another, so scoring it measures the mismatch rather than the render.
    Absent key means verified: an unclassified apartment keeps its old
    behaviour instead of silently scoring nothing.
    """
    return spot.get('compare') and spot.get('poseVerified', True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apt', required=True)
    ap.add_argument('--phase', required=True)
    ap.add_argument('--all-spots', action='store_true',
                     help='bypass the poseVerified filter and score every '
                          'compare-flagged spot -- reproduces the population '
                          'the PR #27 merge gate was set on, not the default '
                          'poseVerified-filtered one')
    args = ap.parse_args()

    cfg = json.load(open(os.path.join(ROOT, 'tour', 'apartments', args.apt + '.json'),
                         encoding='utf-8'))
    compare_spots = [s for s in cfg['photoSpots'] if s.get('compare')]
    if not compare_spots:
        raise SystemExit(
            'no compare-flagged photo spots for apartment "%s" -- this '
            'metric only exists for apartments with photographs flagged '
            '`compare` in their photoSpots' % args.apt)
    population = 'all-spot' if args.all_spots else 'poseVerified'
    if args.all_spots:
        spots = compare_spots
        skipped = 0
        print('scoring %d of %d compare-flagged spots -- ALL-SPOT population '
              '(poseVerified filter bypassed via --all-spots)'
              % (len(spots), len(compare_spots)))
    else:
        spots = [s for s in compare_spots if scorable(s)]
        skipped = len(compare_spots) - len(spots)
        print('scoring %d of %d compare-flagged spots -- poseVerified population '
              '(%d skipped: failed pose verification)'
              % (len(spots), len(compare_spots), skipped))
    if not spots:
        raise SystemExit(
            'all %d compare-flagged spots for apartment "%s" failed pose '
            'verification -- nothing left to score' % (len(compare_spots), args.apt))
    rows = []
    for s in spots:
        photo = os.path.join(ROOT, 'tour', cfg['meta']['photoBase'], s['file'])
        render = os.path.join(ROOT, 'tools', 'shots',
                              'render_%s_%s' % (args.apt, s['file'].replace('.webp', '.jpg')))
        if not os.path.exists(render):
            raise SystemExit('missing render: %s -- run window.__measure() first' % render)
        de = ciede2000(cell_means(render), cell_means(photo))
        rows.append({'file': s['file'], 'name': s.get('name', ''), 'deltaE': round(de, 2)})
        print('%-10s %-16s dE2000 %6.2f' % (s['file'], s.get('name', ''), de))

    mean = round(sum(r['deltaE'] for r in rows) / len(rows), 2)
    print('mean dE2000 (%s population): %.2f' % (population, mean))

    out_dir = os.path.join(ROOT, 'docs', 'superpowers', 'metrics')
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, '%s-%s.json' % (args.apt, args.phase))
    json.dump({
        'apartment': args.apt,
        'phase': args.phase,
        'population': population,
        'mean': mean,
        'spots': rows,
        'scored': len(spots),
        'compareTotal': len(compare_spots),
        'skippedPoseVerification': skipped,
        'caveat': ('Absolute values are meaningless: render and photograph differ in '
                   'lens, exposure and furniture model. Only the trend between phases '
                   'carries information.')
    }, open(out, 'w', encoding='utf-8'), indent=2)
    print('wrote', out)


if __name__ == '__main__':
    main()
