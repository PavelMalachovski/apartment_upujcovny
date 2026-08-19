"""Sweep the durable record for present-tense assertions plan 4b falsified.

Greps for the CLAIM, not for the number. Every sweep in plan 4b that searched
for digit patterns ('2 of 11', '8 of 14') missed sites, six times running,
because the survivors state the fact in prose and contain no digit pattern.

A hit is OK only when a dated marker, a strikethrough or a historical-scoping
word appears in the claim's OWN block -- the contiguous run of non-blank lines
containing it. Neighbouring paragraphs do not count. Otherwise it is UNMARKED.

That scope has been wrong twice, in the same direction, and both bugs made the
check pass rather than fail:

  1. A 90-line lookback. PHASE-B-RESUME.md is now annotated densely enough
     that every hit found some marker above it, so nothing could ever fail.
  2. Own paragraph plus the ones either side, searched as one string. A marker
     on an unrelated neighbour then laundered a genuinely unmarked claim --
     and it leaked precisely where new staleness accumulates, next to existing
     annotations, which is the one place it must not.

Neither was found by reading the code; both were found by mutating a document
and watching the check stay green. Hence two self-test mutations, not one --
see self_test().

What this costs authors, and it matches the repo's convention anyway: **every
stale claim needs its own inline marker**. A narrated blockquote beside a
claim is still the right thing to write for a human, but it does not satisfy
this check on its own -- the claim itself needs a strikethrough or a bracketed
pointer, which is what a reader landing mid-document needs too.

Known limits, so nobody reads a pass as more than it is:
  - It finds only the claims listed in CLAIMS. A new false claim in new
    wording is invisible until someone adds a pattern. This is not
    hypothetical: 'merge status in prose' was added only after CLAUDE.md:96
    ("`main` still carries the older three until it merges") was found by
    hand, having survived every sweep and the first three versions of this
    file, because it names no commit, no branch and no count.
  - It checks that a claim is MARKED, never that the marking is TRUE. A wrong
    claim inside a correct-looking marker passes -- that is exactly what
    metrics/README.md:460 was. No grep closes this; only reading does.
  - Merge-status claims go stale with nobody editing the file, so a green run
    means nothing once `origin/main` moves. The real check is resolving the
    SHAs: `git merge-base --is-ancestor <sha> origin/main`. Routed to plan 5
    in docs/PHASE-B-RESUME.md, "Deferred, with owners".
  - It is a backstop for a sweep, not a substitute for one.

Run:  python tools/checks/stale_claims.py
Exit: 0 clean, 1 if any unmarked site remains.

Failure path (run this whenever you change the patterns or the scope -- a
checker that cannot fail is worse than none):
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
    # Merge status asserted in prose. This shape is why CLAUDE.md:96 ("`main`
    # still carries the older three until it merges") survived every earlier
    # sweep AND the first three versions of this checker: it names no commit,
    # no count and no branch, so nothing pattern-matched it. It also goes stale
    # SILENTLY -- a merge elsewhere falsifies it with nobody editing the file.
    # Kept deliberately broad; a false positive costs one marker, a miss costs
    # a fresh session reading a wrong fact out of the first file it opens.
    'merge status in prose': (r'(still carries|until it merges|once (it|4a|4b|this) '
                              r'(merges|lands)|when 4[abc] merges|not yet merged|'
                              r'awaiting merge|unmerged branch tip)'),
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
    """The claim's OWN block only -- the contiguous run of non-blank lines
    containing line `ln` (1-based).

    Neighbouring paragraphs are deliberately NOT included. An earlier draft
    concatenated the previous and following paragraphs and searched the lot,
    so a marker on an unrelated neighbour laundered an actually-unmarked
    claim -- and it leaked exactly where new staleness accumulates, next to
    existing annotations. A marker now only counts for the block it is in.

    Consequence for authors, and it is the repo's convention anyway: every
    stale claim carries its OWN inline marker. A narrated blockquote beside a
    claim is still the right thing to write for a human, but it does not by
    itself satisfy this check -- the claim needs a strikethrough or a
    bracketed pointer of its own, which is what a reader landing mid-document
    needs too. A multi-line blockquote counts as one block, so a dated marker
    at the top of a `>` block covers that whole block.
    """
    i = ln - 1
    start = end = i
    while start > 0 and lines[start - 1].strip():
        start -= 1
    while end < len(lines) - 1 and lines[end + 1].strip():
        end += 1
    return '\n'.join(lines[start:end + 1])


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


def _mutate(target, original, mutated, want):
    """Write `mutated`, sweep, restore, and report whether `want` was caught."""
    try:
        open(target, 'w', encoding='utf-8').write(mutated)
        hits = sweep()
    finally:
        open(target, 'w', encoding='utf-8').write(original)
    caught = [h for h in hits if h[2] in want]
    restored = open(target, encoding='utf-8').read() == original
    return caught, restored


def self_test():
    """Prove the checker can fail, and fail WHERE failures actually occur.

    Two mutations, because they guarantee different things:

      1. at file end -- proves the failure path executes at all. This is what
         caught the original 90-line-window bug.
      2. immediately after an existing marked blockquote -- proves it executes
         where new staleness accumulates, which is next to existing
         annotations. Mutation 1 passed while mutation 2 leaked for a whole
         fix round: `scope()` was concatenating the neighbouring paragraphs,
         so a marker on an unrelated neighbour laundered an unmarked claim.
         Mutation 1 could never have found that. Keep both.
    """
    target = os.path.join(ROOT, FILES[0])
    original = open(target, encoding='utf-8').read()
    ok = True

    caught, restored = _mutate(
        target, original,
        original + '\n\nThe model has a punched window, and serenity passes 2 of 11.\n',
        ('punched window', 'pose counts'))
    print('self-test 1 (claim at file end): %d hit(s) -- %s'
          % (len(caught), 'PASS' if caught else 'FAIL'))
    ok &= bool(caught) and restored

    # Find a marked blockquote and plant an unmarked claim directly after it.
    lines = original.split('\n')
    anchor = next((i for i, l in enumerate(lines)
                   if l.startswith('>') and '2026-08-19' in l), None)
    if anchor is None:
        print('self-test 2 (claim adjacent to a marker): FAIL -- no marked '
              'blockquote found to anchor the mutation')
        return 1
    end = anchor
    while end < len(lines) - 1 and lines[end + 1].strip():
        end += 1
    adjacent = '\n'.join(lines[:end + 1]
                         + ['', 'Still present on `main`.', '']
                         + lines[end + 1:])
    caught, restored2 = _mutate(target, original, adjacent, ('still on main',))
    print('self-test 2 (claim adjacent to a marker): %d hit(s) -- %s'
          % (len(caught), 'PASS' if caught else 'FAIL'))
    ok &= bool(caught) and restored2

    restored_final = open(target, encoding='utf-8').read() == original
    print('self-test: file restored byte-for-byte -- %s'
          % ('PASS' if restored_final else 'FAIL'))
    return 0 if (ok and restored_final) else 1


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
