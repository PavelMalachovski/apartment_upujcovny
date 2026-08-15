"""Build task 3's committed metrics files.

Two sources, kept deliberately separate:

* **Exposure-sweep rows are DERIVED, not typed.** Every row is recomputed here
  from the captured frames still on disk under `tools/shots/<label>/`, through
  `score.py` (which is `tools/luminance.py`'s luminance maths plus
  `tools/delta_e.py`'s own ΔE functions). Nothing about a sweep row passes
  through a human transcription step.
* **Browser-probe blocks are transcribed** — bloom fractions, spawn-pooled
  luminance, the render-target-size check — because they are GPU readings with
  no artefact left on disk. They live verbatim in `session.json` and in the
  `thresh-*.json` probe dumps beside this script.

    python write_metrics.py            # write
    python write_metrics.py --check    # rebuild in memory, diff against disk

`--check` is how "derived, not typed" is verified rather than asserted: it
exits 1 if any committed file differs from what this script rebuilds.
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
METRICS = os.path.join(ROOT, 'docs', 'superpowers', 'metrics')
RAW = HERE   # thresh-*.json live beside this script so the harness is self-contained

from score import measure, summarise   # noqa: E402

SESSION = json.load(open(os.path.join(HERE, 'session.json'), encoding='utf-8'))

FIT_TARGET = (
    "The photographs' own mean linear-light relative luminance (Rec.709, sRGB "
    "EOTF) over the ALL-SPOT compare population, i.e. minimise "
    "|render mean - photograph mean|. Stated in writing before the first "
    "capture (task-3-report.md step 1). dE2000 is recorded on every row and "
    "was NOT used to choose any value; where the two disagree the report says "
    "so and says what taking luminance cost."
)
POPULATION = (
    "all-spot: every `compare`-flagged spot, scored == compareTotal, "
    "skippedPoseVerification 0. This REVERSES plan 3 task 4, which fitted on "
    "the poseVerified subset that tools/luminance.py hard-codes; the "
    "poseVerified figures are carried on every row as a diagnostic only. "
    "score.py exists because luminance.py cannot report the all-spot "
    "population at all."
)
CAMERA = (
    "fixed-fov (\"new zero\"): ?apt=<id>&measure=1 with NO &fov=legacy -- the "
    "camera that matches each photograph's own field of view, so render and "
    "photograph frame the same subject and a luminance comparison between them "
    "is like-for-like. The gate reading is a separate capture in the legacy "
    "72-degree camera; those files are named -legacy-allspots."
)
BLOOM_STATE = "DISABLED on every sweep row (bloom pass .enabled = false)."
HARNESS = (
    "Playwright MCP -> Chromium on ANGLE (Intel, Intel(R) UHD Graphics 630, "
    "Direct3D11) -- a real GPU, so post.js's capable() accepts the chain; "
    "post.enabled was asserted before every reading. Frames were rendered by "
    "measure.js's own renderAt (never a re-implementation): window.fetch was "
    "patched for the duration of each capture so measure.js's save POST is "
    "mirrored into tools/shots/<label>/ as well as the shots root."
)
EXPOSURE_EQUIVALENCE = (
    "Rows were swept by setting renderer.toneMappingExposure in-page. That is "
    "equivalent to editing the JSON by construction, not empirically: app.js:90 "
    "assigns APT.exposure to that exact property and nothing else reads the key; "
    "three.module.js:18345-18351 forces NoToneMapping whenever the render target "
    "is non-null (which is what RenderPass renders into); and OutputPass.js:93 is "
    "the only consumer of toneMappingExposure in the whole chain."
)
NOISE = (
    "materials.js randomises its procedural canvas textures on every page load, "
    "so two loads of identical code are not bit-identical and bake repeats are "
    "not deterministic (bake.js's cosine sampling uses Math.random()). Measured "
    "here across independent loads: all-spot mean linear luminance +-0.0003 "
    "(serenity, at 0.295) / +-0.0003 (kings-court, at 0.52); all-spot dE2000 "
    "+-0.02; spawn-pooled sRGB mean +-0.32. Rows inside one batch share a page "
    "load and one set of textures."
)

BATCHES = {
    'serenity': [
        ('coarse (one page load)', 't3-serenity-fixedfov-bloomOff-e%s',
         ['0.2', '0.22', '0.24', '0.26', '0.28', '0.29', '0.3', '0.31', '0.32',
          '0.329', '0.35', '0.4']),
        ('refine 1 (independent page load)', 't3r1-serenity-fixedfov-bloomOff-e%s',
         ['0.291', '0.293', '0.294', '0.295', '0.296', '0.297']),
        ('refine 2 (independent page load, repeat of refine 1)',
         't3r2-serenity-fixedfov-bloomOff-e%s',
         ['0.293', '0.294', '0.295', '0.296', '0.297']),
    ],
    'kings-court': [
        ('coarse (one page load)', 't3-kings-court-fixedfov-bloomOff-e%s',
         ['0.42', '0.46', '0.5', '0.53', '0.56', '0.575', '0.62', '0.7']),
        ('refine 1 (same page load as coarse)',
         't3r1-kings-court-fixedfov-bloomOff-e%s',
         ['0.51', '0.515', '0.52', '0.525']),
        ('refine 2 (independent page load)',
         't3r2-kings-court-fixedfov-bloomOff-e%s',
         ['0.515', '0.52', '0.521', '0.525']),
    ],
}

CHOSEN = {
    'serenity': {
        'exposure': 0.295, 'previousValue': 0.329,
        'why': ("The all-spot luminance crossing. Signed diff (render - "
                "photographs) changes sign between 0.295 and 0.296 in BOTH "
                "independent refine loads, and 0.295 also carries the smallest "
                "|diff| in both (0.0002 and 0.0001, against 0.296's 0.0008 and "
                "0.0011). dE2000 was NOT used: it falls monotonically below the "
                "crossing to a minimum near 0.26 (15.59 all-spot), so taking "
                "the luminance value costs about +0.24 dE2000 -- disclosed, "
                "not hidden."),
    },
    'kings-court': {
        'exposure': 0.52, 'previousValue': 0.575,
        'why': ("The all-spot luminance crossing. Signed diff changes sign "
                "between 0.52 and 0.525 in refine 1 and between 0.52 and 0.521 "
                "in refine 2; 0.52 reads -0.0002 and -0.0003, the smallest "
                "|diff| of any value measured twice. 0.521 measured +0.0002 on "
                "its single load, which is inside the +-0.0003 repeat spread, "
                "so the two are not distinguishable and the rounder value was "
                "taken. dE2000 has a shallow minimum near 0.46-0.50 (18.32-"
                "18.34), so taking the luminance value costs about +0.06 "
                "dE2000 -- the same order as the precedent in plan 3 task 4, "
                "and disclosed the same way."),
    },
}


def sweep_file(apt):
    photo = None
    batches = []
    for name, pattern, values in BATCHES[apt]:
        points = []
        for v in values:
            label = pattern % v
            _, rows = measure(apt, label)
            s = summarise(apt, label, rows)
            allspot = s['populations']['all-spot']
            pv = s['populations']['poseVerified']
            if photo is None:
                photo = {
                    'allSpot': {'n': allspot['n'], 'meanLum': allspot['photoMeanLum'],
                                'p5Lum': allspot['photoP5Lum']},
                    'poseVerified': {'n': pv['n'], 'meanLum': pv['photoMeanLum'],
                                     'p5Lum': pv['photoP5Lum']},
                }
            points.append({
                'exposure': float(v),
                'set': label,
                'renderMeanLum': allspot['renderMeanLum'],
                'diffFromPhotographs': allspot['diffFromPhotographs'],
                'absDiffFromPhotographs': allspot['absDiffFromPhotographs'],
                'renderP5Lum': allspot['renderP5Lum'],
                'dE2000': allspot['dE2000'],
                'diagnostic_poseVerified': {
                    'renderMeanLum': pv['renderMeanLum'],
                    'diffFromPhotographs': pv['diffFromPhotographs'],
                    'dE2000': pv['dE2000'],
                },
                'perSpot': [{'file': r['file'], 'name': r['name'],
                             'poseVerified': r['poseVerified'],
                             'renderMeanLum': r['renderMeanLum'],
                             'deltaE': r['deltaE']} for r in rows],
            })
        batches.append({'batch': name, 'points': points})
    n_all = photo['allSpot']['n']
    return {
        'apartment': apt,
        'metric': 'exposure fit -- all-spot linear-light mean luminance vs the photographs',
        'task': 'phase B plan 4a task 3',
        'fitTarget': FIT_TARGET,
        'population': POPULATION,
        'scored': n_all,
        'compareTotal': n_all,
        'skippedPoseVerification': 0,
        'harnessMode': CAMERA,
        'bloom': BLOOM_STATE,
        'harness': HARNESS,
        'exposureOverrideEquivalence': EXPOSURE_EQUIVALENCE,
        'noise': NOISE,
        'windingDefect': ('FIXED. Plan 4a task 1 corrected grid()\'s triangle '
                          'order, so walls now present their near face. That is '
                          'the scene change this re-fit exists for: the earlier '
                          'fits (plan 2 task 7, plan 3 task 4) were made against '
                          'the defective render and have expired.'),
        'photographs': photo,
        'previousValue': CHOSEN[apt]['previousValue'],
        'chosen': CHOSEN[apt],
        'batches': batches,
    }


def horkyone_file():
    lum = SESSION['spawnPooledLuminance']
    ser = [r for r in lum['serenity'] if r['exposure'] == 0.295]
    kc = [r for r in lum['kings-court'] if r['exposure'] == 0.52]
    ser_mean = round(sum(r['meanL'] for r in ser) / len(ser), 2)
    kc_mean = round(sum(r['meanL'] for r in kc) / len(kc), 2)
    hk = lum['horkyone-10']
    chosen = [r for r in hk if r['exposure'] == 0.42 and r['bloomOn']]
    hk_mean = round(sum(r['meanL'] for r in chosen) / len(chosen), 2)
    band = [round(max(ser_mean, kc_mean) - 10, 2), round(min(ser_mean, kc_mean) + 10, 2)]
    return {
        'apartment': 'horkyone-10',
        'metric': 'exposure fit -- mean scene luminance proximity to the two fitted siblings',
        'task': 'phase B plan 4a task 3',
        'population': ('n/a -- horkyone-10 has ZERO `compare`-flagged photo spots, so it '
                       'has no photographs to fit resemblance or photograph luminance '
                       'against. Its criterion is the fallback set in plan 2 task 6: mean '
                       'scene luminance within +-10 of both fitted apartments.'),
        'method': lum['method'],
        'deliberateDeviation': (
            'Measured through the FULL post chain, not with bloom disabled the way the '
            'exposure sweep is. Named as a deviation rather than assumed harmless. The '
            'earlier rounds justified it by "every horkyone-10 spawn measures 0.00% over '
            'threshold" -- that premise NO LONGER HOLDS exactly: its Living room and '
            'Terrace spawns now cross threshold 1.8 at 0.0015% and 0.0048% of frame area. '
            'So it was measured instead of inferred: at 0.40, 0.42 and 0.44, and again at '
            'the shipped 0.42 on a third load, bloom-on and bloom-off give an IDENTICAL '
            'pooled mean and p5 to 0.01 -- far below the +-10 criterion and below this '
            'measurement\'s own +-0.32 repeat spread. Bloom contributes nothing here.'),
        'siblingBand': {
            'serenity': {'exposure': 0.295, 'meanL': ser_mean, 'loads': len(ser)},
            'kings-court': {'exposure': 0.52, 'meanL': kc_mean, 'loads': len(kc)},
            'acceptanceWindow': band,
            'windowMidpoint': round((band[0] + band[1]) / 2, 2),
        },
        'previousValue': 0.46,
        'chosen': {
            'exposure': 0.42,
            'meanL': hk_mean,
            'loads': len(chosen),
            'diffFromSerenity': round(hk_mean - ser_mean, 2),
            'diffFromKingsCourt': round(hk_mean - kc_mean, 2),
            'why': ('Closest tested value to the midpoint of the acceptance window, and '
                    'inside +-10 of both siblings with margin. The shipped 0.46 now FAILS '
                    'the criterion outright: it measures 151.03/151.65, i.e. +10.8 to '
                    '+11.4 from serenity, because task 1\'s winding fix brightened every '
                    'apartment and serenity\'s own fitted exposure came down further than '
                    'horkyone-10\'s would have.'),
        },
        'sweep': hk,
        'noise': NOISE,
        'harness': HARNESS,
    }


def bloom_file():
    thr = {}
    for apt, fn in (('serenity', 'thresh-serenity-e0.295.json'),
                    ('kings-court', 'thresh-kings-court-e0.52.json'),):
        d = json.load(open(os.path.join(RAW, fn), encoding='utf-8'))
        thr[apt] = {'exposure': d['exposure'], 'size': d['size'],
                    'thresholds': d['thresholds'], 'rows': d['rows']}
    hk = json.load(open(os.path.join(RAW, 'thresh-serenity-e1.0-independence.json'),
                        encoding='utf-8'))
    i18 = thr['serenity']['thresholds'].index(1.8)
    indep = [{'name': a['name'], 'kind': a['kind'],
              'atExposure0_295': a['fractionOverThresholdPct'][i18],
              'atExposure1_0': b['fractionOverThresholdPct'][i18],
              'identical': a['fractionOverThresholdPct'] == b['fractionOverThresholdPct']
                           and a['maxLuminance'] == b['maxLuminance']}
             for a, b in zip(thr['serenity']['rows'], hk['rows'])]
    return {
        'metric': 'bloom threshold and strength, re-measured from scratch after the winding fix',
        'task': 'phase B plan 4a task 3',
        'result': {
            'threshold': 1.8, 'strength': 0.1, 'radius': 0.5,
            'changedFromPrevious': False,
            'note': ('Not carried forward on trust. Task 1 changed scene radiance -- the '
                     'one thing that CAN move this threshold -- so both constants were '
                     'measured again from zero by the same method, at the newly fitted '
                     'exposures. Both landed back on the same values. Held, not skipped.'),
        },
        'thresholdMethod': (
            "Fraction of frame area over threshold in the exact pre-tonemap linear buffer "
            "UnrealBloomPass's LuminosityHighPassShader reads: RenderPass's own "
            "setRenderTarget/clear/render pattern reproduced into an offscreen FloatType "
            "target, pixels read back, and the same luminance() the highpass compiles "
            "applied with weights read out of the live "
            "THREE.ColorManagement.getLuminanceCoefficients() rather than hardcoded. "
            "FRACTION, never the peak -- see peakVsFractionAcrossRenderTargetSizes below. "
            "1280x800, every spawn and every compare photo spot, photo-spot markers hidden."),
        'strengthMethod': SESSION['bloomStrength']['method'],
        'harness': HARNESS,
        'exposureIndependence': {
            'claim': ('Verified within a SINGLE page load, where materials.js cannot have '
                      'randomised different textures, so this is exact rather than "within '
                      'noise": all 16 serenity positions returned bit-identical fractions '
                      'AND bit-identical peak luminances at exposure 0.295 and at 1.0. '
                      'OutputPass is the only stage that reads toneMappingExposure and it '
                      'runs after this buffer.'),
            'allIdentical': all(r['identical'] for r in indep),
            'perPosition': indep,
        },
        'peakVsFractionAcrossRenderTargetSizes': SESSION['peakVsFractionAcrossRenderTargetSizes'],
        'perApartment': thr,
        'horkyone10SpawnCrossings': {
            'note': ('Recorded because it contradicts an earlier round\'s premise. '
                     'horkyone-10\'s spawns are no longer all 0.00% over threshold 1.8.'),
            'source': 'browser probe, 1280x800, spawns only (no compare spots exist)',
            'rows': [{'name': 'Living room', 'pctOver1_8': 0.0015, 'maxLuminance': 1.916},
                     {'name': 'Bedroom', 'pctOver1_8': 0.0, 'maxLuminance': 1.621},
                     {'name': 'Bathroom', 'pctOver1_8': 0.0, 'maxLuminance': 0.981},
                     {'name': 'Hall', 'pctOver1_8': 0.0, 'maxLuminance': 1.329},
                     {'name': 'Terrace', 'pctOver1_8': 0.0048, 'maxLuminance': 1.924}],
            'consequence': ('Measured, not inferred: bloom on vs off leaves horkyone-10\'s '
                            'spawn-pooled mean sRGB luminance identical to 0.01, so bloom '
                            'still contributes nothing measurable there.'),
        },
        'strengthSweeps': {k: v for k, v in SESSION['bloomStrength'].items() if k != 'method'},
        'looked': ('Frames compared by eye at serenity\'s bathroom mirror, 900x560 through '
                   'the full chain at exposure 0.295, saved during the session as '
                   'tools/shots/b4a-task3/serenity-bathroom-{bloomOff,strength0.1,'
                   'strength0.22}-e0.295.jpg and committed beside this harness as WebP: at '
                   '0.22 the glint spreads and visibly lifts the whole frame, including the '
                   'flat wall left of the mirror; at 0.1 it stays a contained glint on the '
                   'mirror and the shower glass and the walls keep their tone. Same '
                   'judgement plan 2 task 7 and plan 3 task 4 made, re-made at the new '
                   'exposure.'),
    }


FILES = {
    'serenity-b4a-task3-exposure-sweep-fixedfov-allspot.json': lambda: sweep_file('serenity'),
    'kings-court-b4a-task3-exposure-sweep-fixedfov-allspot.json': lambda: sweep_file('kings-court'),
    'horkyone-10-b4a-task3-luminance.json': horkyone_file,
    'bloom-b4a-task3.json': bloom_file,
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()
    bad = 0
    for name, build in FILES.items():
        data = build()
        path = os.path.join(METRICS, name)
        text = json.dumps(data, indent=2, ensure_ascii=False) + '\n'
        if args.check:
            if not os.path.exists(path):
                print('MISSING', name)
                bad += 1
            elif open(path, encoding='utf-8').read() != text:
                print('DIFFERS', name)
                bad += 1
            else:
                print('ok      ', name)
        else:
            open(path, 'w', encoding='utf-8', newline='\n').write(text)
            print('wrote', path)
    if args.check:
        print('%d file(s) differ' % bad)
        sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
