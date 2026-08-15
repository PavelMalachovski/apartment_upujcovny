# Phase B — resume here

Written 2026-08-14 for a fresh session with none of this conversation's
context; **updated 2026-08-15 as plan 3 closed.** Everything below is either
committed on `phaseB-migration` (plans 1–2, merged to `main` at `c2bb0bd`) or
on `phaseB-plan3-light` (plan 3, branched from that merge), or measured and
recorded on one of them. The original line here said "committed on
`phaseB-migration`" alone, which stopped being true once plan 3 got its own
branch.

**Read this file, then `docs/superpowers/metrics/README.md`, then the plan you
are about to run.** Do not read the older handoff (`docs/PHASE-B-HANDOFF.md`)
as current — it was written before phase B started and several of its facts
have since been measured false; the corrections are in
`docs/PHASE-B-OBSERVATIONS.md` and in the metrics record.

---

## Where the work stands

Branch `phaseB-migration`, PR #27 — **merged** (`c2bb0bd` on `main`). Plan 3
continues on `phaseB-plan3-light`, branched from that merge, with no PR of
its own yet.

| Plan | Scope | State |
|---|---|---|
| 1 — `2026-08-12-phase-b1-migration.md` | r128 → r185 migration | **Done**, 7 tasks, reviewed |
| 2 — `2026-08-13-phase-b2-measurement-exposure.md` | Fix the metric's camera, re-fit exposure | **Done**, 9 tasks, reviewed, final fix wave applied |
| 3 — `2026-08-13-phase-b3-light.md` | Reachable blacks: source fix, BVH sampler, GTAO, lightmap pilot | **Closed.** All 7 tasks done and reviewed, plus a whole-branch review and its fix wave. Two of its three bets measured and **rejected** on their own criteria — GTAO (task 3) and offline lightmaps (task 6). Plan 3 pushed serenity out of the then-current merge gate; that gate was **restated on 2026-08-15** and the 0.03 accepted — see "The gate, restated 2026-08-15" |
| 4 — not yet written | serenity content: B1 geometry, exterior, GLTF, PBR | Not started |
| 5 — not yet written | Re-validate constants, rewrite `CLAUDE.md` and `docs/PROMPT.md` | Not started |

Roughly **10 tasks remain**, all of them in plans 4 and 5, both still to be
written. (An earlier version of this line said "roughly 17 tasks remain across
plans 3–5" and was written while plan 3 still had tasks left; plan 3's
remaining 7 are now done.) Plan 4's model curation is human/asset work, not
agent work — the design spec budgets a day or more per premium property.

**Nothing in plan 3 is "in progress", and it no longer leaves anything open.**
The one thing it did leave open was a decision rather than a task — what to do
about serenity's 0.03 — and the merge owner settled it on 2026-08-15 by
accepting the shortfall and restating the gate. The reasoning, the three
rejected alternatives and the new rules are recorded below.

## The numbers that matter

| Apartment | pre-migration (r128) | end of plan 2 | now, after plan 3 | note |
|---|---:|---:|---:|---|
| serenity | 16.58 | 16.56–16.57 | **16.60–16.61** | now the recorded baseline; the 0.03 was accepted |
| kings-court | 22.44 | 18.73–18.75 | **~18.87–18.90** | now the recorded baseline, replacing 22.44 |
| horkyone-10 | — | — | — | no photographs; accepted on luminance proximity |

Plan 2 closed serenity to parity and PR #27 merged on that basis. **Plan 3
then pushed it back out**, by +0.0516 at full precision — larger than the
±0.039 noise floor, reproduced across two trees and eight readings. That
movement is real and it is attributed (task 2's source fix). What was
decided on 2026-08-15 is that it is **accepted** and that the gate it
tripped was the wrong instrument for the question — see "The gate, restated
2026-08-15" above and "How the 0.03 was resolved" below.

Shipped config: serenity `exposure` **0.329**, kings-court **0.575**,
horkyone-10 **0.46**; bloom threshold **1.8**, strength **0.1**; `?v=107`.
(This line said `?v=106` until 2026-08-15; plan 3's final fix wave `7f90820`
bumped it to 107 and the resume doc was not updated with it. Verified against
`tour/index.html:254`, which is the single module tag that versions
everything.)

## The gate, restated 2026-08-15

**This is the live definition. It replaced the previous one by a merge-owner
decision on 2026-08-15.** Until then the gate was `serenity ≤ 16.58` and
`kings-court ≤ 22.44`, measured all-spot in legacy mode — each apartment's
own final pre-migration score, so the condition read "match your prior self".
Plan 3 left serenity at 16.60–16.61 against that ceiling. **The 0.03
shortfall was accepted deliberately, not tuned away**; the four options are
in "How the 0.03 was resolved" below, and the old thresholds stay in the
metrics record as the measurements they were.

**The all-spot legacy ΔE reading is a regression tripwire, not a quality
ceiling.** It was never able to be the latter. ΔE2000 against these
photographs is dominated by pose and content mismatch rather than by
shading — 9 of serenity's 11 compare spots and 6 of kings-court's 14 fail
pose verification, serenity's living room is modelled with a punched window
where the flat has a sliding door, kings-court's Bathroom 2 has no shower at
all, and two of serenity's worst spots photograph a real swimming pool
against a flat abstraction of one. `metrics/README.md` already states the
consequence outright: *a lighting change moving this metric by 0.05 is not
evidence that the lighting got worse; it is evidence that this metric cannot
arbitrate lighting.* The old gate asked it to arbitrate anyway, at a
resolution of 0.03.

Three rules replace the two thresholds:

1. **Baseline.** Each apartment carries a recorded all-spot legacy value and
   the commit that produced it. Movement inside the noise floor (±0.03
   rounded, ±0.039 full precision) passes silently.
2. **Attribution.** Movement past the floor does *not* fail on sight — it
   must be **attributed** before it is accepted: a same-session paired A/B,
   both arms on the same machine, session and harness, naming the change
   that produced it, committed to the metrics record. **An unattributed
   movement past the floor fails the gate.** This is exactly the discipline
   that made plan 3's regression traceable to task 2 rather than a mystery;
   it is now the rule rather than a habit.
3. **Hard stop.** Any single task that makes an apartment's reading worse by
   more than **0.5** stops the branch and is reported, attributed or not.
   That is the breakage catch the absolute ceilings used to provide.

Baselines as of `b39a99a`, `?v=107`:

| Apartment | Baseline | Recorded at |
|---|---:|---|
| serenity | **16.61** | plan 3 task 7; eight readings spanning 16.59–16.62 |
| kings-court | **18.90** | plan 3 tasks 4 and 7 |
| horkyone-10 | — | no photographs; accepted on luminance proximity only |

**This loosens serenity by 0.03 and tightens kings-court by about 3.5.** The
old 22.44 was kings-court's pre-migration score and the apartment has since
improved to 18.90, so that ceiling carried three and a half points of slack
in which a real regression could have hidden unseen. Re-baselining removes
it. The restatement is not a blanket relaxation, and it must not be quoted
as one.

```bash
# capture: open ?apt=<id>&measure=1&fov=legacy, then in the console
#   await window.__bakeReady; await window.__measure();
python tools/delta_e.py --apt serenity --all-spots --phase <name>
```

**Both halves of that measurement were briefly deleted and have been
restored** — `--all-spots` on `delta_e.py` and the `?fov=legacy` branch in
`measure.js`. If either disappears again the gate becomes unenforceable.

## The five constraints that govern everything left

1. **Re-run the gate after each task that touches a render, never once at the
   end.** Under the restated gate this is no longer a margin-preservation
   habit — it is what makes rule 2 (attribution) possible at all. A movement
   can only be paired against a same-session control if someone measured
   before and after that specific change. Measure once at the end and every
   task's contribution collapses into one unattributable number, which now
   *fails* the gate rather than merely being untidy. serenity is still the
   sensitive one: its margin never had room, plan 3 spent it, and the
   baseline it now carries was set at the edge of the noise floor.
2. **Never fit toward ΔE.** Fit toward the photographs' luminance from
   `tools/luminance.py` and report ΔE as a consequence. Plan 2 caught this
   substitution once: an exposure was chosen as the ΔE minimum and labelled a
   luminance match.
3. **Fit exposure and bloom together.** They are coupled through the same
   buffer; fitting either alone makes it absorb the other's error.
4. **Track the fraction of frame over the bloom threshold, never the peak.**
   The peak scales with render-target size — 9.75 at 240×150 to 16.23 at
   1280×800 — while the fraction holds at 21.4–21.5%.
5. **Never gate on the `poseVerified`-filtered population.** It produces much
   prettier numbers from a smaller set of spots. The thresholds were set
   all-spot. A gate passed by shrinking its population is the failure this
   phase exists to prevent.

## What the metric can and cannot see

`poseVerified` marks spots whose render shows a **different subject** than
their photograph. **serenity passes 2 of 11, kings-court 8 of 14,
horkyone-10 has no scorable spots at all.** The scorers skip the failures; the
spots stay in the config with a `poseNote`, because they are the only
automated trail of the defects they expose.

Those defects are plan 4's work:
- serenity's living room is modelled with a **punched window** where the flat
  has a floor-to-ceiling sliding door (observation B1). Three spots fail on it.
- kings-court's **Bathroom 2 shower was never modelled** — none of that
  config's four `type: "shower"` entries fall inside the room's bounds
  (8.8, 0)–(11.4, 2.6).
- Ten spots across both flats are simply pointed wrong.
- horkyone-10 has **zero** photographic anchors; its exposure rests entirely
  on luminance proximity to two flats, one of which sits at its own noise-floor
  margin.

## Immediately next: plan 3 closed, and it did not do what it set out to do

Plan 3's task 7 ran the closing gate (`aab562d`), measuring both trees at once
— HEAD on :8742 and a detached `c2bb0bd` worktree on :8743, the same scripts
pointed at each — so before and after cannot differ by method.

**Structural: clean.** `__issues` empty, `Sampler.selfTest()` 8/8, zero console
errors, all four walk routes and the sky-leak raycasts matching precedent.
Draw calls through the post chain 72/165/83 desktop and 64/150/64 mobile,
inside both budgets.

**The merge condition now FAILS on serenity.** All-spot legacy reads **16.61
and 16.60** against ≤16.58 — a shortfall of 0.029/0.020 at full precision.
Eight independent readings of this render sit in 16.59–16.62 and **not one has
reached 16.58**. kings-court still passes by ~3.57.

**Plan 3 is what moved it, and the cause is identified.** The base tree reads
16.54/16.56 and passes; the shift is +0.0516 at full precision, larger than
the ±0.039 floor. It is **task 2's source fix**, not task 4's exposure — task 2's
own before/after pair was captured in one session with exposure held at 0.326
on both sides (before `6372939` moved it to 0.329) and reads 16.5427/16.5464 →
16.6027, **+0.058 at constant exposure**; task 4's sweep bounds the whole
0.326→0.329 interval at 0.0027.

**And the plan's own claim did not land either.** Endpoint to endpoint,
spawn-pooled 5th-percentile luminance moved **0.0% on serenity**, −5.4% on
kings-court, −1.2% on horkyone-10. Reachable blacks were this plan's entire
subject, and on the apartment the gate is judged by, nothing moved.

Two of plan 3's three bets were also measured and rejected on their own
criteria, which is the process working rather than failing:

- **GTAO: rejected** (task 3), measured and removed.
- **Offline path-traced lightmaps: NO-GO** (task 6). The pilot missed its
  pre-agreed exit criterion, serenity was reverted to the runtime bake, and
  the loader was removed with it (`3c622d4`, `736a867`).

### How the 0.03 was resolved

**Decided by the merge owner on 2026-08-15: option 3 — accept the 0.03 and
restate the gate.** The decision was put as four options and none of them was
free:

1. **Revert task 2's source fix.** Rejected. It is the only mechanism plan 3
   shipped, and it did buy −5.4% p5 on kings-court.
2. **Re-fit serenity's exposure against the new render.** Rejected, and it
   was already proved impossible before it was offered: a sweep across
   0.30–0.34 in the gate's own camera bottoms at 16.6085, so the best
   exposure anywhere buys 0.0057 of the 0.03. A fit chasing the remainder
   would be fitting toward ΔE, which this phase forbids outright.
3. **Accept the 0.03 and restate the gate.** **Taken.**
4. **Fix the wall-winding defect first and re-measure.** Not taken now, but
   not dropped — it stays deferred to plan 4 or 5 with its own entry below.

The restatement did **not** rest on "the threshold is one noisy historical
reading", which is the weak form of this argument and is the shape of moving
the goalposts. It rests on something the metrics record had already
established independently: this metric is dominated by pose and content
mismatch, so it cannot arbitrate a 0.03 difference in lighting, and the
defects that dominate it are precisely what plan 4 exists to fix. Holding a
16.58 ceiling through plan 4 would have been incoherent regardless of how
today's 0.03 was settled — serenity's ΔE is expected to move by whole points
once the living-room opening, the missing shower and the mis-pointed spots
are corrected.

What replaced it is in "The gate, restated 2026-08-15" above. Note that it
tightens kings-court by about 3.5 points while loosening serenity by 0.03.

**None of this was resolved by tuning, and nothing was re-measured to make it
come out.** Every number in this section was reproduced across two trees and
eight readings before the decision was put.

## How to work in this repo

- Server: `python tools/serve.py`, then `http://localhost:8742/?apt=<id>`.
  **Agents must start it with the sandbox disabled** or its `/save/` endpoint
  returns HTTP 200 while the files silently vanish. Probe for a file on disk
  before trusting any capture.
- The in-app Browser pane will not composite. Render into a full-viewport
  element and take a Playwright screenshot.
- `?check=1` runs the layout validator; `window.__issues` must be empty on all
  three apartments before every commit.
- `?compare=1` opens the render-versus-photograph divider — the only
  instrument that sees geometry errors. `window.__compare(file)`.
- Draw calls go through the post chain (`a.post.render(0)` with
  `info.autoReset` handled); a bare `renderer.render()` undercounts by ~15.
- Bump `?v=` on the **single** module tag in `index.html`, after the last code
  edit.
- Execution method: `superpowers:subagent-driven-development` — a fresh
  implementer per task, a review after each, a whole-branch review at the end.
  Ledgers live in `.superpowers/sdd/<plan-basename>/progress.md` and carry the
  deferred items; read the one for the plan you are running.

## Deferred, with owners

| Item | Owner |
|---|---|
| `vercel.json` still caches the deleted `/three.min.js`; the version-stamped `tour/lib/` gets the generic `max-age=300` | any plan touching deploy |
| No explicit `Cache-Control` on the HTML entry point — now the single point of failure, since one tag versions everything | plan 5 |
| `serve.py`: `%00` in a path raises instead of returning 400; realpath check is TOCTOU-racy in principle | deferred, dev-only, fails closed |
| `CLAUDE.md` beyond the two rows already corrected | plan 5 |
| 5th-percentile shadow luminance never closes | **this is plan 3's whole subject** |
| **`grid()` winds 8 of 12 wall faces backwards** — see below | **plan 4 or 5**, decided 2026-08-14 |
| `.gitignore` covers only `tools/__pycache__/`, not a generic `__pycache__/` rule | any plan touching tooling |

### The wall-winding defect, deferred deliberately

Found by plan 3 task 2, confirmed independently by two reviewers reading the
code. **This is a shipped rendering bug that predates phase B**, and the
decision to defer it was made with the diagnosis in hand, not before it.

`grid()` in `tour/bake.js` emits one fixed triangle order, so a quad's
geometric front face is `uVec × vVec` regardless of the normal passed in. The
merged wall material is `MeshBasicMaterial` with no `side` override, so
backface culling is live. Working through all twelve `grid()` calls per wall
piece, **8 of 12 faces are reversed**: all six of an along-z piece, plus the
top and bottom of an along-x one. Only along-x's four vertical faces are
correct.

So every along-z wall in every apartment currently presents its **far** face,
14 cm from where the visitor thinks it is, shaded from a sample point on the
other side of the wall — outside the building, for a shell wall. It is
invisible today only because walls are flat-shaded.

**The fix is a sign test — reverse the quad when `(uVec × vVec) · n < 0`.**
Not a reversal of the `else` branch: that would leave top and bottom broken
everywhere, and an earlier draft of this write-up said exactly that before it
was corrected.

Three consequences were accepted knowingly when this was deferred:

- **It blocks any wall lightmap atlas.** An atlas baked onto inside-out walls
  records the wrong side. Plan 3 task 2 split that atlas out for this reason,
  and most of that task's intended effect went with it — walls carry most of a
  first-person frame's darkest 5%.
- **It is why GTAO was rejected.** GTAO is the first thing in this pipeline to
  read scene normals; with them pointing away from the viewer it closes the
  hemisphere and multiplies walls to black (plan 3 task 3). That rejection has
  a second, independent ground — a mobile draw-call breach — so it survives
  this fix, but the black walls do not.
- **It expires plan 3 task 4's exposure fit.** That fit is correct for the
  render as it ships today; fixing the winding changes the render and forces a
  re-fit.

Whoever fixes it owns a verification pass of its own: moving those faces moves
apparent room dimensions.
