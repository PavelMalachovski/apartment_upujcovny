"""Asserts every figure in docs/superpowers/metrics/README.md's plan-4a section
against the metrics files it describes.

    python check_metrics_readme.py     # prints one line per check, exits 1 on any failure

WHY THIS EXISTS. That section was written by hand in task 2's fix round 1 and
shipped with a wrong range: the row claimed serenity 16.19-16.34 while one of
the files it names, `serenity-b4a-task1-after-legacy-allspots.json`, reads
16.4027. Fix round 2 caught it -- and then, checking the rest of the same row
as instructed, found a second slip of the same class: "nine of those ten
measure code that is not in the tree" against two shipped `-before-` files out
of ten, which is eight. Both were arithmetic a script would never have got
wrong, in freshly written text whose entire purpose is precision, in the file
this project keeps specifically to stop wrong numbers surviving review.

So the section is now machine-checked rather than re-read. This is the same
move as write_metrics.py --check, one level up: that proves the metrics files
were derived from sweep.json, this proves the README's prose was derived from
the metrics files.

Values are the mean of each file's own rounded `spots[]` -- the computation the
lineage table in that README declares for itself, NOT the files' own `mean`
field (which is that same quantity already rounded to 2 dp).
"""
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
METRICS = os.path.join(ROOT, 'docs', 'superpowers', 'metrics')

# The two lineage ranges the plan-4a section compares itself against. They are
# the pre-existing lineage table's own figures, quoted here so a change to
# either side shows up as a failure rather than as silent drift.
BASE = (16.5409, 16.5700)
HEAD = (16.5882, 16.6155)


def mean(name):
    d = json.load(open(os.path.join(METRICS, name + '.json'), encoding='utf-8'))
    spots = [x['deltaE'] for x in d['spots']]
    return sum(spots) / len(spots)


def main():
    readme = open(os.path.join(METRICS, 'README.md'), encoding='utf-8').read()
    start = readme.index("#### Plan 4a's readings are a third render")
    sec = readme[start:readme.index("### The plan's own claim: blacks", start)]

    b4a = sorted(os.path.basename(f)[:-5]
                 for f in glob.glob(os.path.join(METRICS, '*b4a-*allspots.json')))
    t2 = [f for f in b4a if 'task2' in f]
    t2_trial = [f for f in t2 if '-before-' not in f]

    # The row names task 1's two POST-fix files plus all five serenity task-2
    # files. task1-before is the pre-fix render and is deliberately outside it.
    row = ['serenity-b4a-task1-after-legacy-allspots',
           'serenity-b4a-task1-after-paintings-legacy-allspots'] + \
          [f for f in t2 if f.startswith('serenity')]
    rv = [mean(f) for f in row]
    tip = [mean('serenity-b4a-task1-after-paintings-legacy-allspots'),
           mean('serenity-b4a-task2-before-legacy-allspots')]
    c = sum(tip) / 2

    checks = [
        ('file count is fifteen', len(b4a) == 15, len(b4a)),
        ('"fifteen" appears in the section', '**fifteen**' in sec, ''),
        ('ten of them are task 2', len(t2) == 10, len(t2)),
        ('"Ten of the fifteen"', 'Ten of the fifteen' in sec, ''),
        ('eight task-2 files are trial state', len(t2_trial) == 8, len(t2_trial)),
        ('"eight of those ten"', 'eight of those ten' in sec, ''),
        ('row low  = 16.19', round(min(rv), 2) == 16.19, '%.4f' % min(rv)),
        ('row high = 16.40', round(max(rv), 2) == 16.40, '%.4f' % max(rv)),
        ('row text says 16.19 - 16.40', '**16.19 – 16.40**' in sec, ''),
        ('row high is task1-after (intermediate)',
         round(mean('serenity-b4a-task1-after-legacy-allspots'), 4) == 16.4027, ''),
        ('task1-before is NOT in the row',
         'b4a-task1-before' not in sec.split('| **plan 4a')[1].split('\n')[0], ''),
        ('task-1 tip = 16.3227', round(tip[0], 4) == 16.3227, ''),
        ('task-2 before = 16.3391', round(tip[1], 4) == 16.3391, ''),
        ('their mean = 16.3309 (the "~16.33")', round(c, 4) == 16.3309, '%.4f' % c),
        ('gap below BASE is 0.21 - 0.24',
         (round(BASE[0] - c, 2), round(BASE[1] - c, 2)) == (0.21, 0.24),
         '%.4f / %.4f' % (BASE[0] - c, BASE[1] - c)),
        ('gap below HEAD is 0.26 - 0.28',
         (round(HEAD[0] - c, 2), round(HEAD[1] - c, 2)) == (0.26, 0.28),
         '%.4f / %.4f' % (HEAD[0] - c, HEAD[1] - c)),
        ('serenity cross-session check = 0.02',
         round(abs(tip[0] - tip[1]), 2) == 0.02, '%.4f' % abs(tip[0] - tip[1])),
        ('kings-court cross-session check = 0.02',
         round(abs(mean('kings-court-b4a-task1-after-legacy-allspots')
                   - mean('kings-court-b4a-task2-before-legacy-allspots')), 2) == 0.02, ''),
        ('task-1 serenity 16.60 / 16.40 / 16.32',
         [round(mean('serenity-b4a-task1-%s-legacy-allspots' % s), 2)
          for s in ['before', 'after', 'after-paintings']] == [16.60, 16.40, 16.32], ''),
        ('task-1 kings-court 18.87 / 18.79',
         [round(mean('kings-court-b4a-task1-%s-legacy-allspots' % s), 2)
          for s in ['before', 'after']] == [18.87, 18.79], ''),
    ]
    for tag, ser, kc in [('before', 16.34, 18.81), ('seg045', 16.27, 19.46),
                         ('seg030', 16.19, 19.35), ('seg022', 16.30, 19.22),
                         ('seg015', 16.29, 19.24)]:
        for apt, want in [('serenity', ser), ('kings-court', kc)]:
            checks.append(('state table %-6s %-11s %.2f' % (tag, apt, want),
                           round(mean('%s-b4a-task2-%s-legacy-allspots' % (apt, tag)), 2) == want,
                           ''))

    bad = 0
    for name, ok, extra in checks:
        if not ok:
            bad += 1
        print('%-4s %-44s %s' % ('OK' if ok else 'FAIL', name, extra))
    print('\n%d checks, %d failures' % (len(checks), bad))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
