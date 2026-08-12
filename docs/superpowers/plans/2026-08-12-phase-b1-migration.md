# Phase B, plan 1 — migration to Three.js r185 with no regression

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all three apartments from Three.js r128 to r185 on the classic
`WebGLRenderer`, so that the rendered result is indistinguishable from r128 —
and prove it with a captured reference set rather than by eye.

**Architecture:** `index.html` keeps one `<script type="module">` tag pointing
at `main.js`; `main.js` imports three and its addons through an importmap,
publishes `window.THREE` plus the addon classes, and only then loads the
existing classic scripts in order. Vendored library files live under a
version-stamped directory so no cache rule has to reach them. Nothing else is
converted to ESM.

**Tech Stack:** Three.js 0.185.0 (r185, released 2026-07-01), ESM + importmap,
no bundler, no npm. Verification is Playwright-free and browser-side, matching
the existing `measure.js` pattern: a capture script POSTs frames to the save
endpoint in `tools/serve.py`, and Python compares them.

## Global Constraints

- Three.js version: **0.185.0** exactly. No other version is vendored.
- Renderer: classic `THREE.WebGLRenderer`. **No WebGPU, no `RenderPipeline`,
  no TSL nodes.** (Spec decision 2.)
- `builder.js`, `bake.js`, `controls.js`, `doll.js`, `validate.js`, `app.js`
  are **not converted to ES modules**. Explicitly out of scope.
- The JSON config stays the single source of data. **No coordinates in code.**
- `window.__issues` must be empty under `?check=1` for all three apartments
  before every commit.
- Draw calls: ≤400 desktop, ≤250 mobile. Measured today, kings-court entry
  hall: 144.
- Everything in the repository is in English: UI strings, JSON room names,
  docs, code comments.
- `serenity.json`'s `"exposure": 0.33` **stays untouched in this plan.** It is
  a compensation and it will be cleared and re-fitted in plan 2. Here it is
  part of the look we are preserving.
- No apartment JSON is edited by this plan at all.

## Environment note, read this before task 1

`tools/serve.py` writes captured frames to `tools/shots/`. **If the server
process is sandboxed, the POST returns HTTP 200 and the file never appears in
the repository** — the write lands in a filesystem overlay you cannot read.
Measured during step 0 and again before this plan was executed: same endpoint,
same 200, file present only when the server runs unsandboxed.

- **Human, normal terminal:** `python tools/serve.py` — works as-is.
- **Agent:** start it with the sandbox disabled, or every capture in this plan
  silently produces nothing. It is a static file server bound to 127.0.0.1
  that writes only into `tools/shots/`.

**Verify before trusting any capture**, once per session:

```js
await fetch('/save/probe.txt', { method: 'POST', body: 'data:text/plain;base64,aGk=' });
```

Then confirm `tools/shots/probe.txt` exists **on disk**. HTTP 200 is not
evidence — that is the whole trap. Delete the probe afterwards.

## File structure

| File | Responsibility |
|---|---|
| `tour/refshots.js` | **New.** Renders a fixed set of cameras per apartment and POSTs each frame. Loaded only under `?refshots=1`, like `measure.js` |
| `tools/compare_shots.py` | **New.** Compares two capture directories, reports per-frame mean absolute difference, exits non-zero above a threshold |
| `tour/lib/three-0.185.0/` | **New.** Vendored `build/three.module.js` and the `examples/jsm/` subtree we use |
| `tour/index.html` | Modified: importmap, one module tag, fifteen script tags removed |
| `tour/main.js` | Modified: becomes the ES module entry; imports three, publishes globals, loads the classic scripts in order |
| `tour/app.js` | Modified: `outputEncoding` → `outputColorSpace`, light intensities |
| `tour/post.js` | Rewritten against r185 addons |
| `tour/three.min.js`, `tour/lib/*.js` | Deleted (six r128 UMD files plus the core) |

---

### Task 1: Freeze the r128 reference set

Nothing else in this plan can be judged without it. The capture must be shown
to detect a change before it is trusted to report "no change" — phase A
shipped a verification that compared frames byte-for-byte to prove a refactor
changed nothing, while 41 `Math.random()` calls made identical code render
differently. This one is built to fail first.

**Files:**
- Create: `tour/refshots.js`
- Create: `tools/compare_shots.py`
- Modify: `tour/main.js:60-64` (add the `refshots` loader beside `measure`)
- Modify: `tour/index.html:197` (bump `?v=65` → `?v=66` on `main.js`)

**Interfaces:**
- Consumes: `window.__app` (`{scene, camera, renderer, controls, doll, composer}`), `window.__bakeReady`, `window.APT`.
- Produces: `window.__refshots()` → `Promise<Array<{name, w, h}>>`; frames at `tools/shots/<dir>/ref_<apt>_<slug>.jpg`; `python tools/compare_shots.py --a <dirA> --b <dirB>` printing per-frame MAD and a max.

- [ ] **Step 1: Write the capture script**

Cameras are derived from the config, not hardcoded, so a new apartment needs
no edit here. `spawns` gives one frame per room; two extra dollhouse frames
give the shell.

Create `tour/refshots.js`:

```js
// ============================================================
// Fixed-camera reference capture. Loaded only under ?refshots=1.
// Renders one frame per spawn plus two dollhouse frames, at a
// fixed size and pixel ratio, and POSTs each to the save endpoint.
// The frames are the regression net for the r185 migration.
// ============================================================

window.__refshots = function (dir) {
  const a = window.__app;
  const W = 640, H = 400;
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  function views() {
    const out = (APT.spawns || []).map((s) => ({
      name: slug(s.name),
      kind: 'walk',
      x: s.x, z: s.z, g: s.g || 0, yaw: s.yaw   // main.js already converted to radians
    }));
    // Shell from above: one per level. Centre on the mean spawn position so
    // this works for any apartment without a hand-picked camera.
    const n = (APT.spawns || []).length || 1;
    const cx = (APT.spawns || []).reduce((t, s) => t + s.x, 0) / n;
    const cz = (APT.spawns || []).reduce((t, s) => t + s.z, 0) / n;
    out.push({ name: 'doll-1', kind: 'doll', level: '1', cx: cx, cz: cz });
    out.push({ name: 'doll-all', kind: 'doll', level: 'all', cx: cx, cz: cz });
    return out;
  }

  function renderOne(v) {
    const c = a.controls;
    if (v.kind === 'doll') {
      if (!a.doll.on) a.doll.enter();
      a.doll.setLevel(v.level);
      a.camera.up.set(0, 0, -1);
      a.camera.position.set(v.cx, 40, v.cz + 0.01);
      a.camera.lookAt(v.cx, 0, v.cz);
    } else {
      if (a.doll.on) a.doll.exit();
      a.camera.up.set(0, 1, 0);
      c.enabled = true;
      c.pos.x = v.x; c.pos.z = v.z; c.ground = v.g;
      c.yaw = v.yaw; c.pitch = 0; c.keys = {}; c.update(0.001);
    }
    if (a.composer) a.composer.render(); else a.renderer.render(a.scene, a.camera);
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    cv.getContext('2d').drawImage(a.renderer.domElement, 0, 0, W, H);
    return cv.toDataURL('image/jpeg', 0.92);
  }

  return (async () => {
    const prevRatio = a.renderer.getPixelRatio();
    a.renderer.setPixelRatio(1);
    a.renderer.setSize(W, H, false);
    a.camera.aspect = W / H;
    a.camera.updateProjectionMatrix();
    if (a.composer) a.composer.setSize(W, H);
    const out = [];
    try {
      for (const v of views()) {
        const data = renderOne(v);
        await fetch('/save/' + dir + '/ref_' + APT.meta.id + '_' + v.name + '.jpg',
                    { method: 'POST', body: data });
        out.push({ name: v.name, w: W, h: H });
      }
    } finally {
      if (a.doll.on) a.doll.exit();
      a.camera.up.set(0, 1, 0);
      a.renderer.setPixelRatio(prevRatio);
      a.renderer.setSize(window.innerWidth, window.innerHeight, false);
      a.camera.aspect = window.innerWidth / window.innerHeight;
      a.camera.updateProjectionMatrix();
      if (a.composer) a.composer.setSize(window.innerWidth, window.innerHeight);
    }
    console.log('[refshots] captured ' + out.length + ' frames into ' + dir);
    return out;
  })();
};
```

- [ ] **Step 2: Let the save endpoint write into a subdirectory**

`tools/serve.py` currently does `os.path.basename(self.path)`, which flattens
`r128/ref_x.jpg` to `ref_x.jpg` and would silently overwrite the r185 run with
the r128 one. Replace the `do_POST` body's path handling:

```python
        rel = self.path[len('/save/'):]
        parts = [p for p in rel.split('/') if p not in ('', '.', '..')]
        if not parts:
            self.send_response(400)
            self.end_headers()
            return
        dest = os.path.join(SHOTS, *parts)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        n = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(n).decode()
        if ',' in body:
            body = body.split(',', 1)[1]
        with open(dest, 'wb') as f:
            f.write(base64.b64decode(body))
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')
```

The `..` filter matters: without it a crafted path writes anywhere on disk.

- [ ] **Step 3: Load the capture script under `?refshots=1`**

In `tour/main.js`, beside the existing `measure` block:

```js
  for (const flag of ['measure', 'refshots']) {
    if (new URLSearchParams(location.search).has(flag)) {
      const s = document.createElement('script');
      s.src = flag + '.js' + (BUILD_V ? '?v=' + BUILD_V : '');
      document.head.appendChild(s);
    }
  }
```

- [ ] **Step 4: Write the comparer**

Create `tools/compare_shots.py`:

```python
"""Compare two directories of reference captures.

Run: python tools/compare_shots.py --a r128 --b r185
Exits non-zero if any frame differs by more than --max-mad.
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, 'tools', 'shots')


def mad(p, q):
    a = np.asarray(Image.open(p).convert('RGB'), dtype=np.float64)
    b = np.asarray(Image.open(q).convert('RGB'), dtype=np.float64)
    if a.shape != b.shape:
        raise SystemExit('size mismatch: %s %s vs %s' % (p, a.shape, b.shape))
    return float(np.abs(a - b).mean())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--a', required=True)
    ap.add_argument('--b', required=True)
    ap.add_argument('--max-mad', type=float, default=2.0)
    args = ap.parse_args()

    da = os.path.join(SHOTS, args.a)
    db = os.path.join(SHOTS, args.b)
    names = sorted(os.listdir(da))
    if not names:
        raise SystemExit('no frames in %s' % da)

    worst, failures = 0.0, 0
    for n in names:
        q = os.path.join(db, n)
        if not os.path.exists(q):
            print('%-44s MISSING in %s' % (n, args.b))
            failures += 1
            continue
        m = mad(os.path.join(da, n), q)
        worst = max(worst, m)
        flag = 'FAIL' if m > args.max_mad else 'ok'
        if m > args.max_mad:
            failures += 1
        print('%-44s MAD %6.2f  %s' % (n, m, flag))

    print('\n%d frames, worst MAD %.2f, threshold %.2f, %d failing'
          % (len(names), worst, args.max_mad, failures))
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
```

- [ ] **Step 5: Prove the comparer can fail — capture a deliberately wrong set**

A check that cannot fail proves nothing. Capture the reference, then capture a
second set with the exposure deliberately perturbed, and confirm the comparer
reports failures.

Start the server in a normal terminal, then in the browser console at
`http://localhost:8742/?apt=serenity&refshots=1`:

```js
await window.__bakeReady;
await window.__refshots('r128');
window.__app.renderer.toneMappingExposure *= 1.10;   // 10% brighter
await window.__refshots('perturbed');
window.__app.renderer.toneMappingExposure /= 1.10;   // put it back
```

Run:

```bash
python tools/compare_shots.py --a r128 --b perturbed
```

Expected: **exit code 1**, most frames FAIL with MAD well above 2.0. If it
passes, the capture is not actually re-rendering and the whole regression net
is worthless — stop and fix that before going further.

- [ ] **Step 6: Confirm it passes on a true repeat**

```js
await window.__refshots('r128-repeat');
```

```bash
python tools/compare_shots.py --a r128 --b r128-repeat
```

Expected: **exit code 0**. Frames will not be bit-identical — `builder.js`
uses `Math.random()` in its procedural textures, so re-loading the page
reshuffles fine detail. Capturing both sets **without reloading** keeps the
same textures and MAD should land near 0. If a repeat after a reload is
needed, expect a few units of MAD and set `--max-mad` accordingly, recording
the chosen number in the commit message.

- [ ] **Step 7: Capture all three apartments and commit the reference**

```js
// once per apartment, at ?apt=<id>&refshots=1
await window.__bakeReady; await window.__refshots('r128');
```

**The frames themselves are not committed.** `.gitignore:23` excludes
`tools/shots/` as "build output, not source", and `*.jpg` is excluded too.
Respect that: the frames stay local for the life of this plan, and what gets
committed is the *result* of comparing them.

Write `docs/superpowers/metrics/r128-reference.md` recording, for each
apartment: the frame names captured, the `--max-mad` threshold chosen, and the
two proof runs from steps 5 and 6 — the perturbed run's exit code 1 with its
worst MAD, and the repeat run's exit code 0 with its worst MAD. Those two
numbers are the evidence that the net works; the pixels are not.

```bash
git add tour/refshots.js tools/compare_shots.py tools/serve.py tour/main.js \
        tour/index.html docs/superpowers/metrics/r128-reference.md
git commit -m "Freeze the r128 render as a reference set before migrating"
```

Do not `git add -f` the frames. If a later session needs them, it re-captures
them from the r128 tag — that is what the version-controlled capture script is
for.

---

### Task 2: Vendor Three.js 0.185.0 under a version-stamped directory

**Files:**
- Create: `tour/lib/three-0.185.0/build/three.module.js`
- Create: `tour/lib/three-0.185.0/build/three.core.js` — 0.185.0 splits the
  build into a facade (`three.module.js`) plus the core, which the facade
  imports by relative path and which holds `REVISION`. Step 2's closure scan
  is what finds this; it is listed here so the next reader does not have to
  rediscover it.
- Create: `tour/lib/three-0.185.0/examples/jsm/postprocessing/{EffectComposer,RenderPass,ShaderPass,MaskPass,Pass,UnrealBloomPass,OutputPass}.js`
- Create: `tour/lib/three-0.185.0/examples/jsm/shaders/{CopyShader,LuminosityHighPassShader,OutputShader}.js`
- Create: `tour/lib/three-0.185.0/LICENSE`

**Interfaces:**
- Produces: the importmap targets `./lib/three-0.185.0/build/three.module.js`
  and the prefix `./lib/three-0.185.0/examples/jsm/`.

**Why the version is in the directory name, not in a `?v=` query.** The
approved spec said to enumerate each addon in the importmap with `?v=N`. That
does not work, and this task is where it was caught: addons import each other
by **relative path** — `EffectComposer.js` does
`import { CopyShader } from '../shaders/CopyShader.js'` — and a relative
specifier resolves against the importing module's URL **without inheriting its
query string**. Enumeration versions only the files named in the map and
silently leaves every transitively-imported file cacheable forever. Putting
the version in the path fixes it for the whole subtree, because the URL itself
changes when the library does. Our own files keep `?v=N`; vendored files never
need one.

- [ ] **Step 1: Download the files**

```bash
V=0.185.0
B="tour/lib/three-$V"
mkdir -p "$B/build" "$B/examples/jsm/postprocessing" "$B/examples/jsm/shaders"
curl -fsSL "https://unpkg.com/three@$V/build/three.module.js" -o "$B/build/three.module.js"
curl -fsSL "https://unpkg.com/three@$V/LICENSE" -o "$B/LICENSE"
for f in EffectComposer RenderPass ShaderPass MaskPass Pass UnrealBloomPass OutputPass; do
  curl -fsSL "https://unpkg.com/three@$V/examples/jsm/postprocessing/$f.js" \
    -o "$B/examples/jsm/postprocessing/$f.js"
done
for f in CopyShader LuminosityHighPassShader OutputShader; do
  curl -fsSL "https://unpkg.com/three@$V/examples/jsm/shaders/$f.js" \
    -o "$B/examples/jsm/shaders/$f.js"
done
```

- [ ] **Step 2: Verify no unresolved imports were missed**

Every bare specifier must be `three`, and every relative import must point at
a file that now exists.

```bash
grep -rhoE "from '[^']+'" tour/lib/three-0.185.0/examples/jsm | sort -u
```

Expected: only `from 'three'` and relative paths whose targets are in the list
above. If a new relative path appears, download that file too and re-run until
the list closes.

- [ ] **Step 3: Confirm the revision**

```bash
grep -rhoE "REVISION = '[0-9]+" tour/lib/three-0.185.0/build/ | head -1
```

Expected: `REVISION = '185`. Search the whole `build/` directory, not
`three.module.js` alone — in 0.185.0 the constant is defined in
`three.core.js` and only re-exported by the facade, so grepping the facade
returns nothing and looks like a failed download.

- [ ] **Step 4: Commit**

```bash
git add tour/lib/three-0.185.0
git commit -m "Vendor Three.js 0.185.0 under a version-stamped directory"
```

---

### Task 3: Make `main.js` the module entry and load the classic scripts from it

**Files:**
- Modify: `tour/index.html:182-197` (replace fifteen script tags)
- Modify: `tour/main.js:10-16` and the IIFE around `:18`
- Delete: `tour/three.min.js`, `tour/lib/CopyShader.js`, `tour/lib/LuminosityHighPassShader.js`, `tour/lib/EffectComposer.js`, `tour/lib/RenderPass.js`, `tour/lib/ShaderPass.js`, `tour/lib/UnrealBloomPass.js`

**Interfaces:**
- Consumes: `tour/lib/three-0.185.0/**` from task 2.
- Produces: `window.THREE` populated before any classic script evaluates;
  `window.EffectComposer`, `window.RenderPass`, `window.ShaderPass`,
  `window.UnrealBloomPass`, `window.OutputPass` as globals for `post.js`.

**The ordering trap.** Classic `<script src>` tags execute *before* deferred
module scripts. `post.js:12` evaluates `const T = THREE;` at load time, so
leaving the classic tags in `index.html` would throw `ReferenceError: THREE is
not defined` before `main.js` ever runs. Therefore `main.js` loads the classic
scripts itself, in the existing order, after publishing the globals.

The side benefit is worth stating: the version now lives on **one** tag
instead of fifteen, which removes the "bump `?v=N` on all tags" chore that has
already cost this project an hour.

- [ ] **Step 1: Replace the script tags in `index.html`**

Replace lines 182–197 with:

```html
<script type="importmap">
{
  "imports": {
    "three": "./lib/three-0.185.0/build/three.module.js",
    "three/addons/": "./lib/three-0.185.0/examples/jsm/"
  }
}
</script>
<script type="module" src="main.js?v=66"></script>
```

- [ ] **Step 2: Rewrite the head of `main.js`**

Replace lines 10–16 (the `BUILD_V` block) with:

```js
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// The version comes from ?v= on this module's own URL — the same value
// versions the config fetch and every classic script loaded below, otherwise
// the browser serves stale JSON and stale code from cache and edits never
// reach phones. document.currentScript is null in a module; import.meta.url
// carries the query string, so it is the equivalent.
const BUILD_V = new URL(import.meta.url).searchParams.get('v') || '';

window.THREE = THREE;
Object.assign(window, { EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, OutputPass });

// The classic scripts only declare classes and touch THREE inside functions,
// so publishing the globals first is enough — but they must load in this
// order, and they must load before initApp is called.
const CLASSIC = ['post.js', 'bake.js', 'materials.js', 'builder.js',
                 'controls.js', 'doll.js', 'validate.js', 'app.js'];

function loadClassic(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src + (BUILD_V ? '?v=' + BUILD_V : '');
    s.onload = res;
    s.onerror = () => rej(new Error('failed to load ' + src));
    document.head.appendChild(s);
  });
}
```

- [ ] **Step 3: Await the classic scripts before `initApp`**

In the async IIFE, immediately before `window.initApp();` at `main.js:54`:

```js
  try {
    for (const f of CLASSIC) await loadClassic(f);
  } catch (err) {
    goBtn.textContent = 'Could not load the tour';
    document.getElementById('overlayText').textContent = String(err.message);
    return;
  }

  window.initApp();
```

The failure path matters: phase A shipped a missing-file guard that covered 2
of 6 vendored files and let the other four abort init into a black screen.
This one names the file that failed, for every file.

- [ ] **Step 4: Delete the r128 library**

```bash
git rm tour/three.min.js tour/lib/CopyShader.js tour/lib/LuminosityHighPassShader.js \
       tour/lib/EffectComposer.js tour/lib/RenderPass.js tour/lib/ShaderPass.js \
       tour/lib/UnrealBloomPass.js
```

- [ ] **Step 5: Load and confirm the revision changed**

At `http://localhost:8742/?apt=serenity&check=1`:

```js
await window.__bakeReady;
console.log(THREE.REVISION, window.__issues.length, Math.round(window.__bakeMs));
```

Expected: `185`, `0`, a number in the low hundreds. The page **will** look
wrong at this point — colour space and the post chain are not migrated yet.
That is expected; tasks 4 and 5 fix it. Do not tune anything here.

- [ ] **Step 6: Commit**

```bash
git add tour/index.html tour/main.js
git commit -m "Load three r185 as a module and the classic scripts from main.js"
```

---

### Task 4: Colour-space renames

**Files:**
- Modify: `tour/app.js:65`
- Modify: `tour/post.js:117-118` (removed here, the file is rewritten in task 5)

**Interfaces:**
- Consumes: `window.THREE` from task 3.
- Produces: `renderer.outputColorSpace === THREE.SRGBColorSpace`.

- [ ] **Step 1: Rename the renderer property**

`tour/app.js:65`, replace:

```js
  renderer.outputEncoding = THREE.sRGBEncoding;
```

with:

```js
  renderer.outputColorSpace = THREE.SRGBColorSpace;
```

- [ ] **Step 2: Delete the composer encoding patch**

`tour/post.js:117-118`, delete both lines:

```js
      composer.renderTarget1.texture.encoding = renderer.outputEncoding;
      composer.renderTarget2.texture.encoding = renderer.outputEncoding;
```

`texture.encoding` does not exist in r185; assigning it sets a dead property
and the comment block above it describes r128 behaviour that no longer
applies. Task 5 replaces this mechanism with `OutputPass`. Delete the
now-stale comment block at `:90-116` along with the two lines.

- [ ] **Step 3: Do NOT set `colorSpace` on the procedural textures**

`builder.js` creates `CanvasTexture`s and never sets `encoding`, so on r128
they are treated as linear data. r185's default (`NoColorSpace`) preserves
that behaviour exactly. Setting `texture.colorSpace = THREE.SRGBColorSpace`
would be the physically correct thing and **would change every colour in the
scene**, breaking this plan's no-regression gate for a reason that looks like
a migration bug.

Leave it. Record it as a deliberate deviation for plan 3 to revisit with the
metric watching. Add this comment above the first `CanvasTexture` creation in
`materials.js`:

```js
// Deliberately no texture.colorSpace: these canvases were authored against
// r128's linear default, and tagging them sRGB shifts every colour in the
// scene. Revisit with the resemblance metric watching, not during a
// migration whose gate is "nothing changed". See
// docs/superpowers/plans/2026-08-12-phase-b1-migration.md task 4.
```

- [ ] **Step 4: Verify no `encoding` references survive**

```bash
grep -rn "outputEncoding\|sRGBEncoding\|LinearEncoding\|\.encoding" tour --include=*.js | grep -v "^tour/lib/"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add tour/app.js tour/post.js tour/materials.js
git commit -m "Rename to outputColorSpace and drop the r128 composer encoding patch"
```

---

### Task 5: Rewrite the post chain against r185

**Files:**
- Modify: `tour/post.js` (the `create` function body)

**Interfaces:**
- Consumes: `window.EffectComposer`, `window.RenderPass`, `window.ShaderPass`,
  `window.UnrealBloomPass`, `window.OutputPass` from task 3.
- Produces: unchanged public shape — `Post.create(renderer, scene, camera)`
  returning `null` or `{composer, enabled, setSize(w,h), update(t), render(t)}`.
  `app.js` and `measure.js` call these and must not need editing.

- [ ] **Step 1: Replace the guard and the chain**

In `post.js`, replace the `if (!T.EffectComposer || !T.UnrealBloomPass)` guard
with a check over every class the chain actually uses, and rebuild the chain
with `OutputPass` last:

```js
    const need = { EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, OutputPass };
    for (const k in need) {
      if (!need[k]) {
        console.warn('[post] ' + k + ' missing, rendering without the chain');
        return null;
      }
    }
```

and inside the `try`:

```js
      const size = new T.Vector2();
      renderer.getSize(size);

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));

      // strength, radius, threshold. The threshold is re-derived in step 3 of
      // this task: on r185 the chain runs in linear light and OutputPass does
      // tone mapping at the end, so the value that acted on encoded pixels in
      // r128 does not mean the same thing here.
      const bloom = new UnrealBloomPass(size, 0.22, 0.5, 0.92);
      composer.addPass(bloom);

      const grain = new ShaderPass(GrainVignetteShader);
      composer.addPass(grain);

      // Tone mapping and the sRGB conversion happen here, once, at the end.
      // This is what replaces r128's per-material encoding and the render
      // target patch deleted in task 4.
      composer.addPass(new OutputPass());
```

Delete `grain.renderToScreen = true;` — `OutputPass` is now the last pass and
`EffectComposer` renders the final pass to screen itself.

- [ ] **Step 2: Update the file's header comment**

The existing header claims "No SSAO" with a reason. Keep that. Replace the
`const T = THREE;` line's usages that no longer apply — `T` is still used for
`T.Vector2`, so keep the line.

- [ ] **Step 3: Re-measure what the bloom threshold acts on**

This is the trap the handoff calls fact 2, and it is being walked into
deliberately with a measurement instead of an assumption. Phase A tuned 0.92
at exposure 1.05, then a later task moved exposure to 0.33 and nothing
re-checked it; the threshold ended up inert at 11 of 12 camera positions.

At `?apt=serenity&check=1`, read back the maximum channel value the threshold
now sees, at serenity's start position and at its bathroom photo spot — the
one live specular highlight known to cross the threshold on r128:

```js
await window.__bakeReady;
const a = window.__app, c = a.controls;
function maxChannel(x, z, yaw) {
  c.enabled = true; c.pos.x = x; c.pos.z = z; c.ground = 0;
  c.yaw = yaw * Math.PI / 180; c.pitch = 0; c.keys = {}; c.update(0.001);
  a.renderer.render(a.scene, a.camera);
  const cv = document.createElement('canvas');
  cv.width = 480; cv.height = 300;
  cv.getContext('2d').drawImage(a.renderer.domElement, 0, 0, 480, 300);
  const d = cv.getContext('2d').getImageData(0, 0, 480, 300).data;
  let m = 0;
  for (let i = 0; i < d.length; i += 4) m = Math.max(m, d[i], d[i + 1], d[i + 2]);
  return m;
}
console.log('entrance', maxChannel(3.6, 0.8, 180), 'bathroom', maxChannel(2.7, 1.25, 55));
```

Record both numbers in the commit message. On r128 the bathroom frame reached
an encoded 246/255 (0.965) and everything else sat at 185–215 (0.73–0.84).

**Do not retune the threshold in this plan.** If the numbers moved, that is
information for plan 2's exposure work, and changing two things at once is how
phase A lost track of which one mattered. Write down what you saw.

- [ ] **Step 4: Confirm the chain is actually running**

A composer that silently returned `null` would also produce "no regression"
against a screenshot set if the set were captured the same way. Check
explicitly:

```js
console.log('composer:', !!window.__app.composer);
```

Expected: `true`. If `false`, read the `[post]` warning in the console and fix
the cause before continuing — a disabled chain is not a passing migration.

- [ ] **Step 5: Commit**

```bash
git add tour/post.js
git commit -m "Rewrite the post chain against r185 with OutputPass"
```

---

### Task 6: Recalculate light intensities under physically correct lighting

r155 made physically correct lighting the default and removed the legacy
switch. `PointLight` now uses candela and defaults to `decay = 2`, where r128
defaulted to `decay = 1`. Everything the bake produces is unaffected — it is
baked texture data — but the dynamic lights `builder.js` creates are not.

**Files:**
- Modify: `tour/builder.js` (wherever `PointLight`, `AmbientLight` and
  `HemisphereLight` are constructed)

**Interfaces:**
- Consumes: the r128 reference frames from task 1.
- Produces: no API change. Only constructor arguments move.

- [ ] **Step 1: Enumerate every light in the scene, on the current build**

```js
await window.__bakeReady;
const out = [];
window.__app.scene.traverse(o => {
  if (o.isLight) out.push({
    type: o.type, name: o.name || '', intensity: o.intensity,
    decay: o.decay, distance: o.distance, color: '#' + o.color.getHexString()
  });
});
console.table(out);
```

Run it for all three apartments and paste the tables into the commit message.
This is the record of what the values were, and there is no other copy.

- [ ] **Step 2: Set `decay` explicitly on every PointLight**

Find each `new THREE.PointLight(...)` in `builder.js` and add an explicit
`decay` matching r128's default, so the migration does not silently change the
falloff curve:

```js
const l = new THREE.PointLight(color, intensity, distance);
l.decay = 1;   // r128 default; r155+ defaults to 2. Explicit so the
               // migration changes nothing, and so the value is visible
               // when plan 3 revisits the lighting model.
```

- [ ] **Step 3: Capture the r185 set and compare**

```js
await window.__bakeReady; await window.__refshots('r185');
```

```bash
python tools/compare_shots.py --a r128 --b r185
```

- [ ] **Step 4: Close the gap, one variable at a time**

If frames fail, change **one** thing, re-capture into a differently named
directory, and compare again. Do not batch changes. The likely causes, in the
order worth checking:

1. A `PointLight` whose `decay` was missed in step 2.
2. `AmbientLight`/`HemisphereLight` intensity — these are not distance-based
   and should carry over unchanged; if they moved, something else did.
3. The post chain — bypass it with `window.__app.composer = null` before
   capturing to find out whether the difference is in the chain or the scene.

Record which cause it was in the commit message. "It matches now" without a
mechanism is the failure phase A's catalogue puts first: a number that
improved for a reason nobody checked is a bug, not a result.

- [ ] **Step 5: Commit**

Append the r128-vs-r185 comparison result to
`docs/superpowers/metrics/r128-reference.md` — worst MAD, threshold, and the
mechanism found in step 4. The frames stay local and gitignored, as in task 1.

```bash
git add tour/builder.js docs/superpowers/metrics/r128-reference.md
git commit -m "Set PointLight decay explicitly for r155+ physically correct lighting"
```

---

### Task 7: The migration gate

Everything in one place, all three apartments, before this is called done.

**Files:**
- Modify: `tour/index.html` (bump `?v=` on the single module tag, **after**
  the last code edit)

- [ ] **Step 1: Layout self-check, all three**

Open `?apt=<id>&check=1` for `serenity`, `kings-court`, `horkyone-10`:

```js
await window.__bakeReady; window.__issues
```

Expected: `[]` for each. A non-empty list blocks the commit.

- [ ] **Step 2: Walk a route on each level of kings-court**

```js
const c = window.__app.controls;
c.enabled = true; c.pos.x = 22.6; c.pos.z = 5; c.ground = 0;
c.yaw = 90 * Math.PI / 180;
c.keys = { KeyW: true };
for (let i = 0; i < 180; i++) c.update(0.033);
c.keys = {}; console.log(c.pos, c.ground);
```

Expected: the camera has moved west along the entry hall and `ground` is still
`0`. Repeat from the `Upper hall` spawn (13.6, 0.9, ground 3.1) and confirm it
stays on the upper level.

- [ ] **Step 3: Sky-leak raycasts**

From each spawn of each apartment, cast straight up and confirm a mesh is hit:

```js
const a = window.__app, rc = new THREE.Raycaster();
rc.camera = a.camera;
for (const s of APT.spawns) {
  rc.set(new THREE.Vector3(s.x, (s.g || 0) + 1.6, s.z), new THREE.Vector3(0, 1, 0));
  const h = rc.intersectObjects(a.scene.children, true)
    .filter(x => x.object.type !== 'Sprite' && x.object.type !== 'Points')[0];
  console.log(s.name, h ? h.distance.toFixed(2) : 'NOTHING ABOVE');
}
```

Expected: a distance for every indoor spawn. `NOTHING ABOVE` is allowed only
for the terraces (`Terrace`, `Pool Terrace`), which are open to the sky.

- [ ] **Step 4: Draw calls**

```js
const a = window.__app, c = a.controls;
a.renderer.setSize(1280, 820, false);
a.camera.aspect = 1280 / 820; a.camera.updateProjectionMatrix();
c.pos.x = 22.6; c.pos.z = 5; c.ground = 0; c.yaw = Math.PI / 2; c.update(0.001);
a.renderer.render(a.scene, a.camera);
console.log(a.renderer.info.render.calls);
```

Expected: ≤400 at kings-court's entry hall. It was 144 on r128; a large jump
means something stopped merging.

- [ ] **Step 5: Resemblance metric, both measured apartments**

```js
await window.__bakeReady; await window.__measure();
```

```bash
python tools/delta_e.py --apt serenity --phase b1-migration
python tools/delta_e.py --apt kings-court --phase b1-migration
```

Expected: **serenity within ±0.3 of 16.58, kings-court within ±0.3 of 22.44.**
These are measured with the harness's existing, unfixed field of view — on
purpose. The FOV error is systematic and cancels in a before/after
comparison; fixing it here would move the engine and the ruler at once. Plan 2
fixes it and re-baselines.

`horkyone-10` has no `compare`-flagged spots, so `delta_e.py` exits with an
error for it. That is expected and is not a failure of this step — it is
observation A1, and plan 2 decides what to do about it.

- [ ] **Step 6: Reference frames**

```bash
python tools/compare_shots.py --a r128 --b r185
```

Expected: exit code 0.

- [ ] **Step 7: Bump the version, last**

Only now, after the final code edit, in `tour/index.html`:

```html
<script type="module" src="main.js?v=66"></script>
```

Confirm the new code is actually being served rather than a cached build, by
comparing a config field against the file:

```js
console.log(APT.meta.id, THREE.REVISION);
```

- [ ] **Step 8: Commit and open the PR**

```bash
git add -A
git commit -m "Migrate all three tours to Three.js r185 with no visual regression"
git push
gh pr create --title "Migrate to Three.js r185" --body "..."
```

The PR body follows the style of PRs #1–#21: what changed, what was measured,
what was deliberately left alone. State the ΔE numbers, the worst MAD from
`compare_shots.py`, the draw-call figure, and the two bloom-threshold readings
from task 5 step 3.

---

## What this plan deliberately does not do

Each of these is a later plan, and doing any of them here would break the
"nothing changed" gate that makes this migration provable:

- Fixing the harness field of view (observation C1) — plan 2.
- Clearing `serenity.exposure` and fitting exposure for the other two
  apartments (A1) — plan 2.
- The render↔photograph slider — plan 2.
- The BVH sampler, the source fix in `lightAt`/`aoAt`, GTAO (A2, A3) — plan 3.
- Offline path-traced lightmaps — plan 3.
- serenity's living-room geometry (B1), HDRI, GLTF furniture, PBR textures —
  plan 4.
- Rewriting `CLAUDE.md` and `docs/PROMPT.md` — plan 5, after the architecture
  has stopped moving.

## Self-review notes

Checked against `docs/superpowers/specs/2026-08-12-phase-b-migration-design.md`:

- Spec steps 1 and 2 are covered by tasks 1–7. Steps 3–9 are out of scope and
  listed above.
- The spec's importmap decision was **wrong and is corrected in task 2**:
  enumerating addons with `?v=N` does not version their relative imports. The
  spec must be amended to say version-stamped directory.
- `Post.create`'s return shape is unchanged, so `app.js` and `measure.js` need
  no edits — verified against `measure.js:49-53` and `:76`, which call
  `a.composer.setSize` and `a.composer.render`.
- `window.__refshots(dir)` is defined in task 1 and used in tasks 6 and 7 with
  the same signature.
