"""Sweep the durable record for present-tense assertions plan 4b falsified.

Greps for the CLAIM, not for the number. Every sweep in plan 4b that searched
for digit patterns ('2 of 11', '8 of 14') missed sites, six times running,
because the survivors state the fact in prose and contain no digit pattern.

A hit is OK only when a dated marker, a strikethrough or a historical-scoping
word appears in the claim's OWN scope. Otherwise it is UNMARKED.

WHAT COUNTS AS THE SCOPE, exactly -- read this before trusting a green run.
The scope is the smallest unit that RENDERS as its own visual element:

  a table row      -> that row alone
  a list item      -> that item alone, at any nesting depth
  anything else    -> the contiguous run of lines around it, where a bare `>`
                      inside a blockquote counts as a break, because it is one

So a marker in a table's header cell covers NO row. A marker on one bullet
covers NO other bullet. A marker in one paragraph of a long narrated
blockquote covers NO other paragraph of it. A marker in a hard-wrapped
paragraph DOES cover that whole paragraph -- it renders as one paragraph, and
splitting it per source line would be wrong rather than stricter.

That scope has been wrong three times, always in the same direction, and every
one of the three made the check pass rather than fail:

  1. A 90-line lookback. PHASE-B-RESUME.md is now annotated densely enough
     that every hit found some marker above it, so nothing could ever fail.
  2. Own paragraph plus the ones either side, searched as one string. A marker
     on an unrelated neighbour then laundered a genuinely unmarked claim --
     and it leaked precisely where new staleness accumulates, next to existing
     annotations, which is the one place it must not.
  3. Own block -- but for a table or a tight list, "one block" is the WHOLE
     table or the WHOLE list, so a marker in a header cell or in an earlier
     row covered every row after it. Fix round 3 created this hole itself, by
     moving a table's scoping marker into its header cell "so it travels with
     the rows"; it travelled to rows nobody had written yet, and a fabricated
     claim inserted as a plain row passed silently.

None of the three was found by reading the code. All three were found by
mutating a document and watching the check stay green.

A fourth leak, found the same way in fix round 4 and NOT a scope bug at all:
a claim hard-wrapped across a line break inside a blockquote has `> ` sitting
in the middle of it, so no pattern matched it. Matching now runs over a
de-quoted copy of the file with whitespace-tolerant patterns (_flatten,
_tolerant), while line numbers still point at the real source line.

Hence five self-test mutations, one per position that has actually leaked --
see self_test(). Three of the five fail against the previous revision of this
file; that is the only evidence any of them mean anything.

What this costs authors: **every stale claim needs its own inline marker**. A
narrated blockquote beside a claim is still the right thing to write for a
human, but it does not satisfy this check on its own. That demand CONFLICTS
with this repo's written convention ("a narrated marker beside what it
supersedes"), and the conflict is not resolved here -- it is a debt row owned
by plan 5 in docs/PHASE-B-RESUME.md, "Deferred, with owners". If your correct,
convention-following edit trips this checker, that row is the argument, not a
bug report.

Known limits. This tool catches ASSERTED claims whose wording is in CLAIMS, in
prose paragraphs, table rows and list items. It does NOT do the following, and
a green run says nothing about any of them:
  - It finds only the claims listed in CLAIMS. A new false claim in new
    wording is invisible until someone adds a pattern. This is not
    hypothetical: 'merge status in prose' was added only after CLAUDE.md:96
    ("`main` still carries the older three until it merges") was found by
    hand, having survived every sweep and the first three versions of this
    file, because it names no commit, no branch and no count.
  - It checks that a claim is MARKED, never that the marking is TRUE. A wrong
    claim inside a correct-looking marker passes -- that is exactly what
    metrics/README.md:460 was. No grep closes this; only reading does.
  - It does not parse fenced code blocks or HTML blocks. A claim inside a
    ``` fence is scoped to the fence, not to anything finer.
  - It cannot tell an assertion from a quotation. A stale claim QUOTED in
    order to correct it is reported like any other, which is why the
    corrections in metrics/README.md carry strikethroughs on the quoted
    phrase. The converse also holds: writing a live claim inside quotation
    marks is a way to defeat this checker, and nothing here detects that.
  - A marker anywhere in a prose paragraph still covers that whole paragraph.
    Appending a fresh claim to the bottom of an old dated paragraph passes.
    This is the design, and it is the design's soft spot.
  - Merge-status claims go stale with nobody editing the file, so a green run
    means nothing once `origin/main` moves. The real check is resolving the
    SHAs: `git merge-base --is-ancestor <sha> origin/main`. Routed to plan 5
    in docs/PHASE-B-RESUME.md, "Deferred, with owners".
  - It is a backstop for a sweep, not a substitute for one.

Run:  python tools/checks/stale_claims.py
Exit: 0 clean, 1 if any unmarked site remains.

Failure path (run this whenever you change the patterns or the scope -- a
checker that cannot fail is worse than none, and this one has been that three
times):
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


_QUOTE = re.compile(r'^(?:\s*>\s?)*')
_ITEM = re.compile(r'^(?:\s*>\s?)*\s*(?:[-*+]|\d+[.)])\s+')


def _is_row(line):
    """A markdown table row (or a table row inside a `>` blockquote)."""
    return _QUOTE.sub('', line).lstrip().startswith('|')


def _is_item(line):
    """The first line of a list item, at any nesting depth, quoted or not."""
    return bool(_ITEM.match(line))


def _is_break(line):
    """Blank as markdown sees it -- including a bare `>` inside a blockquote,
    which separates two quoted paragraphs exactly as a blank line separates
    two unquoted ones. Treating `>` as non-blank is what made a 40-line
    narrated blockquote a single scope, so one dated marker at its top covered
    every paragraph in it, reviewed or not.
    """
    return not _QUOTE.sub('', line).strip()


def scope(lines, ln):
    """The smallest unit that RENDERS as its own visual element around `ln`.

    - a table row      -> that row alone
    - a list item      -> that item alone (its bullet line plus the wrapped
                          continuation lines under it, stopping at the next
                          bullet at ANY depth, or the next table row)
    - anything else    -> the contiguous run of non-blank lines containing it

    Where the line is drawn and why. This scope rule has now failed open three
    times, always the same way -- a marker near the claim being read as a
    marker ON the claim:

      1. a 90-line lookback; every hit found some marker above it,
      2. own paragraph plus the ones either side, searched as one string,
      3. own block -- which for a table or a tight list is the WHOLE table or
         the WHOLE list, so a marker in a header cell or an earlier row
         covered every later row. Fix round 3 created that one itself, by
         moving a table's scoping marker into its header cell "so it travels
         with the rows"; it travelled to rows nobody had written yet.

    The line is now drawn at **what a reader sees as one thing**. A table row
    renders as its own row and a bullet as its own bullet, so each is its own
    scope. A hard-wrapped paragraph renders as ONE paragraph, so it stays one
    scope -- splitting it per source line would be wrong, not stricter, since
    a marker in a paragraph's first sentence really does cover its third. A
    `>` blockquote of prose likewise renders as one quote and stays one scope;
    that is what lets a dated marker at the top of a narrated block cover it.

    What is still NOT scoped, stated plainly rather than implied away:
      - content inside a ``` fence is not parsed; the fence is one block,
      - HTML blocks are not parsed at all,
      - and a marker anywhere in a prose block still covers that whole block,
        which is by design and is also the design's soft spot: appending a
        fresh claim to the bottom of an old dated blockquote passes.
    See the module docstring's known limits; these are limits, not coverage.

    Consequence for authors: every stale claim carries its OWN inline marker.
    A narrated blockquote beside a claim is still the right thing to write for
    a human, but it does not by itself satisfy this check. That demand
    conflicts with this repo's written "narrated marker beside what it
    supersedes" convention and the conflict is plan 5's to settle -- see the
    debt row in docs/PHASE-B-RESUME.md, "Deferred, with owners".
    """
    i = ln - 1
    start = end = i
    while start > 0 and not _is_break(lines[start - 1]):
        start -= 1
    while end < len(lines) - 1 and not _is_break(lines[end + 1]):
        end += 1

    if _is_row(lines[i]):
        return lines[i]

    lo = i
    while lo > start and not _is_item(lines[lo]) and not _is_row(lines[lo]):
        lo -= 1
    if _is_row(lines[lo]):
        lo += 1              # a row above us is a boundary, never a parent
    elif not _is_item(lines[lo]):
        lo = start           # no bullet above: ordinary prose / lead-in text

    hi = i
    while hi < end and not _is_item(lines[hi + 1]) and not _is_row(lines[hi + 1]):
        hi += 1
    return '\n'.join(lines[lo:hi + 1])


# A stale count stated next to its corrected value is a transition ('before ->
# after'), which is correct by construction. The arrow form is excluded in the
# pattern itself; the table form -- old and new in adjacent cells of one row --
# is caught here.
CORRECTED = ('9 of 11', '10 of 13', '9 of serenity', '3 of kings-court')


def is_transition(line):
    return line.lstrip().startswith('|') and any(c in line for c in CORRECTED)


def _flatten(lines):
    """De-quoted text plus a char -> source-line-index map.

    Claims are matched against THIS, not against the raw file, for one reason
    found by mutation in fix round 4: a claim hard-wrapped across a line break
    inside a blockquote has `> ` sitting in the middle of it, so no pattern
    matches. The planted probe
        > The living room model has a punched window, and the geometry
        > itself is missing.
    was caught on its first claim and silently missed on its second. Stripping
    the quote prefix and keeping the newline lets the whitespace-tolerant
    patterns (see _tolerant) span the wrap while line numbers stay honest.
    """
    parts, owner = [], []
    for idx, raw in enumerate(lines):
        bare = _QUOTE.sub('', raw)
        parts.append(bare)
        owner.extend([idx] * len(bare))
        parts.append('\n')
        owner.append(idx)
    return ''.join(parts), owner


def _tolerant(pat):
    """Let any literal space in a pattern match a line wrap as well.

    `\\s` includes the newline, so 'a punched window' now matches across a
    hard wrap. Over-matching is the safe direction here -- a false positive
    costs one marker, a miss costs a wrong fact in the durable record.

    CAUTION for whoever adds a pattern: this is a plain textual substitution,
    so a literal space inside a character class would be rewritten too. No
    pattern in CLAIMS has one; keep it that way, or teach this function.
    """
    return pat.replace(' ', r'\s+')


def sweep():
    unmarked = []
    for rel in FILES:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            print('MISSING FILE', rel)
            continue
        lines = open(path, encoding='utf-8').read().split('\n')
        flat, owner = _flatten(lines)
        for name, pat in CLAIMS.items():
            for m in re.finditer(_tolerant(pat), flat):
                ln = owner[m.start()] + 1
                if is_transition(lines[ln - 1]):
                    continue
                if not any(k in scope(lines, ln) for k in MARKERS):
                    unmarked.append((rel, ln, name, lines[ln - 1].strip()[:90]))
    return unmarked


def _mutate(target, original_bytes, mutated, want):
    """Write `mutated`, sweep, restore, and report whether `want` was caught.

    BINARY save and restore, and a BYTE comparison, both deliberately.

    The previous version did all three in text mode. On Windows that means the
    read translates CRLF to LF and the write translates LF back to os.linesep,
    so restoring an LF-committed file silently rewrote every line ending in it
    -- and the "restored byte-for-byte" check, reading in text mode too, could
    not see its own damage and printed PASS. Three fix rounds reported that
    PASS while `git status` showed the files modified. An unearned green tick
    inside the function whose entire job is to prove the tool fails honestly
    is the worst place in this file to have one.
    """
    try:
        with open(target, 'wb') as f:
            f.write(mutated.encode('utf-8'))
        hits = sweep()
    finally:
        with open(target, 'wb') as f:
            f.write(original_bytes)
    caught = [h for h in hits if h[2] in want]
    with open(target, 'rb') as f:
        restored = f.read() == original_bytes
    return caught, restored


def self_test():
    """Prove the checker can fail, and fail WHERE failures actually occur.

    Five mutations, because they guarantee different things and each one
    corresponds to a bug that shipped green:

      1. at file end -- proves the failure path executes at all. This is what
         caught the original 90-line-window bug.
      2. immediately after an existing marked blockquote -- proves it executes
         where new staleness accumulates, which is next to existing
         annotations. Mutation 1 passed while mutation 2 leaked for a whole
         fix round: `scope()` was concatenating the neighbouring paragraphs,
         so a marker on an unrelated neighbour laundered an unmarked claim.
      3. as a TABLE ROW under a marked header -- fix round 3 moved a table's
         scoping marker into its header cell so it would "travel with the
         rows", and it travelled to rows nobody had written. Mutations 1 and 2
         both passed while a fabricated row rode in silently.
      4. as a LIST ITEM under a marked parent bullet -- the same mechanism in
         the other tight container. A bullet list has no blank lines either,
         so before this round one marked bullet covered every bullet under it.
      5. HARD-WRAPPED across a line break inside a marked blockquote -- not a
         scope bug but a matching one: the `> ` prefix landed in the middle of
         the claim. Mutations 1-4 all plant single-line claims and none of
         them could ever have found it.

    Keep all five. Each was invisible to every mutation written before it;
    that is the only evidence any of them work. 3, 4 and 5 all report zero
    hits against the previous revision of this file -- check that again if you
    ever rewrite scope() or sweep().
    """
    target = os.path.join(ROOT, FILES[0])
    with open(target, 'rb') as f:
        original_bytes = f.read()
    # Parse from a newline-normalised copy; restore from the exact bytes.
    original = original_bytes.decode('utf-8').replace('\r\n', '\n')
    lines = original.split('\n')
    ok = True

    caught, restored = _mutate(
        target, original_bytes,
        original + '\n\nThe model has a punched window, and serenity passes 2 of 11.\n',
        ('punched window', 'pose counts'))
    print('self-test 1 (claim at file end): %d hit(s) -- %s'
          % (len(caught), 'PASS' if caught else 'FAIL'))
    ok &= bool(caught) and restored

    # 2. Find a marked blockquote and plant an unmarked claim directly after it.
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
    caught, restored2 = _mutate(target, original_bytes, adjacent, ('still on main',))
    print('self-test 2 (claim adjacent to a marker): %d hit(s) -- %s'
          % (len(caught), 'PASS' if caught else 'FAIL'))
    ok &= bool(caught) and restored2

    # 3. A fabricated row smuggled into a table whose header carries a marker.
    row_at = next((i for i, l in enumerate(lines)
                   if _is_row(l) and any(k in l for k in MARKERS)
                   and i + 2 < len(lines) and _is_row(lines[i + 2])), None)
    if row_at is None:
        print('self-test 3 (claim as a table row under a marked header): '
              'FAIL -- no marked table header found to anchor the mutation')
        return 1
    smuggled = '\n'.join(lines[:row_at + 2]
                         + ['| the model has a punched window | x | x |']
                         + lines[row_at + 2:])
    caught, restored3 = _mutate(target, original_bytes, smuggled, ('punched window',))
    print('self-test 3 (claim as a table row under a marked header): %d hit(s) -- %s'
          % (len(caught), 'PASS' if caught else 'FAIL'))
    ok &= bool(caught) and restored3

    # 4. A fabricated bullet appended under a marked bullet in the same list.
    item_at = next((i for i, l in enumerate(lines)
                    if _is_item(l) and any(k in l for k in MARKERS)), None)
    if item_at is None:
        print('self-test 4 (claim as a list item under a marked bullet): '
              'FAIL -- no marked list item found to anchor the mutation')
        return 1
    tail = item_at
    while tail < len(lines) - 1 and not _is_break(lines[tail + 1]) \
            and not _is_item(lines[tail + 1]):
        tail += 1
    pre = _QUOTE.match(lines[item_at]).group(0)
    nested = '\n'.join(lines[:tail + 1]
                       + [pre + '- the geometry itself is missing']
                       + lines[tail + 1:])
    caught, restored4 = _mutate(target, original_bytes, nested, ('geometry missing',))
    print('self-test 4 (claim as a list item under a marked bullet): %d hit(s) -- %s'
          % (len(caught), 'PASS' if caught else 'FAIL'))
    ok &= bool(caught) and restored4

    # 5. A claim HARD-WRAPPED across a line break, inside a marked blockquote,
    #    after one of the quote's own bare `>` separators. Two mechanisms at
    #    once, and both had to be fixed for it to pass: the `> ` prefix used to
    #    sit in the middle of the claim so no pattern matched it at all, and a
    #    bare `>` used to count as non-blank so the whole quote was one scope.
    quoted = next((i for i, l in enumerate(lines)
                   if l.startswith('>') and any(k in l for k in MARKERS)), None)
    sep = None
    if quoted is not None:
        j = quoted
        while j < len(lines) - 1 and lines[j + 1].lstrip().startswith('>'):
            j += 1
            if lines[j].strip() == '>':
                sep = j
                break
    if sep is None:
        print('self-test 5 (claim wrapped across lines inside a marked quote): '
              'FAIL -- no marked blockquote with an internal separator found')
        return 1
    wrapped = '\n'.join(lines[:sep + 1]
                        + ['> The living room model has a punched window, and',
                           '> the geometry itself is missing.', '>']
                        + lines[sep + 1:])
    caught, restored5 = _mutate(target, original_bytes, wrapped,
                                ('punched window', 'geometry missing'))
    print('self-test 5 (claim wrapped across lines inside a marked quote): '
          '%d hit(s) -- %s' % (len(caught), 'PASS' if len(caught) == 2 else 'FAIL'))
    ok &= len(caught) == 2 and restored5

    with open(target, 'rb') as f:
        restored_final = f.read() == original_bytes
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
