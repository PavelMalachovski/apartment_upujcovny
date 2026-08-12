"""Where does the residual dE2000 actually live?

Task 7 removed the lightness error. Task 8 showed that sampling six material
colours out of the photographs does not touch what remains. This asks a
different question: is the residual a GLOBAL colour cast -- the same shape of
problem exposure turned out to be -- or is it distributed content error that
no global correction can reach?

Matches tools/delta_e.py's conventions: ROOT is resolved from this file's own
path (not the caller's cwd), so it runs the same way regardless of where you
invoke it from, and a missing render fails with the same clear "run
window.__measure() first" message rather than a raw FileNotFoundError.

Run: python tools/residual.py --apt serenity
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image  # noqa: F401  (imported for parity/side effects with delta_e's PIL usage)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from delta_e import srgb_to_lab, ciede2000, cell_means, GRID  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apt', default='serenity',
                     help='apartment id (default: serenity -- currently the '
                          'only apartment with compare-flagged photo spots)')
    args = ap.parse_args()

    cfg = json.load(open(os.path.join(ROOT, 'tour', 'apartments', args.apt + '.json'),
                        encoding='utf-8'))
    spots = [s for s in cfg['photoSpots'] if s.get('compare')]
    if not spots:
        raise SystemExit(
            'no compare-flagged photo spots for apartment "%s" -- this '
            'decomposition only exists for apartments with photographs '
            'flagged `compare` in their photoSpots (currently just '
            'serenity)' % args.apt)

    rows = []
    for s in spots:
        photo = os.path.join(ROOT, 'tour', cfg['meta']['photoBase'], s['file'])
        render = os.path.join(ROOT, 'tools', 'shots',
                              'render_%s_%s' % (args.apt, s['file'].replace('.webp', '.jpg')))
        if not os.path.exists(render):
            raise SystemExit('missing render: %s -- run window.__measure() first' % render)
        lp = cell_means(photo)      # (8,8,3) Lab
        lr = cell_means(render)
        rows.append((s['file'], s.get('name', ''), lr, lp))

    print('%-9s %-15s %7s %7s %7s %7s %7s' %
          ('file', 'room', 'dL', 'da', 'db', 'dE', 'dE_noAB'))
    dLs, das, dbs = [], [], []
    for f, name, lr, lp in rows:
        dL = float(np.mean(lr[..., 0] - lp[..., 0]))
        da = float(np.mean(lr[..., 1] - lp[..., 1]))
        db = float(np.mean(lr[..., 2] - lp[..., 2]))
        de = ciede2000(lr, lp)
        # what would dE be if we removed the MEAN a/b offset from the render?
        lr2 = lr.copy()
        lr2[..., 1] -= da
        lr2[..., 2] -= db
        de2 = ciede2000(lr2, lp)
        dLs.append(dL); das.append(da); dbs.append(db)
        print('%-9s %-15s %+7.2f %+7.2f %+7.2f %7.2f %7.2f' %
              (f, name[:15], dL, da, db, de, de2))

    print()
    print('mean offsets across spots:  dL %+.2f   da %+.2f   db %+.2f' %
          (np.mean(dLs), np.mean(das), np.mean(dbs)))
    print('spread (std):               dL  %.2f   da  %.2f   db  %.2f' %
          (np.std(dLs), np.std(das), np.std(dbs)))

    # Global correction: subtract the ACROSS-ALL-SPOTS mean a/b offset, not per-spot
    ga, gb = float(np.mean(das)), float(np.mean(dbs))
    tot_before, tot_after = [], []
    for f, name, lr, lp in rows:
        tot_before.append(ciede2000(lr, lp))
        lr2 = lr.copy()
        lr2[..., 1] -= ga
        lr2[..., 2] -= gb
        tot_after.append(ciede2000(lr2, lp))
    print()
    print('mean dE2000 now:                        %.2f' % np.mean(tot_before))
    print('after ONE global a/b shift (%.2f, %.2f): %.2f' % (ga, gb, np.mean(tot_after)))
    print('  -> a single global colour correction is worth %.2f points'
          % (np.mean(tot_before) - np.mean(tot_after)))


if __name__ == '__main__':
    main()
