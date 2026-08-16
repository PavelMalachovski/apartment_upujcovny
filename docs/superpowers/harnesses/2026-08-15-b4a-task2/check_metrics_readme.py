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
beside this file mutates a scratch copy of the README (and of a metrics or
harness JSON) **thirty-seven** different ways and asserts this script exits
non-zero on every one. This run makes **100** assertions. (Both counts have
been stale before: the line said "twelve different ways" from round 3 until the
final whole-branch review, while the self-test grew to 34 and then 37 cases.
They are prose, nothing computes them -- re-read the tail of a real run rather
than trusting them.)

WHAT THIS DOES **NOT** REACH -- read `metrics/README.md`'s scope note with it.
Everything below is read out of ONE section of that README, and it opens only
the task-4 harness directory. Task 2's `sweep.json` and task 3's harness are
never opened, and task 3's own figures in the README are unguarded. The
`metrics/README.md` blockquote that used to claim the chain is machine-checked
"from `sweep.json` outward" has been narrowed to say so.

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
         'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
         'twenty': 20, 'twentyone': 21, 'twenty-one': 21, 'twenty-two': 22,
         'twenty-three': 23, 'twenty-four': 24, 'twenty-five': 25,
         'twenty-six': 26, 'twenty-seven': 27, 'twenty-eight': 28,
         'twenty-nine': 29, 'thirty': 30}
# A word this map does not know resolves to None, which never equals an int, so
# an unknown number word FAILS rather than passing quietly. Extended in plan 4a
# task 3, when the b4a reading count reached nineteen; extended again in plan 4a
# task 4, when it reached twenty-three and the counts first needed a HYPHEN.
# That is why the count patterns below capture `WORD` rather than `\w+`: `\w`
# excludes '-', so "twenty-three" would have matched only its first component
# and compared 20 against 23 -- a pattern that half-matches is worse than one
# that does not match at all, because only the second fails loudly.
WORD = r'[\w-]+'

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


def disagreeing_grid_calls(src):
    """Recompute the '8 of 12' claim from `bake.js`'s own argument lists.

    Each wall quad is emitted as `grid(origin, uVec, vVec, n, ...)`, and grid()
    winds its triangles along uVec x vVec, so the quad's geometric front face
    disagrees with the normal it was handed exactly when
    `(uVec x vVec) . n < 0`. Every component of those three literals is one of
    `0`, `1`, `-1`, or a `w`/`h`/`d` extent with an optional sign, and all
    three extents are strictly positive (builder.js builds each piece as
    centre -/+ size/2), so substituting 1 for every named extent preserves
    every sign in the product. Returns (disagreeing, parsed).

    Nothing is typed here: 8 and 12 both come out of the source file. The
    README's two words are compared against these.
    """
    def vec(s):
        out = []
        for tok in s.strip()[1:-1].split(','):
            tok = tok.strip()
            sign = -1.0 if tok.startswith('-') else 1.0
            out.append(0.0 if tok.lstrip('-') == '0' else sign)
        if len(out) != 3:
            raise SystemExit('grid() argument is not a 3-vector: %r' % s)
        return out

    bad = parsed = 0
    for mm in re.finditer(r'^\s*grid\(\s*\[[^\]]*\],\s*(\[[^\]]*\]),\s*(\[[^\]]*\]),'
                          r'\s*(\[[^\]]*\])', src, re.M):
        u, v, n = (vec(mm.group(i)) for i in (1, 2, 3))
        cross = [u[1] * v[2] - u[2] * v[1],
                 u[2] * v[0] - u[0] * v[2],
                 u[0] * v[1] - u[1] * v[0]]
        parsed += 1
        if sum(cross[k] * n[k] for k in range(3)) < 0:
            bad += 1
    return bad, parsed


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
    # Plan 4a task 4's rounds 2-3 and its two counterfactual-exposure probes are
    # raw probe dumps and live in the harness, not in metrics/ -- the same
    # split task 3 used for `thresh-*.json`. The README quotes them, so the
    # checker has to be able to read them; a quoted figure nothing verifies is
    # the exact hole this script exists to close.
    ap.add_argument('--harness', default=os.path.join(ROOT, 'docs', 'superpowers',
                                                      'harnesses', '2026-08-15-b4a-task4'))
    args = ap.parse_args()

    c = Checks()
    readme = open(args.readme, encoding='utf-8').read()
    M = lambda n: mean_of_rounded(args.metrics, n)                       # noqa: E731
    Hf = lambda n: mean_of_rounded(args.harness, n)                      # noqa: E731

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
        ('count: total b4a readings', r'adds \*\*(' + WORD + r')\*\* all-spot legacy readings', len(files)),
        # The total is a literal `\w+` here, not the word "fifteen": hard-coding
        # it made this pattern stop MATCHING the moment plan 4a task 3 added
        # four more readings and the total became "nineteen", and a
        # non-matching pattern is a failure, not a skip. The count this line
        # asserts is group(1) against len(t2); the total in the same sentence
        # is asserted separately, against len(files), by the
        # 'count: "of the fifteen" agrees' check below. Nothing is weakened.
        ('count: how many are task 2',
         r'\*\*(' + WORD + r') of the ' + WORD + r' are `b4a-task2`', len(t2)),
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
    m = grab(sec, r'\*\*' + WORD + r' of the (' + WORD + r') are `b4a-task2`', c,
             'count: "of the fifteen" agrees')
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
        # The headline number, recomputed from bake.js's own argument lists.
        # It used to be asserted as `WORDS.get(word, 0) <= sites`, which is
        # only "n <= 12" -- and the `, 0` default meant an unrecognised word
        # scored 0 and passed. The whole-branch review proved it empirically:
        # rewriting "eight" to "most", to "zero" or to "twelve" all returned
        # exit 0. The branch's headline claim was guarded by nothing.
        bad, parsed = disagreeing_grid_calls(src)
        c.ok('grid() call sites parsed = call sites counted', parsed == sites,
             'parsed %d vs counted %d' % (parsed, sites))
        c.ok('grid() disagreeing count matches bake.js',
             WORDS.get(m.group(1).lower()) == bad,
             'README "%s" (=%s) vs bake.js %d'
             % (m.group(1), WORDS.get(m.group(1).lower()), bad))

    # ---- 8a. plan 4a task 4: the two-tree gate pair ----------------------
    # Added in task 4. Everything here is compared against a spots[] array;
    # rounds 1 come from metrics/, rounds 2-3 and the probes from the harness.
    T4 = {}
    for apt in ['serenity', 'kings-court']:
        T4[apt] = {
            'BASE': [M('%s-b4a-task4-BASE-legacy-allspots' % apt),
                     Hf('%s-b4a-task4-run2-BASE-b39a99a-legacy-allspots' % apt),
                     Hf('%s-b4a-task4-run3-BASE-b39a99a-legacy-allspots' % apt)],
            'HEAD': [M('%s-b4a-task4-gate-legacy-allspots' % apt),
                     Hf('%s-b4a-task4-run2-HEAD-f0315ea-legacy-allspots' % apt),
                     Hf('%s-b4a-task4-run3-HEAD-f0315ea-legacy-allspots' % apt)],
        }
    avg = lambda v: sum(v) / len(v)                                      # noqa: E731
    # The render/convention split. Fix round 1 replaced task 4's original
    # single-load probes with SAME-LOAD paired control/probe captures, two loads
    # each, at the counterfactual read off task 3's committed sweep. The
    # convention part is a paired within-load difference; the render part is the
    # two-tree total minus it. Superseded probes (e0.306, e0.56) are still in the
    # harness but nothing in the README is computed from them any more.
    SHIP = {'serenity': '0.295', 'kings-court': '0.52'}
    CF = {'serenity': '0.298', 'kings-court': '0.5596'}
    for apt in T4:
        pairs = []
        for L in (1, 2):
            ctl = Hf('%s-b4a-task4-fix1-HEAD-f0315ea-L%d-control-e%s-legacy-allspots'
                     % (apt, L, SHIP[apt]))
            prb = Hf('%s-b4a-task4-fix1-HEAD-f0315ea-L%d-probe-e%s-legacy-allspots'
                     % (apt, L, CF[apt]))
            pairs.append(ctl - prb)
        T4[apt]['convention'] = avg(pairs)
        T4[apt]['total'] = avg(T4[apt]['HEAD']) - avg(T4[apt]['BASE'])
        T4[apt]['render'] = T4[apt]['total'] - T4[apt]['convention']
        T4[apt]['share'] = 100.0 * T4[apt]['convention'] / T4[apt]['total']
        T4[apt]['slope'] = -T4[apt]['convention'] / (float(CF[apt]) - float(SHIP[apt]))
        T4[apt]['breakeven'] = (float(SHIP[apt])
                                + 0.5 * abs(T4[apt]['total']) / T4[apt]['slope'])

    # the two-row table: round 1 of each arm, both apartments
    for label, tag, arm in [('task4 table: BASE row', 'BASE', 'BASE'),
                            ('task4 table: gate row', 'gate', 'HEAD')]:
        m = grab(sec, r'\|\s*`\*-b4a-task4-' + tag + r'-legacy-allspots`\s*\|\s*(' + NUM +
                 r')\s*\|\s*(' + NUM + r')\s*\|', c, label)
        if m:
            c.near(label + ' [serenity]', float(m.group(1)), T4['serenity'][arm][0], 4)
            c.near(label + ' [kings-court]', float(m.group(2)), T4['kings-court'][arm][0], 4)

    # the twelve individual round readings, in the order the sentence lists them
    m = grab(sec, r'serenity BASE\s+(' + NUM + r')/(' + NUM + r')/(' + NUM + r')\s+against tip\s+'
             r'(' + NUM + r')/(' + NUM + r')/(' + NUM + r')[^|]*?kings-court BASE\s+'
             r'(' + NUM + r')/(' + NUM + r')/(' + NUM + r')\s+against tip\s+'
             r'(' + NUM + r')/(' + NUM + r')/(' + NUM + r')', c, 'task4 rounds sentence', re.S)
    if m:
        want = (T4['serenity']['BASE'] + T4['serenity']['HEAD']
                + T4['kings-court']['BASE'] + T4['kings-court']['HEAD'])
        for i, w in enumerate(want):
            c.near('task4 round %d of 12' % (i + 1), float(m.group(i + 1)), w, 4)
        lo = min(abs(v[0] - v[1]) for v in
                 [(max(x), min(x)) for x in [T4[a][k] for a in T4 for k in ('BASE', 'HEAD')]])
        hi = max(abs(v[0] - v[1]) for v in
                 [(max(x), min(x)) for x in [T4[a][k] for a in T4 for k in ('BASE', 'HEAD')]])
        s = grab(sec, r'within-arm spread of (' + NUM + r')' + DASH + r'(' + NUM + r')', c,
                 'task4 spread')
        if s:
            c.near('task4 spread low', float(s.group(1)), lo, 3)
            c.near('task4 spread high', float(s.group(2)), hi, 3)

    # the headline movements, and the render/convention split from the probes
    MINUS = r'[-−]'
    m = grab(sec, r'movement of \*\*' + MINUS + r'(' + NUM + r') on serenity and\s*\n?' +
             MINUS + r'(' + NUM + r') on kings-court\*\*', c, 'task4 headline movements')
    if m:
        c.near('task4 movement serenity', -float(m.group(1)),
               avg(T4['serenity']['HEAD']) - avg(T4['serenity']['BASE']), 2)
        c.near('task4 movement kings-court', -float(m.group(2)),
               avg(T4['kings-court']['HEAD']) - avg(T4['kings-court']['BASE']), 2)

    # the split table: counterfactual, render, convention, convention share
    for apt in ['serenity', 'kings-court']:
        m = grab(sec, r'\|\s*' + apt + r'\s*\|\s*(' + NUM + r')\s*\|\s*\*\*' + MINUS +
                 r'(' + NUM + r')\*\*\s*\|\s*\*\*' + MINUS + r'(' + NUM + r')\*\*\s*\|\s*\*\*(' +
                 NUM + r')%\*\*\s*\|', c, 'task4 split row: ' + apt)
        if m:
            c.near('task4 split %s: counterfactual' % apt, float(m.group(1)),
                   float(CF[apt]), 4)
            c.near('task4 split %s: render part' % apt, -float(m.group(2)),
                   T4[apt]['render'], 3)
            c.near('task4 split %s: convention part' % apt, -float(m.group(3)),
                   T4[apt]['convention'], 3)
            c.near('task4 split %s: convention share' % apt, float(m.group(4)),
                   T4[apt]['share'], 1)

    # the sensitivity sentence: the two slopes and the two break-even points
    m = grab(sec, r'slopes are (' + NUM + r')\s*\(serenity\) and (' + NUM + r')\s*\(kings-court\).*?'
             r'would read 50/50 is \*\*(' + NUM + r')\*\* and\s*\n?\*\*(' + NUM + r')\*\*',
             c, 'task4 sensitivity', re.S)
    if m:
        c.near('task4 slope serenity', float(m.group(1)), T4['serenity']['slope'], 3)
        c.near('task4 slope kings-court', float(m.group(2)), T4['kings-court']['slope'], 3)
        c.near('task4 break-even serenity', float(m.group(3)), T4['serenity']['breakeven'], 4)
        c.near('task4 break-even kings-court', float(m.group(4)), T4['kings-court']['breakeven'], 4)

    # the withdrawn-corroboration paragraph must keep naming the superseded slope
    m = grab(sec, r'inflated kings-court\'s\s+slope\s+from\s+(' + NUM + r')\s+to\s+(' + NUM + r')',
             c, 'task4 superseded slope', re.S)
    if m:
        c.near('task4 corrected slope', float(m.group(1)), T4['kings-court']['slope'], 3)
        old = Hf('kings-court-b4a-task4-probe-HEAD-f0315ea-e0.56-legacy-allspots')
        c.near('task4 superseded slope value', float(m.group(2)),
               (old - avg(T4['kings-court']['HEAD'])) / 0.04, 3)

    # the per-spot disclosures, against the round arrays themselves
    def spot_delta(apt, f):
        base = [json.load(open(os.path.join(d, n), encoding='utf-8'))
                for d, n in [(args.metrics, '%s-b4a-task4-BASE-legacy-allspots.json' % apt),
                             (args.harness, '%s-b4a-task4-run2-BASE-b39a99a-legacy-allspots.json' % apt),
                             (args.harness, '%s-b4a-task4-run3-BASE-b39a99a-legacy-allspots.json' % apt)]]
        head = [json.load(open(os.path.join(d, n), encoding='utf-8'))
                for d, n in [(args.metrics, '%s-b4a-task4-gate-legacy-allspots.json' % apt),
                             (args.harness, '%s-b4a-task4-run2-HEAD-f0315ea-legacy-allspots.json' % apt),
                             (args.harness, '%s-b4a-task4-run3-HEAD-f0315ea-legacy-allspots.json' % apt)]]
        pick = lambda ds: avg([[s['deltaE'] for s in d['spots'] if s['file'] == f][0] for d in ds])
        return pick(head) - pick(base)

    m = grab(sec, r'`7\.webp` \(' + MINUS + r'(' + NUM + r')\) and `6\.webp` \(' + MINUS +
             r'(' + NUM + r')\), together\s*\n?' + MINUS + r'(' + NUM + r') of the ' + MINUS +
             r'(' + NUM + r')', c, 'task4 serenity spot concentration', re.S)
    if m:
        d7, d6 = spot_delta('serenity', '7.webp'), spot_delta('serenity', '6.webp')
        c.near('task4 serenity 7.webp', -float(m.group(1)), d7, 2)
        c.near('task4 serenity 6.webp', -float(m.group(2)), d6, 2)
        c.near('task4 serenity pair contribution', -float(m.group(3)), (d7 + d6) / 11.0, 3)
        c.near('task4 serenity total restated', -float(m.group(4)), T4['serenity']['total'], 3)
    m = grab(sec, r'`1\.webp` \+(' + NUM + r'), `11\.webp` \+(' + NUM + r')\)', c,
             'task4 serenity pose-verified spots')
    if m:
        c.near('task4 serenity 1.webp', float(m.group(1)), spot_delta('serenity', '1.webp'), 2)
        c.near('task4 serenity 11.webp', float(m.group(2)), spot_delta('serenity', '11.webp'), 2)
    m = grab(sec, r'`19\.webp` \(Laundry\), regresses \*\*\+(' + NUM + r')\*\*', c,
             'task4 kings-court 19.webp')
    if m:
        c.near('task4 kings-court 19.webp', float(m.group(1)),
               spot_delta('kings-court', '19.webp'), 2)

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
