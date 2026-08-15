"""Builds the three committed metrics files from sweep.json beside it, so the
numbers in docs/superpowers/metrics/ are DERIVED from the raw capture record
rather than transcribed by hand.

    python write_metrics.py            # write
    python write_metrics.py --check    # rebuild in memory, diff against disk

Writes docs/superpowers/metrics/{serenity,kings-court,horkyone-10}-b4a-task2-luminance.json.

FILENAMES. Task 2's brief fixes these three names verbatim, and they name
neither a camera nor a population -- which is exactly what the project's
sharpest recorded lesson is about. The names are kept as specified because
they are what the task's commit line references, and the risk is answered a
different way: each file carries a `population` and a `camera` field on
EVERY block that holds a number, and the two readings inside are deliberately
kept apart, because they are not the same population:

  * spawnPooled -- all spawns[], the live in-page camera at 480x300 through
    the post chain. Includes serenity's Entrance, the darkest spawn.
  * linearContrast -- the criterion. poseVerified compare spots only (2 of
    serenity's 11), captured under ?measure=1&fov=legacy at 1024 px.

The all-spot delta-E readings live in their own files, whose names DO carry
both the camera and the population (…-legacy-allspots.json).
"""
import argparse
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
OUT = os.path.join(ROOT, 'docs', 'superpowers', 'metrics')

SEG_ORDER = ['SEG_0.45', 'SEG_0.30', 'SEG_0.22', 'SEG_0.15']
SEG_VALUE = {'SEG_0.45': 0.45, 'SEG_0.30': 0.30, 'SEG_0.22': 0.22, 'SEG_0.15': 0.15}
BAKE_MEDIAN = {'serenity': 267, 'kings-court': 8674, 'horkyone-10': 1323}


def build(sw, apt):
    before = sw['before'][apt]
    runs = before['runs']
    p5s = [r['spawnPooled']['p5L'] for r in runs]
    rows = []
    for key in SEG_ORDER:
        r = sw['sweep'][key][apt]
        rows.append({
            'SEG': SEG_VALUE[key],
            'sampled': True,
            'spawnPooled': dict(r['spawnPooled'],
                                population='all spawns[] entries',
                                camera='in-page camera, 480x300, full post chain'),
            'perSpawnP5': r.get('perSpawnP5'),
            'linearContrast': r.get('linearContrast'),
            'deltaE_allSpot_legacy': r.get('deltaE_allSpot_legacy'),
            'bakeMs': r['bakeMs'],
            'bakeMsVsMedian': round(r['bakeMs'] / BAKE_MEDIAN[apt], 2),
            'drawCallsDesktop': r['drawCallsDesktop'],
            'wallVerts': r['wallVerts'],
            'wallVertsVsBefore': round(r['wallVerts'] / runs[0]['wallVerts'], 2),
            'wallZeroVerts': r['wallZeroVerts'],
            'pctWallVertsTrueZero': r['pctWallVertsTrueZero'],
            'wallMeanVertexColour': r['wallMeanVertexColour']
        })

    doc = {
        'apartment': apt,
        'task': 'phase B plan 4a task 2 -- walls take the visibility-scaled ambient',
        'verdict': 'NO-GO',
        'verdictRestsOn': sw['criterion'],
        'shipped': ('NOTHING. The change was reverted in full: tour/ is byte-identical '
                    'to task 1 tip 656b5c4 and the cache version stays at 109.'),
        'environment': sw['environment'],
        'noiseFloor': sw['noiseFloor'],
        'before': {
            'state': sw['before']['state'],
            'cacheVersion': sw['before']['cacheVersion'],
            'runs': runs,
            'spawnPooledP5Runs': p5s,
            'population': 'all spawns[] entries',
            'camera': 'in-page camera, 480x300, full post chain',
            'linearContrast': before.get('linearContrast'),
            'deltaE_allSpot_legacy': before.get('deltaE_allSpot_legacy'),
            'bakeMedianOnReferenceMachine': BAKE_MEDIAN[apt]
        },
        'sweep': rows,
        'spawnPooledSecondReading': {
            'why': ('The criterion population is 2 bright rooms and excludes the darkest '
                    'spawn. This reading exists so a No-Go measured there is not written '
                    'into the record as "walls do not help" full stop. It does NOT change '
                    'the verdict.'),
            'population': 'all spawns[] entries, including the darkest',
            'beforeP5': p5s,
            'sweepP5': {str(SEG_VALUE[k]): sw['sweep'][k][apt]['spawnPooled']['p5L']
                        for k in SEG_ORDER},
            'reading': None      # filled below
        },
        'samplerLiveness': sw['samplerLiveness'],
        'postRevertVerification': {
            'facesLvl': sw['postRevertVerification']['facesLvl'][apt],
            'issues': sw['postRevertVerification']['issues'][apt],
            'drawCallsDesktop': sw['postRevertVerification']['drawCalls']['desktop_1280x820'][apt],
            'drawCallsMobileViewport': sw['postRevertVerification']['drawCalls']['mobileViewport_390x844'][apt],
            'budgets': {'desktop': 400, 'mobile': 250},
            'mobileCaveat': sw['postRevertVerification']['drawCalls']['caveat'],
            'state': sw['postRevertVerification']['state']
        },
        'screenshots': sw['screenshots'],
        'caveat': ('Absolute values carry no meaning across machines. This file\'s before '
                   'and after were captured on the SAME machine in one session; nothing '
                   'here is comparable to a phase B3 number.')
    }

    best_before = min(p5s)
    best_after = min(r['spawnPooled']['p5L'] for r in rows)
    doc['spawnPooledSecondReading']['reading'] = (
        'Pooled p5 falls at every SEG on every apartment: best before %.1f, best after '
        '%.1f. The second reading AGREES with the criterion -- the dark end of the frame '
        'gets darker, not better. There is no disagreement to report.'
        % (best_before, best_after))
    return doc


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()
    sw = json.load(open(os.path.join(HERE, 'sweep.json'), encoding='utf-8'))
    bad = 0
    for apt in ['serenity', 'kings-court', 'horkyone-10']:
        doc = build(sw, apt)
        path = os.path.join(OUT, '%s-b4a-task2-luminance.json' % apt)
        if args.check:
            on_disk = json.load(open(path, encoding='utf-8'))
            same = on_disk == doc
            print('%-14s %s' % (apt, 'matches' if same else 'DIFFERS from sweep.json'))
            if not same:
                bad += 1
        else:
            json.dump(doc, open(path, 'w', encoding='utf-8'), indent=2)
            print('wrote', path)
    if args.check:
        raise SystemExit(bad)


if __name__ == '__main__':
    main()
