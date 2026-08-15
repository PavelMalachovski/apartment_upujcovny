"""Full-precision all-spot mean CIEDE2000 for a capture set.

`tools/delta_e.py` rounds every per-spot value to 2 dp before averaging, so
its committed `mean` is the mean of rounded values -- which is exactly the
number the merge condition has always been read against, and the number the
committed metric files must keep.  This script answers the separate question
the noise floor is quoted at (`+/-0.039 at full precision`,
`docs/superpowers/metrics/README.md`) by averaging the UNROUNDED values.

It imports `delta_e`'s own `cell_means` and `ciede2000` unmodified and reads
`tools/shots/<label>/`, so it can be re-run against any preserved set long
after the root `tools/shots/render_*` files have been overwritten.

    python fullprec.py <apt> <label> [<label> ...]
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))

from delta_e import cell_means, ciede2000          # noqa: E402

apt = sys.argv[1]
labels = sys.argv[2:]
if not labels:
    raise SystemExit('usage: python fullprec.py <apt> <label> [<label> ...]')

cfg = json.load(open(os.path.join(ROOT, 'tour', 'apartments', apt + '.json'), encoding='utf-8'))
spots = [s for s in cfg['photoSpots'] if s.get('compare')]      # ALL-SPOT population

for label in labels:
    vals = []
    for s in spots:
        render = os.path.join(ROOT, 'tools', 'shots', label,
                              'render_%s_%s' % (apt, s['file'].replace('.webp', '.jpg')))
        photo = os.path.join(ROOT, 'tour', cfg['meta']['photoBase'], s['file'])
        vals.append(ciede2000(cell_means(render), cell_means(photo)))
    full = sum(vals) / len(vals)
    rounded = sum(round(v, 2) for v in vals) / len(vals)
    print('%-30s n=%2d  full-precision mean %.4f   mean-of-rounded %.4f'
          % (label, len(vals), full, rounded))
