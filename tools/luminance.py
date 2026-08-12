"""Mean relative luminance (linear-light, Rec.709 weights) over the 11
serenity compare spots, for three image sets: two render sets found in
tools/shots/<label>/ and the real photographs in tour/photos/<apt>/.

This is a diagnostic, not a scoring gate: unlike ΔE2000 (which is
direction-blind -- a uniformly too-dark render and a uniformly too-bright
one can score the same), mean luminance directly answers "brighter or
darker," which is what matters before AO (darkens) and tone mapping
(later tasks) get layered on top.

Run: python tools/luminance.py --apt serenity --sets current_v48 pretask3_385a17a
"""
import argparse
import json
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def mean_luminance(path):
    im = Image.open(path).convert('RGB')
    arr = np.asarray(im, dtype=np.float64) / 255.0
    m = arr <= 0.04045
    lin = np.where(m, arr / 12.92, ((arr + 0.055) / 1.055) ** 2.4)
    Y = 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]
    return float(Y.mean())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apt', required=True)
    ap.add_argument('--sets', nargs='+', required=True,
                     help='subfolder names under tools/shots/ holding render_<apt>_<file>.jpg')
    args = ap.parse_args()

    cfg = json.load(open(os.path.join(ROOT, 'tour', 'apartments', args.apt + '.json'),
                         encoding='utf-8'))
    spots = [s for s in cfg['photoSpots'] if s.get('compare')]

    results = {}
    for label in args.sets:
        vals = []
        for s in spots:
            p = os.path.join(ROOT, 'tools', 'shots', label,
                              'render_%s_%s' % (args.apt, s['file'].replace('.webp', '.jpg')))
            vals.append(mean_luminance(p))
        results[label] = sum(vals) / len(vals)

    photo_vals = []
    for s in spots:
        p = os.path.join(ROOT, 'tour', cfg['meta']['photoBase'], s['file'])
        photo_vals.append(mean_luminance(p))
    results['photographs'] = sum(photo_vals) / len(photo_vals)

    for label, v in results.items():
        print('%-20s mean luminance %.4f' % (label, v))


if __name__ == '__main__':
    main()
