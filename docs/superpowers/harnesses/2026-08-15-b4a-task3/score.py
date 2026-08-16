"""Phase B plan 4a task 3 — the fit instrument.

For one captured render set (tools/shots/<label>/render_<apt>_<file>.jpg) this
prints, in ONE pass over the same bytes, all four numbers the fit and its
diagnostics need:

    * mean and p5 linear-light relative luminance (Rec.709), and
    * mean CIEDE2000 against the real photographs,

each over BOTH populations: **all-spot** (every `compare`-flagged spot, the
population this task fits and gates on) and **poseVerified** (the subset
tools/luminance.py hard-codes, carried only as a diagnostic).

Why this exists rather than tools/luminance.py: luminance.py applies
delta_e.py's `scorable()` filter unconditionally, so it can only report the
poseVerified population. Task 3's binding constraint is that the fit and the
gate both run on the all-spot population. The luminance maths here is
luminance.py's `luminance_stats` verbatim (same sRGB EOTF, same Rec.709
weights) and the deltaE is delta_e.py's own `cell_means`/`ciede2000`, imported
rather than re-implemented, so a row from this script and a row from those
tools are the same measurement on the same pixels.

    python score.py --apt serenity --label t3-serenity-fixedfov-bloomOff-e0.329
    python score.py --apt serenity --label ... --json      # machine-readable
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                    '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))

from delta_e import cell_means, ciede2000, scorable   # noqa: E402


def luminance_stats(path):
    """Verbatim from tools/luminance.py — mean and p5 linear-light Rec.709 Y."""
    im = Image.open(path).convert('RGB')
    arr = np.asarray(im, dtype=np.float64) / 255.0
    m = arr <= 0.04045
    lin = np.where(m, arr / 12.92, ((arr + 0.055) / 1.055) ** 2.4)
    Y = 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]
    return float(Y.mean()), float(np.percentile(Y, 5))


def load_cfg(apt):
    return json.load(open(os.path.join(ROOT, 'tour', 'apartments', apt + '.json'),
                          encoding='utf-8'))


def photo_path(cfg, spot):
    return os.path.join(ROOT, 'tour', cfg['meta']['photoBase'], spot['file'])


def render_path(apt, label, spot):
    return os.path.join(ROOT, 'tools', 'shots', label,
                        'render_%s_%s' % (apt, spot['file'].replace('.webp', '.jpg')))


def measure(apt, label):
    cfg = load_cfg(apt)
    spots = [s for s in cfg['photoSpots'] if s.get('compare')]
    rows = []
    for s in spots:
        rp = render_path(apt, label, s)
        if not os.path.exists(rp):
            raise SystemExit('missing render: %s' % rp)
        if os.path.getsize(rp) == 0:
            raise SystemExit('zero-byte render (sandboxed save endpoint?): %s' % rp)
        rm, rp5 = luminance_stats(rp)
        pm, pp5 = luminance_stats(photo_path(cfg, s))
        de = ciede2000(cell_means(rp), cell_means(photo_path(cfg, s)))
        rows.append({
            'file': s['file'], 'name': s.get('name', ''),
            'poseVerified': bool(scorable(s)),
            'renderMeanLum': round(rm, 4), 'renderP5Lum': round(rp5, 4),
            'photoMeanLum': round(pm, 4), 'photoP5Lum': round(pp5, 4),
            'deltaE': round(de, 2),
        })
    return cfg, rows


def pool(rows, key):
    return round(sum(r[key] for r in rows) / len(rows), 4)


def summarise(apt, label, rows):
    out = {'apartment': apt, 'label': label,
           'compareTotal': len(rows), 'populations': {}}
    for name, sel in (('all-spot', rows),
                      ('poseVerified', [r for r in rows if r['poseVerified']])):
        if not sel:
            continue
        rmean, pmean = pool(sel, 'renderMeanLum'), pool(sel, 'photoMeanLum')
        out['populations'][name] = {
            'n': len(sel),
            'renderMeanLum': rmean,
            'photoMeanLum': pmean,
            'diffFromPhotographs': round(rmean - pmean, 4),
            'absDiffFromPhotographs': round(abs(rmean - pmean), 4),
            'renderP5Lum': pool(sel, 'renderP5Lum'),
            'photoP5Lum': pool(sel, 'photoP5Lum'),
            'dE2000': round(sum(r['deltaE'] for r in sel) / len(sel), 2),
        }
    out['spots'] = rows
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apt', required=True)
    ap.add_argument('--label', required=True)
    ap.add_argument('--json', action='store_true')
    args = ap.parse_args()
    _, rows = measure(args.apt, args.label)
    res = summarise(args.apt, args.label, rows)
    if args.json:
        print(json.dumps(res))
        return
    print('%s  %s  (%d compare spots)' % (args.apt, args.label, res['compareTotal']))
    for name, p in res['populations'].items():
        print('  %-13s n=%-3d render mean %.4f  photographs %.4f  '
              'diff %+.4f  |diff| %.4f  renderP5 %.4f  photoP5 %.4f  dE2000 %.2f'
              % (name, p['n'], p['renderMeanLum'], p['photoMeanLum'],
                 p['diffFromPhotographs'], p['absDiffFromPhotographs'],
                 p['renderP5Lum'], p['photoP5Lum'], p['dE2000']))


if __name__ == '__main__':
    main()
