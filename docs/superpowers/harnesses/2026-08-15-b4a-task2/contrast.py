"""Linear-domain mean, p5 and CONTRAST on serenity's poseVerified `compare`
spots -- the exact quantity plan 4a task 2's exit criterion is applied to
(GO if contrast >= 4.32).

This is phase B3 task 6's linear.py, unchanged in method and re-committed
here so task 2's numbers can be re-derived from a checkout without reaching
into another task's directory. It uses tools/luminance.py's own estimator,
because luminance.py PRINTS four decimals while the contrast has to be the
ratio of the UNROUNDED aggregates -- the derivation the task 5 harness
README names.

POPULATION WARNING, and it is the whole reason this file prints the spot
list before anything else: `scorable()` requires poseVerified, and serenity
has exactly TWO such spots -- 1.webp (Bathroom) and 11.webp (Bedroom), both
among the brightest rooms in the flat. The darkest spawn (Entrance) is not
in this population at all. The criterion still rests on this number and
only this number; the spawn-pooled p5 in the metrics files is the second
reading that exists so a verdict measured on two bright rooms is not
written into the record as "walls do not help" full stop.

CAMERA: the sets must have been captured under ?measure=1&fov=legacy.
Nothing in this file can check that -- it reads JPEGs off disk -- so the
capture label is expected to say `legacy` and the metrics file records the
camera explicitly beside every number.

    python contrast.py <label> [<label> ...]

Each label is a folder under tools/shots/ holding
render_serenity_<n>.jpg. Writes contrast.json beside this file.
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
    flag = ''
    if label != 'photographs':
        flag = '   GO' if v['contrast'] >= 4.32 else '   NO-GO'
    print('%-40s mean %.6f  p5 %.6f  contrast %.4f%s'
          % (label, v['mean'], v['p5'], v['contrast'], flag))

dest = os.path.join(HERE, 'contrast.json')
prev = {}
if os.path.exists(dest):
    prev = json.load(open(dest, encoding='utf-8'))
prev.update(out)
json.dump(prev, open(dest, 'w', encoding='utf-8'), indent=2)
print('wrote', dest)
