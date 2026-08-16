"""Adversarial self-test for check_metrics_readme.py: proves its FAILURE PATH
runs, by mutating a scratch copy of the README (and of a metrics JSON) and
asserting the checker exits non-zero every time.

    python check_metrics_readme_selftest.py

Exits non-zero if the pristine copy fails, or if ANY mutation passes.

WHY. The first version of `check_metrics_readme.py` compared JSON-derived
values against constants hard-coded beside them, so it could not fail on a
wrong README figure -- and nobody noticed, because it had only ever been run
against a correct document. Thirty green ticks were taken as verification of a
section none of them had read. The re-review demonstrated the hole by mutating
a copy and watching the script still print "0 failures".

That demonstration is now permanent and automated. This project's precedent is
explicit: plan 3's final wave proved a guard by driving the real file against a
throwaway stub, not by reading the code and concluding it worked. A checker
whose failure path has never been executed is a checker whose failure path is
untested.

The mutations below are deliberately spread across ALL the figure classes, not
only the two that were wrong in round 2: counts, the lineage row, the gap
sentence, the cross-session sentence, the 4-dp parentheticals, the state table
(edit AND delete), the source-count claim, the exclusion note, the BASE/HEAD
quotes -- plus one mutation of a METRICS FILE rather than the README, since the
checker must also notice the data moving under fixed prose.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
METRICS = os.path.join(ROOT, 'docs', 'superpowers', 'metrics')
CHECKER = os.path.join(HERE, 'check_metrics_readme.py')
BAKE = os.path.join(ROOT, 'tour', 'bake.js')
# Plan 4a task 4 put its rounds 2-3 and its two counterfactual-exposure probes
# in a harness dir rather than in metrics/, and the checker reads both. Copied
# and mutated here for the same reason metrics/ is: a data source the checker
# reads but the self-test never perturbs is a source whose comparison has never
# been shown to bite.
HARNESS = os.path.join(ROOT, 'docs', 'superpowers', 'harnesses', '2026-08-15-b4a-task4')


def sub_once(text, old, new, label):
    """Replace exactly once, and prove the anchor existed -- a mutation that
    silently did nothing would look like a checker failure that isn't one."""
    if text.count(old) < 1:
        raise SystemExit('self-test anchor missing for %r: %r' % (label, old[:70]))
    return text.replace(old, new, 1)


# (label, kind, function) -- kind is 'readme' or 'json'
MUTATIONS = [
    ('gap range reverted to round 2\'s wrong value', 'readme',
     lambda t: sub_once(t, '**0.26–0.28** below HEAD', '**0.25–0.28** below HEAD', 'gap HEAD')),
    ('gap BASE range wrong', 'readme',
     lambda t: sub_once(t, '**0.21–0.24 below**', '**0.21–0.23 below**', 'gap BASE')),
    ('state table: kings-court seg045 corrupted to 99.99', 'readme',
     lambda t: sub_once(t, '| 16.27 | 19.46 |', '| 16.27 | 99.99 |', 'seg045 row')),
    ('state table: a whole row deleted', 'readme',
     lambda t: re.subn(r'^\|\s*`\*-b4a-task2-seg030-legacy-allspots`.*\n', '', t, 1, re.M)[0]),
    ('lineage row range reverted to the original error', 'readme',
     lambda t: sub_once(t, '**16.19 – 16.40**', '**16.19 – 16.34**', 'lineage row')),
    ('count "eight of those ten" reverted to "nine"', 'readme',
     lambda t: sub_once(t, 'eight of those ten', 'nine of those ten', 'trial count')),
    ('count "twenty-three" changed to "eighteen"', 'readme',
     lambda t: sub_once(t, 'adds **twenty-three**', 'adds **eighteen**', 'total count')),
    # Added in plan 4a task 4, when the count first needed a hyphen and the
    # checker's `\w+` became `[\w-]+`. A hyphenated word must still be COMPARED,
    # not merely matched: "twenty-two" is one off and must fail. Without this
    # case, relaxing the pattern could have been mistaken for widening what
    # passes.
    ('count "twenty-three" changed to the adjacent "twenty-two"', 'readme',
     lambda t: sub_once(t, 'adds **twenty-three**', 'adds **twenty-two**', 'total count off-by-one')),
    # Added in plan 4a task 3, when relaxing a hard-coded "fifteen" in the
    # checker's own pattern: prove the SECOND half of that sentence is still
    # checked, i.e. that "Ten of the twenty-three" going stale is still caught.
    ('count "of the twenty-three" changed to "of the fifteen"', 'readme',
     lambda t: sub_once(t, 'of the twenty-three are `b4a-task2`',
                        'of the fifteen are `b4a-task2`', 'inner total')),
    # ---- plan 4a task 4's own figure classes ----------------------------
    ('task4 table: gate row serenity corrupted', 'readme',
     lambda t: sub_once(t, '| 15.9891 | 18.5864 |', '| 15.9899 | 18.5864 |', 'task4 gate row')),
    ('task4 table: BASE row deleted', 'readme',
     lambda t: re.subn(r'^\|\s*`\*-b4a-task4-BASE-legacy-allspots`.*\n', '', t, 1, re.M)[0]),
    ('task4 one of the twelve round readings edited', 'readme',
     lambda t: sub_once(t, '18.8443/18.8921/18.9000', '18.8443/18.8021/18.9000', 'task4 rounds')),
    ('task4 headline movement -0.30 -> -0.20', 'readme',
     lambda t: sub_once(t, '−0.30 on kings-court', '−0.20 on kings-court', 'task4 movement')),
    # ---- the render/convention split, rebuilt in fix round 1 -------------
    ('task4 split: serenity render/convention swapped', 'readme',
     lambda t: sub_once(t, '| serenity | 0.298 | **−0.590** | **−0.024** | **3.9%** |',
                        '| serenity | 0.298 | **−0.024** | **−0.590** | **3.9%** |',
                        'serenity split row')),
    ('task4 split: kings-court share reverted to the withdrawn 60%', 'readme',
     lambda t: sub_once(t, '| **50.1%** |', '| **60.1%** |', 'kc share')),
    ('task4 split: serenity counterfactual reverted to the wrong 0.306', 'readme',
     lambda t: sub_once(t, '| serenity | 0.298 |', '| serenity | 0.306 |', 'serenity counterfactual')),
    ('task4 split: a whole split row deleted', 'readme',
     lambda t: re.subn(r'^\|\s*kings-court\s*\|\s*0\.5596\s*\|.*\n', '', t, 1, re.M)[0]),
    ('task4 sensitivity: kings-court break-even edited', 'readme',
     lambda t: sub_once(t, '**0.5595**', '**0.5495**', 'kc break-even')),
    ('task4 sensitivity: a slope edited', 'readme',
     lambda t: sub_once(t, 'slopes are 7.879 (serenity)', 'slopes are 7.979 (serenity)', 'slope')),
    ('task4 erratum: the superseded slope pair edited', 'readme',
     lambda t: sub_once(t, 'slope from 3.833 to 4.554', 'slope from 3.833 to 4.654', 'superseded slope')),
    # ---- the per-spot disclosures ---------------------------------------
    ('task4 per-spot: serenity 7.webp understated', 'readme',
     lambda t: sub_once(t, '`7.webp` (−4.96)', '`7.webp` (−3.96)', 'serenity 7.webp')),
    ('task4 per-spot: the two-spot contribution edited', 'readme',
     lambda t: sub_once(t, '\n  −0.825 of the −0.614', '\n  −0.725 of the −0.614',
                        'serenity pair contribution')),
    ('task4 per-spot: a pose-verified regression softened', 'readme',
     lambda t: sub_once(t, '`1.webp` +0.37', '`1.webp` +0.07', 'serenity 1.webp')),
    ('task4 per-spot: kings-court 19.webp understated', 'readme',
     lambda t: sub_once(t, 'regresses **+1.55**', 'regresses **+0.55**', 'kc 19.webp')),
    # ---- the harness data path -------------------------------------------
    ('HARNESS FILE moves under fixed prose (a paired-probe spot dE +1.0)', 'harness',
     ('kings-court-b4a-task4-fix1-HEAD-f0315ea-L1-probe-e0.5596-legacy-allspots.json',
      lambda t: sub_once(t, '"deltaE": 17.93', '"deltaE": 18.93', 'kc paired probe spot'))),
    ('HARNESS FILE: a round file moves (per-spot disclosure depends on it)', 'harness',
     ('serenity-b4a-task4-run2-HEAD-f0315ea-legacy-allspots.json',
      lambda t: sub_once(t, '"deltaE": 14.47', '"deltaE": 15.47', 'serenity 7.webp round 2'))),
    ('cross-session kings-court after 18.79 -> 18.99', 'readme',
     lambda t: sub_once(t, 'against **18.79**), Δ0.02', 'against **18.99**), Δ0.02', 'cross-session')),
    ('4-dp parenthetical 16.4027 -> 16.4028', 'readme',
     lambda t: sub_once(t, '`b4a-task1-after` (16.4027)', '`b4a-task1-after` (16.4028)', 'note')),
    ('task-1 series 16.60 -> 16.61', 'readme',
     lambda t: sub_once(t, 'serenity **16.60 → 16.40 → 16.32**',
                        'serenity **16.61 → 16.40 → 16.32**', 'task-1 series')),
    ('exclusion note range not updated with the row', 'readme',
     lambda t: sub_once(t, 'render again — 16.19–16.40', 'render again — 16.19–16.34', 'exclusion')),
    ('BASE quote in the section drifts from the lineage table', 'readme',
     lambda t: sub_once(t, '| BASE (pre-b3-task-2 render) | 16.5409 – 16.5700 |',
                        '| BASE (pre-b3-task-2 render) | 16.5400 – 16.5700 |', 'BASE quote')),
    ('source claim: "twelve grid() call sites" -> "ten"', 'readme',
     lambda t: sub_once(t, "of the file's twelve `grid()` call sites",
                        "of the file's ten `grid()` call sites", 'grid count')),
    # The branch's HEADLINE claim. Until the final whole-branch review it was
    # asserted only as `WORDS.get(word, 0) <= sites` -- "n <= 12", with an
    # unknown word defaulting to 0 -- so all three of these mutations returned
    # exit 0 / "0 failures". They are here because the fix to that assertion is
    # worthless unless the failure it enables is executed: "most" covers the
    # unknown-word default, "zero" and "twelve" cover the two ends of the
    # vacuous `<=` range.
    ('headline: "eight of the file\'s twelve" -> "most" (unknown word)', 'readme',
     lambda t: sub_once(t, "winding — eight\nof the file's twelve",
                        "winding — most\nof the file's twelve", 'grid disagreeing / most')),
    ('headline: "eight" -> "zero"', 'readme',
     lambda t: sub_once(t, "winding — eight\nof the file's twelve",
                        "winding — zero\nof the file's twelve", 'grid disagreeing / zero')),
    ('headline: "eight" -> "twelve" (the whole file)', 'readme',
     lambda t: sub_once(t, "winding — eight\nof the file's twelve",
                        "winding — twelve\nof the file's twelve", 'grid disagreeing / twelve')),
    ('section heading removed entirely', 'readme',
     lambda t: sub_once(t, "#### Plan 4a's readings are a third render",
                        "#### Plan 4a notes", 'heading')),
    ('METRICS FILE moves under fixed prose (a spot dE +1.0)', 'json',
     ('kings-court-b4a-task2-seg045-legacy-allspots.json',
      lambda t: sub_once(t, '"deltaE": 21.24', '"deltaE": 22.24', 'kc seg045 spot'))),
]


def run(readme, metrics, harness):
    p = subprocess.run([sys.executable, CHECKER, '--readme', readme,
                        '--metrics', metrics, '--harness', harness, '--bake', BAKE],
                       capture_output=True, text=True)
    tail = [l for l in p.stdout.strip().splitlines() if l.strip()]
    return p.returncode, (tail[-1] if tail else '(no output)'), p.stdout


def main():
    work = tempfile.mkdtemp(prefix='b4a-task2-selftest-')
    try:
        mdir = os.path.join(work, 'metrics')
        hdir = os.path.join(work, 'harness')
        shutil.copytree(METRICS, mdir)
        shutil.copytree(HARNESS, hdir)
        pristine = open(os.path.join(METRICS, 'README.md'), encoding='utf-8').read()
        readme = os.path.join(work, 'README.md')

        print('=' * 78)
        print('CONTROL: unmutated copy must PASS')
        print('=' * 78)
        open(readme, 'w', encoding='utf-8').write(pristine)
        # the checker reads BASE/HEAD out of the same README, so it needs the
        # whole file, not only the section -- copied verbatim above.
        code, last, _ = run(readme, mdir, hdir)
        print('  exit %d   %s' % (code, last))
        bad = 0
        if code != 0:
            print('  *** CONTROL FAILED -- the checker rejects a correct document')
            bad += 1

        print()
        print('=' * 78)
        print('MUTATIONS: each must make the checker FAIL (non-zero exit)')
        print('=' * 78)
        for label, kind, fn in MUTATIONS:
            # reset both sides for every case
            open(readme, 'w', encoding='utf-8').write(pristine)
            shutil.rmtree(mdir)
            shutil.copytree(METRICS, mdir)
            shutil.rmtree(hdir)
            shutil.copytree(HARNESS, hdir)
            if kind == 'readme':
                open(readme, 'w', encoding='utf-8').write(fn(pristine))
            else:
                fname, jfn = fn
                p = os.path.join(mdir if kind == 'json' else hdir, fname)
                # Read fully into a variable FIRST. `open(p,'w').write(f(open(p).read()))`
                # truncates the file when the outer open() is evaluated, before the
                # argument expression runs, so the inner read returns '' and the
                # mutation's anchor "goes missing". That is exactly what happened on
                # this self-test's first run, and it presented as a broken anchor
                # rather than as a truncation -- worth the four extra characters.
                before = open(p, encoding='utf-8').read()
                after = jfn(before)
                open(p, 'w', encoding='utf-8').write(after)
            code, last, _ = run(readme, mdir, hdir)
            ok = code != 0
            if not ok:
                bad += 1
            print('  %-4s exit %d   %-58s %s'
                  % ('OK' if ok else '****', code, label, last))

        print()
        print('%d mutations + 1 control, %d unexpected results' % (len(MUTATIONS), bad))
        if bad:
            print('THE CHECKER IS NOT SOUND: a mutation above passed, or the control failed.')
        else:
            print('Failure path verified: every mutation was caught, the clean copy passed.')
        return bad
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(1 if main() else 0)
