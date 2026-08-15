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
    ('count "fifteen" changed to "fourteen"', 'readme',
     lambda t: sub_once(t, 'adds **fifteen**', 'adds **fourteen**', 'total count')),
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
    ('section heading removed entirely', 'readme',
     lambda t: sub_once(t, "#### Plan 4a's readings are a third render",
                        "#### Plan 4a notes", 'heading')),
    ('METRICS FILE moves under fixed prose (a spot dE +1.0)', 'json',
     ('kings-court-b4a-task2-seg045-legacy-allspots.json',
      lambda t: sub_once(t, '"deltaE": 21.24', '"deltaE": 22.24', 'kc seg045 spot'))),
]


def run(readme, metrics):
    p = subprocess.run([sys.executable, CHECKER, '--readme', readme,
                        '--metrics', metrics, '--bake', BAKE],
                       capture_output=True, text=True)
    tail = [l for l in p.stdout.strip().splitlines() if l.strip()]
    return p.returncode, (tail[-1] if tail else '(no output)'), p.stdout


def main():
    work = tempfile.mkdtemp(prefix='b4a-task2-selftest-')
    try:
        mdir = os.path.join(work, 'metrics')
        shutil.copytree(METRICS, mdir)
        pristine = open(os.path.join(METRICS, 'README.md'), encoding='utf-8').read()
        readme = os.path.join(work, 'README.md')

        print('=' * 78)
        print('CONTROL: unmutated copy must PASS')
        print('=' * 78)
        open(readme, 'w', encoding='utf-8').write(pristine)
        # the checker reads BASE/HEAD out of the same README, so it needs the
        # whole file, not only the section -- copied verbatim above.
        code, last, _ = run(readme, mdir)
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
            if kind == 'readme':
                open(readme, 'w', encoding='utf-8').write(fn(pristine))
            else:
                fname, jfn = fn
                p = os.path.join(mdir, fname)
                # Read fully into a variable FIRST. `open(p,'w').write(f(open(p).read()))`
                # truncates the file when the outer open() is evaluated, before the
                # argument expression runs, so the inner read returns '' and the
                # mutation's anchor "goes missing". That is exactly what happened on
                # this self-test's first run, and it presented as a broken anchor
                # rather than as a truncation -- worth the four extra characters.
                before = open(p, encoding='utf-8').read()
                after = jfn(before)
                open(p, 'w', encoding='utf-8').write(after)
            code, last, _ = run(readme, mdir)
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
