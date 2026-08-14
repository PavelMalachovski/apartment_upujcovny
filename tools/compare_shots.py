"""Compare two directories of reference captures.

Run: python tools/compare_shots.py --a r128 --b r185
Exits non-zero if any frame differs by more than --max-mad.
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, 'tools', 'shots')


def mad(p, q):
    a = np.asarray(Image.open(p).convert('RGB'), dtype=np.float64)
    b = np.asarray(Image.open(q).convert('RGB'), dtype=np.float64)
    if a.shape != b.shape:
        raise SystemExit('size mismatch: %s %s vs %s' % (p, a.shape, b.shape))
    return float(np.abs(a - b).mean())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--a', required=True)
    ap.add_argument('--b', required=True)
    ap.add_argument('--max-mad', type=float, default=2.0)
    args = ap.parse_args()

    da = os.path.join(SHOTS, args.a)
    db = os.path.join(SHOTS, args.b)
    names = sorted(os.listdir(da))
    if not names:
        raise SystemExit('no frames in %s' % da)

    worst, failures = 0.0, 0
    for n in names:
        q = os.path.join(db, n)
        if not os.path.exists(q):
            print('%-44s MISSING in %s' % (n, args.b))
            failures += 1
            continue
        m = mad(os.path.join(da, n), q)
        worst = max(worst, m)
        flag = 'FAIL' if m > args.max_mad else 'ok'
        if m > args.max_mad:
            failures += 1
        print('%-44s MAD %6.2f  %s' % (n, m, flag))

    print('\n%d frames, worst MAD %.2f, threshold %.2f, %d failing'
          % (len(names), worst, args.max_mad, failures))
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
