"""Assemble docs/superpowers/metrics/<apt>-b3-task7-luminance.json from the
committed inputs in this directory.

Every number in those files is read out of `spawnlum-t7-*.json`, `linear-*.json`
and `structural.json`, which are this harness's own raw outputs -- nothing is
typed in.  `--check` rebuilds them in memory and compares against what is
committed, so "derived, not transcribed" is verified rather than asserted.

    python write_metrics7.py            # write
    python write_metrics7.py --check    # verify the committed files match

The two luminance domains are kept in separate blocks on purpose.  The
spawn-pooled block is sRGB-ENCODED 0-255 over every spawns[] entry; the linear
block is linear-light Rec.709 over the poseVerified `compare` spots only.  They
are not comparable and must never be averaged or tabulated together.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
OUT = os.path.join(ROOT, 'docs', 'superpowers', 'metrics')
APTS = ['serenity', 'kings-court', 'horkyone-10']

METHOD_SPAWN = (
    'Every spawns[] entry rendered at 480x300 through the full post chain at '
    'pixelRatio 1, pixels of all spawns pooled, then mean and interpolated 5th '
    'percentile of sRGB-ENCODED luminance 0-255 (Rec.709 weights, no '
    'linearisation). Script: docs/superpowers/harnesses/2026-08-13-b3-task5/'
    'spawnlum.mjs, unchanged since task 2, run against BOTH trees over TOUR_BASE '
    '-- HEAD on :8742, the c2bb0bd worktree on :8743. NOT comparable to '
    'tools/luminance.py, which is linear-light over a different population.')
METHOD_LINEAR = (
    'Linear-light Rec.709 relative luminance via tools/luminance.py\'s own '
    'luminance_stats, over the population that tool hard-codes: compare spots '
    'passing delta_e.scorable, i.e. poseVerified. Captured with '
    '?measure=1&fov=legacy (measure.js is byte-identical between the two trees). '
    'Contrast is the ratio of the UNROUNDED aggregates. Script: linear7.py.')
CAVEAT_ISO = (
    'afterAtBeforeExposure is a DIAGNOSTIC, not a shipped state: the HEAD tree '
    'with renderer.toneMappingExposure overridden at runtime to the BASE tree\'s '
    'value, so task 2\'s geometric effect can be read at constant exposure. No '
    'apartment\'s `exposure` key was touched -- task 4 fitted those and is closed.')


def read(name):
    return json.load(open(os.path.join(HERE, name), encoding='utf-8'))


def spawn_block(label):
    d = read('spawnlum-t7-%s.json' % label)
    return {'label': label, 'exposure': d['exposure'], 'yawSingleConversion': d['yawOk'],
            'ambSampled': d.get('ambSampled'), 'issues': d['issues'],
            'meanL': d['pooled']['meanL'], 'p5L': d['pooled']['p5L'],
            'pctPixelsBelowLuma16': d['pooled']['pctPixelsBelowLuma16'],
            'contrast_mean_over_p5': d['contrast_mean_over_p5'],
            'perSpawn': d['per']}


def build(apt):
    struct = [r for r in read('structural.json')['rows'] if r['apt'] == apt]
    out = {
        'apartment': apt,
        'metric': 'plan 3\'s own claim: shadow (5th-percentile luminance) and '
                  'contrast, before plan 3 (c2bb0bd) and after (736a867)',
        'task': 'phase B plan 3, task 7 -- the gate',
        'harness': 'Playwright headless Chromium with --use-angle=d3d11 '
                   '--enable-gpu --ignore-gpu-blocklist. Without them the default '
                   'headless GPU is SwiftShader, which post.js\'s capable() '
                   'rejects, and every measurement silently has no post chain. '
                   'Both trees served simultaneously: HEAD from tools/serve.py on '
                   ':8742, a detached c2bb0bd worktree from this directory\'s '
                   'serve_base.py on :8743.',
        'spawnPooledSrgb': {
            'method': METHOD_SPAWN,
            'caveat': CAVEAT_ISO,
            'before_c2bb0bd': [spawn_block('before-' + apt), spawn_block('before-rep-' + apt)],
            'after_736a867': [spawn_block('after-' + apt), spawn_block('after-rep-' + apt)],
            'afterAtBeforeExposure': spawn_block('after-iso-' + apt)
        },
        'structural': [{'profile': r['profile'], 'budget': r['budget'], 'pass': r['ok'],
                        'callsStart': r['callsStart'], 'callsSpawn0': r['callsSpawn0'],
                        'selfTest': r['selfTest'], 'ambSampled': r['ambSampled'],
                        'issues': r['issues'], 'consoleErrors': len(r['errors']),
                        'dpr': r['dpr'], 'buffer': r['buffer']} for r in struct]
    }
    for r in struct:
        if r['profile'] == 'desktop':
            out['structural_skyLeak'] = r['sky']
            out['structural_walk'] = r['walk']
    lin = os.path.join(HERE, 'linear-%s.json' % apt)
    if os.path.exists(lin):
        d = json.load(open(lin, encoding='utf-8'))
        out['linearLight'] = {'method': METHOD_LINEAR, 'population': d['population'],
                              'sets': {k: {kk: vv for kk, vv in v.items() if kk != 'perSpot'}
                                       for k, v in d['sets'].items()},
                              'perSpot': {k: v['perSpot'] for k, v in d['sets'].items()}}
    else:
        out['linearLight'] = {
            'method': METHOD_LINEAR,
            'population': 'UNDEFINED -- horkyone-10 has no compare-flagged photo '
                          'spots at all, so tools/luminance.py exits before '
                          'scoring anything. The linear domain does not exist for '
                          'this apartment; only the spawn-pooled block above does.'}
    return out


check = '--check' in sys.argv
bad = 0
for apt in APTS:
    built = build(apt)
    dest = os.path.join(OUT, '%s-b3-task7-luminance.json' % apt)
    if check:
        if not os.path.exists(dest):
            print('MISSING  ' + dest)
            bad += 1
            continue
        have = json.load(open(dest, encoding='utf-8'))
        same = have == built
        print(('OK       ' if same else 'DIFFERS  ') + os.path.basename(dest))
        bad += 0 if same else 1
    else:
        json.dump(built, open(dest, 'w', encoding='utf-8'), indent=2)
        print('wrote', dest)
sys.exit(1 if bad else 0)
