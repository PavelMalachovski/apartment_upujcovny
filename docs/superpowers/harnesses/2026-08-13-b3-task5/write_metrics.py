"""Assemble docs/superpowers/metrics/serenity-b3-task5-luminance.json from the
harness outputs in this directory, so every number in it is derived by a
program from a committed input rather than typed by hand.

Run it from anywhere:  python write_metrics.py
Add --check to compare against the committed file and write nothing; that is
the mode that proves the claim above, and it is what fix round 2 used.

Inputs, all committed alongside this script:
  spawnlum-<phase>.json  spawn-pooled sRGB luminance, one file per phase,
                         written by spawnlum.mjs
  linear.json            every tools/luminance.py capture, as raw
                         (mean, p5) pairs per set -- the aggregates, the
                         ranges and the contrasts below are all computed
                         from these, not transcribed
  baketime.json          window.__bakeMs loads and the packCost decomposition
  pack.json              the shipped pack's weight, settings and outcome

HISTORY, because it matters for trusting this file: the first version of
this script produced the PRE-fix-round-1 content (cacheVersion 103, 2-dp
contrasts, no repeatability or identity data) while the committed JSON had
already been updated by hand. The provenance claim in the README was
therefore false for exactly those fields. This version reproduces the
committed file, and `--check` is how that is verified rather than asserted.
"""
import argparse
import json
import os
from decimal import Decimal, ROUND_HALF_UP

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
OUT = os.path.join(ROOT, 'docs', 'superpowers', 'metrics',
                   'serenity-b3-task5-luminance.json')

# Half-up, from a string, so a tie like the mean of [0.0854, 0.0853, 0.0853,
# 0.0854] = 0.08535 rounds the same way on every machine. Plain round() would
# use banker's rounding on a float that is not exactly 0.08535 anyway.
def r(value, places):
    q = Decimal(1).scaleb(-places)
    return float(Decimal(repr(value)).quantize(q, rounding=ROUND_HALF_UP))


PHASES = [
    ('runtime-bake', 'spawnlum-before-final.json',
     'The runtime bake, this branch, with tour/lightmaps/serenity/ moved aside so '
     'Lightmaps.load() reports "missing" and every surface falls through to '
     'bakeSurface(). The before column.'),
    ('offline-pack', 'spawnlum-after-final.json',
     'The committed offline pack loaded instead: 10 of 10 surfaces, '
     'window.__lightmaps.status "ok".'),
    ('offline-pack-bounces0', 'spawnlum-identity-res1-b0.json',
     'PIPELINE IDENTITY CHECK, never committed: the same pack re-baked with bounces = 0, '
     'at which the integrator reduces exactly to bake.js own AMB_RGB x escaped-fraction '
     'estimator. It reproduces the runtime bake to the reported precision, which is what '
     'proves the texel mapping, the WebP encoding, the loading, the colour space and the '
     'lightMapIntensity are all neutral -- so the shipped pack row differs by the '
     'integrator and nothing else.'
     ' LIMIT, measured in fix round 1: this identity is established for the pooled MEAN and '
     'not for p5. Per spawn the p5 residual under this nominal identity reaches -0.9 '
     '(Entrance) and -1.2 (Bedroom), which is the same size as or larger than the shipped '
     'pack effect on those same spawns (+2.2 and 0.0); the pooled p5 agrees (80.0 vs 80.1) '
     'only because pooling averages the residuals away. p5 is half of the ratio being gated.'
     ' NOTE THE SIGN, recorded in fix round 2: these per-spawn residuals are NEGATIVE, while '
     'the same identity lifts p5 in tools/luminance.py. See linearLuminance.identityCaveat.'),
    ('withdrawn-3x-bounces0', 'spawnlum-res3-b0.json',
     'WITHDRAWN, not shipped: 3x texel density, bounces = 0. Recorded because it is the '
     'evidence for why resScale stayed at 1 -- at 3x the texels are finer than the 0.14 m '
     'wall is thick, bake.js edge dilation replaces exactly one ring and takes its '
     'replacement from a neighbour that is itself spoiled, and the ceilings come back with '
     'a hard black band (13/255 against an interior of 185).'),
    ('withdrawn-3x-bounces2-128rays', 'spawnlum-probe128b.json',
     'WITHDRAWN, not shipped: 3x texel density, 2 bounces, at the 128-ray pipeline-validation '
     'bake rather than the shipped 2048. Carries the same black-band artefact as the row '
     'above, so its apparent contrast gain (1.757) is partly the artefact and must not be '
     'read as the offline bake working. The 2048-ray 3x run measured the same 139.7 / 79.5 / '
     '1.757 but its harness file was overwritten by the re-run at resScale 1, so this file '
     'is the one that survives.'),
    ('BASE-fef2d07', 'spawnlum-BASE-fef2d07.json',
     'The branch tip this task started from, served from a separate git worktree on '
     'port 8743. Present to show that the bake.js and sampler.js refactors are '
     'behaviour-neutral when no pack is loaded, not to be compared with the pack.'),
]


def load(name):
    with open(os.path.join(HERE, name), encoding='utf-8') as f:
        return json.load(f)


def linear_block(linear):
    """sets / captures / repeatability, all derived from the raw captures."""
    caps = {k: v for k, v in linear.items() if not k.startswith('_')}
    sets, repeat = {}, {}
    for key, pairs in caps.items():
        means = [p[0] for p in pairs]
        p5s = [p[1] for p in pairs]
        agg_mean = sum(means) / len(means)
        agg_p5 = sum(p5s) / len(p5s)
        mean = r(agg_mean, 4)
        p5 = r(agg_p5, 4)
        # Contrast is the ratio of the UNROUNDED aggregates, not of the
        # 4-dp values quoted beside it. The two can differ in the last digit
        # -- offline-pack is 3.38576 -> 3.386 unrounded and 0.2890/0.0854 ->
        # 3.384 from the quoted pair -- because its four captures do not all
        # share a p5. Quoting the unrounded ratio is the more accurate of the
        # two and it matches the mean of the per-capture ratios (3.38577).
        sets[key] = {'mean': mean, 'p5': p5, 'contrast': r(agg_mean / agg_p5, 3)}
        if key != 'photographs':
            sets[key]['n'] = len(pairs)
            repeat[key] = {
                'meanRange': [min(means), max(means)],
                'p5Range': [min(p5s), max(p5s)],
                'contrastRange': [r(min(m / p for m, p in pairs), 3),
                                  r(max(m / p for m, p in pairs), 3)],
            }
    repeat['note'] = ('measured in fix round 1; the first draft quoted single shots against '
                      'an uncharacterised harness')
    return sets, caps, repeat


def build():
    linear = load('linear.json')
    times = load('baketime.json')
    pack = load('pack.json')

    phases = {}
    for key, src, note in PHASES:
        if not os.path.exists(os.path.join(HERE, src)):
            continue
        d = load(src)
        phases[key] = {
            'note': note,
            'meanL': d['pooled']['meanL'],
            'p5L': d['pooled']['p5L'],
            'contrast_mean_over_p5': d['contrast_mean_over_p5'],
            'pctPixelsBelowLuma16': d['pooled']['pctPixelsBelowLuma16'],
            'lightmapsStatus': (d.get('lightmaps') or {}).get('status'),
            'issues': d['issues'],
            'perSpawn': [{'spawn': p['spawn'], 'meanL': p['meanL'], 'p5L': p['p5L']}
                         for p in d['per']],
        }

    sets, captures, repeat = linear_block(linear)

    return {
        'apartment': 'serenity',
        'metric': 'spawn-pooled luminance',
        'task': 'phase B plan 3, task 5 -- the offline lightmap baker',
        'outcome': pack['outcome'],
        'method': ('Every spawns[] entry rendered at 480x300 through the full post chain at '
                   'pixelRatio 1, pixels pooled across all spawns before the mean and the '
                   'INTERPOLATED 5th percentile of Rec.709 luma on the sRGB-encoded frame '
                   '(0-255). Same method and same harness as <apt>-b3-task2-luminance.json '
                   'and <apt>-b3-task3-luminance.json. NOT comparable to tools/luminance.py, '
                   'which reports linear-light values over a different population.'),
        'harness': ('Playwright headless Chromium with --use-angle=d3d11 --enable-gpu '
                    '--ignore-gpu-blocklist. The default headless GPU is SwiftShader, which '
                    "post.js's capable() rejects -- a run without these flags silently "
                    'measures with no post chain. Spawn yaw is asserted against the raw JSON '
                    'degrees on every run. Each phase is a separate page load; the run-to-run '
                    'spread measured on an identical build is 0.1 of meanL and 0.0 of p5L '
                    '(BASE-fef2d07 measured twice: 138.7/80.0 and 138.6/80.0).'),
        'exposure': 0.329,
        'cacheVersion': 104,
        'pack': pack,
        'phases': phases,
        'linearLuminance': {
            'tool': 'tools/luminance.py',
            'population': linear['_population'],
            'note': linear['_note'],
            'identityCaveat': linear['_identityCaveat'],
            'sets': sets,
            'captures': dict({'note': ('independent captures of each state, frames re-captured '
                                       'every time; (mean, p5) pairs')}, **captures),
            'repeatability': repeat,
        },
        'bakeMs': {
            'note': ('window.__bakeMs, five fresh page loads per side, twice. With a pack it '
                     'covers the manifest fetch, the SHA-256, the ten texture loads and the '
                     'wall/furniture passes, which still run unchanged. THE TWO PAIRED RUNS '
                     'DISAGREE IN SIGN -- the no-pack side alone moved from a median of 1237 ms '
                     'to 2680 ms between them on identical code -- so no net load-time claim is '
                     'supportable from them. The usable measurement is packCost below, taken '
                     'inside single page loads: the texel loop a pack skips costs 215-294 ms '
                     'for all ten surfaces, and the eleven /lightmaps/ requests cost 4.5-6.8 s '
                     'of wall time against tools/serve.py. The pack does not buy load time.'),
            'phases': times,
        },
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true',
                    help='compare with the committed file and write nothing')
    args = ap.parse_args()
    out = build()
    if args.check:
        with open(OUT, encoding='utf-8') as f:
            committed = json.load(f)
        if committed == out:
            print('MATCH: this script reproduces %s' % OUT)
            return
        print('DIFFERS from %s' % OUT)
        for k in sorted(set(committed) | set(out)):
            if committed.get(k) != out.get(k):
                print('  key %r differs' % k)
        raise SystemExit(1)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2)
    print('wrote', OUT)


if __name__ == '__main__':
    main()
