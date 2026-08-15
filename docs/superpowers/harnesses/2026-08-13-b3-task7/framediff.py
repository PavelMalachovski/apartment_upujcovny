"""Per-frame BASE-vs-HEAD difference, against a HEAD-vs-HEAD control.

The control is the point of this script.  `materials.js` randomises its
procedural textures on every page load, so a straight BASE-vs-HEAD pixel diff
of two loads mixes plan 3's effect with that randomisation.  Capturing HEAD
twice and diffing it against itself gives the randomisation's own magnitude on
each frame, and only the ratio between the two is evidence of anything.

It also writes an amplified signed map per frame (red = HEAD darker, blue =
HEAD brighter).  Those maps are what show *where* the change lands: on floors,
ceilings and furniture contact, and not on flat wall faces -- which is what
`bake.js` predicts, since `bakeWalls()` calls
`lightAt(P, N, occ, data, false, false)`, i.e. `sampled` false and no `ambFn`,
so walls take the flat `AMB_RGB` on both trees.

Capture the three frame sets with look.mjs first:

    FRAMES_ONLY=1 TOUR_BASE=http://localhost:8743/ node look.mjs <apt> <dir>/base
    TOUR_BASE=http://localhost:8742/ node look.mjs <apt> <dir>/head
    FRAMES_ONLY=1 TOUR_BASE=http://localhost:8742/ node look.mjs <apt> <dir>/head2

then:

    python framediff.py <apt> <baseDir> <headDir> <head2Dir> [mapDir]

The PNGs are deliberately not committed -- ~50 MB, and every one regenerates
from look.mjs.  `framediff-t7.json` is.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
apt, base, head, head2 = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
mapdir = sys.argv[5] if len(sys.argv) > 5 else None
AMP = 12.0


def arr(p):
    return np.asarray(Image.open(p).convert('RGB'), dtype=np.float64)


def lum(a):
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


def stats(A, B):
    ad = np.abs(B - A).mean(axis=2)
    return {'meanAbs': round(float(ad.mean()), 3),
            'p99Abs': round(float(np.percentile(ad, 99)), 2),
            'maxAbs': int(ad.max())}


names = sorted(f for f in os.listdir(base)
               if f.endswith('.png') and os.path.exists(os.path.join(head, f))
               and os.path.exists(os.path.join(head2, f)))
rows = []
if mapdir:
    os.makedirs(mapdir, exist_ok=True)
for f in names:
    A, B, C = arr(os.path.join(base, f)), arr(os.path.join(head, f)), arr(os.path.join(head2, f))
    sig, ctl = stats(A, B), stats(B, C)
    rows.append({'frame': f[:-4],
                 'baseVsHead': sig, 'headVsHead_control': ctl,
                 'signalOverNoise': round(sig['meanAbs'] / ctl['meanAbs'], 2) if ctl['meanAbs'] else None,
                 'meanY_base': round(float(lum(A).mean()), 2),
                 'meanY_head': round(float(lum(B).mean()), 2)})
    print('%-24s sig %6.3f  ctl %6.3f  ratio %5.2f'
          % (f[:-4], sig['meanAbs'], ctl['meanAbs'], rows[-1]['signalOverNoise'] or 0))
    if mapdir:
        s = (lum(B) - lum(A)) * AMP
        img = np.zeros(A.shape, dtype=np.uint8)
        img[..., 0] = np.clip(-s, 0, 255)
        img[..., 2] = np.clip(s, 0, 255)
        img[..., 1] = np.clip(np.abs(s) * 0.35, 0, 255)
        Image.fromarray(img).save(os.path.join(mapdir, 'diff_' + f))

dest = os.path.join(HERE, 'framediff-t7.json')
doc = json.load(open(dest, encoding='utf-8')) if os.path.exists(dest) else {'apartments': {}}
doc['apartments'][apt] = rows
doc['method'] = ('900x560, full post chain, one frame per spawns[] entry plus the raw '
                 'top-down cutaway. meanAbs is the mean per-pixel |dRGB| over 0-255. '
                 'signalOverNoise = BASE-vs-HEAD meanAbs / HEAD-vs-HEAD meanAbs; a value '
                 'near 1 means the frame is dominated by materials.js texture '
                 'randomisation and nothing can be read from it.')
json.dump(doc, open(dest, 'w', encoding='utf-8'), indent=2)
print('wrote', dest)
