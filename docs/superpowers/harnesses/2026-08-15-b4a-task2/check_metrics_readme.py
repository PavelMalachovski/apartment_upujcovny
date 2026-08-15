"""Checks that the figures PRINTED IN docs/superpowers/metrics/README.md's
plan-4a section match the metrics files they describe.

    python check_metrics_readme.py                     # check the repo's own files
    python check_metrics_readme.py --readme P --metrics D   # check a copy (see the self-test)

Exits non-zero on any failure.

WHAT THIS CHECKS, AND WHY THE DISTINCTION MATTERS
-------------------------------------------------
Every assertion below does two things in order:

  1. LOCATES the figure in the README's own text with a regex. If the pattern
     does not match -- number edited into a different shape, sentence reworded,
     table row deleted -- that is a FAILURE, not a skip.
  2. COMPARES the number it just read OUT OF THE DOCUMENT against a value
     recomputed from the metrics JSON.

**The first version of this script did neither.** It recomputed values from the
JSON and compared them against constants hard-coded three lines away, so 25 of
its 30 assertions never read the README at all -- including all ten
state-table checks and both gap-range checks, which were the exact two figure
classes it was written to protect. The re-review proved it empirically: it
reverted the gap text to the old wrong `0.21-0.23 / 0.25-0.28`, corrupted a
state-table cell to `99.99`, ran the script unmodified, and got
"30 checks, 0 failures", exit 0. A checker that cannot fail is worse than no
checker, because thirty green ticks persuade a reader that an unverified
section was verified.

So: **no expected value is typed into this file.** Every number compared comes
either from the README text or from a `spots[]` array. The only constants here
are regexes and the word-numeral table.

The failure path is exercised, not assumed: `check_metrics_readme_selftest.py`
beside this file mutates a scratch copy of the README (and of a metrics JSON)
twelve different ways and asserts this script exits non-zero on every one.

Values are the mean of each file's own rounded `spots[]` -- the computation the
lineage table in that README declares for itself, NOT the files' own `mean`
field, which is that same quantity already rounded to 2 dp.
"""
import argparse
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))

WORDS = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6,
         'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11,
         'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
         'sixteen': 16}
NUM = r'\d+\.\d+'
DASH = r'\s*[–—-]\s*'      # en dash, em dash or hyphen, spaced or not


class Checks:
    """Collects results. Any failure, including a regex that did not match,
    makes the run exit non-zero."""

    def __init__(self):
        self.rows = []

    def ok(self, label, passed, detail=''):
        self.rows.append((label, bool(passed), detail))
        return bool(passed)

    def near(self, label, from_text, from_data, places):
        """The document said `from_text`; the files say `from_data`."""
        if from_text is None:
            return self.ok(label, False, 'not found in README text')
        good = round(from_text, places) == round(from_data, places)
        return self.ok(label, good,
                       'README %s vs files %.*f' % (from_text, places, from_data))

    def report(self):
        bad = 0
        for label, passed, detail in self.rows:
            if not passed:
                bad += 1
            print('%-4s %-46s %s' % ('OK' if passed else 'FAIL', label, detail))
        print('\n%d checks, %d failures' % (len(self.rows), bad))
        return bad


def mean_of_rounded(metrics_dir, name):
    d = json.load(open(os.path.join(metrics_dir, name + '.json'), encoding='utf-8'))
    spots = [x['deltaE'] for x in d['spots']]
    return sum(spots) / len(spots)


def grab(text, pattern, c, label, flags=0):
    """Regex the README. Records a FAILURE and returns None if it does not match,
    so a deleted sentence or a reshaped number can never pass silently."""
    m = re.search(pattern, text, flags)
    if not m:
        c.ok(label + ' [present in README]', False, 'pattern did not match')
        return None
    return m


def nums(text):
    return [float(x) for x in re.findall(NUM, text)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--readme', default=os.path.join(ROOT, 'docs', 'superpowers',
                                                     'metrics', 'README.md'))
    ap.add_argument('--metrics', default=os.path.join(ROOT, 'docs', 'superpowers', 'metrics'))
    ap.add_argument('--bake', default=os.path.join(ROOT, 'tour', 'bake.js'))
    args = ap.parse_args()

    c = Checks()
    readme = open(args.readme, encoding='utf-8').read()
    M = lambda n: mean_of_rounded(args.metrics, n)                       # noqa: E731

    # ---- locate the section; everything below is read out of it ----------
    try:
        start = readme.index("#### Plan 4a's readings are a third render")
        sec = readme[start:readme.index("### The plan's own claim: blacks", start)]
    except ValueError:
        c.ok('plan-4a section present', False, 'section heading not found')
        return c.report()
    c.ok('plan-4a section present', True, '%d chars' % len(sec))

    files = sorted(os.path.basename(f)[:-5]
                   for f in glob.glob(os.path.join(args.metrics, '*b4a-*allspots.json')))
    t2 = [f for f in files if 'task2' in f]
    t2_trial = [f for f in t2 if '-before-' not in f]

    # ---- 1. the three counts, as the README words them -------------------
    for label, pattern, actual in [
        ('count: total b4a readings', r'adds \*\*(\w+)\*\* all-spot legacy readings', len(files)),
        ('count: how many are task 2', r'\*\*(\w+) of the fifteen are `b4a-task2`', len(t2)),
        ('count: how many are trial state', r'and (\w+) of those ten measure code', len(t2_trial)),
        ('count: how many are shipped state',
         r'the (\w+) `-before-` files are the shipped state', len(t2) - len(t2_trial)),
    ]:
        m = grab(sec, pattern, c, label)
        if m:
            word = m.group(1).lower()
            c.ok(label, WORDS.get(word) == actual,
                 'README "%s" (=%s) vs files %d' % (m.group(1), WORDS.get(word), actual))

    # The "of the fifteen" and "of those ten" phrasings hard-code numbers in
    # words elsewhere in the same sentences; check they agree with the files too,
    # or a half-edit leaves the sentence self-contradictory.
    m = grab(sec, r'\*\*\w+ of the (\w+) are `b4a-task2`', c, 'count: "of the fifteen" agrees')
    if m:
        c.ok('count: "of the fifteen" agrees', WORDS.get(m.group(1).lower()) == len(files),
             'README "%s" vs files %d' % (m.group(1), len(files)))
    m = grab(sec, r'and \w+ of those (\w+) measure code', c, 'count: "of those ten" agrees')
    if m:
        c.ok('count: "of those ten" agrees', WORDS.get(m.group(1).lower()) == len(t2),
             'README "%s" vs files %d' % (m.group(1), len(t2)))

    # ---- 2. the plan-4a lineage row --------------------------------------
    row = grab(sec, r'\|\s*\*\*plan 4a[^|]*\|\s*\*\*(' + NUM + r')' + DASH + r'(' + NUM + r')\*\*\s*\|([^|]*)\|',
               c, 'lineage row: range')
    row_files = ['serenity-b4a-task1-after-legacy-allspots',
                 'serenity-b4a-task1-after-paintings-legacy-allspots'] + \
                [f for f in t2 if f.startswith('serenity')]
    row_vals = [M(f) for f in row_files]
    if row:
        c.near('lineage row: range low', float(row.group(1)), min(row_vals), 2)
        c.near('lineage row: range high', float(row.group(2)), max(row_vals), 2)
        cell = row.group(3)
        # the row must name task 1's post-fix files and must NOT claim the
        # pre-fix one, which is a different render again
        c.ok('lineage row: names b4a-task1-after[-paintings]',
             'b4a-task1-after' in cell, cell.strip())
        c.ok('lineage row: excludes b4a-task1-before',
             not re.search(r'b4a-task1-before', cell), cell.strip())

    # BASE / HEAD rows in this section are quoted from the pre-existing lineage
    # table higher up the same file. Compare text against text: if either side
    # is edited, this fails.
    for label, here_pat, there_pat in [
        ('BASE range matches the lineage table',
         r'\|\s*BASE \(pre-b3-task-2 render\)\s*\|\s*(' + NUM + r')' + DASH + r'(' + NUM + r')\s*\|',
         r'\|\s*BASE \(pre-task-2 render\)\s*\|\s*\d+\s*\|\s*\*\*(' + NUM + r')' + DASH + r'(' + NUM + r')\*\*'),
        ('HEAD range matches the lineage table',
         r'\|\s*HEAD \(post-b3-task-2 render\)\s*\|\s*(' + NUM + r')' + DASH + r'(' + NUM + r')\s*\|',
         r'\|\s*HEAD \(post-task-2 render\)\s*\|\s*\d+\s*\|\s*\*\*(' + NUM + r')' + DASH + r'(' + NUM + r')\*\*'),
    ]:
        a = grab(sec, here_pat, c, label)
        b = grab(readme, there_pat, c, label + ' [source row]')
        if a and b:
            c.ok(label, a.groups() == b.groups(),
                 'section %s vs lineage table %s' % (list(a.groups()), list(b.groups())))

    # ---- 3. the cross-session sentence -----------------------------------
    m = grab(sec, r'independently measured before is.*?on both', c,
             'cross-session sentence', re.S)
    if m:
        v = nums(m.group(0))
        want = [M('serenity-b4a-task2-before-legacy-allspots'),
                M('serenity-b4a-task1-after-paintings-legacy-allspots'),
                M('kings-court-b4a-task2-before-legacy-allspots'),
                M('kings-court-b4a-task1-after-legacy-allspots')]
        if c.ok('cross-session sentence: five figures', len(v) == 5, 'found %s' % v):
            for i, (label, w) in enumerate(zip(
                    ['serenity task-2 before', 'serenity task-1 after',
                     'kings-court task-2 before', 'kings-court task-1 after'], want)):
                c.near('cross-session: ' + label, v[i], w, 2)
            c.near('cross-session: stated delta', v[4],
                   abs(want[0] - want[1]), 2)
            c.near('cross-session: delta also true of kings-court', v[4],
                   abs(want[2] - want[3]), 2)

    # ---- 4. the ~16.33 / gap-range sentence ------------------------------
    # This is one of the two classes the previous script was blind to.
    m = grab(sec, r'post-winding-fix render reproduces.*?below HEAD', c,
             'gap sentence', re.S)
    if m:
        v = nums(m.group(0))
        tip = [M('serenity-b4a-task1-after-paintings-legacy-allspots'),
               M('serenity-b4a-task2-before-legacy-allspots')]
        centre = sum(tip) / 2
        if c.ok('gap sentence: ten figures', len(v) == 10, 'found %s' % v):
            c.near('gap: the ~16.33 figure', v[0], centre, 2)
            c.near('gap: first tip reading', v[1], tip[0], 4)
            c.near('gap: second tip reading', v[2], tip[1], 4)
            c.near('gap: their mean', v[3], centre, 4)
            base_lo, base_hi = v[6], v[7]
            c.near('gap: BASE low  = BASE_lo - mean', v[4], base_lo - centre, 2)
            c.near('gap: BASE high = BASE_hi - mean', v[5], base_hi - centre, 2)
            # the BASE endpoints quoted mid-sentence must be the lineage table's
            b = grab(readme, r'\|\s*BASE \(pre-task-2 render\)\s*\|\s*\d+\s*\|\s*\*\*(' + NUM +
                     r')' + DASH + r'(' + NUM + r')\*\*', c, 'gap: BASE endpoints quoted')
            if b:
                c.near('gap: quoted BASE low', base_lo, float(b.group(1)), 4)
                c.near('gap: quoted BASE high', base_hi, float(b.group(2)), 4)
                h = grab(readme, r'\|\s*HEAD \(post-task-2 render\)\s*\|\s*\d+\s*\|\s*\*\*(' + NUM +
                         r')' + DASH + r'(' + NUM + r')\*\*', c, 'gap: HEAD endpoints')
                if h:
                    c.near('gap: HEAD low  = HEAD_lo - mean', v[8],
                           float(h.group(1)) - centre, 2)
                    c.near('gap: HEAD high = HEAD_hi - mean', v[9],
                           float(h.group(2)) - centre, 2)

    # ---- 5. task 1's own series ------------------------------------------
    m = grab(sec, r'serenity \*\*(' + NUM + r')\s*→\s*(' + NUM + r')\s*→\s*(' + NUM + r')\*\*',
             c, 'task-1 serenity series')
    if m:
        for i, state in enumerate(['before', 'after', 'after-paintings']):
            c.near('task-1 serenity %s' % state, float(m.group(i + 1)),
                   M('serenity-b4a-task1-%s-legacy-allspots' % state), 2)
    m = grab(sec, r'kings-court\s*\n?\*\*(' + NUM + r')\s*→\s*(' + NUM + r')\*\*',
             c, 'task-1 kings-court series')
    if m:
        for i, state in enumerate(['before', 'after']):
            c.near('task-1 kings-court %s' % state, float(m.group(i + 1)),
                   M('kings-court-b4a-task1-%s-legacy-allspots' % state), 2)

    # ---- 6. the four parenthesised 4-dp readings -------------------------
    for label, pattern, fname in [
        ('note: b4a-task1-after', r'`b4a-task1-after` \((' + NUM + r')\)',
         'serenity-b4a-task1-after-legacy-allspots'),
        ('note: task-1 tip', r'`-after-paintings` \((' + NUM + r')\)',
         'serenity-b4a-task1-after-paintings-legacy-allspots'),
        ("note: task 2's before", r"task 2's before \((" + NUM + r')\)',
         'serenity-b4a-task2-before-legacy-allspots'),
        ('note: b4a-task1-before', r'`b4a-task1-before` \((' + NUM + r')\)',
         'serenity-b4a-task1-before-legacy-allspots'),
    ]:
        m = grab(sec, pattern, c, label)
        if m:
            c.near(label, float(m.group(1)), M(fname), 4)

    # ---- 7. the per-file state table, cell by cell -----------------------
    # The other class the previous script was blind to. Parsed from the
    # document: a deleted row fails on the tag-set check, an edited cell fails
    # on its own comparison.
    rows = re.findall(r'^\|\s*`\*-b4a-task2-(\w+)-legacy-allspots`\s*\|\s*\**(' + NUM +
                      r')\**\s*\|\s*\**(' + NUM + r')\**\s*\|', sec, re.M)
    tags_in_files = sorted({f.split('-b4a-task2-')[1].split('-legacy')[0] for f in t2})
    c.ok('state table: one row per task-2 state',
         sorted(t for t, _, _ in rows) == tags_in_files,
         'README %s vs files %s' % (sorted(t for t, _, _ in rows), tags_in_files))
    for tag, ser, kc in rows:
        c.near('state table: serenity %s' % tag, float(ser),
               M('serenity-b4a-task2-%s-legacy-allspots' % tag), 2)
        c.near('state table: kings-court %s' % tag, float(kc),
               M('kings-court-b4a-task2-%s-legacy-allspots' % tag), 2)

    # ---- 8. the source claim, against the source -------------------------
    # \s+ not ' ': the README hard-wraps at ~79 columns, so any prose pattern
    # spanning more than a few words can have a newline inside it. The first
    # run of this rewrite failed here for exactly that reason -- which is the
    # behaviour wanted (a pattern that cannot match is a failure, never a skip),
    # but the pattern was wrong rather than the document.
    m = grab(sec, r"(\w+)\s+of the file's\s+(\w+)\s+`grid\(\)`\s+call sites", c,
             'grid() call-site count')
    if m:
        src = open(args.bake, encoding='utf-8').read()
        sites = len(re.findall(r'^\s*grid\(', src, re.M))
        c.ok('grid() call sites match bake.js',
             WORDS.get(m.group(2).lower()) == sites,
             'README "%s" (=%s) vs bake.js %d' % (m.group(2), WORDS.get(m.group(2).lower()), sites))
        c.ok('grid() disagreeing count is a subset of the sites',
             WORDS.get(m.group(1).lower(), 0) <= sites,
             'README "%s" of %d' % (m.group(1), sites))

    # ---- 9. the exclusion note higher up the file ------------------------
    excl = grab(readme, r'\*\*Also excluded: every `b4a-\*` file\.\*\*.*?below\.',
                c, 'exclusion note', re.S)
    if excl:
        m = re.search(r'render again\s*[–—-]\s*(' + NUM + r')' + DASH + r'(' + NUM + r')',
                      excl.group(0))
        if c.ok('exclusion note: quotes a range', bool(m), ''):
            c.near('exclusion note: range low', float(m.group(1)), min(row_vals), 2)
            c.near('exclusion note: range high', float(m.group(2)), max(row_vals), 2)
        m2 = re.search(r'`b4a-task1-before`,\s*(' + NUM + r')', excl.group(0))
        if c.ok('exclusion note: quotes task1-before', bool(m2), ''):
            c.near('exclusion note: task1-before value', float(m2.group(1)),
                   M('serenity-b4a-task1-before-legacy-allspots'), 4)

    return c.report()


if __name__ == '__main__':
    sys.exit(1 if main() else 0)
