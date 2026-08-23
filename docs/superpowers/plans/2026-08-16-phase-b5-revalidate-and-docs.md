# Phase B plan 5 — re-validate the constants, then rewrite the documents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every number in this repository's documentation true again, close the caching hole that can silently freeze the whole site, and rewrite `docs/PROMPT.md` so it describes the platform that now exists.

**Architecture:** Measurement first, edits second. Task 1 measures every documented constant and changes nothing; every later task edits against that measurement rather than against memory. Only one task touches shipped behaviour — the deploy headers — and it is the riskiest thing in the plan.

**Tech Stack:** Vanilla ES modules, no bundler, no build step. Three.js r185 vendored at `tour/lib/three-0.185.0/`. Vercel serves `tour/` as the site root, configured by `vercel.json`.

## Why this plan is written to survive plans 4b and 4c

**This plan deliberately hard-codes almost no values.** Plans 4b and 4c will move exposures, baselines, pose counts, draw calls and possibly bake times before this plan runs. A plan that asserted "check `exposure` is 0.295" would be stale on arrival and would teach its implementer to reconcile documentation against a stale plan instead of against the code.

So **task 1 measures, and every later task edits to match what task 1 found.** The one exception is the deploy configuration, which is a structural defect rather than a number and cannot go stale.

## Global Constraints

- **Measure before you write. Every number that lands in a document must come from a command run in this task, not from an older document, not from this plan, and not from memory.** This repository has shipped a wrong figure that survived three review rounds because it looked plausible; it entered through a filename.
- **Mark superseded values in place; do not overwrite them.** The convention is a narrated `>` blockquote in `docs/superpowers/metrics/README.md` and a parenthetical elsewhere. A document that quietly changes a number loses the evidence that it was ever different.
- **`?v=` bumps only when a file under `tour/` changes.** `CLAUDE.md`, `docs/` and `vercel.json` are not shipped by the module tag and never bump. `tour/index.html` itself carries the tag — ~~currently **`?v=113`** at line 254, though 4b will move it~~ **`?v=138` at line 254, corrected 2026-08-23 by task 5 after task 1's audit found this line stale; 4b, 4c and 4e all moved it (113 → 121 → 136 → 138) between this plan being written and being run, which is exactly why the plan's own text says re-read rather than trust. Plan 5 bumps it no further: `vercel.json` is its only shipped change and the module tag does not version it.**
- `window.__issues` must be empty on all three apartments before any commit that touches `tour/`.
- **Start `python tools/serve.py` with the sandbox disabled** — its `POST /save/` returns HTTP 200 and writes nothing when sandboxed. Probe the disk before trusting a capture.
- Playwright MCP is available; Playwright is **not** npm-installed here.
- **Draw calls are measured through the post chain** with `info.autoReset` disabled and reset by hand. A bare `renderer.render()` under-reports by about 14.
- Commit your own files explicitly. Never `git add -A`.

## File structure

| File | Responsibility in this plan |
|---|---|
| `docs/superpowers/metrics/constants-b5-audit.json` | Created in task 1: every documented constant, its documented value, its measured value, and the command that measured it |
| `CLAUDE.md` | Rewritten against task 1's audit (task 2) |
| `vercel.json` | The caching hole and the dead rule (task 3) — **the only shipped-behaviour change in this plan** |
| `docs/PROMPT.md` | Rewritten to describe the current architecture (task 4) |
| `docs/PHASE-B-RESUME.md`, `.gitignore` | Deferred-item sweep and close-out (task 5) |

---

### Task 1: Measure everything, change nothing

**Files:**
- Create: `docs/superpowers/metrics/constants-b5-audit.json`
- Create: `docs/superpowers/harnesses/2026-08-16-b5/measure_constants.py`

**Interfaces:**
- Produces: `constants-b5-audit.json`, an array of `{constant, documentedValue, documentedAt, measuredValue, howMeasured, agrees}`. **Every later task reads this file and edits to match it.** Nothing downstream re-derives a value.

- [ ] **Step 1: Write down what the documents currently claim, before measuring anything**

Extract the claims from `CLAUDE.md`'s "Numbers that matter" table, its "Config keys" table, its hard rules, and `docs/PHASE-B-RESUME.md`'s tables. Record each with its file and line. **Do not correct anything yet** — a claim you fix before you measure it is a claim you never tested.

- [ ] **Step 2: Measure the source constants from the source**

These live in code and can be read without a browser:

```bash
grep -n "WALL_TH\|DOOR_H\|PASS_H\|WIN_SILL\|WIN_HEAD" tour/builder.js | head
grep -n "EYE\|RADIUS\|WALK\|RUN" tour/controls.js | head
grep -n "GRID\|STEP\|RADIUS" tour/validate.js | head
grep -n "EXP\|AMB_DIST\|AMB_RAYS\|SEG\|WEXP" tour/bake.js | head
```

For each, record the value **and the line it came from**. Where a value is documented as mirrored in two files (the player radius is documented as living in `controls.js` and mirrored in `validate.js`), **check both and record whether they still agree** — a drifted mirror is a real defect, not a documentation nit.

- [ ] **Step 3: Measure the runtime numbers in a browser**

Draw calls on all three apartments, through the post chain, from each apartment's own `start`:

```js
const a = window.__app, c = a.controls;
c.pos.x = 3.6; c.pos.z = 0.75; c.ground = 0; c.yaw = 178 * Math.PI / 180; c.update(0.001);
a.renderer.info.autoReset = false;
a.renderer.info.reset();
if (a.post && a.post.enabled) a.post.render(0); else a.renderer.render(a.scene, a.camera);
console.log(a.renderer.info.render.calls);
a.renderer.info.autoReset = true;
```

Those coordinates are **serenity's** `start`. Read each apartment's own `APT.start` rather than reusing them — a previous version of this recipe parked the camera 17 m outside the flat and still returned a number.

Bake times, three runs each:

```js
window.__bakeReady.then(() => console.log(window.__bakeMs));
```

Report bake times **as ratios between apartments as well as in milliseconds**. CLAUDE.md's rule 4a already records why: the absolute figures have moved with hardware twice, and the ratios are what survived.

- [ ] **Step 4: Measure the shipped config values**

```bash
python -c "
import json
for a in ['serenity','kings-court','horkyone-10']:
    d=json.load(open('tour/apartments/%s.json'%a))
    print(a, d.get('exposure'), len(d.get('photoSpots',[])))
"
grep -n "UnrealBloomPass" tour/post.js
grep -n 'main.js?v=' tour/index.html
```

Also count pose verification honestly, since `CLAUDE.md` and `PHASE-B-RESUME.md` both quote it:

```bash
python -c "
import json
for a in ['serenity','kings-court','horkyone-10']:
    d=json.load(open('tour/apartments/%s.json'%a))
    sp=[p for p in d.get('photoSpots',[]) if p.get('compare')]
    print(a, sum(1 for p in sp if p.get('poseVerified')), 'of', len(sp))
"
```

- [ ] **Step 5: Write the audit and stop**

Emit `constants-b5-audit.json`. **Change no document in this task.** Its whole value is being a measurement taken before anyone was invested in a particular answer.

Report the disagreements as a list. If the list is empty, say so — that is a real and welcome result, not a failed task.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/metrics/constants-b5-audit.json docs/superpowers/harnesses/2026-08-16-b5
git commit -m "Task 1: audit every documented constant against the code"
```

---

### Task 2: Rewrite CLAUDE.md against the audit

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `docs/superpowers/metrics/constants-b5-audit.json`. **Every number you write comes from that file.** If a number you want is not in the audit, that is a gap in task 1 — go and measure it, add it to the audit, and say you did.

- [ ] **Step 1: Correct every disagreement the audit found**

Mark superseded values in place with a parenthetical naming what changed them. Do not silently overwrite.

- [ ] **Step 2: Check the rules against the code, not only the tables**

The hard rules make claims too, and they age faster than the tables because nobody greps a rule. Specifically re-read against the current source:

- **Rule 1's debug API** — that `window.__app`, `window.__issues`, `window.__bakeReady` and `window.__bakeMs` are set where and when the rule says.
- **Rule 3's cache claim** — that one module tag really does version everything, including the config fetch and every classic script.
- **Rule 4's draw-call recipe** — that it still produces the audit's numbers.
- **Rule 5's geometry** — it gained the wall-winding convention in plan 4a; confirm the sign test is described correctly and that the wrong fix (reversing the `else` branch) is still recorded as wrong.

- [ ] **Step 3: Add what the last two plans established and CLAUDE.md never learned**

At minimum, and only where the audit or the committed record supports it:

- the wall winding fix and what it changed about apparent room dimensions;
- that `Doll.floorPoint()` and `teleport` skip wall meshes, and why a face-normal test cannot work there;
- that vertex-shaded walls were measured and rejected, **scoped to vertex shading** — not as "walls are not worth lighting" — with the atlas named as the open path;
- the restated gate, in one line with a pointer, since `CLAUDE.md` is what a fresh session reads first.

- [ ] **Step 4: Verify no shipped file changed**

```bash
git diff --stat -- tour/
```

Empty. `CLAUDE.md` is not shipped and does not bump `?v=`.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "Task 2: rewrite CLAUDE.md against measured values"
```

---

### Task 3: The deploy headers — the one shipped change

**This is the only task in the plan that can break production, and the defect it fixes can break production silently and permanently. Treat it accordingly.**

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Understand the hole before touching it**

`vercel.json` sets `Cache-Control` for `.js`/`.css`, `/apartments/*`, `/photos/*` and `/three.min.js`. **It sets nothing for the HTML entry point.**

Since the r185 migration, `tour/index.html` carries the single module tag whose `?v=` versions *everything* — the config fetch, every classic script, the measurement harnesses. So if a CDN or a browser caches `index.html`, **the `?v=` bump never arrives and no code or config change ever ships again.** The site freezes on whatever build was cached, and it looks like a deploy problem rather than a caching one.

`docs/PHASE-B-RESUME.md` lists this as plan 5's, and describes it exactly this way: "now the single point of failure, since one tag versions everything".

- [ ] **Step 2: Record what production actually sends today**

Before changing anything:

```bash
curl -sI https://<production-host>/ | grep -i "cache-control\|age\|x-vercel"
curl -sI https://<production-host>/index.html | grep -i "cache-control\|age\|x-vercel"
```

Record the response. If Vercel's default is already `no-cache` for HTML, the hole is smaller than the note implies — **say so rather than fixing a defect that is not there.** Either way the header should be explicit, because relying on a platform default that nobody has written down is how this became a deferred item.

- [ ] **Step 3: Add an explicit HTML rule**

The entry point must revalidate on every load. `catalog.html` needs the same treatment — it is a second entry point.

Write the rule so that a **correct** `?v=` bump reaches the browser on the next load, and say in the commit message what behaviour you are guaranteeing.

- [ ] **Step 4: Remove the dead rule**

`/three.min.js` no longer exists — it was deleted in the r128 → r185 migration, and `docs/PHASE-B-RESUME.md` lists this as a deferred item. Removing it changes nothing about what ships and removes a rule that would confuse the next reader.

- [ ] **Step 5: Decide about the vendored library, and record the decision**

`tour/lib/three-0.185.0/` is **version-stamped by directory name**, deliberately — CLAUDE.md explains that a `?v=` query cannot work there, because addons import each other by relative path and a relative specifier does not inherit the importing module's query string.

That makes those files genuinely immutable and eligible for a long `max-age`, where today they fall under the generic 300-second `.js` rule. This is a performance improvement, not a correctness fix. **Take it or leave it, but record which and why** — an unexplained immutable rule on a directory is exactly the sort of thing a later reader reverts out of caution.

- [ ] **Step 6: Verify on a preview deployment before merging**

Push the branch, let Vercel build a preview, and `curl -sI` the preview's entry point. **Confirm the header you intended is the header that arrives.** A `vercel.json` change verified only by reading the file is not verified — this is the one place in the repo where being wrong is invisible until the next deploy fails to appear.

- [ ] **Step 7: Commit**

```bash
git add vercel.json
git commit -m "Task 3: give the HTML entry point an explicit cache policy"
```

---

### Task 4: Rewrite docs/PROMPT.md

**Files:**
- Modify: `docs/PROMPT.md`

`docs/PROMPT.md` is the **project-independent** specification for building a tour platform like this one from a folder of photographs. It is not about this repository; it is what someone would follow to start a new property platform. It was last rewritten on 2026-08-10, before phase B finished, so it describes an architecture that has since changed underneath it.

- [ ] **Step 1: Read it end to end and list what is now false**

At minimum check: the engine version and how it is loaded (r185, vendored, resolved through an importmap, no bundler); the cache-versioning scheme and why it is a single tag; the lightmapper's shape after plan 3 and 4a; anything about walls, since their winding was wrong for the document's whole life; and the measurement harness, whose camera was fixed in plan 2.

- [ ] **Step 2: Keep it project-independent**

The temptation is to fold in this repo's specifics — apartment names, the gate's numbers, plan history. **Resist it.** The file's value is that it works for a new property with different photographs. Where a value is genuinely this repo's rather than universal, say so or leave it out.

- [ ] **Step 3: Carry the lessons that generalise**

Some of what phase B learned is not about this flat and belongs in a document meant for the next platform:

- a resemblance metric dominated by pose and content mismatch cannot arbitrate lighting, and will mislead anyone who reads it as if it can;
- a verification that cannot fail is worse than none, and the way to know it can fail is to make it fail on purpose;
- carrying the build version *inside* each measurement, read at measure time, is what makes a lost server log harmless;
- placing anything against a wall by arithmetic from the centreline buries it inside the wall.

- [ ] **Step 4: Commit**

```bash
git add docs/PROMPT.md
git commit -m "Task 4: rewrite PROMPT.md for the architecture that now exists"
```

---

### Task 5: The deferred sweep and close-out

**Files:**
- Modify: `docs/PHASE-B-RESUME.md`, `.gitignore`, and whatever the sweep resolves

- [ ] **Step 1: Work the deferred table**

`docs/PHASE-B-RESUME.md`'s "Deferred, with owners" table plus the two items plan 4a parked in its own plan document. For each: fix it, or re-assign it with a reason. **An item that is neither fixed nor re-argued has been silently dropped**, which is the failure this table exists to prevent.

Known contents at time of writing, to be re-read rather than trusted:

- `.gitignore` covers only `tools/__pycache__/`, not a generic `__pycache__/` rule. A stray `.pyc` has already been removed by hand once, "which worked because someone was paying attention, which is not a mechanism".
- `serve.py`: `%00` in a path raises instead of returning 400; the realpath check is TOCTOU-racy in principle; and `:90`'s `base64.b64decode` is unguarded, so a malformed save body kills the handler thread. All dev-only and all fail closed — **decide explicitly whether dev-only tooling that every measurement depends on deserves hardening**, and record the decision either way.
- horkyone-10's exposure criterion is defined against its siblings and nothing re-runs it; plan 4a found it had been **failing** (+11.07 against a ±10 band) before anyone noticed.
- the two items parked at 4a's close: the coverage paragraph's own inaccuracy, and `floorPoint`'s undisclosed null return on wall footprints.

- [ ] **Step 2: Reconcile the resume document with reality one last time**

It is the entry point for a fresh session. After 4a, 4b and this plan, check every table in it against the audit and the committed metrics — particularly the plan table, the baselines, and "What the metric can and cannot see", whose pose counts 4b moves.

- [ ] **Step 3: State what phase B did and did not achieve**

Phase B set out to close the gap to the photographs. Write the honest closing paragraph: what moved, what was measured and rejected (GTAO, offline lightmaps, vertex-shaded walls), what remains open (the wall atlas, 4c's assets), and what the metric can never settle.

**Do not let the record end on a number.** Every number in it is conditional on a metric this phase proved cannot arbitrate the thing it was built to arbitrate.

- [ ] **Step 4: Commit**

```bash
git add docs/PHASE-B-RESUME.md .gitignore
git commit -m "Task 5: work the deferred table and close phase B's record"
```

---

## Self-review notes

- **The plan hard-codes almost nothing, by design.** Plans 4b and 4c will move exposures, baselines, pose counts and possibly draw calls before this runs. Task 1 measures; every later task edits to match. The only fixed content is the deploy defect, which is structural.
- **One task can break production** — task 3 — and it is the only one that touches shipped behaviour. It is written with a preview-deployment check because a `vercel.json` change verified by reading the file is not verified.
- **Task order matters.** The audit precedes every edit; `PROMPT.md` comes after `CLAUDE.md` because the repo-specific document is where the measured truth lands first; the sweep comes last because it reconciles what the earlier tasks moved.
- **Deliberately not here:** anything in 4b or 4c, and the wall lightmap atlas. The atlas is unblocked and unowned; this plan should note that it stays unowned rather than quietly adopting it.
