"""Sweep the durable record for present-tense assertions plan 4b falsified.

Greps for the CLAIM, not for the number. Every sweep in plan 4b that searched
for digit patterns ('2 of 11', '8 of 14') missed sites, six times running,
because the survivors state the fact in prose and contain no digit pattern.

A hit is OK when a dated marker, a strikethrough or a historical-scoping word
appears in the SAME paragraph, or in the paragraph immediately before it.
Otherwise it is reported as UNMARKED.

Scope is deliberately paragraph-tight rather than a line window. An earlier
draft used a 90-line lookback and, on a document as densely annotated as
PHASE-B-RESUME.md now is, every hit found some marker above it and the check
passed trivially -- it could not fail. That was caught by exercising the
failure path (below) rather than by reading the code.

Known limits, so nobody reads a pass as more than it is:
  - It finds only the claims listed in CLAIMS. A NEW false claim in new
    wording is invisible until someone adds its pattern.
  - It cannot tell a correct marker from a wrong one. It checks that a claim
    is marked, never that the marking is true.
  - It is a backstop for a sweep, not a substitute for one.

Run:  python tools/checks/stale_claims.py
Exit: 0 clean, 1 if any unmarked site remains.

Failure path (run this whenever you change the patterns -- a checker that
cannot fail is worse than none):
    python tools/checks/stale_claims.py --self-test
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

FILES = [
    'docs/PHASE-B-RESUME.md',
    'docs/PHASE-B-OBSERVATIONS.md',
    'docs/superpowers/metrics/README.md',
    'CLAUDE.md',
    'docs/PROMPT.md',
]

# name -> regex for a claim plan 4b falsified
CLAIMS = {
    'punched window':      r'(has|is modelled with|model has) a punched window',
    'no camera angle':     r'No camera angle reproduces',
    'geometry missing':    r'geometry itself is missing',
    'needs recalibration': r'need position/yaw',
    'N currently pass':    r'\d+ currently pass',
    'never modelled here': r'was never modelled\s*\n?\s*here',
    'Plan 4 owns/fixes':   r"Plan 4('s)? (owns|fixes|job)",
    'still present':       r'confirmed still\s*\n?\s*present',
    # A bare stale count. A count written as a transition ('2 of 11 -> 9 of 11')
    # is correct by construction, so skip a hit with an arrow just after it.
    'pose counts':         r'\b(2 of 11|8 of 14|6 of kings-court|9 of serenity)(?![^\n]{0,14}→)',
    'unmerged 4a':         r'(f0315ea`?, unmerged|plan 4a is unmerged|If plan 4a is not merged)',
    'main is at c2bb0bd':  r'`main` is still\s*\n?\s*at `c2bb0bd`',
    'still on main':       r'(Still present on `main`|still open on `main`)',
    'stale exposures':     r'ship today as 0\.329',
}

MARKERS = ('2026-08-19', 'SUPERSEDED', '~~', 'historical', 'dated record',
           'left as observed', 'corrected 2026', 'Struck 2026')


def _para_bounds(lines, i):
    start = end = i
    while start > 0 and lines[start - 1].strip():
        start -= 1
    while end < len(lines) - 1 and lines[end + 1].strip():
        end += 1
    return start, end


def scope(lines, ln):
    """The paragraph containing line `ln` (1-based), plus the ones either side.

    Paragraphs are separated by blank lines. Tight on purpose -- see the module
    docstring for what a line-window scope did wrong. The FOLLOWING paragraph
    is included because this repo's convention puts the narrated marker
    *beside* what it supersedes, and in practice that usually means directly
    under it (the B1/B3/B4 notes sit below their table, not above it).
    """
    i = ln - 1
    start, end = _para_bounds(lines, i)

    prev_end = start - 1
    while prev_end > 0 and not lines[prev_end].strip():
        prev_end -= 1
    prev_start, _ = _para_bounds(lines, prev_end) if prev_end >= 0 else (start, end)

    next_start = end + 1
    while next_start < len(lines) and not lines[next_start].strip():
        next_start += 1
    next_end = end
    if next_start < len(lines):
        _, next_end = _para_bounds(lines, next_start)

    return '\n'.join(lines[prev_start:next_end + 1])


# A stale count stated next to its corrected value is a transition ('before ->
# after'), which is correct by construction. The arrow form is excluded in the
# pattern itself; the table form -- old and new in adjacent cells of one row --
# is caught here.
CORRECTED = ('9 of 11', '10 of 13', '9 of serenity', '3 of kings-court')


def is_transition(line):
    return line.lstrip().startswith('|') and any(c in line for c in CORRECTED)


def sweep():
    unmarked = []
    for rel in FILES:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            print('MISSING FILE', rel)
            continue
        text = open(path, encoding='utf-8').read()
        lines = text.split('\n')
        for name, pat in CLAIMS.items():
            for m in re.finditer(pat, text):
                ln = text[:m.start()].count('\n') + 1
                if is_transition(lines[ln - 1]):
                    continue
                if not any(k in scope(lines, ln) for k in MARKERS):
                    unmarked.append((rel, ln, name, lines[ln - 1].strip()[:90]))
    return unmarked


def self_test():
    """Prove the checker can fail: inject a known-stale claim, expect a hit."""
    target = os.path.join(ROOT, FILES[0])
    original = open(target, encoding='utf-8').read()
    probe = '\n\nThe model has a punched window, and serenity passes 2 of 11.\n'
    try:
        open(target, 'w', encoding='utf-8').write(original + probe)
        hits = sweep()
    finally:
        open(target, 'w', encoding='utf-8').write(original)
    caught = [h for h in hits if h[2] in ('punched window', 'pose counts')]
    print('self-test: injected 1 stale paragraph, checker reported %d matching '
          'hit(s) -- %s' % (len(caught), 'PASS' if caught else 'FAIL'))
    restored = open(target, encoding='utf-8').read() == original
    print('self-test: file restored byte-for-byte -- %s'
          % ('PASS' if restored else 'FAIL'))
    return 0 if (caught and restored) else 1


def main():
    if '--self-test' in sys.argv:
        return self_test()
    unmarked = sweep()
    for rel, ln, name, txt in unmarked:
        print('UNMARKED  %-20s %s:%d  %s' % (name, rel, ln, txt))
    print('checked %d claim patterns over %d files -- %d unmarked site(s)'
          % (len(CLAIMS), len(FILES), len(unmarked)))
    return 1 if unmarked else 0


if __name__ == '__main__':
    sys.exit(main())
