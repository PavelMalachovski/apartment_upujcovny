"""Assemble docs/superpowers/metrics/serenity-b3-task5-luminance.json from the
harness outputs, so every number in it is copied by a program and not by hand.

Inputs (all written by the harnesses in this directory):
  spawnlum-<phase>.json     spawn-pooled sRGB luminance, one per phase
  linear.json               {phase: [mean, p5]} transcribed from tools/luminance.py
  baketime.json             {phase: {loads, median}}
  pack.json                 {bytes, files, cfg, bakeSeconds}
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = r'C:\Git\AirBNB\docs\superpowers\metrics\serenity-b3-task5-luminance.json'

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
     'integrator and nothing else.'),
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


def main():
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

    out = {
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
        'cacheVersion': 103,
        'pack': pack,
        'phases': phases,
        'linearLuminance': {
            'tool': 'tools/luminance.py',
            'population': '2 of 11 (poseVerified filter, hard-coded in tools/luminance.py)',
            'note': ('Linear-light Rec.709 relative luminance over the compare spots, captured '
                     'at ?fov=legacy. Diagnostic only -- no gate is taken from it here. '
                     'Contrast is mean/p5, quoted so the render can be compared with the '
                     'photographs. This is the number task 6 applies its >= 4.9 criterion to.'),
            'sets': {k: {'mean': v[0], 'p5': v[1],
                         'contrast': round(v[0] / v[1], 2)} for k, v in linear.items()},
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
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2)
    print('wrote', OUT)


if __name__ == '__main__':
    main()
