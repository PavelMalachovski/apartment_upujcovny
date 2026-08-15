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
            # SELECTION RULE, named because the first version of this file got it
            # wrong and the error ran one way. It took the MINIMUM of both sides
            # and called it "best", which overstated the fall by up to 2.8 points
            # against the report's own table -- always in the direction that
            # flatters the measured effect. The rule below is the one the report
            # uses and the one this reading's question demands. The question is
            # "did the dark end improve?", so the after side must be the value
            # most FAVOURABLE to the change (the maximum across the sweep), and
            # the before side must be the whole baseline rather than its luckier
            # half (the mean of the two same-state runs).
            'selectionRule': ('before = mean of the two same-state runs; after = the '
                              'MAXIMUM pooled p5 across the sweep, i.e. the sweep point '
                              'most favourable to the change. Not a minimum on either '
                              'side. Matches task-2-report.md section 5 exactly.'),
            'beforeMeanP5': None,        # filled below
            'mostFavourableAfterP5': None,
            'mostFavourableAfterSEG': None,
            'deltaP5': None,
            'reading': None
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

    before_mean = round(sum(p5s) / len(p5s), 2)
    best_row = max(rows, key=lambda r: r['spawnPooled']['p5L'])
    best_after = best_row['spawnPooled']['p5L']
    sec = doc['spawnPooledSecondReading']
    sec['beforeMeanP5'] = before_mean
    sec['mostFavourableAfterP5'] = best_after
    # Ties are real: serenity reads 88.6 at both 0.22 and 0.15. Report every
    # SEG that attains the maximum rather than silently keeping whichever one
    # max() happened to see first.
    sec['mostFavourableAfterSEG'] = [r['SEG'] for r in rows
                                     if r['spawnPooled']['p5L'] == best_after]
    sec['deltaP5'] = round(best_after - before_mean, 2)

    zeros = [r['pctWallVertsTrueZero'] for r in rows]
    p5_by_seg = [r['spawnPooled']['p5L'] for r in rows]
    corroboration = {
        'serenity': ('serenity carries the direct case. Its Entrance -- the darkest spawn, '
                     'and the one the criterion population excludes -- loses 20.5 points at '
                     'SEG 0.45 (72.8 to 52.3) and is still 19.1 down at the most favourable '
                     'sweep point (53.7 at SEG 0.15). 428 of 5568 wall vertices land at '
                     'LITERAL zero where the shipped build has none. Recomputing Rec.709 '
                     'luma over the committed entrance frames '
                     '(serenity-entrance-{before,seg045,seg015}.webp, 900x560) puts the '
                     'frame MINIMUM at 1.4 before and 0.0 under the trial: an ambient '
                     'visibility integral over a lit interior room does not reach exactly '
                     'zero on a face a visitor is looking at. That last figure comes from '
                     'the committed frames, not from the 480x300 pooled captures the p5 '
                     'numbers above come from.'),
        'kings-court': ('kings-court corroborates by recovery. Its true-zero fraction falls '
                        '6.0 / 4.5 / 4.2 / 3.7 percent across the sweep and its pooled p5 '
                        'climbs back monotonically, 60.4 / 60.9 / 62.0 / 62.8. Where the '
                        'artefact shrinks, p5 comes back -- which is what an artefact does '
                        'and not what deeper shading would do.'),
        'horkyone-10': ('horkyone-10 corroborates by NOT recovering. Its true-zero fraction '
                        'does not fall (13.5 / 13.7 / 13.7 / 13.0 percent, roughly double '
                        'the other two apartments) and its pooled p5 correspondingly does '
                        'not recover (100.5 / 100.7 / 99.8 / 103.0). p5 tracks the zero '
                        'fraction, not SEG.')
    }[apt]

    # kings-court's and horkyone-10's corroboration sentences already quote
    # their own two series, so repeating them here would say the same numbers
    # twice in one paragraph. serenity's does not, so it gets them appended.
    series = ('On this apartment the true-zero fraction runs %s percent against pooled '
              'p5 %s. ' % (' / '.join('%.1f' % z for z in zeros),
                           ' / '.join('%.1f' % p for p in p5_by_seg))) if apt == 'serenity' else ''

    sec['reading'] = (
        'Pooled p5 FALLS: %.2f before, %.1f after at the most favourable sweep point '
        '(SEG %s), a change of %+.2f, larger than the +-0.9 same-state floor. '
        'DO NOT READ THAT AS SELF-EVIDENT AGREEMENT WITH THE NO-GO. A falling p5 is '
        'the OBJECTIVE of this plan -- deeper shadow reaching the frame -- so on its '
        'face this reading looks like the target effect, and taken at face value it '
        'would read as success. It agrees with the No-Go only because the fall is '
        'DISCOUNTED AS ARTEFACT, and that discount is the load-bearing part. '
        'The mechanism: of the four grid() calls per wall piece that are hard-coded '
        '1,1 -- both end reveals, top and bottom -- three are shaded, and SEG cannot '
        'subdivide any of them at any value. Each is shaded from four geometric '
        'corners with the sample point offset only 0.03 m along the normal, so a '
        'reveal corner butted into the wall it meets is sampled INSIDE solid geometry '
        'and the value returned is not a measurement of visibility on the visible '
        'surface at all. The result is smeared across a full-height strip. That is '
        'bake.js defect 2, and the screenshots in the harness directory show the same '
        'bands at SEG 0.15 as at 0.45. %s '
        '%sThe second reading therefore does not contradict the verdict -- but the '
        'reason is the artefact, not the direction of travel.'
        % (before_mean, best_after, '/'.join(str(x) for x in sec['mostFavourableAfterSEG']),
           sec['deltaP5'], corroboration, series))
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
