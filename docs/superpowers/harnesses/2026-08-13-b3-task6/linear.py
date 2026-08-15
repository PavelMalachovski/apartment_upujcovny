"""Task 6's re-measurement of the gated quantity: linear-domain mean, 5th
percentile and contrast on serenity's poseVerified `compare` spots, at full
precision.

Uses tools/luminance.py's own estimator, so this is the same number the
criterion is applied to -- it exists only because luminance.py prints four
decimals and the contrast has to be the ratio of the UNROUNDED aggregates,
which is the derivation the task 5 harness README names.

Capture the sets first with task 5's shots.mjs, e.g.

    node ../2026-08-13-b3-task5/shots.mjs t6-after-1  ok
    node ../2026-08-13-b3-task5/shots.mjs t6-before-1 missing   # pack moved aside

Then, from this directory:

    python linear.py t6-before-1 t6-before-2 t6-after-1 t6-after-2
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))

from luminance import luminance_stats            # noqa: E402
from delta_e import scorable                     # noqa: E402

APT = 'serenity'

cfg = json.load(open(os.path.join(ROOT, 'tour', 'apartments', APT + '.json'), encoding='utf-8'))
compare = [s for s in cfg['photoSpots'] if s.get('compare')]
spots = [s for s in compare if scorable(s)]
print('population: %d of %d compare-flagged spots -> %s'
      % (len(spots), len(compare), [s['file'] for s in spots]))

out = {}
for label in sys.argv[1:]:
    per = []
    for s in spots:
        p = os.path.join(ROOT, 'tools', 'shots', label,
                         'render_%s_%s' % (APT, s['file'].replace('.webp', '.jpg')))
        m, p5 = luminance_stats(p)
        per.append({'file': s['file'], 'mean': m, 'p5': p5})
    mean = sum(x['mean'] for x in per) / len(per)
    p5 = sum(x['p5'] for x in per) / len(per)
    out[label] = {'mean': mean, 'p5': p5, 'contrast': mean / p5, 'perSpot': per}

per = []
for s in spots:
    p = os.path.join(ROOT, 'tour', cfg['meta']['photoBase'], s['file'])
    m, p5 = luminance_stats(p)
    per.append({'file': s['file'], 'mean': m, 'p5': p5})
mean = sum(x['mean'] for x in per) / len(per)
p5 = sum(x['p5'] for x in per) / len(per)
out['photographs'] = {'mean': mean, 'p5': p5, 'contrast': mean / p5, 'perSpot': per}

for label, v in out.items():
    print('%-16s mean %.6f  p5 %.6f  contrast %.4f' % (label, v['mean'], v['p5'], v['contrast']))
json.dump(out, open(os.path.join(HERE, 'linear.json'), 'w'), indent=2)
print('wrote linear.json')
