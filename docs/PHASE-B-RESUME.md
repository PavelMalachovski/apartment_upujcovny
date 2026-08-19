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
| 4a — `2026-08-15-phase-b4a-winding-walls.md` | Wall winding, walls taking their own light, the re-fit both force | **Done**, 5 tasks, reviewed, whole-branch review and its fix wave applied. Fixed a shipped rendering bug older than phase B; the wall-shading trial returned **NO-GO** and reverted |
| 4b — `2026-08-16-phase-b4b-content-poses.md` | serenity's terrace opening, kings-court's missing shower, the mis-pointed and mis-mapped `photoSpots` | **Done**, 5 tasks, each reviewed with a fix round. Branch `phaseB-plan4b-content` off `5963ddd`, `?v=113 → 121`, no PR yet. **The largest metric movement in phase B and not one line of rendering code:** serenity 16.00 → **15.49**, kings-court 18.59 → **18.17** on a fixed 14-spot population, shipping **17.59** on 13. `poseVerified` 2 of 11 → 9 of 11 and 8 of 14 → 10 of 13. Task 1's "floor-to-ceiling slider" premise was **disproved** and only the width widened |
| 4c — not yet written | HDRI and exterior, GLTF furniture, PBR/KTX2 | **Deliberately not written.** Its critical path is human asset curation, and a plan whose bottleneck is someone else's time is better written when that is settled |
| 5 — `2026-08-16-phase-b5-revalidate-and-docs.md` | Re-validate every constant, rewrite `CLAUDE.md` and `docs/PROMPT.md`, close the deploy caching hole | **Written, not started.** 5 tasks. **Plan 4b routed ~~three~~ six items into it** (corrected 2026-08-19, fix round 4 — rounds 2–4 each added one and left the count reading three, which is this document’s own recurring defect) and none is in its written scope yet: serenity's `mainCeilH: 2.6` (re-pointed here from 4c — see "Deferred, with owners"), kings-court's `meta.photoFovLong: 120` measured at ~57–58°, the unsettled per-spot noise floor (0.35 vs 0.75), what varies across a page load, resolving every commit SHA named in the docs against `origin/main`, and the `stale_claims.py`-vs-marker-convention conflict |

**"Plan 4" was one line and three different kinds of work** — engine code,
config geometry, and an asset-curation effort the design spec budgets at a day
or more of *human* work per property. It was split on 2026-08-15 so its code
half would not wait on its human half. 4a shipped; 4b is written; 4c waits on
a decision about who curates the assets.

~~**Ten tasks are written and unstarted** (5 in 4b, 5 in plan 5)~~ **Five are:
plan 5's. 4b's five are done** (updated 2026-08-19 by plan 4b task 5), plus 4c
whenever it is written. **4b is the one that matters most**: ~~nine of
serenity's eleven `compare` spots~~ and ~~six of kings-court's fourteen~~
**three of kings-court's thirteen** fail pose
verification, and that — not lighting — is what dominates the metric every
other plan has been judged by.

> **Superseded for serenity, 2026-08-19 by plan 4b task 2** (`1e0d4e5`): six
> mis-pointed spots were re-pointed and the one attached to the bathroom
> photograph was moved into the bathroom, so **serenity now fails 2 of 11, not
> 9** — `2.webp` and `10.webp`, the pool vista, which is a content defect
> (no pool geometry, no sky) owned by 4c. ~~kings-court's six are untouched and
> the sentence still stands for it.~~ The paragraph's *thesis* is unchanged and
> was confirmed, not weakened: re-pointing those seven moved serenity's
> all-spot legacy gate 15.97 → 15.49 without a line of renderer code, which is
> the largest single movement in phase B and exactly the "pose dominates the
> metric" claim being made here.
>
> **Two corrections to that last sentence, 2026-08-19 by task 5 fix round 1 —
> the conclusion survives both.** (1) **`15.97 → 15.49` is a cross-session
> pair**, which is the exact shape the restated gate's rule 2 forbids: 15.97
> is task 2's own session BEFORE-figure, while 15.49 is task 5's tip reading
> from a different session. Task 5's own same-session BASE is **16.00**, so
> the properly-paired branch movement is **16.00 → 15.49, −0.51**. The
> difference is 0.03 and changes nothing, but a cross-session pair should not
> stand in this document unlabelled. (2) **The movement is not all task 2's.**
> Task 5's per-spot data shows `3.webp` (−0.29) and `9.webp` (−0.43) are
> shared with **task 1's** terrace widening, which task 2's cameras were
> pointed at. Task 2's own share is carried by `6.webp` (−2.65) and `7.webp`
> (−1.38), which is more than the whole movement on its own.
>
> **Superseded for kings-court too, 2026-08-19 by plan 4b task 4** (`d7a643b`).
> The struck sentence above was written by task 2 and was true then; task 4
> falsified it four commits later. Four kings-court cameras were re-pointed
> and `4.webp` left the `compare` set on the merge owner's ruling, so
> **kings-court fails 3 of 13, not 6 of 14** — `14.webp` and `17.webp`
> (defective subjects in the model, not mis-aimed cameras) and `18.webp` (the
> rattan set does not exist). **Across both flats: 10 of 25 spots passed at
> the merge-base; 19 of 24 pass now.** Closing-gate figures, measured by task
> 5 against `5963ddd` in one session: serenity **16.00 → 15.49**;
> kings-court **18.59 → 18.17 on one fixed 14-spot population**, shipping at
> **17.59** on 13. **No renderer, bake, post-processing, material or shader
> code changed anywhere in this branch** — the numbers moved because the
> metric began comparing like with like and because two objects that were
> missing or wrong got fixed.

**Nothing in plan 3 is "in progress", and it no longer leaves anything open.**
The one thing it did leave open was a decision rather than a task — what to do
about serenity's 0.03 — and the merge owner settled it on 2026-08-15 by
accepting the shortfall and restating the gate. The reasoning, the three
rejected alternatives and the new rules are recorded below.

## The numbers that matter

| Apartment | pre-migration (r128) | end of plan 2 | now, after plan 3 | note |
|---|---:|---:|---:|---|
| serenity | 16.58 | 16.56–16.57 | **16.60–16.61** | superseded — plan 4a task 4 rebaselined to 16.00 |
| kings-court | 22.44 | 18.73–18.75 | **~18.87–18.90** | superseded — plan 4a task 4 rebaselined to 18.58 |
| horkyone-10 | — | — | — | no photographs; accepted on luminance proximity |

The "after plan 3" column is the record as of `b39a99a` and is left as measured.
The **live** baselines are plan 4a task 4's, in the table under "The gate,
restated 2026-08-15" below; read that one before quoting a number.

Plan 2 closed serenity to parity and PR #27 merged on that basis. **Plan 3
then pushed it back out**, by +0.0516 at full precision — larger than the
±0.039 noise floor, reproduced across two trees and eight readings. That
movement is real and it is attributed (task 2's source fix). What was
decided on 2026-08-15 is that it is **accepted** and that the gate it
tripped was the wrong instrument for the question — see "The gate, restated
2026-08-15" above and "How the 0.03 was resolved" below.

Shipped config **on `main` (`c2bb0bd`, and at `b39a99a`)**: serenity `exposure`
**0.329**, kings-court **0.575**, horkyone-10 **0.46**; bloom threshold **1.8**,
strength **0.1**; `?v=107`.
(This line said `?v=106` until 2026-08-15; plan 3's final fix wave `7f90820`
bumped it to 107 and the resume doc was not updated with it. Verified against
`tour/index.html:254`, which is the single module tag that versions
everything.)

**On branch `phaseB-plan4a-winding` (`f0315ea`, ~~unmerged~~ **merged — PR
#30, `feac92a`; `f0315ea` is an ancestor of `origin/main`, corrected
2026-08-19 by plan 4b task 5 fix round 2 after checking the merge base
directly**)** plan 4a task 3
re-fitted every exposure against the post-winding render: serenity **0.295**,
kings-court **0.52**, horkyone-10 **0.42**; bloom unchanged at threshold
**1.8** / strength **0.1**; `?v=110`. The baseline table below is measured
against that tip. (Plan 4a task 5 then bumped the tree to `?v=111`, and to
**`?v=112`** in its fix round, both for comment-only rewrites in
`tour/bake.js`. No shader, constant or config value moved with either, so
every baseline below still stands unremeasured — the bumps follow the
precedent that any edit to a shipped file bumps the cache tag, `?v=100 → 101`
for a `post.js` header pointer. Proved rather than asserted: strip every
`^\s*//` line from both revisions of `bake.js` and the remainder is
byte-identical, md5 `e22e63e5…` on both sides.)

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
shading — ~~9 of serenity's 11 compare spots~~ **2 of serenity's 11** and
~~6 of kings-court's 14~~
**3 of kings-court's 13** (corrected 2026-08-19, plan 4b task 4 fix round 1
— see the baseline table below for the population change this reflects)
fail pose verification, ~~serenity's living room is modelled with a punched window
where the flat has a sliding door~~, ~~kings-court's Bathroom 2 has no shower at
all~~, and two of serenity's worst spots photograph a real swimming pool
against a flat abstraction of one.

> **Three clauses of that sentence were falsified by plan 4b and are struck
> here, 2026-08-19 by task 5 — but its thesis was CONFIRMED, not weakened,
> and that is why the sentence stays.** Fix round 1 corrected only the
> kings-court count and left the other three; this is the fourth sweep of
> these figures in this plan and each earlier one missed sites, so it was done
> by search this time rather than from memory. What changed: serenity's
> failures went 9 → **2** (task 2 re-pointed six cameras and re-mapped one);
> the punched window **never existed** by the time the sentence was written
> and the photograph is not a floor-to-ceiling slider either (task 1 measured
> the head at 1.95–2.10 m, which `DOOR_H` 2.05 already builds, and widened
> only the width); Bathroom 2 **has a shower** (task 3 built it). Only the
> pool clause survives untouched, and it is 4c's.
>
> **Why this strengthens the paragraph.** Its claim is that this metric is
> dominated by pose and content mismatch rather than by shading. Plan 4b
> tested exactly that by fixing *only* pose and content: serenity **16.00 →
> 15.49**, kings-court **18.59 → 18.17** on one fixed population — larger
> than seven tasks of lighting work achieved — **without changing one line of
> renderer, bake, post-processing, material or shader code.** The evidence
> list above got shorter because the work was done, not because the argument
> failed. And the conclusion still holds: what now dominates the residual is
> furniture on the wrong walls, missing pool and sky, a mirrored bathroom, a
> wardrobe through a wall, and a field of view measured at half its configured
> value — content, still not shading.

`metrics/README.md` already states the
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

Baselines as of `f0315ea` (branch `phaseB-plan4a-winding`, plan 4a tasks 1–3
applied), `?v=110`:

| Apartment | Baseline | Recorded at |
|---|---:|---|
| serenity | ~~**16.00**~~ | plan 4a task 4; three-round mean 15.9973, readings 15.9891 / 16.0055 / 15.9973 |
| kings-court | ~~**18.58**~~ | plan 4a task 4; three-round mean 18.5757, readings 18.5864 / 18.5643 / 18.5764 |
| horkyone-10 | — | no photographs; accepted on luminance proximity only |

### The live baselines, as of plan 4b — read these, not the table above

**Recorded 2026-08-19 by plan 4b task 5** at branch `phaseB-plan4b-content`
tip, `?v=121`. The table above is kept as the plan-4a record it is; **these
supersede it.**

| Apartment | Baseline | Population | Recorded at |
|---|---:|---|---|
| serenity | **15.49** | 11 (unchanged all branch) | plan 4b task 5; two rounds 15.4982 / 15.4800, spread 0.018. `serenity-b4b-task5-gate-legacy-allspots[-repeat].json` |
| kings-court | **17.59** | **13** — changed from 14 by `d7a643b` | plan 4b task 5; two rounds 17.5792 / 17.5931, spread 0.014. `kings-court-b4b-task5-gate-legacy-allspots-pop13[-repeat].json` |
| horkyone-10 | — | — | no photographs; accepted on luminance proximity only |

**Two conditions attached to quoting these, and neither is optional.**

**1. kings-court's 17.59 is on a 13-spot population and is not comparable to
any earlier kings-court number on sight.** The like-for-like reading — same
fourteen spots as the merge-base — is **18.17**. The gap between 18.17 and
17.59 is **−0.56 of pure arithmetic**, re-derived here rather than quoted:
`(25.55 − 18.1871)/13 = 0.5664` and `(25.46 − 18.1521)/13 = 0.5621` on this
task's own two rounds. **Nothing about the render produced it.** Check the
commit *and* the population before comparing anything to 17.59.

**2. The movement is a measurement correction, not a rendering improvement.**
**No renderer, bake, post-processing, material or shader code changed anywhere
in plan 4b.** Both numbers moved because eleven cameras across two flats were
re-pointed at the subjects their photographs actually show — the metric began
comparing like with like — and because two objects that were missing or wrong
got fixed (kings-court's Bathroom 2 shower, which had never been modelled at
all, and that bathroom's inverted marble).

| Apartment | old → new | movement | attribution, all measured same-session against `5963ddd` |
|---|---|---:|---|
| serenity | 16.00 → **15.49** | **−0.51** | task 1 widened the terrace opening 1.4 → 1.8 m; task 2 re-pointed six cameras and moved `8.webp` into the bathroom its photograph shows. Carried by `6.webp` −2.65 and `7.webp` −1.38; the four untouched spots all moved ≤0.10 |
| kings-court (14-spot, like-for-like) | 18.59 → **18.17** | **−0.42** | task 3 built the Bathroom 2 shower and un-inverted its marble; task 4 re-pointed four cameras. Carried by `14.webp` −4.03, `2.webp` −1.54, `10.webp` −1.15, against `17.webp` **+1.00 — a deliberate regression**, because the old pose rendered a blank wall that matched a white-marble photograph better than the vanity does. The nine untouched spots all moved ≤0.10 |
| kings-court (13-spot, shipped) | — | — | **17.59.** 18.17 less the −0.56 of removal arithmetic above. **The chain leaves 0.02 over — 18.17 − 0.56 = 17.61, not 17.59 — and that residual is cross-load, not unexplained** (added 2026-08-19, fix round 1). The −0.56 is derived *same-load* from the pop14 legs, which put mean₁₃ at 17.6054; the separately-measured pop13 legs read 17.5862. The 0.019 gap is two different page loads of one render state, inside these legs' own 0.014–0.048 mean band. The same-load derivation is the one to trust — it is the only one with no load noise in it — and the shipped figure is the one actually measured on the shipped population |

**Rules 1–3, checked.** Both movements are far past the noise floor and both
are **attributed** per rule 2, with a same-session paired A/B on the same
machine and harness (three trees on ports 8742/8743/8744, one browser
session, two rounds per leg). The **hard stop is not tripped**: no apartment's
reading got worse at all. The BASE arm reproduced plan 4a's recorded serenity
baseline of **16.00 exactly**, which is what licenses reading the movement as
the branch's rather than the session's.

**And the noise floor itself moved, wider.** Enumerated across *every*
committed same-state capture set in `docs/superpowers/metrics/` — not one set,
which is how this branch got it wrong twice — kings-court's widest same-state
**mean** spread is **0.054** and serenity's **0.026**; the widest **per-spot**
range is **0.14** on serenity and **0.75** on kings-court. Task 3's fix round
and task 4's fix round disagree about whether that 0.75 is a floor or a
one-frame anomaly, and **that disagreement is still open, routed to plan 5.**

**This task's own legs narrow it, and plan 5 should start from them** (added
2026-08-19, fix round 1 — the first pass mined only the *committed
historical* sets and left its own fresh data unexamined). Six kings-court
captures in two independent same-state groups put **`11.webp` at a range of
0.32 (BASE, 2 captures) and 0.30 (tip, 4 captures)**, while the
second-worst spot in any pairing never exceeds **0.16**. So kings-court's
per-spot floor is **around 0.3, not 0.14** — corroborating task 4's 0.35 —
but it is better described as *most spots ≈0.15 with `11.webp` ≈0.3*, which
is a lead on the mechanism rather than only a number. Serenity's equivalent
is **0.08–0.09**, which is why its committed 0.14 is credible.

**It changes no conclusion here, but the reason differs by apartment and
must be stated that way** (corrected 2026-08-19, fix round 1 — the sentence
here previously gave only kings-court's reason and over-reached by applying
it to both):

- **kings-court:** smallest attributed movement **+1.00**, largest
  unattributed **0.10**. Every candidate floor — 0.033, 0.14, 0.30, 0.35,
  0.75 — falls in that gap, so no value of the disputed constant changes an
  attribution.
- **serenity:** ~~every attributed movement is ≥1.00~~ — **false here.**
  Five of its seven attributed movements are 0.21, 0.25, 0.29, 0.43 and
  0.56. What carries serenity is that **its own floor is settled at 0.14**
  (the disputed figures are kings-court's), so its smallest attributed
  movement, `4.webp`'s **+0.21**, clears it by 1.5×. `8.webp`'s −0.25 is
  independently safe on mechanism — its `name` field changes inside the
  committed data, Bedroom → Bathroom. **`4.webp`'s +0.21 rests on the
  margin alone and should not be leaned on.**

Full working:
`docs/superpowers/metrics/README.md`, "Phase B plan 4b task 5: the closing
gate".

> **Corrected 2026-08-19, plan 4b task 4 fix round 1 — read this before
> comparing anything to kings-court's 18.58.** That baseline is on the
> **14-spot** population, recorded before plan 4b touched kings-court at
> all. Two plan 4b commits have moved it since, the second of which also
> changed the population itself: `c1a7329` (task 3's marble un-inversion) to
> **18.46**; then task 4's pose re-pointing to **18.16** (−0.30, same 14
> spots, attributed — task 4's report §3); then task 4's B4 ruling dropped
> `4.webp` from `compare`, moving the population to **13** and the reading
> to the shipped **17.60** (−0.56, arithmetic only, not a render change).
> **(Task 5 measured this same shipped state at 17.59 on its own two legs,
> 2026-08-19 — the 0.01 is between-session noise, well inside the band, and
> neither figure is wrong. The live baseline table above carries 17.59
> because it is the reading taken with a same-session BASE control beside
> it; "the shipped 17.60" in this blockquote is task 4's own session
> reading and is left as measured.)**
> Sum: 18.58 → 17.60 is −0.98, composed of −0.12 (marble, partly
> attributed) + −0.30 (pose, attributed) + −0.56 (population arithmetic).
> **A future kings-court reading is not comparable to 18.58 on sight — check
> both the commit and the population first.** Full per-spot and per-step
> numbers: `docs/superpowers/metrics/README.md` ("Pose verification") and
> `.superpowers/sdd/2026-08-16-phase-b4b-content-poses/task-4-report.md` §3.

The outgoing rows read *serenity **16.61** — plan 3 task 7; eight readings
spanning 16.59–16.62* and *kings-court **18.90** — plan 3 tasks 4 and 7*,
carried here verbatim so that replacing them loses no provenance.

**These replace serenity 16.61 and kings-court 18.90**, which were the
baselines as of `b39a99a` (`?v=107`) recorded by plan 3 tasks 4 and 7. Both
movements are improvements and both are attributed, per rule 2: plan 4a task 4
re-measured `b39a99a` in the same session as `f0315ea` — a detached worktree on
`:8743` against the tip on `:8742`, three interleaved rounds each — and read
the old tree at **16.6109** and **18.8788**, reproducing the outgoing baselines
to 0.000 and 0.021, i.e. inside the noise floor. The movement is therefore the
branch's and not the session's.

| Apartment | old → new | movement | attribution |
|---|---|---:|---|
| serenity | 16.61 → **16.00** | −0.614 | task 1 winding fix −0.201, task 1 paintings −0.080, task 2 **0.000** (reverted in full), task 3 exposure 0.329→0.295 −0.357; sum −0.638 against −0.614 measured, residual +0.025 inside the floor |
| kings-court | 18.90 → **18.58** | −0.303 | task 1 winding fix −0.081, task 2 **0.000**, task 3 exposure 0.575→0.52 −0.228; sum −0.309 against −0.303 measured, residual +0.006 |

> **The winding fix had one side effect nobody looked for: it broke the
> dollhouse tape.** Found by the final whole-branch review 2026-08-16, fixed
> the same day in `doll.js` (`?v=113`). **Task 1's report had stated the
> opposite** — that the tape and the m² badges "cannot detect this change."
> The m² half is right; the tape half is exactly backwards, and that sentence
> is why five task reviews never drove it. `Doll.floorPoint()` accepted the
> first visible hit whose face normal pointed up, and `h.face.normal` is the
> **winding** normal with FrontSide culling live — so while the winding was
> wrong a wall's top quad was culled and the ray fell through to the floor by
> accident, and once it was right the top quad was returned first. Driving the
> real `floorPoint` on both arms: a serenity bay of a true 2.65 m read
> **2.650 at `b39a99a`** and **3.719 at `6214d00`** (+40%), marker 2.6 m in
> the air. **`teleport` was affected too, on kings-court** — the review
> believed its ground-proximity guard covered it, and on serenity it does, but
> kings-court's upper ground zones (2.98 / 3.10) sit within 0.6 of its
> 2.80 m wall tops, so 12 of 28 ground-floor wall centrelines passed that
> guard and a cutaway click put the player on the **upper** floor (ground 3.10
> where `b39a99a` gave 0.00). The fix skips the merged wall meshes by
> `userData.doll` in both readers — not a height test, which is the thing
> kings-court just disproved, and not a different normal, since a wall top's
> true normal really is +y. **No published figure moves:** `measure.js`
> renders from photo-spot cameras and never calls `floorPoint`.

**Do not read kings-court's movement as entirely a better render.** Task 3's
exposure re-fit was made on the mandated **all-spot** population where plan 3
task 4 had fitted on `poseVerified`, and that convention change moved the
fitted exposure in its own right. Task 4 measured the split directly, by
re-reading the tip at the exposure each apartment's `poseVerified` fit would
have chosen — taken from task 3's committed sweep as that population's own
zero crossing, and paired against a control at the shipped exposure **on the
same page load**:

| Apartment | counterfactual | render | convention | convention share |
|---|---:|---:|---:|---:|
| serenity | 0.298 | −0.590 | −0.024 | 4% |
| kings-court | 0.5596 | −0.151 | −0.152 | **50%** |

**serenity's improvement is essentially all render.** **kings-court's is about
half measurement convention** — and the two halves are 0.0005 apart, so which
of them is larger is *not* resolved and must not be quoted as though it were.
The condition this rests on: the counterfactuals are the sweep's crossings, and
at the measured ΔE slopes the split would read 50/50 at 0.3339 (serenity) and
0.5595 (kings-court). serenity's crossing sits 0.036 below its break-even, so
that conclusion is robust; kings-court's sits 0.0001 from its own, which is
what "a dead heat" means quantitatively. Full working in
`docs/superpowers/harnesses/2026-08-15-b4a-task4/`.

**Where each movement comes from, per spot.** Both baselines are all-spot means
by rule 5, and on both apartments the movement is concentrated. **serenity's
−0.61 is carried entirely by two `poseVerified: false` spots** (`7.webp` −4.96,
`6.webp` −4.11, together more than the whole movement), while its **only two**
pose-verified spots moved slightly the other way (+0.37, +0.16). **kings-court
is the reverse** — seven of its eight pose-verified spots improved; the
exception, `19.webp`, regresses **+1.55**, the largest single-spot movement on
the branch, most of it traceable to the exposure rather than the render (19.95
at 0.56 against 21.18 at the shipped 0.52). Neither fact moves a baseline; both
are recorded so that a later reader does not discover them.

**Hard stop (rule 3): not tripped.** No task on this branch made either
apartment's reading worse at all, let alone by more than 0.5. The one figure on
the branch that looks like a breach is
`kings-court-b4a-task2-seg045-legacy-allspots.json` at 19.4636 against a before
of 18.8079, **+0.656** — that is plan 4a task 2's trial state, which failed its
exit criterion and was **reverted in full**; `tour/` carries none of it, and
the hard stop is about what a task leaves in the tree.

~~**These baselines are recorded from an unmerged branch tip.** `main` is still
at `c2bb0bd` and the `b39a99a` values above are what a checkout of `main`
measures. If plan 4a is not merged, the outgoing baselines stand.~~

> **Struck 2026-08-19 by plan 4b task 5, fix round 2 — this paragraph's
> condition resolved and it now says the opposite of the truth.** **Plan 4a
> is merged** (PR #30, `feac92a`), `origin/main` is at **`5963ddd`**, not
> `c2bb0bd`, and it carries serenity `exposure` **0.295**, kings-court
> **0.52**, horkyone-10 **0.42** at `?v=113`. Verified by reading
> `origin/main:tour/apartments/*.json` and `origin/main:tour/index.html`
> directly. So the conditional's antecedent is false and its conclusion —
> "the outgoing baselines stand" — must **not** be acted on: the plan-4a
> baselines are the merged ones, and they are in turn superseded by plan
> 4b's, in the live table above.
>
> **This is a live conditional whose antecedent went false, which is the
> hardest staleness shape to catch — corrected 2026-08-19.** — every individual sentence in it was
> true when written, and it reads as cautious rather than wrong. Sibling
> instances corrected in the same round: the `f0315ea, unmerged` label
> above, the `grid()` row's "still open on `main`", and the
> wall-winding section's "Still present on `main`".

**This loosens serenity by 0.03 and tightens kings-court by about 3.5.** The
old 22.44 was kings-court's pre-migration score and the apartment had by then
improved to 18.90, so that ceiling carried three and a half points of slack
in which a real regression could have hidden unseen. Re-baselining removes
it. The restatement is not a blanket relaxation, and it must not be quoted
as one. (This paragraph describes the 2026-08-15 restatement as it stood at
`b39a99a`; kings-court has since been rebaselined again, to **18.58**, by plan
4a task 4 — the tightening is now about 3.9, not 3.5.)

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
their photograph. ~~**serenity passes 2 of 11**~~ **serenity 9 of 11**,
~~**kings-court 8 of 14**~~
**kings-court 10 of 13** (see the 2026-08-19 notes below), **horkyone-10 has no
scorable spots at all.** (serenity's live figure was added inline here
2026-08-19 by task 5 — the earlier fix round struck the old number without
putting the new one beside it, so this sentence read as though only
kings-court had a current count.) **Across both flats: 10 of 25 passed at
this branch's merge-base; 19 of 24 pass now.** The scorers skip the failures; the
spots stay in the config with a `poseNote`, because they are the only
automated trail of the defects they expose.

> **serenity now passes 9 of 11**, 2026-08-19, plan 4b task 2 (`1e0d4e5`).
> Only `2.webp` and `10.webp` still fail, and they keep their `poseNote`s.
> **This is not only a bookkeeping change — it silently re-defines an
> instrument.** `tools/luminance.py` filters its population through
> `delta_e.scorable`, which requires `poseVerified`, and unlike `delta_e.py` it
> has **no `--all-spots` escape hatch**. So serenity's luminance-fitting
> population went from **2 spots to 9** the moment those flags flipped. Any
> future `exposure` re-fit — including the one the `mainCeilH` row below
> mandates — therefore runs on a different, and much better-founded,
> population than the one that produced the committed 0.295. It is an
> improvement, not a defect, but it is **not** comparable to the old fit, and
> the horkyone-10 ±10 luminance criterion is derived from serenity's number,
> so it moves too. Re-derive both; do not carry the old figures across.

> **kings-court now passes 10 of 13**, 2026-08-19, plan 4b task 4. Four
> mis-pointed cameras were re-pointed: `2.webp` and `10.webp` flipped to
> `true`; `14.webp` and `17.webp` stayed `false` and kept (rewritten)
> `poseNote`s, because their subjects are defective in the model rather than
> mis-aimed — Bathroom 2's shower sits west of the bath where the photograph
> puts it east and has no divider glass, and the entry-hall wardrobe crosses
> the `x = 23` wall 0.80 m into the Guest WC and stands 0.16 m in front of the
> vanity — **and also projects ~0.73 m past the building's own `x = 23.8`
> exterior wall (0.80 m past its centreline), the more visible half of the
> defect since it shows in dollhouse mode from outside** (added 2026-08-19,
> fix round 1, from the task 4 report — the `tour/apartments/kings-court.json`
> `poseNote` itself still only names the Guest WC intrusion; this is a
> documentation-only round and cannot touch `tour/`, so the `poseNote` needs
> its own edit under `tour/` before 4c starts, which reads the routed record,
> not the report). Both are 4c's.
>
> **Two instrument changes in that one commit, and they compound.**
> (1) The denominator: the merge owner ruled `4.webp`'s coffee corner will not
> be modelled, so its `compare` flag was removed and **kings-court's compare
> population is 13, not 14** from that commit on. Any before/after pair that
> straddles it compares two different populations. Dropping a spot that scored
> 25.47 against a 14-spot mean of 18.16 moves the mean to 17.60 **by
> arithmetic alone** — that ~~−0.57~~ **−0.56** (corrected 2026-08-19, fix
> round 1: `(25.47 − 18.16) / 13 = 0.5623`, not 0.57) is not a rendering
> change and must never be reported as one.
> (2) The `luminance.py` population above: kings-court went from **8 spots to
> 10**, and the committed `exposure: 0.52` was fitted against the 8.

Those defects are plan 4's work:
- ~~serenity's living room is modelled with a **punched window** where the flat
  has a floor-to-ceiling sliding door (observation B1). Three spots fail on it.~~
  **Both halves disproved, 2026-08-19 by plan 4b task 1.** The model was already
  a `type: "door"`, and the photograph was never a floor-to-ceiling slider
  either — measured inside `9.webp`, the head sits at 1.95–2.10 m, which
  `DOOR_H` 2.05 already builds. Only the **width** was ever wrong; task 1
  widened it 1.4 → 1.8 m and deliberately left the height alone. **Do not
  heighten this opening.**
- ~~kings-court's **Bathroom 2 shower was never modelled** — none of that
  config's four `type: "shower"` entries fall inside the room's bounds
  (8.8, 0)–(11.4, 2.6).~~ **Built, 2026-08-19 by plan 4b task 3** (`d9672c3`),
  whose fix round also un-inverted that bathroom's marble (`c1a7329`).
  `14.webp` moved 25.78 → 21.75, the largest single-spot movement on the
  branch. It still fails pose verification, for reasons no camera fixes — see
  the routing list below.
- ~~Ten spots across both flats are simply pointed wrong.~~ **All ten
  re-pointed, 2026-08-19 by plan 4b tasks 2 and 4**, plus one *mis-mapped*
  spot (serenity's `8.webp`, a bathroom photograph attached to a spot standing
  in the bedroom) moved into the room its photograph shows — eleven cameras in
  total. **`poseVerified` went 2 of 11 → 9 of 11 on serenity and 8 of 14 → 10
  of 13 on kings-court.**
- horkyone-10 has **zero** photographic anchors; its exposure rests entirely
  on luminance proximity to two flats, one of which sits at its own noise-floor
  margin. **Still true, and it moved:** serenity's luminance-fitting population
  went from 2 spots to 9 in `1e0d4e5`, so the ±10 band derived from serenity's
  mean-scene-luminance must be **re-derived**, not carried across.

### What plan 4b left open, routed so nothing is dropped

Written 2026-08-19 by plan 4b task 5, closing the branch. Every item below was
found or confirmed by this branch and none of them is a pose defect any more.

| Open item | Why 4b could not close it | Owner |
|---|---|---|
| **serenity's sofa is on the wrong wall**, and the bedroom's bed head shares the window wall where the photographs show them perpendicular (the headboard buries ~0.45 m of the window). | A furniture-layout rewrite against the photographs, not a camera fix. It moves the metric — pair it same-session. Full measurement in the deferred table below | **4c** |
| **kings-court's Bathroom 2 is the photograph's mirror image** (shower west of the bath where the photograph puts it east) and **has no divider glass** — the photograph's defining element | `F.shower` builds glass on two adjacent sides and assumes the other two are walls. This is a `builder.js` constructor change, which 4b forbids outright, so it is **genuinely blocked** rather than deferred by choice. The mirroring is a layout question on top of it | **4c** (constructor), layout question with it |
| **kings-court's entry-hall wardrobe passes through a wall** — world box x 22.20–24.60, so 0.80 m of it stands inside the Guest WC, 0.16 m in front of the vanity, **and its far end clears the x = 23.8 exterior wall by 0.80 m past the centreline / ~0.73 m past its outer face**, hanging outside the building where dollhouse mode shows it | Content defect; no legal camera clears it. Task 5 added the exterior half to the config's own `poseNote`, which had carried only the Guest WC half | **4c** |
| **`meta.photoFovLong: 120` is wrong for kings-court** — measured ~57° and ~58° by two independent methods on two different photographs (angular separation of identified features on `10.webp`; object size on `2.webp`) | **Deliberately shipped uncorrected.** It is one per-apartment constant governing all thirteen frames; correcting four spots per-spot would split the compare set in a way the gate cannot see and a visitor can. The right fix is to re-derive the constant from the apartment's own photographs as one change. Only two of thirteen frames were measured, so the derivation is not finished | **plan 5** (a documented constant) |
| **The per-spot noise floor is unsettled: 0.35 or 0.75?** Task 3's fix round calls the committed 0.75 swing on `10.webp` a one-frame capture anomaly; task 4's fix round carries 0.35 forward. Both figures are committed in `docs/superpowers/metrics/` | Neither task's conclusion depended on it and this one's does not either, so nobody has had to settle it. It is the last open question about this instrument. **Start from ~0.3, not from scratch** (added 2026-08-19, fix round 1): task 5's own six kings-court captures form two independent same-state groups and put **`11.webp` at 0.32 and 0.30**, with the second-worst spot in any pairing never above 0.16. That corroborates **0.35** and refutes 0.14, and it localises the problem — **`11.webp` (Bedroom 1, desk) is where to look**, since the floor is really "most spots ≈0.15, `11.webp` ≈0.3" rather than a uniform band. serenity's equivalent is 0.08–0.09. Working: `metrics/README.md`, "The noise floors" | **plan 5** |
| **What varies across a page load** — ruled out per-frame grain and capture jitter; `captureEnvironment` is the untested suspect, `AO_DIRS` is a fixed table | Never isolated | **plan 5** |
| **Merge-status claims in the docs go stale silently, and nothing checks them.** Four were found and corrected 2026-08-19 (`f0315ea, unmerged`; "`main` is still at `c2bb0bd`… If plan 4a is not merged, the outgoing baselines stand"; "still open on `main`"; "Still present on `main`"), then **two more that no pattern matched**, because they name no commit, no branch and no count: `CLAUDE.md:96` and `metrics/README.md:681` ("`main` still carries the older three until it merges"). A seventh, `metrics/README.md:460`, is counted here too but is **a different failure mode and must not be added to that two** (corrected 2026-08-19, fix round 4): it was found by reading, by hand, in the same round that later created `stale_claims.py` — no checker existed to miss it. Every one was wrong the same way — **plan 4a merged as PR #30 (`feac92a`), and `origin/main` ships 0.295 / 0.52 / 0.42 at `?v=113`** | **Build the check; do not just re-sweep.** The mechanism is `git merge-base --is-ancestor <sha> origin/main`, cheap and decisive: **resolve every commit SHA named in `docs/` and `CLAUDE.md` against `origin/main` and report which claims about them are now false.** This is the worst class in this record because it goes stale with **nobody editing the file** — a merge elsewhere falsifies it — so a one-off sweep cannot hold it, and `CLAUDE.md` is the first file a fresh session reads. `tools/checks/stale_claims.py` now greps the prose *shapes* ("still carries", "until it merges", "unmerged branch tip") as a stopgap, but that is pattern-matching English; resolving the SHAs is the real check. And note its stated limit: it verifies a claim is **marked**, never that the marking is **true** — `metrics/README.md:460` was a false claim sitting *inside* a correct-looking marker, which no grep can catch | **plan 5** |
| **`stale_claims.py`’s scope rule and this repo’s marker convention now contradict each other, and a correct edit can trip the checker.** The checker scopes a claim to the smallest unit that renders on its own — a table row, a list item, a paragraph — so **every stale claim needs its OWN inline marker**. This repo’s written convention is the opposite shape: *“a narrated marker beside what it supersedes”* (a dated blockquote above or below the thing it retires). A writer following the convention will trip the checker and reasonably conclude the checker is wrong. Raised in fix round 3, promoted out of the gitignored task report into this table in fix round 4 — **the same placement failure the merge-status row above had just been fixed for** | **Decide it; do not let it decide itself by attrition.** Two ways out, and they are not equal. (1) **Write the inline-marker requirement into the convention** — cheap, and it is what a reader landing mid-document needs anyway, since a narrated block above a paragraph is invisible to someone who lands below it; the cost is that every existing narrated block in `docs/` becomes non-compliant and needs an inline tag. (2) **Find a scope rule that satisfies both** — e.g. let a marker cover the container only for content that existed when the marker was written, which needs `git blame` per line and is a real tool, not a tweak. **What must NOT happen is loosening the scope back**: it has failed open three times (90-line window, paragraph-plus-neighbours, whole-table/whole-list) and every loosening was found by mutation, never by reading. Evidence for the decision is in `tools/checks/stale_claims.py`: its module docstring states the conflict and the seven known limits, and its `BOUNDARY` table records, construct by construct, what a CommonMark/GFM renderer emits and therefore what the checker treats as a separate scope — so the decision can be made against the rendering rather than against taste. Run `python tools/checks/stale_claims.py --census` to see every claim site with the marker covering it before deciding, including the two this round could not close (it cannot tell an assertion from a quotation, and a marker anywhere in a prose paragraph still covers the whole paragraph) | **plan 5** |

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
4. **Fix the wall-winding defect first and re-measure.** Not taken at the
   time — it was deferred to plan 4 or 5 with its own entry below.
   **Superseded: it was taken, and it closed the shortfall outright.** See
   the block immediately below.

#### Option 4 was executed after all, and the 0.03 is gone

**Written 2026-08-15 by plan 4a task 5.** The paragraphs above are true of
the moment they describe and are kept as the record of that decision. They
have stopped describing the current state, and a reader who stops at "we
accepted a 0.03 miss" will carry away something that is no longer the case.

Plan 4a was written to do option 4 and did it. Task 1 fixed the `grid()`
winding with the sign test (`b767b4b`) and un-buried two paintings that had
been inside a wall; **serenity's all-spot legacy reading moved 16.60 →
16.32**, which is **0.26 *under* the old 16.58 ceiling**, not 0.03 over it.
Task 3 then re-fitted exposure against the post-winding render (0.329 →
0.295) and it reached **16.00**. kings-court moved the same way, 18.90 →
**18.58**. Both movements are attributed per rule 2 and are recorded in the
baseline table above; the 0.03 shortfall that this whole section exists to
explain **does not exist in the current tree.**

Two things follow, and the second matters more than the first:

- **The shortfall was closed by fixing a real rendering defect, not by
  tuning and not by moving a threshold.** Option 2 — re-fit exposure against
  the old render — remains rejected and was proved impossible before it was
  offered; the exposure re-fit that did happen (task 3) came *after* the
  render changed, which is a different act.
- **The restatement of the gate still stands, and it was re-confirmed on the
  new numbers.** After task 1's readings were verified, the merge owner made
  a **second ruling on 2026-08-15**: keep the restated gate — baselines plus
  attribution plus the 0.5 hard stop — rather than reinstating the old
  absolute ceilings now that serenity would pass them.
  **Provenance, stated plainly because it is thinner than the first
  ruling's.** This was a merge-owner decision taken **in session on
  2026-08-15** and recorded by the controller; the decision was made
  conversationally, after task 1's numbers were verified, so **there is no
  in-tree artefact of it** — no commit, no report, no metrics file. That is
  exactly why it is written here, and why it is mirrored into
  `docs/superpowers/metrics/README.md` beside the first ruling's marker: a
  ruling that exists in one file can be lost by one deletion. Read it as a
  recorded decision, not as a citation. The first ruling, by contrast, is
  documented in three places and has the plan-3 gate readings behind it.
  The grounds are
  unchanged and never depended on the 0.03: this metric is dominated by pose
  and content mismatch, so it cannot arbitrate lighting at that resolution,
  and serenity's ΔE is expected to move by whole points once plan 4 fixes the
  living-room opening, the missing shower and the mis-pointed spots. Passing
  a ceiling once is not a reason to re-adopt an instrument that was retired
  for being the wrong instrument.

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

> **That forecast resolved, and it was right — 2026-08-19, plan 4b task 5.**
> This paragraph and its twin in `metrics/README.md` are dated 2026-08-15
> records of a ruling and are left as written; the prediction inside them is
> now settled, so it is recorded here rather than left for a reader to
> wonder about. Plan 4b corrected all three named defects — though not as
> predicted in one case: **the living-room opening was not too short, only
> too narrow**, and the "floor-to-ceiling slider" premise was disproved
> photographically (task 1). serenity moved **16.00 → 15.49** and
> kings-court **18.59 → 18.17** on a fixed 14-spot population. "Whole
> points" overshot — the movement is half a point on serenity — but the
> *direction*, the *cause* and the *conclusion drawn from it* are all
> confirmed, and the ruling would have been right at any magnitude.
> **Crucially, this is not evidence that the lighting improved: no
> renderer, bake, post-processing, material or shader code changed anywhere
> in plan 4b.** It is the metric beginning to compare like with like.

What replaced it is in "The gate, restated 2026-08-15" above. Note that it
tightens kings-court by about 3.5 points while loosening serenity by 0.03.

**None of this was resolved by tuning, and nothing was re-measured to make it
come out.** Every number in this section was reproduced across two trees and
eight readings before the decision was put.

## How to work in this repo

- Server: `python tools/serve.py`, then `http://localhost:8742/?apt=<id>`.
  **Agents must start it with the sandbox disabled** or its `/save/` endpoint
  returns HTTP 200 while the files silently vanish. ~~Probe for a file on disk
  before trusting any capture.~~ **Probe for the file on disk _and check it is
  non-empty_** — corrected 2026-08-19 by plan 4b task 5. A presence probe alone
  is not enough: `serve.py:90` truncates the destination into existence before
  it decodes the body, so a malformed capture leaves a **zero-byte file** that
  a presence probe happily passes. See the `serve.py:90` row in "Deferred, with
  owners" for both reproduced failure shapes.
- The in-app Browser pane will not composite. Render into a full-viewport
  element and take a Playwright screenshot.
- `?check=1` runs the layout validator; `window.__issues` must be empty on all
  three apartments before every commit.
- The render-versus-photograph divider is opened from the console, **not** by a URL parameter — `?compare=1` never existed, and this line claimed it did until 2026-08-18. It loads on demand behind a button gated on `poseVerified !== false`; load `compare.js` by hand and call `window.__compare(file)`, which ignores that flag. `window.__compareAll()` walks every `compare` spot. It is the divider — the only
  instrument that sees geometry errors. `window.__compare(file)`.
- Draw calls go through the post chain (`a.post.render(0)` with
  `info.autoReset` handled); a bare `renderer.render()` undercounts by ~15.
- Bump `?v=` on the **single** module tag in `index.html`, after the last code
  edit.
- **Know where the machine-checking stops.** Every committed checker in this
  repo verifies the chain *from the raw JSON outward* — metrics files derived
  from `sweep.json`, README figures matching the metrics files, the checker's
  own failure path exercised. The first hop, **browser console → JSON, is
  hand-transcribed and nothing verifies it**, and nothing could without
  re-running the capture. If a number ever has to be defended, re-capture it;
  do not re-read it.
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
| `serve.py:90`: `base64.b64decode(body)` is unguarded in `do_POST`, so a malformed save body raises, `socketserver` prints the traceback and **kills that handler thread**. Sibling to the `%00` row above, and it matters more than it looks: **every** measurement recipe in this repo goes through `/save/`, and the failure mode next door is a sandboxed `serve.py` answering HTTP 200 while writing nothing. Two independent ways for a capture to be silently absent, and neither announces itself — ~~probe for the file on disk, never trust the response~~ **probe for the file on disk AND check it is non-empty** (corrected 2026-08-19 by plan 4b task 5, after reproducing the bug directly against a running `serve.py`). **The old advice does not survive this very bug.** `f.write(base64.b64decode(body))` at `:90` evaluates the decode *after* `open(dest, 'wb')` has already truncated the file into existence, so a bad body leaves a **zero-byte file that exists** — a presence probe passes and proves nothing. Both failure shapes were reproduced: a body of `!!!` raises nothing at all (`b64decode` discards non-alphabet characters, so it decodes to `b''`), returns **HTTP 200**, and writes 0 bytes; a body of `QUJDQ` raises `binascii.Error`, kills the handler thread so the client sees a dropped connection — and still leaves the same 0-byte file. Non-emptiness is the only check that catches either | deferred, dev-only; found by plan 4a, advice corrected by plan 4b |
| The horkyone-10 ±10 luminance criterion **went unenforced for some time**: the shipped `exposure` 0.46 was already failing it before plan 4a started (+11.07 from serenity against a ±10 band), because plan 4a task 1 brightened all three apartments and serenity's re-fit came down further, moving the band out from under horkyone-10. Found in passing by plan 4a task 3, whose refit to 0.42 was therefore **mandatory, not cosmetic**. The criterion has no automated check and nothing re-runs it when a sibling's exposure moves — that is the actual gap | plan 5 |
| `CLAUDE.md` beyond the two rows already corrected | plan 5 |
| 5th-percentile shadow luminance never closes | **this is plan 3's whole subject** |
| ~~**`grid()` winds 8 of 12 wall faces backwards**~~ — **discharged** by plan 4a task 1 (`b767b4b`) with the sign test the section below prescribes; ~~still open on `main`, closed on `phaseB-plan4a-winding`~~ **closed on `main` as well — `b767b4b` is an ancestor of `origin/main` via PR #30 (corrected 2026-08-19, plan 4b task 5 fix round 2)**. **What it cost:** one task, plus the exposure re-fit it forced (task 3) and the rebaselining that followed (task 4) — and a real dimensional change, every **x** span in all three apartments shrinking by exactly 0.280 to its configured size, which is a correction rather than a regression. **What it bought:** serenity 16.60 → 16.32 all-spot legacy on task 1 alone, closing the 0.03 shortfall this document spends a section explaining. **What it unblocked: the per-texel wall lightmap atlas**, which could not be built onto inside-out walls at all — that is now the open path for whoever writes plan 4c or 5, and plan 4a task 2's NO-GO does **not** close it (see the atlas bullet below). The section below is kept as the diagnosis that produced the fix, not as an outstanding item | plan 4a, done |
| `.gitignore` covers only `tools/__pycache__/`, not a generic `__pycache__/` rule | any plan touching tooling |
| **serenity's furniture is on the wrong walls in two rooms, and no camera can fix it.** Found by plan 4b task 2 while re-pointing the seven mis-pointed spots — it is what remains after every pose is correct. (a) **Living room:** `3.webp`, `4.webp` and `9.webp` all put the sofa against the *same* long wall as the dining table, with the terrace door beyond it; `serenity.json` puts the sofa against the **west** wall (backing onto x 3.1) and the dining table against the **east** (x ≈ 5.2), so any camera that frames the terrace door correctly renders the sofa on the opposite side of the frame from the photograph. (b) **Bedroom:** `6.webp` and `11.webp` between them show the window wall and the bed-head wall to be **perpendicular**; the config puts both on the **same** wall (z 6.65) — the bed is centred at x 1.0 and the window opening spans **x 1.6–2.9** (`at` is the opening's **start** offset along the wall, not its centre: `builder.js` splits pieces at `from: o.at, to: o.at + o.w`), while `F.bed`'s headboard is drawn `w + 0.5` = **2.1 m** wide, so it runs to x 2.05 and buries roughly **0.45 m of the window's left edge** behind it. Both are content defects, not pose defects, and both survive at the poses this task shipped. They are also the reason serenity's living-room ΔE barely moves while the bedroom's falls by 2.7. **Whoever takes it:** this is a furniture-layout rewrite against the photographs, and it moves the metric — pair it same-session like any other change | **plan 4c** |
| **serenity's `mainCeilH` is 2.6 and the photographs say ~2.9–3.2 — the shell is 0.3–0.4 m too short.** Found by plan 4b task 1 while disproving the "floor-to-ceiling slider" premise, and confirmed independently by its reviewer with **two routes off `4.webp`**, the only frame carrying both the ceiling junction and the floor of that wall: the **curtain rod** at (448−157)/(448−70) = 0.770 of ceiling height, which at a normal 2.20–2.25 m rod gives a ceiling of **2.86–2.92 m**; and the **air-conditioner** at 102 px against 378 px floor-to-ceiling (0.261 after perspective correction), which for a 0.78–0.92 m wall-split unit gives **3.1–3.2 m**. **2.6 falls outside both.** At 2.6 the same unit would have to be 0.68–0.70 m wide, narrower than any common split. Deferring was right — `mainCeilH` feeds every wall `h`, the ceiling plates, the terrace-level relationship, the bake geometry and the fitted `exposure`, so changing it inside a task whose gate is read for one opening's width would have destroyed the attribution. But it is now **live debt task 2 executes on top of**: six serenity cameras get re-pointed inside this short shell, and their poses do not become wrong when the ceiling is corrected — the *numbers* do. **Whoever takes it: re-fitting serenity's `exposure` is part of the task, not a follow-up, and all eleven spots must be re-baselined afterward.** Do not fold it into a pose task. Caveat carried with it: the reviewer could not establish whether `4.webp` and `9.webp` are the same physical unit (different floors, sofas and prints), so the ceiling routes rest on `4.webp` alone — **and that caveat is load-bearing: both photographic routes rest on `4.webp` alone, so the 2.86–2.92 / 3.1–3.2 band must be RE-MEASURED before anyone edits the constant.** Do not treat "~2.9–3.2" as a measurement ready to be applied | ~~**plan 4c, as its own task**~~ **plan 5, as its own task** (re-routed 2026-08-19 by plan 4b task 5) — not 4b, and not inside any pose or furniture task. **Why it moved:** 4c is on record above as *deliberately not written*, because its critical path is human asset curation that nobody has scheduled — so the row was owned by a plan that cannot act on it, and a ceiling height would have sat blocked behind a photographer's calendar. **`mainCeilH` is a constant**, and plan 5 (`2026-08-16-phase-b5-revalidate-and-docs.md`) is written, unblocked, and opens by re-validating every documented constant, which is exactly this row's shape. Everything else in the cell stands unchanged — including that the re-fit of serenity's `exposure` and the re-baselining of all eleven spots are **part of the task, not a follow-up** |

### The wall-winding defect, deferred deliberately — and since fixed

> **Status, 2026-08-15:** fixed on branch `phaseB-plan4a-winding` by plan 4a
> task 1 (`b767b4b`), with the sign test this section prescribes rather than
> the `else`-branch reversal it warns against. ~~Still present on `main`.~~
> **Fixed on `main` too — `b767b4b` is an ancestor of `origin/main` via PR
> #30 (corrected 2026-08-19, plan 4b task 5 fix round 2).** The
> third consequence below — that the fix expires plan 3 task 4's exposure fit —
> came true and was discharged by plan 4a task 3; plan 4a task 4 then
> re-measured the gate and rebaselined both apartments. Everything below is
> the original diagnosis, kept because it is what the fix was built from.

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

Three consequences were accepted knowingly when this was deferred. **All three
have now played out; here is each one's disposal, added 2026-08-15 by plan 4a
task 5.**

- **It blocks any wall lightmap atlas.** An atlas baked onto inside-out walls
  records the wrong side. Plan 3 task 2 split that atlas out for this reason,
  and most of that task's intended effect went with it — walls carry most of a
  first-person frame's darkest 5%.
  → **UNBLOCKED, and still unbuilt.** Task 1 removed this obstacle. Plan 4a
  task 2 then tried the *cheap* substitute — vertex-shaded walls taking the
  visibility-scaled ambient, `SEG` swept 0.45/0.30/0.22/0.15 — and returned
  **NO-GO** (serenity linear-domain contrast 3.9347 against a required ≥4.32,
  reverted in full, `tour/` carries none of it). **Do not over-read that
  verdict.** It says *vertex-shaded* walls cannot reach the bar; it does not
  say walls are not worth lighting. With the smearing artefact suppressed as
  far as the sweep could, the surviving real effect is **+0.23 of the +1.11
  required — about a fifth** — and 3.4380 is **not** a ceiling on a per-texel
  atlas, which samples on the surface and produces real gradients where this
  shades from four geometric corners, some of them buried inside adjoining
  solids. The atlas remains the open path, and its known cost is a
  **from-scratch atlas rasteriser**: three.js's `UVUnwrapper` is a thin
  wrapper over the `xatlas-web` WASM module, so there is nothing in the
  vendored tree to reuse for the packing. Whoever writes plan 4c or 5 must
  meet that distinction rather than plan 4a task 2's headline number.
- **It is why GTAO was rejected.** GTAO is the first thing in this pipeline to
  read scene normals; with them pointing away from the viewer it closes the
  hemisphere and multiplies walls to black (plan 3 task 3). That rejection has
  a second, independent ground — a mobile draw-call breach — so it survives
  this fix, but the black walls do not.
  → **The black walls are CURED; GTAO stays rejected anyway.** The normals now
  face the viewer, so that specific failure cannot recur. The surviving ground
  is the one that never depended on the winding: GTAO's G-buffer prepass takes
  kings-court from **150 to 282 mobile draw calls against a ≤250 budget**.
  Re-adopting GTAO means solving that, not re-testing the walls.
- **It expires plan 3 task 4's exposure fit.** That fit is correct for the
  render as it ships today; fixing the winding changes the render and forces a
  re-fit.
  → **Came true, and was discharged.** Plan 4a task 3 re-fitted all three
  against the post-winding render: serenity 0.329 → **0.295**, kings-court
  0.575 → **0.52**, horkyone-10 0.46 → **0.42**. It also found that the
  shipped horkyone-10 0.46 had *already* fallen out of its own ±10 band
  (+11.07 from serenity) once serenity's fit came down — see the deferred
  table above.

Whoever fixes it owns a verification pass of its own: moving those faces moves
apparent room dimensions. → **It did, exactly as predicted and on the axis the
original note got wrong.** Every measurable **x** span in all three apartments
shrank by exactly **0.280**, every **z** span by exactly 0.000; the reversed
faces belong to walls *running* along z, which bound a room in **x**. Each room
now measures its configured centreline distance minus the 0.14 wall thickness
exactly.
