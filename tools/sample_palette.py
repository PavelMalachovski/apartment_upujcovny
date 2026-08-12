"""Sample material colours out of the real photographs.

Sample points are normalised (x, y) in [0,1] over the named photo, chosen
by eye on a flat, evenly lit patch of the material. Prints a `palette`
block to paste into the apartment config.

Run: python tools/sample_palette.py --apt serenity
"""
import argparse
import json
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# material key -> (photo file, x, y) with x,y normalised.
# Each point was picked by eye on an annotated crop of the source photo and
# double-checked against a zoomed crop -- see task-8-report.md for the
# sample map and the reasoning behind each point (why it was moved off the
# brief's first guess where that guess drifted onto a seam, an edge or the
# wrong surface).
SAMPLES = {
    'serenity': {
        'floorWood': ('5.webp', 0.26, 0.81),
        'wall':      ('5.webp', 0.88, 0.30),
        'ash':       ('7.webp', 0.52, 0.25),
        'sofa':      ('3.webp', 0.50, 0.45),
        'tileGray':  ('1.webp', 0.52, 0.23),
        'counter':   ('5.webp', 0.583, 0.538),
    },
}


def sample(path, x, y, r=6):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    cx, cy = int(x * w), int(y * h)
    arr = np.asarray(im, dtype=np.float64)
    patch = arr[max(0, cy - r):cy + r, max(0, cx - r):cx + r]
    med = np.median(patch.reshape(-1, 3), axis=0)
    return '#%02x%02x%02x' % tuple(int(round(v)) for v in med)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apt', required=True)
    args = ap.parse_args()
    cfg = json.load(open(os.path.join(ROOT, 'tour', 'apartments', args.apt + '.json'),
                         encoding='utf-8'))
    base = os.path.join(ROOT, 'tour', cfg['meta']['photoBase'])
    out = {}
    for key, (f, x, y) in SAMPLES[args.apt].items():
        out[key] = sample(os.path.join(base, f), x, y)
        print('%-12s %s   (from %s)' % (key, out[key], f))
    print()
    print('"palette": ' + json.dumps(out, indent=2))


if __name__ == '__main__':
    main()
