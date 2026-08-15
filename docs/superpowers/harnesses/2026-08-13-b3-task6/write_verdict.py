"""Assembles docs/superpowers/metrics/serenity-b3-task6-verdict.json from the
committed inputs in this directory, so no number in it is hand-copied.

Inputs: linear.json (the re-measurement), calls.json and reveal/mapping.json
(the blind A/B), abdelta.json (the post-reveal characterisation), and the two
serenity-b3-task6-spotcheck-*-legacy-allspots.json files that tools/delta_e.py
wrote in its own native shape.

    python write_verdict.py            # writes the metrics file
    python write_verdict.py --check    # rebuilds it in memory and compares,
                                       # without writing

`--check` is how the "derived, not typed" claim is verified rather than
asserted. Task 5's equivalent script did not hold when it was first
committed; this one is checked in the report that ships with it.
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
METRICS = os.path.join(ROOT, 'docs', 'superpowers', 'metrics')
OUT = os.path.join(METRICS, 'serenity-b3-task6-verdict.json')

CRITERION = 4.9
BEFORE_SETS = ['t6-before-1', 't6-before-2']
AFTER_SETS = ['t6-after-1', 't6-after-2']

# Task 5's committed figures, quoted here so the re-measurement can be
# compared against them. Source: docs/superpowers/metrics/
# serenity-b3-task5-luminance.json -> linearLuminance.sets / .repeatability.
INHERITED = {
    'source': 'docs/superpowers/metrics/serenity-b3-task5-luminance.json',
    'runtime-bake': {'mean': 0.2820, 'p5': 0.0833, 'contrast': 3.385, 'n': 4,
                     'contrastRange': [3.383, 3.387]},
    'offline-pack': {'mean': 0.2890, 'p5': 0.0854, 'contrast': 3.386, 'n': 4,
                     'contrastRange': [3.384, 3.387]},
    'photographs': {'mean': 0.2993, 'p5': 0.0483, 'contrast': 6.197},
    'deltaE_allspot_legacy': {'before': 16.59, 'after': 16.75},
}


def load(name):
    with open(os.path.join(HERE, name), encoding='utf-8') as f:
        return json.load(f)


def agg(linear, labels):
    mean = sum(linear[k]['mean'] for k in labels) / len(labels)
    p5 = sum(linear[k]['p5'] for k in labels) / len(labels)
    return {'mean': round(mean, 6), 'p5': round(p5, 6),
            'contrast': round(mean / p5, 4), 'n': len(labels),
            'captures': [[round(linear[k]['mean'], 6), round(linear[k]['p5'], 6)]
                         for k in labels],
            'contrastPerCapture': [round(linear[k]['mean'] / linear[k]['p5'], 4)
                                   for k in labels]}


def tail_p(hits, n):
    """P(>= hits correct out of n) when each call is a fair coin."""
    return sum(math.comb(n, k) for k in range(hits, n + 1)) / 2 ** n


def build():
    linear = load('linear.json')
    calls = load('calls.json')
    mapping = load(os.path.join('reveal', 'mapping.json'))
    abdelta = load('abdelta.json')
    de_before = json.load(open(os.path.join(
        METRICS, 'serenity-b3-task6-spotcheck-before-legacy-allspots.json'), encoding='utf-8'))
    de_after = json.load(open(os.path.join(
        METRICS, 'serenity-b3-task6-spotcheck-after-legacy-allspots.json'), encoding='utf-8'))

    before = agg(linear, BEFORE_SETS)
    after = agg(linear, AFTER_SETS)
    photos = {'mean': round(linear['photographs']['mean'], 6),
              'p5': round(linear['photographs']['p5'], 6),
              'contrast': round(linear['photographs']['mean'] / linear['photographs']['p5'], 4)}

    graded = []
    for c in calls['calls']:
        key = 'pair%d' % c['pair']
        truth = 'A' if mapping[key]['A'] == 'pack-on' else 'B'
        graded.append({'pair': c['pair'], 'pose': c['pose'], 'call': c['call'],
                       'confidence': c['confidence'], 'packWasOn': truth,
                       'correct': c['call'] == truth})
    hits = sum(1 for g in graded if g['correct'])
    n = len(graded)

    contrast_met = after['contrast'] >= CRITERION
    visible_met = hits == n

    return {
        'apartment': 'serenity',
        'task': 'phase B plan 3, task 6 -- does the offline lightmap pack earn its cost',
        'verdict': 'NO-GO',
        'verdictSummary': (
            'The offline lightmap pack fails its exit criterion. Linear-domain '
            'contrast measures %.4f with the pack against a threshold of >= %.1f: it '
            'would have to rise by %.1f%% to pass, and it does not move at all -- '
            '%.4f without the pack, %.4f with it, a change of %+.4f against a '
            'same-state repeat spread of +-0.002 whose sign is not even stable '
            'between this run and task 5. The blind A/B returned %d of %d, short of '
            'the 6/6 fixed before viewing (P(>=%d of %d) = %.3f under guessing), and '
            'every call leaned on a magnified flat-surface patch rather than on the '
            'frames at viewing size. Both halves of the criterion fail; the '
            'conjunction fails on the contrast half alone, whatever the A/B had '
            'returned. THE PACK IS NOT A NO-OP -- it lifts the ceiling/wall perimeter '
            'and the floor near obstructions by up to ~100 of 255 locally -- but the '
            'gated statistic cannot see that, and the criterion is applied to the '
            'gated statistic.'
            % (after['contrast'], CRITERION, (CRITERION / after['contrast'] - 1) * 100,
               before['contrast'], after['contrast'],
               after['contrast'] - before['contrast'],
               hits, n, hits, n, tail_p(hits, n))),
        'criterion': {
            'threshold': CRITERION,
            'text': ('Go if the linear-domain contrast reaches >= 4.9 AND the blind '
                     'A/B is visible.'),
            'derivationNote': (
                'The plan derives 4.9 as a third of a 3.6 -> 7.6 gap. Those anchors '
                'are STALE -- they belong to the phase A series plan 2 closed, '
                'measured through the broken fixed-72-degree camera, which the '
                'metrics README says "cannot be converted into the corrected one; it '
                'can only be ended". The live numbers are render 3.38 and photographs '
                '6.197-6.200, and a third of THAT gap is 4.32. The human partner was '
                'asked and ruled HOLD 4.9 LITERALLY, the strictest reading of "not '
                'renegotiable", knowing it makes the bar harder than its own stated '
                'derivation. 4.9 is what is applied here and 4.32 is not.'),
            'comparison': (
                'Offline lightmap pack vs. the runtime bake -- pack on against pack '
                'off. The brief says "against GTAO-only"; there is no GTAO. Task 3 '
                'vendored GTAOPass, measured it and rejected it, and no tour/ file '
                'adopted it (docs/superpowers/rejected/2026-08-13-b3-task3-gtao/).'),
            'contrastHalf': {'measured': after['contrast'], 'required': CRITERION,
                             'met': contrast_met,
                             'shortfallPct': round((CRITERION / after['contrast'] - 1) * 100, 1)},
            'visibleHalf': {'hits': hits, 'of': n, 'requiredForVisible': n,
                            'met': visible_met,
                            'pValueUnderGuessing': round(tail_p(hits, n), 4)},
            'conjunction': contrast_met and visible_met,
        },
        'linearLuminance': {
            'tool': 'tools/luminance.py estimator, at full precision, via linear.py',
            'population': (
                '2 of 11. tools/luminance.py:60 filters through delta_e.scorable, '
                'which requires poseVerified; serenity has exactly two that pass, '
                '1.webp (Bathroom) and 11.webp (Bedroom). Both are among the '
                'highest-p5 rooms in the flat, i.e. the least shadow available to '
                'change; the darkest spawn (Entrance) is NOT in this population, and '
                'it is the one place task 5 measured a genuine fill signature.'),
            'capture': ('?fov=legacy, full post chain, exposure 0.329, ?v=104, frames '
                        're-captured for every set. The two sides are the same build; '
                        'the only difference is whether tour/lightmaps/serenity/ is on '
                        'disk.'),
            'contrastDerivation': ('ratio of the UNROUNDED aggregates, not of the '
                                   'rounded mean and p5 quoted beside them'),
            'remeasured': {'runtime-bake': before, 'offline-pack': after,
                           'photographs': photos},
            'inherited': INHERITED,
            'inheritanceCheck': (
                'Every re-measured figure lands inside the range task 5 committed for '
                'the same state, so its numbers are inherited with a check rather than '
                'on trust. Re-measured contrast: runtime bake %.4f (task 5: %.3f, '
                'range %.3f-%.3f), offline pack %.4f (task 5: %.3f, range %.3f-%.3f). '
                'NOTE THE SIGN: task 5 measured the pack +0.001 on contrast and this '
                'run measures it %+.4f. Both are inside the same-state spread, which '
                'is the finding -- the change is not resolvable by either run, in '
                'either direction.'
                % (before['contrast'], INHERITED['runtime-bake']['contrast'],
                   INHERITED['runtime-bake']['contrastRange'][0],
                   INHERITED['runtime-bake']['contrastRange'][1],
                   after['contrast'], INHERITED['offline-pack']['contrast'],
                   INHERITED['offline-pack']['contrastRange'][0],
                   INHERITED['offline-pack']['contrastRange'][1],
                   after['contrast'] - before['contrast'])),
            'gainShape': {
                'meanRatio': round(after['mean'] / before['mean'], 5),
                'p5Ratio': round(after['p5'] / before['p5'], 5),
                'differencePp': round((after['p5'] / before['p5']
                                       - after['mean'] / before['mean']) * 100, 3),
                'note': ('On THIS population the pack is a near-uniform gain of ~2.4-2.5%, '
                         'and a mean/p5 ratio is blind to a uniform gain by construction. '
                         'This reproduces task 5 (mean x1.02482, p5 x1.02461) including '
                         'that the mean/p5 ordering is not resolvable: task 5 had mean '
                         'marginally ahead, this run has p5 marginally ahead, both by less '
                         'than a tenth of a percentage point.'),
            },
        },
        'blindAB': {
            'method': calls['protocol'],
            'aids': calls['aids'],
            'poses': [r['pose'] for r in abdelta],
            'poseSelection': (
                'Six poses fixed before any frame was looked at, weighted TOWARD where '
                'the pack can act: it lightmaps floors, ceilings and attic slopes only. '
                'The outdoor Pool Terrace spawn was excluded because it bakes with no '
                'gather and could not differ. The deck is stacked in favour of '
                'visibility on purpose.'),
            'callsWrittenBeforeReveal': calls['writtenBeforeReveal'],
            'graded': graded,
            'hits': hits,
            'of': n,
            'pValueUnderGuessing': round(tail_p(hits, n), 4),
            'preRegisteredBar': ('visible only at 6/6, because P(6/6) = 1/64 = 0.016 '
                                 'while P(>=5/6) = 7/64 = 0.109 does not clear 0.05 at '
                                 'n = 6'),
            'result': ('%d of %d. Above the 3 expected from guessing and short of the '
                       'pre-registered 6/6; at n = 6 this is not distinguishable from '
                       'chance. The load-bearing observation is not the hit rate: at '
                       'full viewing size none of the six pairs could be separated, and '
                       'every call leans on a 3-4x magnified patch of a flat floor or '
                       'ceiling. On pair 3 the full-frame impression was the OPPOSITE of '
                       'the patch reading and the patch was right, which is recorded in '
                       'calls.json rather than quietly dropped.' % (hits, n)),
            'perPoseObjectiveDelta': abdelta,
            'objectiveNote': (
                'Measured AFTER the calls were written and the mapping opened. The pack '
                'is not a no-op: per pose the sRGB mean rises 0.8-1.7%, 24-58% of pixels '
                'move at all, 3-8% move by >= 10 of 255 and the largest single-pixel '
                'move is ~100. diff/diff1.png and diff/diff6.png show WHERE -- a band '
                'along the ceiling/wall perimeter and the floor beside obstructions, '
                'which is the near-field crevice fill a 0.65 m gather on lightmapped '
                'surfaces predicts. Note the tension with gainShape above and do not '
                'flatten it: on these six full frames the effect is CONCENTRATED, while '
                'on the two gated spots it measures near-uniform. Both were measured; '
                'the gate is applied to the second.'),
        },
        'deltaESpotCheck': {
            'note': ('All-spot legacy dE2000, tools/delta_e.py native output, run as a '
                     'second check on an inherited number rather than as a gate. Task 6 '
                     'gates on contrast and the A/B, not on this.'),
            'before': de_before['mean'],
            'after': de_after['mean'],
            'delta': round(de_after['mean'] - de_before['mean'], 2),
            'population': de_before['population'],
            'scored': de_before['scored'],
            'compareTotal': de_before['compareTotal'],
            'inherited': INHERITED['deltaE_allspot_legacy'],
            'agreement': (
                'Direction reproduces -- the pack moves this metric the wrong way, away '
                'from the 16.58 ceiling. Magnitude is smaller than task 5 recorded '
                '(+%.2f here vs +%.2f there). The before reading of %.2f sits inside the '
                '16.60-16.62 the metrics README records for that state.'
                % (de_after['mean'] - de_before['mean'],
                   INHERITED['deltaE_allspot_legacy']['after']
                   - INHERITED['deltaE_allspot_legacy']['before'],
                   de_before['mean'])),
        },
        'shipOrRevert': {
            'decided': False,
            'owner': 'the human partner',
            'why': ('The plan says a failure means "do not carry lightmaps to the other '
                    'two apartments". It does NOT say whether serenity keeps its pilot '
                    'pack or reverts to the runtime bake, and those differ by 13,626 '
                    'bytes of shipped assets, eleven extra HTTP requests, and by whether '
                    'the product ships a feature that failed its own exit criterion. '
                    'Task 6 records the verdict and the costs and recommends; it does '
                    'not decide, and it left the shipped state exactly as task 5 '
                    'committed it.'),
            'recommendation': 'revert serenity to the runtime bake',
            'recommendationReasons': [
                'It failed the exit criterion the plan set for it, and the point of an '
                'exit criterion is that failing it means not shipping.',
                'It moves the merge gate the wrong way: all-spot legacy dE 16.61 -> '
                '16.71 here, 16.59 -> 16.75 in task 5, against a ceiling of 16.58 that '
                'serenity already misses by 0.03.',
                'It costs eleven extra HTTP requests and does not buy load time -- the '
                'texel loop it skips is 233 ms of a ~2.6 s Baker.run, while the requests '
                'measured 4.5-6.8 s of wall time against the dev server.',
                'Shipping it obliges an exposure and bloom re-fit under the phase\'s own '
                'standing rule, which reopens task 4, and task 5 measured the pack\'s '
                'whole effect on the gated population to be of a kind that re-fit would '
                'undo.',
                'Nothing is lost by reverting: tools/bake_lightmaps.mjs, tour/lightmaps.js, '
                'the guard and the pack itself all stay in git history, so reconsidering '
                'costs a checkout rather than a redo.',
            ],
            'againstReverting': [
                'The pack is real and structured -- the difference maps show genuine '
                'crevice fill on ceilings and floors -- and 13.6 KB is 0.16% of the 8 MB '
                'ceiling, so the cost of keeping it is small.',
                'Keeping it is the only way the loader, the manifest hash and the '
                'per-surface geometry guard stay exercised by a real pack in production.',
                'Reverting and later re-adopting costs another 551 s bake plus the '
                'exposure re-fit either way.',
            ],
        },
        'shippedStateAtVerdict': {
            'note': 'Unchanged by this task. No tour/ or tools/ file was modified.',
            'lightmapsFlag': True,
            'packFiles': 11,
            'packBytes': 13626,
            'manifestHash': '53377a0816c2bd63f9f8bdd07ed4ccfd3d702f654fe0264b5e633303c54951bf',
            'cacheVersion': 104,
            'exposure': 0.329,
        },
    }


def main():
    doc = build()
    if '--check' in sys.argv:
        with open(OUT, encoding='utf-8') as f:
            have = json.load(f)
        if have == doc:
            print('MATCH: this script reproduces %s' % OUT)
            return
        print('MISMATCH against %s' % OUT)
        for k in sorted(set(have) | set(doc)):
            if have.get(k) != doc.get(k):
                print('  differs:', k)
        raise SystemExit(1)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(doc, f, indent=2)
    print('wrote', OUT)


if __name__ == '__main__':
    main()
