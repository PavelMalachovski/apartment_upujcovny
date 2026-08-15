"""Post-reveal characterisation of the six A/B pairs.

Run only AFTER calls.json is written and reveal/mapping.json is opened --
its output would defeat the blind if read earlier.

Reports, per pose: sRGB mean luma and 5th percentile with the pack off and
on, the difference and the ratio, how much of the frame is bit-unchanged,
and the tail of the per-pixel difference. Writes abdelta.json, and two
false-colour difference maps (red = pack brighter, green = darker, full
scale at 30 of 255) which are what show that the change is a fill along
the ceiling/wall perimeter and the floor near obstructions rather than a
flat offset.

The unchanged fraction is the internal control: walls carry no lightmap,
so wall pixels cannot move, and a large identical fraction is expected.

Run from this directory: python score.py
"""
import json
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
FRAMES = os.path.join(HERE, 'frames')
DIFF = os.path.join(HERE, 'diff')
os.makedirs(DIFF, exist_ok=True)
NAMES = {1: 'entrance-spawn', 2: 'entrance-floor-down', 3: 'bathroom-spawn',
         4: 'bedroom-spawn', 5: 'living-room-spawn', 6: 'kitchen-hall-spot5'}
DIFF_MAPS = (1, 6)


def luma(p):
    a = np.asarray(Image.open(p).convert('RGB'), dtype=np.float64)
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


rows = []
for i in range(1, 7):
    on = luma(os.path.join(FRAMES, 'packon', 'pose%d.png' % i))
    off = luma(os.path.join(FRAMES, 'packoff', 'pose%d.png' % i))
    d = on - off
    rows.append({
        'pose': NAMES[i],
        'meanLumaOff': round(float(off.mean()), 2),
        'meanLumaOn': round(float(on.mean()), 2),
        'meanDelta': round(float(d.mean()), 3),
        'meanRatio': round(float(on.mean() / off.mean()), 5),
        'p5Off': round(float(np.percentile(off, 5)), 2),
        'p5On': round(float(np.percentile(on, 5)), 2),
        'p5Delta': round(float(np.percentile(on, 5) - np.percentile(off, 5)), 3),
        'pctPixelsUnchanged': round(float((np.abs(d) < 0.5).mean() * 100), 1),
        'pctPixelsOver10': round(float((np.abs(d) >= 10).mean() * 100), 2),
        'pctPixelsOver25': round(float((np.abs(d) >= 25).mean() * 100), 2),
        'maxAbsDelta': round(float(np.abs(d).max()), 1),
        'p99AbsDelta': round(float(np.percentile(np.abs(d), 99)), 2),
    })
    if i in DIFF_MAPS:
        img = np.zeros(d.shape + (3,), dtype=np.uint8)
        img[..., 0] = (np.clip(d / 30.0, 0, 1) * 255).astype(np.uint8)
        img[..., 1] = (np.clip(-d / 30.0, 0, 1) * 255).astype(np.uint8)
        Image.fromarray(img).save(os.path.join(DIFF, 'diff%d.png' % i))

for r in rows:
    print('%-22s off %6.2f -> on %6.2f  (x%.5f, %+0.3f)   p5 %+0.3f   '
          'unchanged %4.1f%%  >=10: %4.1f%%  >=25: %4.2f%%  max |d| %5.1f'
          % (r['pose'], r['meanLumaOff'], r['meanLumaOn'], r['meanRatio'],
             r['meanDelta'], r['p5Delta'], r['pctPixelsUnchanged'],
             r['pctPixelsOver10'], r['pctPixelsOver25'], r['maxAbsDelta']))

json.dump(rows, open(os.path.join(HERE, 'abdelta.json'), 'w'), indent=2)
print('\nwrote abdelta.json and %d difference maps' % len(DIFF_MAPS))
