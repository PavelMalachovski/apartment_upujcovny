"""Mean and 5th-percentile relative luminance (linear-light, Rec.709
weights) over an apartment's pose-verified `compare` spots, for any number
of render sets found in tools/shots/<label>/ plus the real photographs in
tour/photos/<apt>/.

This is a diagnostic, not a scoring gate: unlike ΔE2000 (which is
direction-blind -- a uniformly too-dark render and a uniformly too-bright
one can score the same), mean luminance directly answers "brighter or
darker." The 5th percentile is reported alongside it because the mean
alone cannot tell a genuine exposure fit apart from one that hit the same
mean by crushing shadow detail -- compare p5 between a render set and the
photographs to check for that.

Run: python tools/luminance.py --apt serenity --sets a6-exposure-fit
"""
import argparse
import json
import os

import numpy as np
from PIL import Image

from delta_e import scorable

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def luminance_stats(path):
    """Returns (mean, p5) linear-light relative luminance for one image.

    p5 (5th percentile) exists to catch a fit that hits the mean by
    crushing shadow detail: a global exposure drop darkens everything,
    including regions that were already correct, and the mean alone
    cannot see that happening. p5 is the standard reporting point for
    shadow/near-black behaviour in photographic exposure work.
    """
    im = Image.open(path).convert('RGB')
    arr = np.asarray(im, dtype=np.float64) / 255.0
    m = arr <= 0.04045
    lin = np.where(m, arr / 12.92, ((arr + 0.055) / 1.055) ** 2.4)
    Y = 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]
    return float(Y.mean()), float(np.percentile(Y, 5))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apt', required=True)
    ap.add_argument('--sets', nargs='+', required=True,
                     help='subfolder names under tools/shots/ holding render_<apt>_<file>.jpg')
    args = ap.parse_args()

    cfg = json.load(open(os.path.join(ROOT, 'tour', 'apartments', args.apt + '.json'),
                         encoding='utf-8'))
    compare_spots = [s for s in cfg['photoSpots'] if s.get('compare')]
    if not compare_spots:
        raise SystemExit(
            'no compare-flagged photo spots for apartment "%s" -- this '
            'diagnostic only exists for apartments with photographs flagged '
            '`compare` in their photoSpots' % args.apt)
    spots = [s for s in compare_spots if scorable(s)]
    skipped = len(compare_spots) - len(spots)
    print('scoring %d of %d compare-flagged spots (%d skipped: failed pose verification)'
          % (len(spots), len(compare_spots), skipped))
    if not spots:
        raise SystemExit(
            'all %d compare-flagged spots for apartment "%s" failed pose '
            'verification -- nothing left to score' % (len(compare_spots), args.apt))

    results = {}
    for label in args.sets:
        means, p5s = [], []
        for s in spots:
            p = os.path.join(ROOT, 'tools', 'shots', label,
                              'render_%s_%s' % (args.apt, s['file'].replace('.webp', '.jpg')))
            m, p5 = luminance_stats(p)
            means.append(m)
            p5s.append(p5)
        results[label] = (sum(means) / len(means), sum(p5s) / len(p5s))

    photo_means, photo_p5s = [], []
    for s in spots:
        p = os.path.join(ROOT, 'tour', cfg['meta']['photoBase'], s['file'])
        m, p5 = luminance_stats(p)
        photo_means.append(m)
        photo_p5s.append(p5)
    results['photographs'] = (sum(photo_means) / len(photo_means), sum(photo_p5s) / len(photo_p5s))

    for label, (mean, p5) in results.items():
        print('%-20s mean luminance %.4f   p5 %.4f' % (label, mean, p5))


if __name__ == '__main__':
    main()
