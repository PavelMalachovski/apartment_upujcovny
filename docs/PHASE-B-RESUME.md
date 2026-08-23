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

~~Branch `phaseB-migration`, PR #27 — **merged** (`c2bb0bd` on `main`). Plan 3
continues on `phaseB-plan3-light`, branched from that merge, with no PR of
its own yet.~~ **Rewritten 2026-08-23 by plan 5 task 5, the closing task of
phase B: `origin/main` is at `b2bf733`, `?v=138`, carrying every plan through
4e (PR #36, merged 2026-08-22). Plans 1, 2, 3, 4a, 4b, 4c and 4e are all
merged — verified by `gh pr list` and by `git merge-base --is-ancestor` rather
than from this document's own memory. Plan 5 is the branch you are reading this
on, `phaseB-plan5-revalidate-docs`, stacked on 4e; it is the last plan of phase
B and it changes exactly one shipped file's behaviour (`vercel.json`, task 3).
The paragraph above is kept because it is the record of where the phase
started.**

**Read "What phase B did and did not achieve" at the end of this file before
quoting any number out of the middle of it.**

| Plan | Scope | State |
|---|---|---|
| 1 — `2026-08-12-phase-b1-migration.md` | r128 → r185 migration | **Done**, 7 tasks, reviewed |
| 2 — `2026-08-13-phase-b2-measurement-exposure.md` | Fix the metric's camera, re-fit exposure | **Done**, 9 tasks, reviewed, final fix wave applied |
| 3 — `2026-08-13-phase-b3-light.md` | Reachable blacks: source fix, BVH sampler, GTAO, lightmap pilot | **Closed.** All 7 tasks done and reviewed, plus a whole-branch review and its fix wave. Two of its three bets measured and **rejected** on their own criteria — GTAO (task 3) and offline lightmaps (task 6). Plan 3 pushed serenity out of the then-current merge gate; that gate was **restated on 2026-08-15** and the 0.03 accepted — see "The gate, restated 2026-08-15" |
| 4a — `2026-08-15-phase-b4a-winding-walls.md` | Wall winding, walls taking their own light, the re-fit both force | **Done**, 5 tasks, reviewed, whole-branch review and its fix wave applied. Fixed a shipped rendering bug older than phase B; the wall-shading trial returned **NO-GO** and reverted |
| 4b — `2026-08-16-phase-b4b-content-poses.md` | serenity's terrace opening, kings-court's missing shower, the mis-pointed and mis-mapped `photoSpots` | **Done**, 5 tasks, each reviewed with a fix round. Branch `phaseB-plan4b-content` off `5963ddd`, `?v=113 → 121`, ~~no PR yet~~ **merged as PR #33 (`b78ebd3`) on 2026-08-19 — corrected 2026-08-23 by plan 5 task 5, verified via `gh pr view 33`.** **Both apartments moved, and not one line of rendering code:** serenity 16.00 → **15.49**, kings-court 18.59 → **18.17** on a fixed 14-spot population, shipping **17.59** on 13. (~~The largest metric movement in phase B~~ — **superlative dropped 2026-08-19 by the whole-branch review**, and dropped rather than defended. Per apartment it is false on serenity: plan 4a moved serenity **−0.614** (row below) against 4b's **−0.51**. 4b is the larger only on kings-court, −0.42 vs −0.303, and only wins overall on an undeclared two-flat sum — 0.93 against 0.917, a **0.013** margin far inside this branch's own noise floor of 0.026 on serenity and 0.048–0.054 on kings-court. A branch that exists to stop numbers reading better than they are does not get to keep that superlative.) `poseVerified` 2 of 11 → 9 of 11 and 8 of 14 → 10 of 13. Task 1's "floor-to-ceiling slider" premise was **disproved** and only the width widened |
| 4c — `2026-08-19-phase-b4c-exterior-layout.md` | serenity's pool, planting and an opt-in sky; the capture harness's missing camera pitch; the window bench and the terrace lounger; kings-court's shower divider glass; the exposure re-fit | **Done, 2026-08-19**, 5 tasks plus a task 1b added mid-flight. Branch `phaseB-plan4c-exterior-layout` off `b78ebd3`, `?v=113 → 136`, **merged as PR #34 (`eeccd1f`)**. **It was split again before it was written**, the same way plan 4 was split and for the identical reason: the asset half (HDRI, GLTF, PBR/KTX2) is renamed **4d** and stays unwritten, because its critical path is human asset curation nobody has scheduled; everything routed to 4c that needs no asset was done instead. Closing gate, same session, BASE and HEAD served simultaneously: serenity **15.48/15.47 → 14.34/14.34 (−1.14)**, kings-court **17.59/17.61 → 17.58/17.62 (0.00)**. `poseVerified` 9 of 11 → **10 of 11** on serenity, unchanged at 10 of 13 on kings-court. **Most of serenity's −1.14 is an instrument correction, not a rendering improvement** — see the 4d row |
| 4d — not yet written | HDRI and exterior lighting, GLTF furniture library, PBR/KTX2 texture sets; kings-court's `18.webp` rattan set; the `sky` key on the other two apartments; ~~the pitch sweep over every remaining spot~~ | **Deliberately not written**, and this is 4c's old reason kept rather than inherited: its critical path is human asset curation, and a plan whose bottleneck is someone else's time is better written when that is settled. ~~What plan 4c added to it: **nine serenity spots and all thirteen kings-court spots are still captured at `pitch: 0`** and every one of them was pose-verified under that constraint. On the two spots where the tilt was actually supplied it was worth −12.51 and −2.22 of ΔE, so this is not a cosmetic item — but sweeping it is a second pass over every camera in both flats, which is plan 4b's work redone and needs its own before/after~~ **The pitch sweep left 4d on 2026-08-22: it was written and executed as plan 4e (row below), which swept all twenty-four spots and shipped ~~six~~ **four (corrected 2026-08-22 by plan 4e's final whole-branch review, which withdrew two that measured two different physical objects)** tilts on serenity and none on kings-court. Nothing else moved off this row — HDRI, GLTF, PBR/KTX2, the `18.webp` rattan set and the `sky` key on the other two apartments are all still 4d's, all still waiting on the same human asset curation.** |
| 4e — `2026-08-22-phase-b4e-pitch-sweep.md` | The camera-tilt sweep over every `compare` spot in both photographed flats — the item that came off 4d | **Done, 2026-08-22**, 5 tasks, tasks 3 and 4 each with a fix round. Branch `phaseB-plan4e-pitch-sweep` off `705ac42`, ~~`?v=136 → 137` (one bump, task 4)~~ **`?v=136 → 138`, two bumps, the second by the final whole-branch review**. **Merged as PR #36 (`b2bf733`) on 2026-08-22 — added 2026-08-23 by plan 5 task 5, which is the first pass with a merge to record; `origin/main` now ships `?v=138` and this is the tip every "shipped" figure below must be read against. Note the PR's own title says "three tilts shipped" and is wrong by the same withdrawal this row records; a merged PR title cannot be corrected in place, so it is corrected here.** ~~**serenity ships six derived tilts** — `4` 9°, `6` −6°, `7` 13°, `9` 1°, `11` −6° written here and `10`'s 22° independently re-derived — plus `2.webp`'s 40°, excluded from change by the plan's own carve-out; two spots ended `no-usable-landmark`, three `level-confirmed`.~~ **Corrected 2026-08-22 by plan 4e's final whole-branch review: serenity ships FOUR derived tilts — `6` −6°, `7` 13°, `11` −6° written here and `10`'s 22° independently re-derived — plus `2.webp`'s 40° under the carve-out; FOUR spots ended `no-usable-landmark` (`1`, `3`, `4`, `9`) and three `level-confirmed`. `4`'s 9° and `9`'s 1° were withdrawn and their keys removed because re-cropping showed each was measuring two different physical objects — `9`'s photograph row lies on a white table lamp absent from the render entirely, `4`'s on the near dining chair's top rim against bare render wall. `9` had already survived a fix round that RENAMED its landmark without re-cropping it: that is the THIRD instance of this error class on this branch, all three caught by a human cropping and looking and none by a residual, and the durable lesson is that a rename is not a re-derivation.** **kings-court ships nothing: its config is byte-identical to `main`** (0 tilt-confirmed, 1 level-confirmed, 10 no-usable-landmark, 2 will-not-converge) — the two flats' renders and photographs do not share enough unambiguous common architecture there, which is an allowed outcome of this plan and is reported rather than dressed up. **Do not read that `level-confirmed 1` across the rest of the row: "0 tilts shipped" is not "kings-court's cameras are level" — added 2026-08-22, plan 4e task 5 fix round.** Exactly one of its thirteen cameras (`10.webp`) was confirmed level; ~~the other twelve were never measured~~ **of the other twelve, two (`2`, `20`) were measured and contradicted themselves — two same-object landmarks in one frame demanding tilts 6–9° apart, which is the lens evidence — and the remaining ten were never measured at all (corrected 2026-08-22 by plan 4e task 5 fix round 2)**. **10 of the 13 end `no-usable-landmark`, and 8 of those 10 (`7`, `8`, `11`, `12`, `13`, `17`, `18`, `19`) carry a written reason in `b4e-lens-evidence.json`'s `excludedNotLensRelated` naming a furniture model, a room layout, a missing asset or a camera standoff — content work, not camera work** (counted out of that file and `kings-court-b4e-derivation.json`). A ninth, `3.webp`, is the same class (the two televisions hang at different heights), leaving `14.webp` alone on a lens cause. The content is routed to plan 5 through the individual `poseNote`s, and a pass that fixes it will be sweeping these spots **for the first time**. Closing gate, BASE and HEAD served simultaneously in one session, `--all-spots`, twice: ~~serenity **14.32/14.32 → 14.36/14.37 (+0.04)**~~ **serenity 14.33/14.34 → 14.33/14.34 (0.00), re-taken the same way after the two tilts were withdrawn (`serenity-b4e-final-{fix,BASE}.json` and their `-repeat.json`, HEAD at `?v=138`); the BASE side moved 14.32→14.33 between the two sessions on one machine, which is why only the paired Δ is quotable**, kings-court **17.60/17.57 → 17.59/17.57 (0.00, a same-state reproduction)**. ~~serenity's +0.04 sits in two spots, `7.webp` +0.37 and `4.webp` +0.18~~ **serenity's remaining per-spot movement is `7.webp` +0.16/+0.27 against `6.webp` −0.13/−0.12 and `11.webp` −0.06/−0.07; `4.webp` and `9.webp` are back at BASE because they now carry BASE's level camera**, and it **is an instrument correction, not a rendering change** — nothing about how the scene is lit, shaded or drawn moved; the harness stopped capturing a camera the photographer never used, and a saturated, better-aligned cell can score worse than the flat grey it replaced. `poseVerified` **unchanged, verified against the configs this session: serenity 10 of 11, kings-court 10 of 13** — no spot's camera moved in a way that re-opened its stamp. **Automatic two-parameter (tilt + lens) fitting was measured and rejected** before the first browser capture (`docs/superpowers/metrics/b4e-preflight-method-rejection.json`); the shipped method is a named landmark measured in both frames, with the fit only proposing a window |
| 5 — `2026-08-16-phase-b5-revalidate-and-docs.md` | Re-validate every constant, rewrite `CLAUDE.md` and `docs/PROMPT.md`, close the deploy caching hole | ~~**Written, not started.** 5 tasks.~~ **Done, 2026-08-23**, 5 tasks, tasks 1–4 each with a fix round. Branch `phaseB-plan5-revalidate-docs` off `2f257eb`'s lineage on 4e, **no `?v=` bump at all** — the only shipped file it touches is `vercel.json`, which the module tag does not version. Task 1 audited 33 constants (22 agree, 6 disagree, 5 with no comparable claim) into `docs/superpowers/metrics/constants-b5-audit.json`; task 2 corrected 7 `CLAUDE.md` claims plus an 8th found outside the audit; task 3 gave the HTML entry points an explicit cache policy and made `tour/lib/` immutable; task 4 rewrote `docs/PROMPT.md` 456 → ~934 lines; task 5 is this sweep. **It fixed no shipped defect and was not meant to** — the two it newly *found* (kings-court's 11 dynamic PointLights, `bake.js:498`'s unlinked `EXP` mirror) are routed to plan 6, along with everything below that names plan 5 as an owner and that the pre-flight ruling kept out of its five written tasks. See "What plan 5 closed, and what plan 6 inherits". **Plan 4b routed ~~three~~ ~~six~~ nine items into it** (corrected 2026-08-19, fix round 4 — rounds 2–4 each added one and left the count reading three, which is this document’s own recurring defect; **raised to nine 2026-08-19 by the whole-branch review's fix wave**, which re-routed two items off 4c and opened one new row) and none is in its written scope yet: serenity's `mainCeilH: 2.6` (re-pointed here from 4c — see "Deferred, with owners"), kings-court's `meta.photoFovLong: 120` measured at ~57–58°, the unsettled per-spot noise floor (0.35 vs 0.75), what varies across a page load, resolving every commit SHA named in the docs against `origin/main`, the `stale_claims.py`-vs-marker-convention conflict, ~~**kings-court's missing shower-divider glass** (`F.shower` constructor — re-pointed here from 4c)~~ **— CLOSED, and it was never plan 5's to do: plan 4c took this row back and BUILT it, `F.shower` gained opt-in `divider`, `valve` and `handheld` (`builder.js:1212`, used twice in `kings-court.json`). Struck 2026-08-22 after plan 4e; the item had sat here as open since 2026-08-19 while the code shipped, and no checker saw it because nothing in the sentence names a commit, a branch or a count — the same shape as the two `CLAUDE.md:96` / `metrics/README.md:681` misses this document already records. That makes the routed count ~~nine~~ eight**, **kings-court's entry-hall wardrobe coordinates** (re-pointed here from 4c), and **`stale_claims.py`'s own scope, matching and `--census` gaps**. **Resolved 2026-08-23 by plan 5 task 5: NONE of those eight was done, and that was a ruling rather than a slip.** The human partner ruled at plan 5's pre-flight that it executes its five written tasks and that the routed heavyweights go to a **plan 6 written on task 1's audit**, which is their missing input — you cannot correct a documented constant before you have measured it, and task 1 measures every one while changing nothing. All eight are re-assigned to plan 6 by name, with evidence pointers, in "What plan 5 closed, and what plan 6 inherits" below. **Re-assigned is not closed**; the row that records this is the mechanism that stops them being dropped a second time |

**"Plan 4" was one line and three different kinds of work** — engine code,
config geometry, and an asset-curation effort the design spec budgets at a day
or more of *human* work per property. It was split on 2026-08-15 so its code
half would not wait on its human half. ~~4a shipped; 4b is written; 4c waits on
a decision about who curates the assets.~~ **Struck 2026-08-23 by plan 5 task 5:
this was already stale when the RETIRED WHOLE marker below it was written, and
that marker covers only the paragraph after it, not this one. 4a, 4b and 4c
are all done and merged (PR #33 `b78ebd3`, PR #34 `eeccd1f`); the asset half is
renamed 4d and still waits on that curation decision, unchanged.**

**RETIRED WHOLE 2026-08-23 by plan 5 task 5 — read the blockquote under it
before any sentence in this paragraph.** ~~**Ten tasks are written and
unstarted** (5 in 4b, 5 in plan 5)~~ **Five are:
plan 5's. 4b's five are done** (updated 2026-08-19 by plan 4b task 5), plus 4c
whenever it is written. **4b is the one that matters most**: ~~nine of
serenity's eleven `compare` spots~~ and ~~six of kings-court's fourteen~~
**three of kings-court's thirteen** fail pose
verification, and that — not lighting — is what dominates the metric every
other plan has been judged by.

> **Retired, 2026-08-23 by plan 5 task 5. NONE are unstarted: 4b, 4c, 4e
> and plan 5 are all done, and 4c was written and merged.** The only unwritten
> plan is **4d**, whose critical path is human asset curation nobody has
> scheduled, plus a **plan 6** that does not exist yet — what it owns is listed
> under "What plan 5 closed, and what plan 6 inherits". The tally in this
> paragraph has now been wrong twice — the text above carries both corrections
> in place — which is what a live count does in a document nobody re-derives it
> in. **Do not write a third one here.**
> **The thesis of the paragraph survived and was proved, so it is worth
> restating without the tally:** what dominates this metric is pose and content
> mismatch, not lighting. Live counts, taken this session out of
> `tour/apartments/*.json`: **serenity fails 1 of 11** (`2.webp`), **kings-court
> 3 of 13** (`14.webp`, `17.webp`, `18.webp`), **20 of 24 across both flats**.

> **Superseded for serenity, 2026-08-19 by plan 4b task 2** (`1e0d4e5`): six
> mis-pointed spots were re-pointed and the one attached to the bathroom
> photograph was moved into the bathroom, so **serenity now fails 2 of 11, not
> 9** — `2.webp` and `10.webp`, the pool vista, which is a content defect
> (no pool geometry, no sky) ~~owned by 4c~~ **built by plan 4c task 1 and passing since task 1b — `10.webp` is `poseVerified` at 12.84, from 25.35; `2.webp` remains false on a furniture-placement reason routed to plan 5 (corrected 2026-08-19)**. ~~kings-court's six are untouched and
> the sentence still stands for it.~~ The paragraph's *thesis* is unchanged and
> was confirmed, not weakened: re-pointing those seven moved serenity's
> all-spot legacy gate 15.97 → 15.49 without a line of renderer code, which is
> ~~the largest single movement in phase B and~~ exactly the "pose dominates
> the metric" claim being made here.
>
> **A third correction, 2026-08-19 by the whole-branch review: the superlative
> is struck above, not restated anywhere.** "The largest single movement in
> phase B" is false on serenity — plan 4a moved that apartment **−0.614**
> against this branch's **−0.51**, on the same instrument and the same
> attribution discipline. The only comparison that makes the superlative true
> is an undeclared two-flat sum, 0.93 against 0.917, whose **0.013** margin is
> inside serenity's own 0.026 mean spread. Everything else in the sentence
> stands: the movement is real, it is attributed, and no renderer code
> produced it.
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
> rattan set does not exist). ~~**Across both flats: 10 of 25 spots passed at
> the merge-base; 19 of 24 pass now.**~~ **Struck 2026-08-23 by plan 5 task 5:
> "19 of 24" was falsified on 2026-08-19 when plan 4c task 1b flipped
> serenity's `10.webp`, and the live figure is **20 of 24** — counted this
> session out of `tour/apartments/*.json`, not carried across. This is the
> SIXTH correction to this document's pose counts, and the second time this
> exact sentence outlived a sweep that fixed its twin 400 lines below (line
> 509's copy was corrected on 2026-08-22; this one was not, in the same pass).
> The reason is in the deferred table: no `stale_claims.py` pattern matches
> `N of 24`, so a green run says nothing whatever about these figures.**
> Closing-gate figures, measured by task
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

**Shipped on `main`: plan 4c merged as PR #34 (`eeccd1f`) on 2026-08-19 — serenity `exposure` **0.31**, kings-court **0.52**, horkyone-10 **0.42**; bloom unchanged at threshold 1.8 / strength 0.1; `?v=136`; serenity gains a `sky` key and two `photoSpots` gain a `pitch`.** (This line said "unmerged at the time of writing" and `?v=135` when task 5 wrote it; both were falsified within the hour — the first by the merge itself, the second by the fix commit that followed the branch's self-review. Corrected 2026-08-19 immediately after merging, which is the only moment either could be checked.) Baselines: serenity **14.34**, kings-court **17.58–17.62**, both all-spot legacy and both paired same-session against `b78ebd3`.

**Superseded as the "what `main` ships" line, 2026-08-23 by plan 5 task 5 — the
paragraph above is now plan 4c's record, not the live tree.** `origin/main` is
at **`b2bf733`** and ships **`?v=138`**, because plan 4e merged as PR #36 on
2026-08-22. Read directly from `origin/main` this session, not carried across:
`exposure` is **serenity 0.31, kings-court 0.52, horkyone-10 0.42** —
unchanged by 4e, which moved cameras and nothing else — and the module tag at
`origin/main:tour/index.html:254` is `main.js?v=138`. Bloom is unchanged at
threshold **1.8** / strength **0.1** (`tour/post.js:255`). Plan 4e's own closing
gate reads serenity **14.33/14.34** and kings-court **17.59/17.57**, both
same-session paired and both **0.00 movement**; those are the live baselines and
they are in the 4e row of the plan table above. **Plan 5 bumps nothing** — its
one shipped change is `vercel.json`, which the module tag does not version — so
`?v=138` is also what this branch ships.

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
shading — ~~9 of serenity's 11 compare spots~~ ~~**2 of serenity's 11**~~ **1 of serenity's 11 (corrected 2026-08-19, plan 4c task 5 — `10.webp` flipped in task 1b, `2.webp` is the one left)** and
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
> pool clause survives untouched, and it is 4c's. **Closed 2026-08-19 by plan 4c tasks 1 and 1b:** the pool is now a basin with coping, a submerged wall and a rippled surface, with planting, a boundary fence and a gradient sky behind it, and `10.webp` reads **25.35 → 12.84**. Note *how*, because it is the paragraph's own thesis being tested again and the answer is uncomfortable: building the pool alone made the number **worse** (25.35 → 26.37). What moved it was task 1b teaching the capture harness a downward camera tilt it had always pinned to zero. So the dominant term here turned out to be neither shading nor content but the **instrument**, and the sentence above should be read as 'pose, content, and the camera the harness is able to represent'.
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

### ~~The live baselines, as of plan 4b — read these, not the table above~~ The plan-4b baselines — **NO LONGER LIVE**

> **The heading above lied by the time you read it, and that is the point —
> corrected 2026-08-23 by plan 5 task 5.** A heading that says "read these, not
> the table above" is a **live claim**, so it went false the moment another
> branch measured a baseline, and two of them have: plan 4c and plan 4e. It sat
> wrong through both. **The live baselines are plan 4e's, in the 4e row of the
> plan table at the top of this file** — serenity **14.33/14.34**, kings-court
> **17.59/17.57**, both all-spot legacy, both same-session paired, both
> **0.00** against their BASE arms, at `?v=138` on `origin/main` (`b2bf733`).
> Read those. Everything in this section is kept as the plan-4b record it is.
> **The general lesson, since this is the third heading-level instance in this
> document:** do not write "read these, not those" into a heading. Write the
> date and the plan, and let the reader find the newest.

**Recorded 2026-08-19 by plan 4b task 5** at branch `phaseB-plan4b-content`
tip, `?v=121`. The table above is kept as the plan-4a record it is; **these
supersede it** — and are in turn superseded, see the blockquote directly above.

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
| kings-court (14-spot, like-for-like) | 18.59 → **18.17** | **−0.42** | task 3 built the Bathroom 2 shower and un-inverted its marble; task 4 re-pointed four cameras. Carried by `14.webp` −4.03, `2.webp` −1.54, `10.webp` −1.15, against `17.webp` **+1.00 — a deliberate regression**, because the old pose rendered a blank wall that matched a white-marble photograph better than the vanity does. The nine untouched spots all moved ≤0.10. **Do not read this row as the twin of serenity's above** (added 2026-08-19 by the whole-branch review): serenity's carriers all pass pose verification now, kings-court's do not. **`14.webp` and `17.webp` are still `poseVerified: false`** and neither flag moved on this branch — `14.webp` still renders Bathroom 2 as the photograph's mirror image with no divider glass, and `17.webp` still has the wardrobe through the wall. Netted against the fourteen-spot total of −5.820, **51.9% of kings-court's movement comes from spots that still fail pose verification and 69% from `14.webp` alone** (−4.025); the equivalent figure for serenity is **2.2%** from still-failing spots, i.e. 97.8% from spots that now pass. Working: `metrics/README.md`, "Pose verification, which is what actually changed" |
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
> is merged** (PR #30, `feac92a`), ~~`origin/main` is at **`5963ddd`**, not
> `c2bb0bd`, and it carries serenity `exposure` **0.295**, kings-court
> **0.52**, horkyone-10 **0.42** at `?v=113`.~~ **Superseded twice over,
> 2026-08-23 by plan 5 task 5, and this is the same failure the paragraph is
> lecturing about: a dated correction that was true when written and rotted the
> moment two more branches merged. `origin/main` is at `b2bf733` and ships
> serenity 0.31, kings-court 0.52, horkyone-10 0.42 at `?v=138` — read out of
> `origin/main` this session. Plan 5 task 1's audit found `?v=113` still
> standing here and in the plan-5 document; both are corrected in this pass.**
> Verified by reading
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
their photograph. ~~**serenity passes 2 of 11**~~ ~~**serenity 9 of 11**~~
**serenity 10 of 11**,
~~**kings-court 8 of 14**~~
**kings-court 10 of 13** (see the 2026-08-19 notes below), **horkyone-10 has no
scorable spots at all.** (serenity's live figure was added inline here
2026-08-19 by task 5 — the earlier fix round struck the old number without
putting the new one beside it, so this sentence read as though only
kings-court had a current count.) ~~**Across both flats: 10 of 25 passed at
this branch's merge-base; 19 of 24 pass now.**~~ **Across both flats: 20 of 24
pass now.** **Corrected in place 2026-08-22 by plan 4e task 5, which counted
them out of `tour/apartments/*.json` rather than from memory: serenity fails
only `2.webp`, kings-court only `14.webp`, `17.webp` and `18.webp`. The struck
"9 of 11" and "19 of 24" were falsified back on 2026-08-19 when plan 4c task 1b
flipped serenity's `10.webp`, and survived that branch's own sweep — the fifth
time this document's counts have needed correcting. Plan 4e changed no
`poseVerified` flag on either apartment; it only found these stale.** The
scorers skip the failures; the
spots stay in the config with a `poseNote`, because they are the only
automated trail of the defects they expose.

> ~~**serenity now passes 9 of 11**, 2026-08-19, plan 4b task 2 (`1e0d4e5`).
> Only `2.webp` and `10.webp` still fail, and they keep their `poseNote`s.~~
> **Corrected 2026-08-23 by plan 5 task 5: serenity passes 10 of 11 and only
> `2.webp` fails** — `10.webp` flipped on 2026-08-19 when plan 4c task 1b
> taught the harness a downward tilt, and it now reads 12.84 from 25.35. Two
> sweeps of this document's pose counts have gone past this blockquote since.
> The 9 is left visible because the paragraph under it reasons *from* the
> population size, and the reasoning is now stronger, not weaker: the
> luminance-fitting population is **10**, not 9.
> **This is not only a bookkeeping change — it silently re-defines an
> instrument.** `tools/luminance.py` filters its population through
> `delta_e.scorable`, which requires `poseVerified`, and unlike `delta_e.py` it
> has **no `--all-spots` escape hatch**. So serenity's luminance-fitting
> population went from **2 spots to 9** the moment those flags flipped **— and
> then to 10 on 2026-08-19 when 4c task 1b flipped `10.webp`, which is the
> population any plan-6 re-fit will actually run on (noted 2026-08-23 by plan 5
> task 5; `CLAUDE.md`'s `exposure` row records the same 9 → 10 move and the
> `0.295 → 0.31` re-fit that rode on it, so the two files now agree)**. Any
> future `exposure` re-fit — including the one the `mainCeilH` row below
> mandates — therefore runs on a different, and much better-founded,
> population than the one that produced ~~the committed 0.295~~ **the
> then-committed 0.295; serenity ships 0.31 today**. It is an
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
  of 13 on kings-court** — plan 4b's own movement, correct as such. **Live
  today, counted out of `tour/apartments/*.json` on 2026-08-23 by plan 5 task
  5: serenity 10 of 11, kings-court 10 of 13.** Serenity's extra pass is
  `10.webp`, flipped by plan 4c task 1b, not by 4b.
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
| **serenity's sofa is on the wrong wall**, and the bedroom's bed head shares the window wall where the photographs show them perpendicular (the headboard buries ~0.45 m of the window). | A furniture-layout rewrite against the photographs, not a camera fix. It moves the metric — pair it same-session. Full measurement in the deferred table below | ~~**4c**~~ **plan 5, re-routed 2026-08-19 by plan 4c task 2 — the finding is CONFIRMED and the fix does not fit.** Both arrangements were built and RUN, not reasoned about: the first returned 7 validator issues (4 photo spots inside furniture, 3 rooms unreachable), the second 8 including `opening narrowed: 0.09 m free of 1.05 m` at the bedroom passage; both reverted in full. The binding numbers come from the live collider boxes, not the JSON: `F.diningTable`'s collider is **1.10 × 1.96** because it includes chairs, against a `w`/`d` of 0.9 × 0.85 in the config. Sofa 0.80 + table 1.10 + player 0.48 = 2.38 fits the room's 2.51 m, but the three living-room cameras at z 2.0–2.4 and the terrace door's 0.5 m then pin the table's z to 2.60–4.56 with no slack, and the TV console has no legal home left. The bedroom half is arithmetically impossible on that wall — a 2.1 m headboard plus a 1.3 m window on a 3.1 m wall — and the perpendicular alternative puts the bed on top of camera 11 at (1.35, 3.9). **Do not retry the furniture move alone; it has now failed twice with the circulation measured.** Working: `metrics/serenity-b4c-task2-layout-findings.json` **→ plan 6, re-assigned 2026-08-23 by plan 5 task 5.** Plan 5 never owned this in its written scope; it arrived by re-routing after 4c built and reverted two arrangements. The fuller cell in "Deferred, with owners" carries the measured circulation numbers. Listed with its evidence pointer under "What plan 5 closed, and what plan 6 inherits". |
| **kings-court's Bathroom 2 is the photograph's mirror image** (shower west of the bath where the photograph puts it east) and **has no divider glass** — the photograph's defining element | `F.shower` builds glass on two adjacent sides and assumes the other two are walls. This is a `builder.js` constructor change, which 4b forbids outright, so it is **genuinely blocked** rather than deferred by choice. The mirroring is a layout question on top of it | ~~**4c** (constructor), layout question with it~~ **Split, 2026-08-19 by the whole-branch review: the divider glass goes to plan 5; the mirroring stays with 4c.** Adding glass to `F.shower` is a constructor change and needs **no photographer** — routing it to 4c parked a confirmed, shipped, visible defect behind human asset curation that nobody has scheduled, which is the identical argument this document already accepted for `mainCeilH`. The mirroring genuinely is a layout question against the photographs and belongs with the furniture work in 4c. **This is `14.webp`'s defect, and `14.webp` carries 69% of kings-court's ΔE movement while still failing pose verification** — see the attribution row above. **Both halves settled 2026-08-19 by plan 4c task 3.** The divider glass was re-routed BACK from plan 5 and built: `F.shower` gained opt-in `divider`, `valve` and `handheld`, all defaulting off, and its other six callers were proved unchanged by capture against a BASE tree rather than asserted. The **mirroring stays open and moves to plan 5**: it is confirmed by independent derivation (camera yaw 200 → screen-left is EAST, so the photograph's left-hand shower must be east) and it does not fit — the room's interior is 2.46 m square, the photographed side-by-side pair needs 2.65 m, and the only variant that fits puts the bath across this room's own door. **Separate finding, also plan 5's:** under the legacy gate camera this spot renders a close-up of bare marble in *both* trees, so its gate number is scoring a wall, not a bathroom — that folds into the existing `meta.photoFovLong` row **→ plan 6, re-assigned 2026-08-23 by plan 5 task 5.** The divider-glass half was built by 4c and is closed. The **mirroring** is what moves: it is a layout question against the photographs, and plan 5 changes no file under `tour/`. Listed with its evidence pointer under "What plan 5 closed, and what plan 6 inherits". |
| **kings-court's entry-hall wardrobe passes through a wall** — world box x 22.20–24.60, so 0.80 m of it stands inside the Guest WC, 0.16 m in front of the vanity, **and its far end clears the x = 23.8 exterior wall by 0.80 m past the centreline / ~0.73 m past its outer face**, hanging outside the building where dollhouse mode shows it | Content defect; no legal camera clears it. Task 5 added the exterior half to the config's own `poseNote`, which had carried only the Guest WC half | ~~**4c**~~ **plan 5, re-routed 2026-08-19 by the whole-branch review.** This is a **furniture coordinate error** in `kings-court.json` — `x 23.4, d 2.4, rot -90` giving an x-extent of 22.20–24.60 — not asset curation, and **no photographer is required to fix it**. 4c is on record in this document as *deliberately not written* because its critical path is human asset curation, so owning this row with it meant a shipped geometry defect sat blocked indefinitely; the same argument already moved `mainCeilH` here. Plan 5 opens by re-validating constants, which is this row's shape. Confirmed live at HEAD by the whole-branch review: a ray from the east at z 2.15 hits the wardrobe face at x 24.60 and the shell's outer face at 23.87 **→ plan 6, re-assigned 2026-08-23 by plan 5 task 5.** A furniture coordinate error in `kings-court.json` needing no photographer — and therefore exactly the shape of row that keeps being re-routed and never done. Third owner. Confirmed live at HEAD: a ray from the east at z 2.15 hits the wardrobe face at x 24.60 against the shell outer face at 23.87. Listed with its evidence pointer under "What plan 5 closed, and what plan 6 inherits". |
| **`meta.photoFovLong: 120` is wrong for kings-court** — measured ~57° and ~58° by two independent methods on two different photographs (angular separation of identified features on `10.webp`; object size on `2.webp`) | **Deliberately shipped uncorrected.** It is one per-apartment constant governing all thirteen frames; correcting four spots per-spot would split the compare set in a way the gate cannot see and a visitor can. The right fix is to re-derive the constant from the apartment's own photographs as one change. Only two of thirteen frames were measured, so the derivation is not finished | ~~**plan 5** (a documented constant)~~ **→ plan 6, re-assigned 2026-08-23 by plan 5 task 5.** Plan 5 task 1 **measured and flagged it without touching it**, by explicit instruction: the config ships 120, and `constants-b5-audit.json` row "kings-court meta.photoFovLong" records that with the ~57–58° evidence and 4e's 2.2–2.4× factor, marked `agrees: false`. Plan 6 inherits a citation-checked starting point rather than a rumour. Listed with its evidence pointer under "What plan 5 closed, and what plan 6 inherits". |
| **The per-spot noise floor is unsettled: 0.35 or 0.75?** Task 3's fix round calls the committed 0.75 swing on `10.webp` a one-frame capture anomaly; task 4's fix round carries 0.35 forward. Both figures are committed in `docs/superpowers/metrics/` | Neither task's conclusion depended on it and this one's does not either, so nobody has had to settle it. It is the last open question about this instrument. **Start from ~0.3, not from scratch** (added 2026-08-19, fix round 1): task 5's own six kings-court captures form two independent same-state groups and put **`11.webp` at 0.32 and 0.30**, with the second-worst spot in any pairing never above 0.16. That corroborates **0.35** and refutes 0.14, and it localises the problem — **`11.webp` (Bedroom 1, desk) is where to look**, since the floor is really "most spots ≈0.15, `11.webp` ≈0.3" rather than a uniform band. serenity's equivalent is 0.08–0.09. Working: `metrics/README.md`, "The noise floors" | ~~**plan 5**~~ **→ plan 6, re-assigned 2026-08-23 by plan 5 task 5.** Plan 5 ran no capture and measured nothing new here, so the row stands as 4b and 4c left it: start from ~0.3, not from scratch, and look at `11.webp` specifically. 4c's related figure belongs with it — serenity's BASE gate reading drifted 14.32 → 14.33 across sessions on one machine, a lower bound on the smallest effect this instrument can resolve. Listed with its evidence pointer under "What plan 5 closed, and what plan 6 inherits". |
| **What varies across a page load** — ruled out per-frame grain and capture jitter; `captureEnvironment` is the untested suspect, `AO_DIRS` is a fixed table | Never isolated | ~~**plan 5**~~ **→ plan 6, re-assigned 2026-08-23 by plan 5 task 5.** Unchanged and un-narrowed by plan 5. 4c's finding that the variation is **not uniform across apartments** (horkyone-10 spawn-view spread 2.01 of 255 against kings-court's 0.24) folds in here. Listed with its evidence pointer under "What plan 5 closed, and what plan 6 inherits". |
| **Merge-status claims in the docs go stale silently, and nothing checks them.** Four were found and corrected 2026-08-19 (`f0315ea, unmerged`; "`main` is still at `c2bb0bd`… If plan 4a is not merged, the outgoing baselines stand"; "still open on `main`"; "Still present on `main`"), then **two more that no pattern matched**, because they name no commit, no branch and no count: `CLAUDE.md:96` and `metrics/README.md:681` ("`main` still carries the older three until it merges"). A seventh, `metrics/README.md:460`, is counted here too but is **a different failure mode and must not be added to that two** (corrected 2026-08-19, fix round 4): it was found by reading, by hand, in the same round that later created `stale_claims.py` — no checker existed to miss it. Every one was wrong the same way — **plan 4a merged as PR #30 (`feac92a`), and `origin/main` ships 0.295 / 0.52 / 0.42 at `?v=113`** | **Build the check; do not just re-sweep.** The mechanism is `git merge-base --is-ancestor <sha> origin/main`, cheap and decisive: **resolve every commit SHA named in `docs/` and `CLAUDE.md` against `origin/main` and report which claims about them are now false.** This is the worst class in this record because it goes stale with **nobody editing the file** — a merge elsewhere falsifies it — so a one-off sweep cannot hold it, and `CLAUDE.md` is the first file a fresh session reads. `tools/checks/stale_claims.py` now greps the prose *shapes* ("still carries", "until it merges", "unmerged branch tip") as a stopgap, but that is pattern-matching English; resolving the SHAs is the real check. And note its stated limit: it verifies a claim is **marked**, never that the marking is **true** — `metrics/README.md:460` was a false claim sitting *inside* a correct-looking marker, which no grep can catch | ~~**plan 5**~~ **→ plan 6, re-assigned 2026-08-23 by plan 5 task 5.** **This is the row that most deserved plan 5 and least got it.** Plan 5 resolved SHAs *by hand* where it needed them — `origin/main` is `b2bf733`, PR #36 merged, `?v=138`, all checked with `git merge-base --is-ancestor` and `gh pr list` this session — and corrected the `?v=113` sites task 1 found. **It built no check.** The mechanism is still the cheap decisive one this cell names, and the class still goes stale with nobody editing the file. Listed with its evidence pointer under "What plan 5 closed, and what plan 6 inherits". |
| **`stale_claims.py`’s scope rule and this repo’s marker convention now contradict each other, and a correct edit can trip the checker.** The checker scopes a claim to the smallest unit that renders on its own — a table row, a list item, a paragraph — so **every stale claim needs its OWN inline marker**. This repo’s written convention is the opposite shape: *“a narrated marker beside what it supersedes”* (a dated blockquote above or below the thing it retires). A writer following the convention will trip the checker and reasonably conclude the checker is wrong. Raised in fix round 3, promoted out of the gitignored task report into this table in fix round 4 — **the same placement failure the merge-status row above had just been fixed for** | **Decide it; do not let it decide itself by attrition.** Two ways out, and they are not equal. (1) **Write the inline-marker requirement into the convention** — cheap, and it is what a reader landing mid-document needs anyway, since a narrated block above a paragraph is invisible to someone who lands below it; the cost is that every existing narrated block in `docs/` becomes non-compliant and needs an inline tag. (2) **Find a scope rule that satisfies both** — e.g. let a marker cover the container only for content that existed when the marker was written, which needs `git blame` per line and is a real tool, not a tweak. **What must NOT happen is loosening the scope back**: it has failed open three times (90-line window, paragraph-plus-neighbours, whole-table/whole-list) and every loosening was found by mutation, never by reading. Evidence for the decision is in `tools/checks/stale_claims.py`: its module docstring states the conflict and the seven known limits, and its `BOUNDARY` table records, construct by construct, what a CommonMark/GFM renderer emits and therefore what the checker treats as a separate scope — so the decision can be made against the rendering rather than against taste. Run `python tools/checks/stale_claims.py --census` to see every claim site with the marker covering it before deciding, including the two this round could not close (it cannot tell an assertion from a quotation, and a marker anywhere in a prose paragraph still covers the whole paragraph) | ~~**plan 5**~~ **→ plan 6, re-assigned 2026-08-23 by plan 5 task 5.** Still undecided, and the row's own warning stands: **do not let it decide itself by attrition, and do not loosen the scope back** — it has failed open three times and every loosening was found by mutation, never by reading. Plan 5 task 5 wrote its markers to the checker's inline-scope rule rather than to the narrated-blockquote convention, which is one more data point for option (1) but is not the decision. Listed with its evidence pointer under "What plan 5 closed, and what plan 6 inherits". |
| **`stale_claims.py` still fails open in seven places, all reproduced by mutation, none fixed here** (opened 2026-08-19 by the whole-branch review; deliberately **not** fixed in its fix wave — five fix rounds had already run on this file and a sixth would restart a loop that is out of budget). **Scope gaps (4):** `scope()` breaks on blank lines, table rows and list-item markers and on nothing else, so a marker on the far side of any other block boundary launders the claim beside it. Reproduced by appending to `docs/PHASE-B-RESUME.md`, each giving **0 unmarked, exit 0** where the answer is 1 — (a) `## Living room, corrected 2026-08-19` with the claim on the next line; (b) `SUPERSEDED 2026-08-19 …` / `***` / claim; (c) a claim with a fence containing `SUPERSEDED 2026-08-19` glued below it; (d) the setext-heading form of (a). The positive control — a bare unmarked claim — correctly gave 1 unmarked, exit 1. Same mechanism as fix round 3's bug, unfixed for four further constructs, **and none of them is in `BOUNDARY`**. **Matching gaps (3):** `Still carries the older three exposures.` → 0 unmarked (matching is case-sensitive and nothing said so); `The model has a **punched window** on the south wall.` → 0 unmarked (inline emphasis defeats every pattern, in documents that use bold and backticks constantly); `Was ~~2 of 11~~ then; serenity now passes 2 of 11.` → 0 unmarked (a struck twin launders its live twin on the same line). Related: `FILES` is five hardcoded paths, so a brand-new `docs/PHASE-B-PLAN5.md` carrying a stale claim scores 0 unmarked — **which matters most operationally, because plan 5's stated job is to add and rewrite documents.** **`--census` (1):** it always exits 0, printing `NO MARKER` and returning 0 on a planted claim the check mode fails; its "74 sites" is 74 pattern matches over 55 distinct `file:line` pairs as measured at `ef8a898`; **75 over 56** from this row on, because this row's own quoted reproduction of the struck-twin gap above is itself a match; it skips missing files silently where the check mode prints `MISSING FILE`; and `transition` rows are counted but never checked | **Plan 5's first job, and start from these reproductions rather than rediscovering them.** All seven are recorded in `tools/checks/stale_claims.py`'s own docstring and `BOUNDARY` comment as of 2026-08-19, so the tool no longer implies coverage it lacks — but describing a gap is not closing it, and **a green run today is weaker evidence than five rounds of fix-round prose suggest.** The scope four are one change (make `_is_break` a real CommonMark block-boundary test, then re-derive `BOUNDARY` against a parser); the matching three are independent and cheaper. Do **not** widen the regexes to paper over the scope four — that is the loosening the row above forbids | ~~**plan 5**~~ **→ plan 6, re-assigned 2026-08-23 by plan 5 task 5.** Untouched by plan 5, and **now eight**: this pass found a further gap of its own — nothing matches `N of 11` / `N of 13` / `N of 24`, so the checker ran green while four live pose counts were false. It has its own row in "Deferred, with owners". Start from the reproductions in `stale_claims.py`'s docstring rather than rediscovering them. Listed with its evidence pointer under "What plan 5 closed, and what plan 6 inherits". |

### What plan 4c left open, routed so nothing is dropped

Written 2026-08-19 by plan 4c task 5, closing the branch. Every row was found
or confirmed by this branch.

| Open item | Why 4c could not close it | Owner |
|---|---|---|
| **serenity's sofa is on the wrong wall, and the bedroom's bed head shares the window wall** | Confirmed, and it does not fit. Two arrangements built and run, 7 and 8 validator issues respectively, both reverted. Sofa 0.80 + `F.diningTable`'s real 1.10 collider + player 0.48 = 2.38 against the room's 2.51 m *does* fit, but the cameras and the terrace door then pin the table's z with no slack and the TV console has nowhere legal. The bedroom half is arithmetically impossible: 2.1 m headboard + 1.3 m window on a 3.1 m wall. **Do not retry the furniture move alone** | ~~**plan 5**, with the shell-dimension items~~ **→ plan 6, re-assigned 2026-08-23 by plan 5 task 5.** Duplicate of the 4b row above; both move together. Listed with its evidence pointer under "What plan 5 closed, and what plan 6 inherits". |
| **kings-court's Bathroom 2 is still the photograph's mirror image** | The glass, valve and handheld were built; the mirroring was independently confirmed and does not fit — 2.46 m square room, 2.65 m needed, and the only fitting variant blocks this room's own door | ~~**plan 5**~~ **→ plan 6, re-assigned 2026-08-23 by plan 5 task 5.** Duplicate of the 4b row above; both move together. Listed with its evidence pointer under "What plan 5 closed, and what plan 6 inherits". |
| **kings-court's `13.webp` is mirrored too, and unlike Bathroom 2 it is still inside the default scoring population** (opened 2026-08-22 by plan 4e task 4) | Its divider shows the vanity and the shower **left-right reversed** — the render's vessel basin sits at x ≈ 0.66–0.82 with the shower to its left where the photograph puts the basin at x ≈ 0.11–0.35 with the shower right (`docs/superpowers/metrics/b4e-lens-evidence.json`, its `excludedNotLensRelated` entry) — yet it still ships `poseVerified: true`. That is *procedurally* correct: plan 4e never moved this camera, so the plan's re-decide instruction did not bite, and 4e changed no `poseVerified` anywhere. But `delta_e.scorable()` gates on that stamp, so kings-court's **worst-scoring spot — 26.51 against a next-worst 21.74** (`kings-court-b4e-task4.json`) — sits in the DEFAULT, poseVerified-filtered population every unflagged run uses. This is the same mirroring class as the row above and belongs with it. **Not low priority** | ~~**plan 5**, with the Bathroom 2 mirroring row~~ **→ plan 6, re-assigned 2026-08-23 by plan 5 task 5.** **Do not let the duplication hide the priority.** Unlike Bathroom 2 this spot still ships `poseVerified: true`, so `delta_e.scorable()` keeps kings-court's **worst-scoring spot — 26.51 against a next-worst 21.74** — inside the DEFAULT filtered population every unflagged run uses. Listed with its evidence pointer under "What plan 5 closed, and what plan 6 inherits". |
| **Real lens evidence, gathered but deliberately not acted on** (opened 2026-08-22 by plan 4e task 4) | On kings-court `2.webp` and `20.webp`, **two** landmarks that were crop-confirmed the same physical object in *one* frame, measured at the same column across the same nine captures, each have a clean interior minimum — and the minima are **9°** apart on `2.webp` and **6–9°** apart on `20.webp`. One camera has one tilt, so the gap cannot be tilt; the residual scales with distance from the principal point, which is a focal-length signature. Solving `2.webp`'s two rows simultaneously implies a tan-half-angle factor of roughly **2.2–2.4** (`b4e-lens-evidence.json`), ~~re-derived independently by the reviewer at ~2.41~~ **[the "~2.41" is withdrawn, 2026-08-22 by plan 4e task 5 fix round: it came from a re-derivation whose working lives only under gitignored `.superpowers/`, and `b4e-lens-evidence.json` commits the residuals and implied tilts but not the landmark row positions the solve needs — so it was cited and underivable. The committed 2.2–2.4 is the load-bearing figure and stands]**. **Read it as direction and magnitude class, not as a measurement**: it is a two-point estimate from one frame, it assumes the render's own geometry is right, the pre-flight already showed a two-parameter fit is degenerate, and `2.webp`'s second landmark is a **television** — the same record twice argues this apartment's TV models sit at different heights than the photographs'. It does **not** narrow the existing ~2.1 prior (`meta.photoFovLong` documented 120, measured ~57–58° by two earlier independent methods). Plan 4e edited `meta.photoFovLong` on neither apartment | ~~**plan 5**, folded into its existing `meta.photoFovLong` row~~ **→ plan 6, re-assigned 2026-08-23 by plan 5 task 5.** Gathered, committed and deliberately not acted on; plan 5 added nothing to it. Read it as direction and magnitude class, not as a measurement, exactly as the cell says. Listed with its evidence pointer under "What plan 5 closed, and what plan 6 inherits". |
| **`14.webp`'s gate reading is scoring a wall** | Under the legacy 72° gate camera this spot renders a close-up of bare marble in **both** trees; at the per-spot fov it frames the room. Anyone attributing a movement at `14.webp` to bathroom work is reading the wrong thing | ~~**plan 5**, folded into the existing `meta.photoFovLong` row~~ **→ plan 6, re-assigned 2026-08-23 by plan 5 task 5.** Folds into the `meta.photoFovLong` row, which plan 5 task 1 flagged and did not fix. Listed with its evidence pointer under "What plan 5 closed, and what plan 6 inherits". |
| ~~**Nine serenity spots and all thirteen kings-court spots are still captured at `pitch: 0`**, and every one was pose-verified under that constraint~~ **CLOSED 2026-08-22 by plan 4e** (not 4d): all twenty-four were swept. ~~serenity ships six derived tilts and four spots that earned no key~~ **serenity ships FOUR derived tilts and six spots that earned no key — corrected 2026-08-22 by plan 4e's final whole-branch review, which withdrew `4.webp`'s 9° and `9.webp`'s 1° after re-cropping showed each measured two different physical objects**; kings-court ships none and stays byte-identical to `main`. **Qualified 2026-08-22 by plan 4e task 5 fix round: "swept" means the sweep was attempted on all twenty-four, not that all twenty-four yielded an answer. On kings-court it mostly did not — 10 of 13 ended `no-usable-landmark` and 9 of those 10 for furniture/layout reasons, so its cameras are NOT known to be level and this row does not close that question. See the 4e row above** | ~~On the two spots where the tilt was supplied it was worth **−12.51** and **−2.22** of ΔE, so this is not cosmetic. But sweeping it is a second pass over every camera in both flats — plan 4b's work redone — and it needs its own before/after~~ **It was that second pass, and it cost what the row predicted. What it bought is not ΔE: the closing gate moved serenity ~~+0.04~~ **0.00 (re-taken 2026-08-22 by the final whole-branch review after two tilts were withdrawn; `serenity-b4e-final-*.json`)** and kings-court 0.00 (`docs/superpowers/metrics/*-b4e-gate-*.json`), because a correctly-aimed camera scores no better on an 8×8 colour grid than a wrongly-aimed one. What it bought is that the harness now captures the camera the photographer used** | ~~**4d**~~ **plan 4e, done** |
| **`6.webp`'s landmark carries an unrecorded depth offset, the same class already recorded for `11.webp`** (opened 2026-08-22, plan 4e's final whole-branch review) | The photograph's row reads the base of an upholstered bench back, which stands proud of the wall; the render's bench box has no back, so its top-rear edge sits at the wall instead — a cushion-thickness depth offset. `6.webp` moves ΔE −0.13/−0.12, toward the photograph, so this is an observation for a future pass, not a defect in the shipped −6° | ~~**plan 5**, whoever next revisits serenity's window bench~~ **→ plan 6, re-assigned 2026-08-23 by plan 5 task 5.** An observation for whoever next revisits serenity's window bench, not a defect in the shipped −6°. Listed with its evidence pointer under "What plan 5 closed, and what plan 6 inherits". |
| **The instrument's resolution floor is stated operationally but never named** (opened 2026-08-22, plan 4e's final whole-branch review) | serenity's BASE gate reading drifted **14.32 → 14.33** across sessions on one machine — the record says to read the paired Δ, never the absolute, and explains BASE was re-served rather than compared against older committed files, but never states the plain consequence: that drift is a **lower bound on the smallest effect this instrument can resolve**, and a branch whose whole movement is smaller than it has measured nothing | ~~**plan 5**, alongside its existing noise-floor row~~ **→ plan 6, re-assigned 2026-08-23 by plan 5 task 5.** Belongs with the noise-floor row and moves with it. Listed with its evidence pointer under "What plan 5 closed, and what plan 6 inherits". |
| **`4.webp`'s derivation entry lacked the same-camera-return sentence `9.webp`'s carries** (opened and closed here, 2026-08-22, plan 4e's final whole-branch review) | Cosmetic asymmetry in the record: `9.webp`'s entry in `serenity-b4e-derivation.json` explains why `poseVerified` stays `true` after its tilt was withdrawn — the camera returns to exactly the level pose it was verified at before this branch — and `4.webp`, withdrawn the same way, carried no such sentence | **Closed in this pass**: the sentence was added to `4.webp`'s `reason` field, mirroring `9.webp`'s wording, in `docs/superpowers/metrics/serenity-b4e-derivation.json` |
| **The render's shadows are lighter than the photographs' and exposure cannot fix it** | At the fitted 0.31, p5 is 0.0760 against the photographs' 0.0379, and raising exposure to match the *mean* makes it worse. Exposure is a global multiplier. This is plan 3's "reachable blacks" problem, still open | **unowned**, like the wall atlas |
| **The sky cannot reach the photographs' brightness** | Every channel saturates around 176/255 for any source colour at serenity's exposure, so `10.webp`'s (167, 211, 239) zenith is out of range | **unowned** — it is a tone-mapping headroom question, not a config one |
| **Per-page-load variation is not uniform across apartments** | Measured this session on one machine: horkyone-10's spawn-view spread is mean 2.01 of 255, kings-court's entry-hall spread 0.24 — roughly eight times. A single-apartment probe would have missed that | ~~**plan 5**, folded into its existing "what varies across a page load" row~~ **→ plan 6, re-assigned 2026-08-23 by plan 5 task 5.** Folds into the "what varies across a page load" row and moves with it. Listed with its evidence pointer under "What plan 5 closed, and what plan 6 inherits". |
| **`tools/serve.py` sends no cache headers, so a stale `index.html` silently pins every classic script to the old `?v=`** | Cost real time in task 1: three new `F.*` constructors were skipped in silence, because `buildFurniture` does `if (!fn) continue` and an unknown type is not an error. Documented in `CLAUDE.md` rule 3 with the one-line check; **not fixed**, because adding no-store headers to the dev server is a tooling change this branch had no measurement for | ~~**plan 5**~~ **CLOSED 2026-08-23 by plan 5 task 3** — the one row on either of these tables that plan 5 actually discharged. `tools/serve.py` now sends `no-store` on HTML, so a stale `index.html` can no longer pin every classic script to the old `?v=`. `CLAUDE.md` rule 3 keeps its one-line check anyway, because the check is useful whatever the server does |

## What plan 5 closed, and what plan 6 inherits

Written 2026-08-23 by plan 5 task 5, closing the plan and phase B's record.
**This section exists because "plan 6" was already being named as an owner by
several rows in the tables above, by `CLAUDE.md` in two places and by
`docs/superpowers/metrics/constants-b5-audit.json` in three — while no such
plan existed and nothing said what it owned.** An owner that does not exist is
indistinguishable from no owner. This is the single place that says what plan 6
inherits. **It is not plan 6**, and deliberately so: plan 6 must be *written*
on task 1's audit, which is the input the pre-flight ruling identified as
missing.

### The ruling that produced this list

At plan 5's pre-flight the human partner ruled that plan 5 **executes its five
written tasks as they stand**, and that the routed heavyweights do not get
promoted into it. The reason is not scheduling: *you cannot correct a
documented constant before you have measured it*, and task 1 measures every one
while changing nothing. Plan 6 is therefore written on an input that did not
exist when plans 4b and 4c were routing work into "plan 5".

**Nothing in the inheritance list has been fixed. Every item is re-argued, not
re-deferred by silence** — which is the failure the deferred table exists to
prevent, and which this record has committed at least twice (the shower-divider
row sat open for three days while the code shipped; `19 of 24` outlived a sweep
that fixed its own twin four hundred lines away).

### Closed by plan 5, with the task that closed it

| Closed item | By | Evidence |
|---|---|---|
| The deploy-headers hole: dead `/three.min.js` rule, `tour/lib/` on the generic `max-age=300`, no explicit HTML policy | task 3 | `vercel.json`; `X-Cache-Policy: html-explicit` on `/` and `/catalog`; `tour/lib/three-0.185.0/` now `immutable`. **The record OVERSTATED this hole and the correction is part of the close** — production's public alias already returned `public, max-age=0, must-revalidate` on HTML, so "one stale `index.html` and nothing ever ships again" was never live. What is new is that the default became an explicit guarantee. **Carries an unrun post-merge gate**, in the deferred table |
| `tools/serve.py` sending no cache headers, pinning classic scripts to a stale `?v=` | task 3 | `no-store` on HTML only. This was the *local* half of the same failure and it really did cost an hour in plan 4c task 1 |
| `CLAUDE.md` beyond the two rows already corrected | task 2 | 7 claims corrected against the audit, plus an 8th found outside it: hard rule 1's promise that the whole debug API is set synchronously "before the light bake even starts" is true for `window.__issues` (`app.js:152`) and **false** for `window.__app` (`app.js:628`, after `Baker.run` at `:176`) |
| `docs/PROMPT.md` describing an architecture that no longer existed | task 4 | 456 → ~934 lines, rewritten against the audit; ~387 original lines survived |
| Every documented constant unverified against the code it describes | task 1 | `docs/superpowers/metrics/constants-b5-audit.json` — 33 rows, 22 agree, 6 disagree, 5 with no comparable claim, each with provenance, and a `notCovered` field naming what it did **not** read |
| `.gitignore`'s missing generic `__pycache__` rule | plan 4b (nested) + task 5 (generic) | `.gitignore:39` and `:50`; placement after the harness negation verified with `git check-ignore -v`, not by reading |
| The `docs/superpowers/metrics/README.md` coverage paragraph's own inaccuracy (parked by plan 4a, 2026-08-16) | task 5 | It claimed "by literal filename, no glob"; one line globs `metrics/*b4a-*allspots.json`, and `tour/bake.js` was omitted. Both verified in the checker's source |
| `Doll.floorPoint()`'s undisclosed `null` return on wall footprints (parked by plan 4a, 2026-08-16) | task 5 | Now stated in `CLAUDE.md`'s `doll.js` row. **Disclosure only** — the behaviour is correct and better than the silent misread it replaced |
| The `?v=113` claims in this document and in the plan-5 document | task 5 | Tree and `origin/main` both at `?v=138` |

### What plan 6 inherits

Grouped so a plan can be written from it. Every item carries the pointer that
lets whoever writes it start from evidence rather than from this paragraph.

**A. Shipped defects — no photographer, no asset curation, no decision needed.**

1. **kings-court ships 11 dynamic PointLights against a hard-ruled ≤8**
   (serenity 3, horkyone-10 3). Never flagged in `docs/` before plan 5 task 1.
   `tour/builder.js:1604` constructs one live light per `dyn` entry with no
   cap. → `constants-b5-audit.json`, "Dynamic PointLights per apartment";
   `CLAUDE.md` "Numbers that matter" and hard rule 4.
2. **`tour/bake.js:498` hardcodes `1.7 * Math.PI` instead of `EXP * Math.PI`.**
   Latent: the two agree today only because nobody has tuned `EXP` since the
   r185 migration. → `constants-b5-audit.json`, "EXP mirror at bake.js:498".
3. **kings-court's entry-hall wardrobe passes through two walls** — world box
   x 22.20–24.60, so 0.80 m stands inside the Guest WC and ~0.73 m hangs
   outside the building's own exterior face, where dollhouse mode shows it. A
   coordinate error in the config. Third owner.
4. **`tools/serve.py` hardening, as one pass over one file**: the
   `allow_reuse_address` defect (A5), the unguarded `base64.b64decode` at
   ~~`:90`~~ **`:122`, corrected 2026-08-23 by plan 5 task 5 — `:90` is inside
   a comment about the `read(0)` fallback, the actual call is at `:122`,
   verified with `grep -n b64decode tools/serve.py`**, and the `%00`/TOCTOU
   pair. The last two fail closed and would not
   justify a pass alone; A5 does, and they cost nothing once someone is in the
   file.
5. **Stale `serve.py` processes silently re-measure the old tree**
   (`tools/serve.py:131`). **Rated the most serious item on this list**,
   because every measurement recipe here runs through that server and a
   poisoned number becomes invisible the moment it is written down. It nearly
   voided task 3's own verification.

**B. Constants that must be re-measured before they are edited.**

6. **serenity's `mainCeilH: 2.6`** against a photographic band of ~2.9–3.2 m.
   **Its own task, not folded into a pose or furniture task.** Re-fitting
   serenity's `exposure` and re-baselining all eleven spots are *part of it*.
   **Both photographic routes rest on `4.webp` alone and the band must be
   re-measured first** — do not treat ~2.9–3.2 as ready to apply.
   → `constants-b5-audit.json`, "serenity mainCeilH"; the deferred table
   above; `docs/PHASE-B-OBSERVATIONS.md:161`.
7. **kings-court's `meta.photoFovLong: 120`**, measured ~57° and ~58° by two
   independent methods, with plan 4e's 2.2–2.4× lens factor as a third,
   weaker line that does **not** narrow the prior. One constant governs all
   thirteen frames, so correcting spots individually would split the compare
   set in a way the gate cannot see and a visitor can. `14.webp`'s "gate
   reading is scoring a wall" folds in here.
   → `constants-b5-audit.json`, "kings-court meta.photoFovLong";
   `docs/superpowers/metrics/b4e-lens-evidence.json`.
8. **horkyone-10's ±10 luminance criterion has no automated check**, and
   nothing re-runs it when a sibling's exposure moves. **Not separable from
   item 6**: the band is derived from serenity's mean scene luminance, and
   `tools/luminance.py` filters through `delta_e.scorable` with no
   `--all-spots` escape, so serenity's fitting population has already moved
   2 → 9 → 10 spots underneath it. Plan 4a found the shipped 0.46 already
   +11.07 outside its own band — by hand, in passing, which is the gap.

**C. The instrument's own unknowns.**

9. **The per-spot noise floor: 0.35 or 0.75?** Start from ~0.3 and from
   `11.webp` specifically — the shape is "most spots ≈0.15, `11.webp` ≈0.3",
   which is a lead on a mechanism rather than only a number. serenity's
   equivalent is 0.08–0.09.
10. **What varies across a page load.** Per-frame grain and capture jitter are
    ruled out; `captureEnvironment` is the untested suspect and `AO_DIRS` is a
    fixed table. It is **not uniform across apartments** — horkyone-10's
    spawn-view spread is 2.01 of 255 against kings-court's 0.24.
11. **The resolution floor is stated operationally but never named.**
    serenity's BASE gate reading drifted 14.32 → 14.33 across sessions on one
    machine. That drift is a **lower bound on the smallest effect this
    instrument can resolve**, and a branch whose whole movement is smaller than
    it has measured nothing. Belongs with items 9 and 10.

**D. The record's own machinery — the class that rots with nobody editing it.**

12. **Resolve every commit SHA named in `docs/` and `CLAUDE.md` against
    `origin/main`** and report which claims about them are now false. The
    mechanism is `git merge-base --is-ancestor <sha> origin/main`. **Build the
    check; do not just re-sweep** — plan 5 swept by hand where it needed to and
    built nothing, and a one-off sweep cannot hold a class that goes stale when
    someone else merges.
13. **Decide the `stale_claims.py` scope rule against this repo's marker
    convention.** They contradict each other, so a correct edit can trip the
    checker. Two ways out, not equal, both written up in the 4b table above.
    **What must not happen is loosening the scope back**: it has failed open
    three times and every loosening was found by mutation, never by reading.
14. **`stale_claims.py`'s eight reproduced gaps** — the seven the 4b table
    records (four scope, three matching), plus the one this pass found: nothing
    matches `N of 11` / `N of 13` / `N of 24`, so the checker ran green while
    four live pose counts were false. Also `FILES` is five hardcoded paths, so
    a new document carrying a stale claim scores zero unmarked.
15. **`docs/PROMPT.md` and `CLAUDE.md` now assert the same facts twice** and
    will diverge the first time one is corrected alone. Make the relationship
    **directional** — `PROMPT.md` is derived from `CLAUDE.md` at audit time and
    must be re-derived whenever a "Numbers that matter" row moves — and give
    `stale_claims.py` PROMPT-specific patterns keyed on its
    `(reference project — measure your own)` labels, which are exactly the
    claims that will rot.
16. **`stale_claims.py` cannot see `PROMPT.md` at all in practice**, though the
    file sits in `FILES` at `stale_claims.py:163`. Its 14 patterns are plan
    4b's claim shapes, which project-independent prose matches by construction
    never. Either pattern it or remove it from `FILES`; advertising coverage
    that does not exist is the worse of the two.
17. **The HTML cache policy is pinned to two literal paths, not to HTML as a
    type.** Turn `cleanUrls` off or add a third entry point and HTML silently
    reverts to the platform default. `vercel.json` cannot carry comments, so
    this document is the only place it can be said.

**E. Content and layout — real, confirmed, and each already tried once.**

18. **serenity's sofa is on the wrong wall, and the bedroom's bed head shares
    the window wall.** **Do not retry the furniture move alone** — two
    arrangements were built and run, returning 7 and 8 validator issues, both
    reverted in full. The bedroom half is arithmetically impossible on that
    wall: a 2.1 m headboard plus a 1.3 m window on 3.1 m.
    → `metrics/serenity-b4c-task2-layout-findings.json`.
19. **kings-court's Bathroom 2 is the photograph's mirror image**, and
    **`13.webp` is mirrored too**. `13.webp` matters more operationally: it
    still ships `poseVerified: true`, so kings-court's worst-scoring spot —
    **26.51 against a next-worst 21.74** — sits inside the default filtered
    population every unflagged run uses.
20. **`6.webp`'s landmark carries an unrecorded depth offset**, the same class
    already recorded for `11.webp`. An observation for whoever next revisits
    serenity's window bench, not a defect in the shipped −6°.

**F. Still unowned, named here so that stays visible rather than becoming
invisible.**

21. **The per-texel wall lightmap atlas.** Unblocked by plan 4a task 1 and
    unbuilt. Plan 4a task 2's NO-GO bounds *vertex-shaded* walls, not walls:
    with the smearing artefact suppressed as far as that sweep could, vertex
    shading buys **+0.23 of the +1.11** required. Known cost: a **from-scratch
    atlas rasteriser**, since three.js's `UVUnwrapper` is a thin wrapper over
    the `xatlas-web` WASM module and there is nothing in the vendored tree to
    reuse for the packing. **This plan does not adopt it, and says so
    deliberately rather than leaving it to be assumed.**
22. **The render's shadows are lighter than the photographs' and exposure
    cannot fix it** — p5 0.0760 against 0.0379 at serenity's fitted 0.31, and
    raising exposure to match the *mean* makes it worse, because exposure is a
    global multiplier. This is plan 3's "reachable blacks", still open.
23. **The sky cannot reach the photographs' brightness** — every channel
    saturates around 176/255 at serenity's exposure, so `10.webp`'s
    (167, 211, 239) zenith is out of range. A tone-mapping headroom question,
    not a config one.
24. **Plan 4d, still unwritten**: HDRI and exterior lighting, a GLTF furniture
    library, PBR/KTX2 texture sets, kings-court's `18.webp` rattan set, and the
    `sky` key on the other two apartments. **Its critical path is human asset
    curation that nobody has scheduled** — which is exactly why five rows that
    needed no photographer were re-routed off it, and why routing anything
    further there should be resisted.

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
  is not enough: ~~`serve.py:90`~~ **`serve.py:122`** (corrected 2026-08-23 by
  plan 5 task 5 — `:90` is a comment line, the call is at `:122`, verified with
  `grep -n b64decode tools/serve.py`) truncates the destination into existence before
  it decodes the body, so a malformed capture leaves a **zero-byte file** that
  a presence probe happily passes. See the ~~`serve.py:90`~~ **`serve.py:122`**
  row in "Deferred, with
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
| ~~`vercel.json` still caches the deleted `/three.min.js`; the version-stamped `tour/lib/` gets the generic `max-age=300`~~ **CLOSED 2026-08-23 by plan 5 task 3**: the dead `/three.min.js` rule is deleted, and `tour/lib/three-0.185.0/` now gets `max-age=31536000, immutable` instead of `max-age=300` — correct, because that directory is version-stamped **by its name**, so its contents can never change under a fixed URL | plan 5 task 3, done — **but carrying a post-merge gate that has not run**: after this branch merges, `curl` the production alias and confirm `/lib/three-0.185.0/build/three.module.js` returns `max-age=31536000, immutable` and that `/` and `/catalog` carry `X-Cache-Policy: html-explicit`. If `/lib/` shows `max-age=300`, move the two `/lib/` rules above the generic `.js` rule |
| ~~No explicit `Cache-Control` on the HTML entry point — now the single point of failure, since one tag versions everything~~ **CLOSED 2026-08-23 by plan 5 task 3, and the row's own description was an OVERSTATEMENT that must not be carried forward.** The hole was never live: production's public alias `apartment-upujcovny.vercel.app` already returned `public, max-age=0, must-revalidate` on HTML, verified independently against the live site before the change. So "one stale `index.html` and nothing ever ships again" described a risk the platform default was already covering by accident. What task 3 actually bought is that the default became an **explicit written guarantee** plus an `X-Cache-Policy: html-explicit` diagnostic header, and `tools/serve.py` now sends `no-store` on HTML so the *local* variant of the failure — the one that really did cost an hour in plan 4c task 1 — cannot recur | plan 5 task 3, done. **Residual, re-assigned rather than closed:** the HTML policy is pinned to two literal paths (`/`, `/catalog`), not to HTML as a type, so turning `cleanUrls` off or adding a third entry point silently reverts HTML to the platform default. `vercel.json` cannot carry comments, so this document is the only place it can be said → **plan 6** |
| `serve.py`: `%00` in a path raises instead of returning 400; realpath check is TOCTOU-racy in principle | ~~deferred, dev-only, fails closed~~ **DECIDED 2026-08-23 by plan 5 task 5, because the brief required the decision to be recorded either way rather than re-deferred silently: these two stay UNFIXED, and the reason is that both fail closed on a machine only the developer can reach. But the decision the row was framed around — "does dev-only tooling that every measurement depends on deserve hardening?" — is answered YES for `serve.py` as a whole, on the strength of a THIRD defect found this session that does not fail closed at all (the `allow_reuse_address` row below). The work is one pass over one file and belongs in plan 6 with that row, not in isolation** → **plan 6, bundled** |
| ~~`serve.py:90`~~ **`serve.py:122`** (corrected 2026-08-23 by plan 5 task 5, verified with `grep -n b64decode tools/serve.py`; `:90` was a comment line): `base64.b64decode(body)` is unguarded in `do_POST`, so a malformed save body raises, `socketserver` prints the traceback and **kills that handler thread**. Sibling to the `%00` row above, and it matters more than it looks: **every** measurement recipe in this repo goes through `/save/`, and the failure mode next door is a sandboxed `serve.py` answering HTTP 200 while writing nothing. Two independent ways for a capture to be silently absent, and neither announces itself — ~~probe for the file on disk, never trust the response~~ **probe for the file on disk AND check it is non-empty** (corrected 2026-08-19 by plan 4b task 5, after reproducing the bug directly against a running `serve.py`). **The old advice does not survive this very bug.** `f.write(base64.b64decode(body))` at ~~`:90`~~ **`:122`** evaluates the decode *after* `open(dest, 'wb')` has already truncated the file into existence, so a bad body leaves a **zero-byte file that exists** — a presence probe passes and proves nothing. Both failure shapes were reproduced: a body of `!!!` raises nothing at all (`b64decode` discards non-alphabet characters, so it decodes to `b''`), returns **HTTP 200**, and writes 0 bytes; a body of `QUJDQ` raises `binascii.Error`, kills the handler thread so the client sees a dropped connection — and still leaves the same 0-byte file. Non-emptiness is the only check that catches either | ~~deferred, dev-only; found by plan 4a, advice corrected by plan 4b~~ **RE-ASSIGNED 2026-08-23 by plan 5 task 5 → plan 6, bundled into the one `serve.py` hardening pass with the `%00`/TOCTOU row above and the `allow_reuse_address` row below.** Re-deferring this a third time on "dev-only" grounds stopped being defensible once a fourth `serve.py` defect turned up in the same file this session, and this row's own text is the argument: **every** measurement recipe in this repository goes through `/save/`, and a number that never reached disk is indistinguishable from one that did until someone checks the file size |
| The horkyone-10 ±10 luminance criterion **went unenforced for some time**: the shipped `exposure` 0.46 was already failing it before plan 4a started (+11.07 from serenity against a ±10 band), because plan 4a task 1 brightened all three apartments and serenity's re-fit came down further, moving the band out from under horkyone-10. Found in passing by plan 4a task 3, whose refit to 0.42 was therefore **mandatory, not cosmetic**. The criterion has no automated check and nothing re-runs it when a sibling's exposure moves — that is the actual gap | ~~plan 5~~ **plan 6, re-assigned 2026-08-23 by plan 5 task 5.** Plan 5's five written tasks measure and document; they re-fit no exposure, and this row cannot be closed without one. It is also **not separable from `mainCeilH`**: horkyone-10's ±10 band is derived from serenity's mean scene luminance, `mainCeilH` mandates re-fitting serenity's exposure, and `tools/luminance.py` filters through `delta_e.scorable` with no `--all-spots` escape, so serenity's fitting population has already moved 2 → 9 → 10 spots under it. Whoever takes `mainCeilH` re-derives this band in the same task; splitting them re-creates exactly the "nothing re-runs it when a sibling moves" gap this row names. **The automated check is the durable half and is the smaller job** — plan 4a found the shipped 0.46 already +11.07 outside the band, by hand, in passing |
| ~~`CLAUDE.md` beyond the two rows already corrected~~ **CLOSED 2026-08-23 by plan 5 task 2**, which corrected 7 claims against task 1's audit plus an 8th found outside it — hard rule 1 promised the whole debug API is set synchronously "before the light bake even starts", which is **true for `window.__issues`** (`app.js:152`) **and FALSE for `window.__app`** (`app.js:628`, after `Baker.run` at `:176`). Every debug recipe in that file leans on that sentence | plan 5 task 2, done. **Not a general warranty on `CLAUDE.md`**: task 1's audit records its own `notCovered` field, and plan 5 task 2 corrected the rows the audit reached, not every sentence in the file |
| 5th-percentile shadow luminance never closes | ~~**this is plan 3's whole subject**~~ **unowned** (corrected 2026-08-23 by plan 5 task 5: plan 3 is closed; carried as unowned in the plan-6 section, item 22, like the wall atlas) |
| ~~**`grid()` winds 8 of 12 wall faces backwards**~~ — **discharged** by plan 4a task 1 (`b767b4b`) with the sign test the section below prescribes; ~~still open on `main`, closed on `phaseB-plan4a-winding`~~ **closed on `main` as well — `b767b4b` is an ancestor of `origin/main` via PR #30 (corrected 2026-08-19, plan 4b task 5 fix round 2)**. **What it cost:** one task, plus the exposure re-fit it forced (task 3) and the rebaselining that followed (task 4) — and a real dimensional change, every **x** span in all three apartments shrinking by exactly 0.280 to its configured size, which is a correction rather than a regression. **What it bought:** serenity 16.60 → 16.32 all-spot legacy on task 1 alone, closing the 0.03 shortfall this document spends a section explaining. **What it unblocked: the per-texel wall lightmap atlas**, which could not be built onto inside-out walls at all — that is now the open path for whoever writes plan 4c or 5, and plan 4a task 2's NO-GO does **not** close it (see the atlas bullet below). The section below is kept as the diagnosis that produced the fix, not as an outstanding item | plan 4a, done |
| ~~`.gitignore` covers only `tools/__pycache__/`, not a generic `__pycache__/` rule~~ **CLOSED 2026-08-23.** Two commits closed it and both are needed: plan 4b widened the rule to `tools/**/__pycache__/` (`.gitignore:39`) when `tools/checks/` appeared, which covered the tooling directory but left the row itself open by its own comment; plan 5 task 5 added the generic `__pycache__/` at `.gitignore:50`. **The placement is load-bearing and is why this took two passes:** it must sit *after* `!docs/superpowers/harnesses/**` (`.gitignore:15`), because that negation un-ignores everything under the harness tree and in gitignore the last matching rule wins. Verified with `git check-ignore -v` on a planted path in both trees, not by reading | closed — plan 4b (nested) and plan 5 task 5 (generic) |
| **serenity's furniture is on the wrong walls in two rooms, and no camera can fix it.** Found by plan 4b task 2 while re-pointing the seven mis-pointed spots — it is what remains after every pose is correct. (a) **Living room:** `3.webp`, `4.webp` and `9.webp` all put the sofa against the *same* long wall as the dining table, with the terrace door beyond it; `serenity.json` puts the sofa against the **west** wall (backing onto x 3.1) and the dining table against the **east** (x ≈ 5.2), so any camera that frames the terrace door correctly renders the sofa on the opposite side of the frame from the photograph. (b) **Bedroom:** `6.webp` and `11.webp` between them show the window wall and the bed-head wall to be **perpendicular**; the config puts both on the **same** wall (z 6.65) — the bed is centred at x 1.0 and the window opening spans **x 1.6–2.9** (`at` is the opening's **start** offset along the wall, not its centre: `builder.js` splits pieces at `from: o.at, to: o.at + o.w`), while `F.bed`'s headboard is drawn `w + 0.5` = **2.1 m** wide, so it runs to x 2.05 and buries roughly **0.45 m of the window's left edge** behind it. Both are content defects, not pose defects, and both survive at the poses this task shipped. They are also the reason serenity's living-room ΔE barely moves while the bedroom's falls by 2.7. **Whoever takes it:** this is a furniture-layout rewrite against the photographs, and it moves the metric — pair it same-session like any other change | ~~**plan 4c**~~ → 4c re-routed it to plan 5 → **plan 6, re-assigned 2026-08-23 by plan 5 task 5.** Third owner, and the reason is not indecision: plan 4c *tried* it. Two arrangements were built and RUN, returning 7 and 8 validator issues respectively (4 photo spots inside furniture, 3 rooms unreachable; then `opening narrowed: 0.09 m free of 1.05 m` at the bedroom passage), and both were reverted in full — `metrics/serenity-b4c-task2-layout-findings.json`. Plan 5 could not take it either: its five written tasks change no file under `tour/`. **Do not retry the furniture move alone; it has failed twice with the circulation measured.** The binding constraint is that `F.diningTable`'s real collider is 1.10 × 1.96 (it includes chairs) against a config `w`/`d` of 0.9 × 0.85, and the bedroom half is arithmetically impossible on that wall — 2.1 m headboard plus a 1.3 m window on 3.1 m |
| **serenity's `mainCeilH` is 2.6 and the photographs say ~2.9–3.2 — the shell is 0.3–0.4 m too short.** Found by plan 4b task 1 while disproving the "floor-to-ceiling slider" premise, and confirmed independently by its reviewer with **two routes off `4.webp`**, the only frame carrying both the ceiling junction and the floor of that wall: the **curtain rod** at (448−157)/(448−70) = 0.770 of ceiling height, which at a normal 2.20–2.25 m rod gives a ceiling of **2.86–2.92 m**; and the **air-conditioner** at 102 px against 378 px floor-to-ceiling (0.261 after perspective correction), which for a 0.78–0.92 m wall-split unit gives **3.1–3.2 m**. **2.6 falls outside both.** At 2.6 the same unit would have to be 0.68–0.70 m wide, narrower than any common split. Deferring was right — `mainCeilH` feeds every wall `h`, the ceiling plates, the terrace-level relationship, the bake geometry and the fitted `exposure`, so changing it inside a task whose gate is read for one opening's width would have destroyed the attribution. But it is now **live debt task 2 executes on top of**: six serenity cameras get re-pointed inside this short shell, and their poses do not become wrong when the ceiling is corrected — the *numbers* do. **Whoever takes it: re-fitting serenity's `exposure` is part of the task, not a follow-up, and all eleven spots must be re-baselined afterward.** Do not fold it into a pose task. Caveat carried with it: the reviewer could not establish whether `4.webp` and `9.webp` are the same physical unit (different floors, sofas and prints), so the ceiling routes rest on `4.webp` alone — **and that caveat is load-bearing: both photographic routes rest on `4.webp` alone, so the 2.86–2.92 / 3.1–3.2 band must be RE-MEASURED before anyone edits the constant.** Do not treat "~2.9–3.2" as a measurement ready to be applied | ~~**plan 4c, as its own task**~~ **plan 5, as its own task** (re-routed 2026-08-19 by plan 4b task 5) — not 4b, and not inside any pose or furniture task. **Why it moved:** 4c is on record above as *deliberately not written*, because its critical path is human asset curation that nobody has scheduled — so the row was owned by a plan that cannot act on it, and a ceiling height would have sat blocked behind a photographer's calendar. **`mainCeilH` is a constant**, and plan 5 (`2026-08-16-phase-b5-revalidate-and-docs.md`) is written, unblocked, and opens by re-validating every documented constant, which is exactly this row's shape. Everything else in the cell stands unchanged — including that the re-fit of serenity's `exposure` and the re-baselining of all eleven spots are **part of the task, not a follow-up** — **and it moves again: ~~plan 5, as its own task~~ → plan 6, re-assigned 2026-08-23 by plan 5 task 5, on a human-partner ruling taken at plan 5's pre-flight.** The ruling: plan 5 executes its five written tasks, and this goes to a plan 6 **written on task 1's audit**, which is this row's missing input — you cannot correct a documented constant before you have measured it, and task 1 measures every one while changing nothing. Plan 5 task 1 did confirm the shipped value is **2.6** (`tour/apartments/serenity.json`) and transcribed the photographic band with its provenance, deliberately without re-measuring it: `constants-b5-audit.json`, row "serenity mainCeilH". **Its own caveat is unchanged and is the first thing plan 6 must discharge — both routes (curtain rod 2.86–2.92 m, air-conditioner 3.1–3.2 m) rest on `4.webp` alone, and the band must be RE-MEASURED before anyone edits the constant.** The luminance re-fit now also carries horkyone-10's ±10 band with it; see that row above |
| **kings-court ships 11 dynamic PointLights against a hard-ruled budget of ≤8** (serenity 3, horkyone-10 3). Opened 2026-08-23 by plan 5 task 1, and it had **never been flagged anywhere in `docs/` before** — this is a shipped defect that eight plans walked past. Counted in `tour/apartments/kings-court.json` and confirmed in the live built scene by traversing for `isPointLight`; the two agree exactly. Nothing enforces the cap: `tour/builder.js:1604` constructs one live `new T.PointLight(...)` per `dyn` entry, with no cap and no level-based culling | **plan 6.** Plan 5 changes no file under `tour/` and so cannot fix it. **The budget is not being lowered to make the tree compliant** — the rule is right and the config is wrong; the defect was newly *measured*, not newly caused. Now recorded in `CLAUDE.md`'s "Numbers that matter" row and in hard rule 4. Evidence: `docs/superpowers/metrics/constants-b5-audit.json`, row "Dynamic PointLights per apartment" |
| **`tour/bake.js:498` hardcodes `1.7 * Math.PI` instead of `EXP * Math.PI`**, so editing `EXP` at `tour/bake.js:66` silently leaves 498 behind. Opened 2026-08-23 by plan 5 task 1. **The two agree numerically today by coincidence, not by structure** — nobody has edited either since the r185 migration introduced the `* Math.PI` factor — which is why no reader has noticed. This is the drifted-mirror class the player-radius check exists to catch, caught before it drifted rather than after | **plan 6**, and it is a two-character fix that plan 5 is barred from making (`tour/`). Related and separate: `CLAUDE.md`'s `EXP` row said "1.7 (= `lightMapIntensity`)", which **was** true and went stale at the r185 migration commit `67e5582`; the delivered contribution is still 1.7 by design, only the property's own value is `EXP * PI`. That half is **closed** — corrected by plan 5 task 2. Evidence: `constants-b5-audit.json`, rows "HDR headroom EXP" and "EXP mirror at bake.js:498" |
| **Stale `tools/serve.py` processes can silently re-measure the OLD tree.** `socketserver.ThreadingTCPServer.allow_reuse_address = True` (`tools/serve.py:131`) lets a new bind succeed on Windows **while an old listening socket keeps answering**, and which of the two receives a given connection is not deterministic. Opened 2026-08-23 by plan 5 task 3, which it nearly voided | **plan 6, and the reviewer rates it the most serious item on this list.** Every measurement recipe in this repository runs through that server, so "restart and re-measure" can silently re-measure the tree you thought you had replaced — and **a poisoned number becomes invisible the moment it is written into a document**, which is this record's whole failure mode. Suggested fix: drop `allow_reuse_address` so the bind fails naturally, with an actionable message. **Deliberately NOT fixed in plan 5**: it changes startup behaviour that other recipes depend on, and plan 5 had no measurement for it. Bundle it with the other two `serve.py` rows above as one hardening pass |
| **`docs/PROMPT.md` and `CLAUDE.md` now assert the same facts in two places**, after plan 5 task 4 rewrote PROMPT.md 456 → ~934 lines against task 1's audit. They will diverge the first time one is corrected alone, and nothing detects it | **plan 6.** Suggested and specific: make the relationship **directional** — state in `CLAUDE.md` that `PROMPT.md` is derived from it at audit time and must be re-derived whenever a "Numbers that matter" row moves — and add PROMPT-specific patterns to `tools/checks/stale_claims.py` keyed on its `(reference project — measure your own)` labels, which are exactly the claims that will rot |
| **`tools/checks/stale_claims.py` cannot see `docs/PROMPT.md` at all in practice.** The file is in its `FILES` list (`stale_claims.py:163`), but its 14 patterns are plan 4b's claim *shapes* — pose counts, merge-status prose, named commits — which project-independent spec prose matches by construction **never**. Confirmed at `stale_claims.py:158-164` by task 4's reviewer | **plan 6.** The operational consequence is what matters: **a green run says nothing whatever about `PROMPT.md`**, and a reader who sees that file in `FILES` will reasonably assume otherwise. Either add patterns keyed on its own labels or remove it from `FILES` — the present state is worse than either, because it advertises coverage that does not exist |
| **`stale_claims.py` was green while four live `poseVerified` counts were false.** Found 2026-08-23 by plan 5 task 5, which corrected them by search and by counting the configs. The missing pattern is trivial — nothing matches the shape `N of 11` / `N of 13` / `N of 24`, which is how every pose count in this record is written | **plan 6**, on top of the seven gaps already reproduced in the row below. **Read this as calibration, not as one more bug:** the counts in this document have now needed correcting **six** times, every one of them found by a human counting the configs and none by a checker, and each earlier sweep left sites behind. The cheap pattern would have caught all six |
| **`Doll.floorPoint()` returns `null` on wall footprints with no floor plate beneath them** — measured at 100 of 4218 grid cells on kings-court, about 37% of wall-footprint cells. Parked at plan 4a's branch close (2026-08-16) in that plan's own document, where nothing outside it mentioned the behaviour | **Disclosure CLOSED 2026-08-23 by plan 5 task 5**, which added it to `CLAUDE.md`'s `doll.js` row — the parked note's whole complaint was that no committed text outside a plan document said so. **It is not a regression and must not be "fixed" back:** before plan 4a's winding fix those cells returned the wall's own bottom quad at y 0, so the tape silently *misread* them; now it declines to answer. **Whether the silent cells matter to a visitor is a product judgement nobody has made** — the honest position is that the tape is correct where it answers and silent where it cannot → the judgement, if anyone wants it, is **plan 6's** |
| **The coverage paragraph in `docs/superpowers/metrics/README.md` was itself inaccurate** — the one paragraph whose entire job is to stop a coverage claim being over-read. Parked at plan 4a's branch close (2026-08-16). It said the checker reads its inputs "by literal filename, no glob", but one line globs `metrics/*b4a-*allspots.json`, and the sentence omitted `tour/bake.js`, which the checker also reads | **CLOSED 2026-08-23 by plan 5 task 5**, verified against the checker's source rather than the note: `glob.glob(... '*b4a-*allspots.json')` at line 203 and `--bake` defaulting to `tour/bake.js` at line 178 of `docs/superpowers/harnesses/2026-08-15-b4a-task2/check_metrics_readme.py`. **And a larger fact the parked note did not have, found while checking it: that checker and `write_metrics.py` do not exist under `tools/` at all** — they live only in the harness directory, so nothing runs them on a routine basis. The paragraph now says so |

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


## What phase B did and did not achieve

Written 2026-08-23 by plan 5 task 5, the closing task of plan 5 and of phase
B's record. Everything above is the working record and is left as it stands;
this is the reading of it.

**Phase B set out to close the gap between the render and the photographs.**
It did not close that gap, and the most useful thing it produced is a clear
account of why the question was harder than it looked — because the instrument
the phase was going to be judged by turned out not to be able to arbitrate the
thing it was built to arbitrate.

**What moved.** The engine came off r128 and onto r185 without a bundler, and
the behavioural differences that survived the migration are written down rather
than discovered later. A shipped rendering bug older than the phase was found
and fixed: `grid()` in `bake.js` wound eight of twelve wall faces backwards, so
every along-z wall presented its far face, fourteen centimetres from where a
visitor thought the surface was — and every measurable **x** span in all three
apartments was reading 0.280 m too wide as a result. Fixing it moved rooms to
their configured dimensions, un-buried two paintings that had been inside a
wall, broke the dollhouse tape in a way five task reviews missed, and forced a
re-fit of all three exposures. The metric's own camera was fixed twice: once in
plan 2, and once in plan 4c when the capture harness learned a downward camera
tilt it had pinned to zero since it was written. Eleven cameras across two
flats were re-pointed at the subjects their photographs actually show, two
missing objects were built, and serenity gained a pool, planting, a boundary
fence and an opt-in sky. The bake gained a hemisphere-visibility sampler on
lightmapped surfaces and lost the second, double-counting occlusion estimator
that had been multiplying against it.

**What was measured and rejected, on criteria agreed before the measurement.**
Screen-space AO (`GTAOPass`) — vendored, wired in, measured on all three
apartments, and rejected: its depth/normal prepass took kings-court from 150 to
282 mobile draw calls against a ≤250 budget. Offline path-traced lightmaps —
piloted on serenity, missed their pre-agreed contrast criterion by construction
rather than by tuning, and reverted along with their runtime loader.
Vertex-shaded walls — swept across four segment sizes and returned NO-GO, worth
about +0.23 of the +1.11 required. Zone-splitting the merged meshes — measured
and rejected, because the flat is a single 28 m sightline and at the entrance
every zone stays inside the frustum. Deriving the palette by sampling the
photographs directly — measured and rejected, because it double-counts
illumination as albedo and scored worse than doing nothing. Automatic
two-parameter tilt-and-lens fitting — rejected before the first capture, as
degenerate. **Five bets and a method, all killed by their own evidence.** That
is the part of this phase that worked.

**What remains open.** The per-texel wall lightmap atlas is unblocked, unbuilt
and unowned; walls still carry per-vertex baked light and no occlusion of any
kind, and walls are most of what a first-person frame's darkest fifth is made
of. Plan 4d — HDRI, a GLTF furniture library, PBR texture sets — is unwritten
because its critical path is human asset curation that nobody has scheduled.
The render's shadows are lighter than the photographs' and exposure cannot fix
it, because exposure is a global multiplier and this is a shape problem. The
sky cannot reach the photographs' brightness at the exposure the interior
needs. A ceiling height, a field of view, and a count of dynamic lights are all
known to be wrong and all deliberately left wrong, because measuring them
honestly is a task and guessing them is not. The full list, with evidence
pointers, is in "What plan 6 inherits" above.

**And what the metric can never settle.** ΔE2000 against these photographs is
dominated by pose and content mismatch rather than by shading. That was stated
early as a caution and then demonstrated: plan 4b moved serenity 16.00 → 15.49
and kings-court 18.59 → 18.17 **without changing one line of renderer, bake,
post-processing, material or shader code** — more than seven tasks of lighting
work had achieved — simply by pointing cameras at the right subjects. Plan 4c
built serenity's pool and the number got *worse*; what moved it was teaching
the harness a camera tilt. Plan 4e correctly aimed twenty-four cameras and the
gate moved **0.00**, because a better-aligned, more saturated cell can score no
better than the flat grey it replaced. Read those three results together and
the conclusion is not that the work was wasted — the renders are righter and
the harness now captures the camera the photographer used. The conclusion is
that **this instrument measures agreement between two images, and agreement
between two images is not the same quantity as looking right.** A grid of
colour differences cannot tell you that a wall presents its far face, that a
wardrobe hangs outside the building, or that a bathroom is its own mirror
image; humans found all three, by cropping frames and looking. Every gate
reading in this document is conditional on that, and on a resolution floor the
record can only bound from below — one machine, one build, two sessions, and
the same scene reads differently.

So the honest close is this. Phase B leaves the tour looking better than it
found it and leaves the reasoning about it in much better shape than the
looking: five expensive ideas are now known not to work and known *why*, the
camera the metric uses is the camera the photograph was taken with, and the
defects that remain are written down with the evidence that would let someone
act on them rather than rediscover them. What it does not leave is a number
worth quoting on its own. Every figure above is paired, attributed and
conditional, and the last four plans each found at least one earlier figure
that had gone quietly false while nobody edited the file it lived in. **The
right thing to carry out of this record is not a score. It is the habit that
produced the score: measure the thing you are about to claim, pair it against a
control you measured the same way, write down what you did not check, and treat
a number you did not take yourself as a lead rather than a fact.**
