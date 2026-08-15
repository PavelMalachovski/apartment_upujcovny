"""Linear-domain mean, 5th percentile and contrast, at full precision, for any
apartment and any number of capture sets.

Task 6's `../2026-08-13-b3-task6/linear.py` generalised from serenity to an
`--apt` argument; the estimator is still `tools/luminance.py`'s own
`luminance_stats`, and the population is still the one `tools/luminance.py`
hard-codes -- `compare` spots that pass `delta_e.scorable`, i.e. poseVerified.
That population is 2 of 11 on serenity and 8 of 14 on kings-court, and
horkyone-10 has NO compare-flagged spots at all, so the linear domain is
undefined for it.  The population is printed on every run and written into the
output, because quoting a linear number without it is how this metric gets
misread.

It exists at all because `tools/luminance.py` prints four decimals while
contrast has to be the ratio of the UNROUNDED aggregates.

**This is the linear-light domain and is NOT comparable to the spawn-pooled
sRGB 0-255 numbers from `spawnlum.mjs`.** Different transfer function,
different population, different cameras. Never put them in one table.

Capture the sets first with task 5's shots.mjs, e.g.

    TOUR_BASE=http://localhost:8742/ node ../2026-08-13-b3-task5/shots.mjs t7-after-serenity  any serenity
    TOUR_BASE=http://localhost:8743/ node ../2026-08-13-b3-task5/shots.mjs t7-before-serenity any serenity

Then, from this directory:

    python linear7.py --apt serenity --sets t7-before-serenity t7-after-serenity
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))

from luminance import luminance_stats            # noqa: E402
from delta_e import scorable                     # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--apt', required=True)
ap.add_argument('--sets', nargs='+', required=True)
ap.add_argument('--out', default=None)
args = ap.parse_args()

cfg = json.load(open(os.path.join(ROOT, 'tour', 'apartments', args.apt + '.json'),
                     encoding='utf-8'))
compare = [s for s in cfg['photoSpots'] if s.get('compare')]
if not compare:
    raise SystemExit('apartment "%s" has no compare-flagged photo spots -- the '
                     'linear-domain diagnostic is undefined for it' % args.apt)
spots = [s for s in compare if scorable(s)]
if not spots:
    raise SystemExit('no poseVerified compare spots for "%s"' % args.apt)
population = '%d of %d compare-flagged spots (poseVerified filter, hard-coded '
population = (population % (len(spots), len(compare))) + 'in tools/luminance.py)'
print('population: ' + population + ' -> ' + str([s['file'] for s in spots]))


def aggregate(paths_for):
    per = []
    for s in spots:
        m, p5 = luminance_stats(paths_for(s))
        per.append({'file': s['file'], 'mean': m, 'p5': p5})
    mean = sum(x['mean'] for x in per) / len(per)
    p5 = sum(x['p5'] for x in per) / len(per)
    return {'mean': mean, 'p5': p5, 'contrast': mean / p5, 'perSpot': per}


out = {'apartment': args.apt, 'domain': 'linear-light Rec.709 relative luminance',
       'population': population, 'sets': {}}
for label in args.sets:
    out['sets'][label] = aggregate(
        lambda s, label=label: os.path.join(
            ROOT, 'tools', 'shots', label,
            'render_%s_%s' % (args.apt, s['file'].replace('.webp', '.jpg'))))
out['sets']['photographs'] = aggregate(
    lambda s: os.path.join(ROOT, 'tour', cfg['meta']['photoBase'], s['file']))

for label, v in out['sets'].items():
    print('%-26s mean %.6f  p5 %.6f  contrast %.4f' % (label, v['mean'], v['p5'], v['contrast']))
dest = args.out or os.path.join(HERE, 'linear-%s.json' % args.apt)
json.dump(out, open(dest, 'w', encoding='utf-8'), indent=2)
print('wrote', dest)
