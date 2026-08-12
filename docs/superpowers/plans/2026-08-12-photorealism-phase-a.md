# Photorealism Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the visual quality of every existing tour on the current Three.js r128, without an engine migration, and prove the gain with a measured resemblance score rather than opinion.

**Architecture:** Five independent visual changes land behind one measurement harness built first. The harness renders each flagged photo spot from that photograph's camera, saves the frame, and a Python script scores it against the real photograph as mean ΔE2000 over an 8×8 grid. Every later task must hold or improve that score. Materials move out of the 74 KB `builder.js` into their own module before anything touches them.

**Tech Stack:** Three.js r128 (local UMD), plain ES5-compatible browser JS, no bundler, no npm. Python 3.11 with numpy 1.26 and Pillow 11 for the offline scoring script (both already installed and verified).

## Global Constraints

Copied verbatim from `docs/superpowers/specs/2026-08-12-photorealism-design.md`. Every task's requirements implicitly include this section.

- The JSON config is the single source of data. **No coordinates in code.**
- One code base serves every property, selected with `?apt=<id>`.
- Static files, no build step, servable by a plain HTTP server.
- `validate.js` must report an empty issue list before every commit.
- Metres and degrees; the yaw convention is unchanged.
- **≤400 draw calls on desktop, ≤250 on mobile**, re-measured after every geometry addition, at the entrance and in two rooms.
- **Phase A bake stays under ~3 s**, because it is still synchronous.
- Total transferred weight per apartment ≤50 MB including shared assets.
- Everything in the project is in English: UI strings, JSON room names, docs, code comments.
- Any JS or JSON change requires bumping `?v=N` on **all** `<script src>` tags in `index.html`, and the bump happens **after** the last code edit. **Every task in this plan bumps**, as its final edit before committing — not only the first and last. A task that changes JS or JSON without bumping serves the old file from cache, which is the failure `CLAUDE.md` records as having cost an hour.
- A missing asset degrades to the procedural path with a console warning, and never produces a black screen.

## Documented deviation from the spec

The spec's A4 lists the post chain as "render → SAO → bloom → grain and vignette". **This plan drops SAO.** Task 5 bakes real ambient occlusion into both the floor lightmaps and the furniture vertices, and every object in these scenes is static, so screen-space AO would recompute at runtime what we already have at higher quality — while costing five additional example files and their shader dependencies. If the baked AO proves insufficient once phase A is measured, SAO is added in phase B where the module story is cleaner.

Everything else in spec section "Phase A" is implemented here.

## File structure

**Created:**

| File | Responsibility |
|---|---|
| `tools/serve.py` | Static server for `tour/` plus a `POST /save/<name>` endpoint that writes a data-URL body to `tools/shots/`. Replaces the ad-hoc server used during development. |
| `tour/measure.js` | Browser-side capture: renders each `compare` photo spot at that photograph's aspect ratio and POSTs the frame. Loaded only under `?measure=1`, so normal visitors never download it. |
| `tools/delta_e.py` | Offline scoring: mean ΔE2000 over an 8×8 grid between each saved render and its photograph. Writes a JSON metrics file. |
| `tools/sample_palette.py` | Samples reference colours out of the committed webp photos and prints a `palette` block for the apartment config. |
| `tour/materials.js` | The `M.*` palette and all procedural texture generators, moved out of `builder.js`. |
| `tour/post.js` | The EffectComposer chain and its automatic disable on weak GPUs. |
| `tour/lib/` | Local UMD copies of the six r128 example files the post chain needs. |
| `docs/superpowers/metrics/` | One JSON file per measurement run, committed, so the trend is in git history. |

**Modified:** `tour/builder.js`, `tour/bake.js`, `tour/app.js`, `tour/main.js`, `tour/index.html`, `tour/apartments/serenity.json`, `CLAUDE.md`.

**Branch:** `photorealism-phase-a`, off `main`.

---

### Task 1: Measurement harness and baseline

Nothing else in this plan can be judged until this exists, and the baseline must be captured before any visual change. The absolute ΔE number is meaningless — photograph and render differ in lens, exposure and furniture model. **Only its trend across tasks carries information.** Write that caveat into the metrics file itself so nobody later quotes the absolute value.

**Files:**
- Create: `tools/serve.py`
- Create: `tour/measure.js`
- Create: `tools/delta_e.py`
- Modify: `tour/main.js` (inject `measure.js` under `?measure=1`)
- Modify: `tour/apartments/serenity.json` (add `"compare": true` to photo spots)

**Interfaces:**
- Produces: `window.__measure()` → `Promise<Array<{file, w, h}>>`, renders and POSTs one frame per flagged spot, named `render_<aptId>_<file>.jpg`.
- Produces: `tools/delta_e.py --apt serenity --phase baseline` → writes `docs/superpowers/metrics/serenity-baseline.json` with `{spots: [{file, deltaE}], mean, caveat}`.
- Consumes by later tasks: the same two commands, with a different `--phase` value.

- [ ] **Step 1: Create the server with a save endpoint**

Create `tools/serve.py`:

```python
"""Static server for the tour plus a save endpoint for offscreen renders.

Run:  python tools/serve.py
Then: http://localhost:8742/?apt=serenity&check=1
"""
import base64
import http.server
import os
import socketserver

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOUR = os.path.join(ROOT, 'tour')
SHOTS = os.path.join(ROOT, 'tools', 'shots')
os.makedirs(SHOTS, exist_ok=True)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=TOUR, **kw)

    def do_POST(self):
        if not self.path.startswith('/save/'):
            self.send_response(404)
            self.end_headers()
            return
        name = os.path.basename(self.path)
        n = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(n).decode()
        if ',' in body:
            body = body.split(',', 1)[1]
        with open(os.path.join(SHOTS, name), 'wb') as f:
            f.write(base64.b64decode(body))
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')

    def log_message(self, *a):
        pass


socketserver.ThreadingTCPServer.allow_reuse_address = True
print('serving tour/ on http://localhost:8742  (renders -> tools/shots/)')
with socketserver.ThreadingTCPServer(('127.0.0.1', 8742), Handler) as srv:
    srv.serve_forever()
```

Add `tools/shots/` to `.gitignore` — saved renders are build output, not source.

- [ ] **Step 2: Flag the photo spots to compare**

In `tour/apartments/serenity.json`, add `"compare": true` to all 11 entries of `photoSpots`. Every spot has a real photograph, so every spot is comparable.

- [ ] **Step 3: Write the browser-side capture**

Create `tour/measure.js`:

```js
// ============================================================
// Resemblance capture. Loaded only under ?measure=1.
// Renders every photoSpot flagged `compare` from that
// photograph's own camera and aspect ratio, and POSTs the frame
// to the save endpoint for offline scoring by tools/delta_e.py.
// ============================================================

window.__measure = function () {
  const a = window.__app;
  const base = APT.meta.photoBase;
  const spots = (APT.photoSpots || []).filter((s) => s.compare);

  function loadImage(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('cannot load ' + src));
      img.src = src;
    });
  }

  function renderAt(spot, W, H) {
    const c = a.controls;
    c.enabled = true;
    c.pos.x = spot.x;
    c.pos.z = spot.z;
    c.ground = spot.g || 0;
    c.yaw = spot.yaw;          // main.js has already converted to radians
    c.pitch = 0;
    c.update(0.001);
    a.renderer.setSize(W, H, false);
    a.camera.aspect = W / H;
    a.camera.updateProjectionMatrix();
    // render through the post chain when one exists, so the score
    // reflects what a visitor actually sees
    if (a.composer) {
      a.composer.setSize(W, H);
      a.composer.render();
    } else {
      a.renderer.render(a.scene, a.camera);
    }
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    cv.getContext('2d').drawImage(a.renderer.domElement, 0, 0);
    return cv.toDataURL('image/jpeg', 0.92);
  }

  return (async () => {
    const out = [];
    for (const s of spots) {
      const img = await loadImage(base + s.file);
      const W = 1024;
      const H = Math.round(W * img.naturalHeight / img.naturalWidth);
      const data = renderAt(s, W, H);
      await fetch('/save/render_' + APT.meta.id + '_' + s.file.replace('.webp', '.jpg'), {
        method: 'POST', body: data
      });
      out.push({ file: s.file, w: W, h: H });
    }
    console.log('[measure] captured ' + out.length + ' spots');
    return out;
  })();
};
```

- [ ] **Step 4: Inject it under `?measure=1`**

In `tour/main.js`, after the config has loaded and `initApp()` has run, add:

```js
  // Resemblance capture harness, off by default and never downloaded
  // by normal visitors.
  if (new URLSearchParams(location.search).has('measure')) {
    const v = document.currentScript ? document.currentScript.src.split('?v=')[1] : '';
    const s = document.createElement('script');
    s.src = 'measure.js' + (v ? '?v=' + v : '');
    document.head.appendChild(s);
  }
```

Read the version off the loader's own tag exactly as the config fetch already does, or `measure.js` will cache stale.

- [ ] **Step 5: Verify capture works and fails loudly when it should**

Run the server, then in the browser console at `http://localhost:8742/?apt=serenity&measure=1`:

```js
await window.__bakeReady; await window.__measure();
```

Expected: 11 files appear in `tools/shots/` named `render_serenity_1.jpg` … `render_serenity_11.jpg`, each matching its photograph's aspect ratio (1.78 for spots 1–8, 0.77 for 9–11).

Then confirm the harness is genuinely absent without the flag: load `?apt=serenity` and check `typeof window.__measure === 'undefined'`.

- [ ] **Step 6: Write the scoring script**

Create `tools/delta_e.py`:

```python
"""Score renders against the real photographs.

Mean CIEDE2000 over an 8x8 grid of cell mean colours. The grid makes the
measure robust to small misalignment while staying sensitive to colour and
tonal distribution, which is what phase A actually changes.

The absolute value is meaningless: render and photograph differ in lens,
exposure and furniture model. Only the trend across phases carries
information.

Run: python tools/delta_e.py --apt serenity --phase baseline
"""
import argparse
import json
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRID = 8


def srgb_to_lab(rgb):
    """rgb: float array in [0,1], shape (..., 3) -> CIE Lab, D65."""
    m = rgb <= 0.04045
    lin = np.where(m, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    mat = np.array([[0.4124564, 0.3575761, 0.1804375],
                    [0.2126729, 0.7151522, 0.0721750],
                    [0.0193339, 0.1191920, 0.9503041]])
    xyz = lin @ mat.T
    white = np.array([0.95047, 1.0, 1.08883])
    t = xyz / white
    d = 6.0 / 29.0
    f = np.where(t > d ** 3, np.cbrt(t), t / (3 * d * d) + 4.0 / 29.0)
    L = 116 * f[..., 1] - 16
    a = 500 * (f[..., 0] - f[..., 1])
    b = 200 * (f[..., 1] - f[..., 2])
    return np.stack([L, a, b], axis=-1)


def ciede2000(lab1, lab2):
    """Mean CIEDE2000 between two arrays of Lab colours."""
    L1, a1, b1 = lab1[..., 0], lab1[..., 1], lab1[..., 2]
    L2, a2, b2 = lab2[..., 0], lab2[..., 1], lab2[..., 2]
    C1 = np.hypot(a1, b1)
    C2 = np.hypot(a2, b2)
    Cbar = (C1 + C2) / 2
    G = 0.5 * (1 - np.sqrt(Cbar ** 7 / (Cbar ** 7 + 25.0 ** 7 + 1e-12)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = np.hypot(a1p, b1), np.hypot(a2p, b2)
    h1p = np.degrees(np.arctan2(b1, a1p)) % 360
    h2p = np.degrees(np.arctan2(b2, a2p)) % 360
    dLp = L2 - L1
    dCp = C2p - C1p
    dhp = h2p - h1p
    dhp = np.where(dhp > 180, dhp - 360, np.where(dhp < -180, dhp + 360, dhp))
    dhp = np.where(C1p * C2p == 0, 0.0, dhp)
    dHp = 2 * np.sqrt(C1p * C2p) * np.sin(np.radians(dhp / 2))
    Lbp = (L1 + L2) / 2
    Cbp = (C1p + C2p) / 2
    hsum = h1p + h2p
    hdiff = np.abs(h1p - h2p)
    hbp = np.where(C1p * C2p == 0, hsum,
                   np.where(hdiff <= 180, hsum / 2,
                            np.where(hsum < 360, (hsum + 360) / 2, (hsum - 360) / 2)))
    T = (1 - 0.17 * np.cos(np.radians(hbp - 30))
         + 0.24 * np.cos(np.radians(2 * hbp))
         + 0.32 * np.cos(np.radians(3 * hbp + 6))
         - 0.20 * np.cos(np.radians(4 * hbp - 63)))
    dtheta = 30 * np.exp(-(((hbp - 275) / 25) ** 2))
    Rc = 2 * np.sqrt(Cbp ** 7 / (Cbp ** 7 + 25.0 ** 7 + 1e-12))
    Sl = 1 + (0.015 * (Lbp - 50) ** 2) / np.sqrt(20 + (Lbp - 50) ** 2)
    Sc = 1 + 0.045 * Cbp
    Sh = 1 + 0.015 * Cbp * T
    Rt = -np.sin(np.radians(2 * dtheta)) * Rc
    de = np.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2
                 + Rt * (dCp / Sc) * (dHp / Sh))
    return float(np.mean(de))


def cell_means(path):
    im = Image.open(path).convert('RGB').resize((GRID * 16, GRID * 16), Image.LANCZOS)
    arr = np.asarray(im, dtype=np.float64) / 255.0
    arr = arr.reshape(GRID, 16, GRID, 16, 3).mean(axis=(1, 3))
    return srgb_to_lab(arr)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apt', required=True)
    ap.add_argument('--phase', required=True)
    args = ap.parse_args()

    cfg = json.load(open(os.path.join(ROOT, 'tour', 'apartments', args.apt + '.json'),
                         encoding='utf-8'))
    spots = [s for s in cfg['photoSpots'] if s.get('compare')]
    rows = []
    for s in spots:
        photo = os.path.join(ROOT, 'tour', cfg['meta']['photoBase'], s['file'])
        render = os.path.join(ROOT, 'tools', 'shots',
                              'render_%s_%s' % (args.apt, s['file'].replace('.webp', '.jpg')))
        if not os.path.exists(render):
            raise SystemExit('missing render: %s -- run window.__measure() first' % render)
        de = ciede2000(cell_means(render), cell_means(photo))
        rows.append({'file': s['file'], 'name': s.get('name', ''), 'deltaE': round(de, 2)})
        print('%-10s %-16s dE2000 %6.2f' % (s['file'], s.get('name', ''), de))

    mean = round(sum(r['deltaE'] for r in rows) / len(rows), 2)
    print('mean dE2000: %.2f' % mean)

    out_dir = os.path.join(ROOT, 'docs', 'superpowers', 'metrics')
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, '%s-%s.json' % (args.apt, args.phase))
    json.dump({
        'apartment': args.apt,
        'phase': args.phase,
        'mean': mean,
        'spots': rows,
        'caveat': ('Absolute values are meaningless: render and photograph differ in '
                   'lens, exposure and furniture model. Only the trend between phases '
                   'carries information.')
    }, open(out, 'w', encoding='utf-8'), indent=2)
    print('wrote', out)


if __name__ == '__main__':
    main()
```

- [ ] **Step 7: Verify the scorer on a known-bad pair**

Before trusting it, prove it discriminates. Run:

```bash
python tools/delta_e.py --apt serenity --phase baseline
```

Expected: 11 rows print, each with a plausible ΔE2000 (single digits to low tens — a value of 0 or above 60 means the conversion is wrong, not that the render is perfect or hopeless).

Then sanity-check the metric itself: temporarily copy a photograph over its own render file and re-run — that spot must score very close to 0. Restore the render afterwards. A metric that cannot score 0 on identical images is broken and every later number would be noise.

- [ ] **Step 8: Bump the cache version and commit**

Bump `?v=42` → `?v=43` on all eight `<script src>` tags in `tour/index.html`.

```bash
git add tools/serve.py tools/delta_e.py tour/measure.js tour/main.js \
        tour/index.html tour/apartments/serenity.json .gitignore \
        docs/superpowers/metrics/serenity-baseline.json
git commit -m "Add resemblance measurement harness and phase A baseline"
```

---

### Task 2: Extract materials into their own module

A pure move with **no visual change whatsoever**. Doing it first means the four visual tasks all work in the new structure; doing it later means redoing them.

**Files:**
- Create: `tour/materials.js`
- Modify: `tour/builder.js` (remove the moved code, consume `Materials`)
- Modify: `tour/index.html` (add the script tag before `builder.js`)

**Interfaces:**
- Produces: global `Materials = { M, init(palette), canvasTex(w, h, draw, repX, repY) }` where `M` is the same object `builder.js` uses today and `init()` replaces the current `initMaterials()`.
- Consumes: nothing. `palette` is unused until Task 7 and must be accepted and ignored now so the signature does not churn later.

- [ ] **Step 1: Capture a deterministic pre-move snapshot of the palette**

This refactor's test is that the materials do not change. **Do not byte-compare rendered frames:** `builder.js` calls `Math.random()` 41 times in its texture and furniture generation, so two consecutive reloads of identical code produce different images. A byte comparison would fail on correct work.

Snapshot the palette instead — it is deterministic and it is exactly what a move can break. First make it reachable by adding `M` to Builder's returned object, a one-line change that also serves the project's existing debug-API convention:

```js
  return { build, colliders, atticH, bakeData, mergeStatic, openings: doorways, M };
```

Then in the console, with the server running:

```js
await window.__bakeReady;
window.__paletteSnapshot = () => Object.keys(Builder.M).sort().map((k) => {
  const m = Builder.M[k];
  return [k, m.type,
    m.color ? m.color.getHexString() : '-',
    m.roughness !== undefined ? m.roughness.toFixed(3) : '-',
    m.metalness !== undefined ? m.metalness.toFixed(3) : '-',
    m.map ? 'map' : '-',
    m.transparent ? 'T' : '-',
    m.opacity !== undefined ? m.opacity.toFixed(2) : '-',
    m.side !== undefined ? m.side : '-'
  ].join(' ');
}).join('\n');
copy(window.__paletteSnapshot());   // or console.log and save by hand
```

Save the output to `tools/palette-before.txt`.

- [ ] **Step 2: Move the code**

Create `tour/materials.js` containing, moved verbatim out of `builder.js`: `canvasTex`, every texture generator (`woodTex`, `floorTex`, `marbleTex`, `deckTex`, `terracottaTex`, `tileGrayTex`, `artTex`, `throwMat` and the rest — all 13 `canvasTex` call sites), the `const M = {}` declaration and the whole body of `initMaterials`.

Wrap it in the same IIFE style the other modules use:

```js
// ============================================================
// Material palette and procedural textures.
//
// Split out of builder.js because materials are the subject of the
// photorealism work and editing them inside a 74 KB file is where
// mistakes happen. Behaviour is identical to the previous inline
// version.
// ============================================================

const Materials = (() => {
  const T = THREE;
  const M = {};

  function canvasTex(w, h, draw, repX = 1, repY = 1) { /* moved verbatim */ }

  /* ... all texture generators, moved verbatim ... */

  // `palette` is accepted and ignored until Task 7 introduces it, so the
  // signature does not churn.
  function init(palette) {
    /* the former body of initMaterials, moved verbatim */
  }

  return { M, init, canvasTex };
})();
```

In `builder.js`: delete the moved code and add near the top of the IIFE:

```js
  const M = Materials.M;
  const canvasTex = Materials.canvasTex;
```

and replace the `initMaterials()` call inside `build()` with `Materials.init(APT.palette)`.

- [ ] **Step 3: Add the script tag**

In `tour/index.html`, insert `materials.js` **before** `builder.js`:

```html
<script src="materials.js?v=43"></script>
```

- [ ] **Step 4: Verify nothing changed**

`builder.js` now reads `M` from `Materials`, so `Builder.M` and `Materials.M` are the same object and the snapshot is taken through the same accessor as before the move — an apples-to-apples comparison.

Reload and check the layout gate:

```js
await window.__bakeReady; window.__issues
```

Expected: `[]`.

Then take the snapshot again with the identical function from Step 1 and diff it against `tools/palette-before.txt`:

```bash
python -c "import sys; a=open('tools/palette-before.txt',encoding='utf-8').read().splitlines(); b=open('tools/palette-after.txt',encoding='utf-8').read().splitlines(); d=[(x,y) for x,y in zip(a,b) if x!=y]; print('lines before/after:', len(a), len(b)); print('differences:', d if d else 'none')"
```

Expected: identical line counts and **no differences**. Any difference means a material was dropped or altered in the move — find it rather than accepting it. A shorter "after" list means a material was lost entirely, which is the most likely mistake and the one a screenshot would miss.

Also confirm the other two apartments still build: load `?apt=kings-court&check=1` and `?apt=horkyone-10&check=1`, both must report `[]`.

- [ ] **Step 5: Bump the cache version and commit**

Bump `?v=43` → `?v=44` on all `<script src>` tags in `tour/index.html`, including the new `materials.js`, as the last edit.

```bash
rm -f tools/palette-before.txt tools/palette-after.txt
git add tour/materials.js tour/builder.js tour/index.html
git commit -m "Extract the material palette into materials.js, no visual change"
```

---

### Task 3: Environment map captured from the apartment itself

The highest ratio of effect to effort in this plan. `PMREMGenerator`, `CubeCamera` and `WebGLCubeRenderTarget` are all in the local core bundle (verified by grep); `RoomEnvironment` is not, and importing a stock studio box would be worse anyway — reflections of *this* flat's window serve resemblance better than reflections of a generic lightbox.

**Files:**
- Modify: `tour/app.js` (capture after the bake resolves)
- Modify: `tour/apartments/serenity.json` (optional `env.capture`)

**Interfaces:**
- Produces: `captureEnvironment(renderer, scene, point)` in `app.js`, sets `scene.environment` and returns the generated `Texture`, or `null` on failure.
- Consumes: `APT.env.capture` `{x, y, z}`, all optional; `x`/`z` default to `APT.roomCenter.main`, `y` defaults to 1.6.

- [ ] **Step 1: Record the failing state**

In the console, confirm there is nothing to reflect today:

```js
await window.__bakeReady;
console.log('environment:', window.__app.scene.environment);
```

Expected: `null`. This is the defect: 65 standard materials with nowhere to source reflections from.

- [ ] **Step 2: Implement the capture**

In `tour/app.js`, add above `window.initApp`:

```js
// Capture a cube panorama of the apartment itself and turn it into a
// PMREM environment. Reflections then show this flat's real window
// instead of a stock studio, which is what resemblance needs.
//
// Two ordering constraints, both load-bearing:
//   - run AFTER the light bake, or the panorama records unlit surfaces;
//   - run while scene.environment is still null, or reflections feed
//     back on themselves.
function captureEnvironment(renderer, scene, point) {
  try {
    const target = new THREE.WebGLCubeRenderTarget(256, {
      format: THREE.RGBAFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter
    });
    const cam = new THREE.CubeCamera(0.1, 60, target);
    cam.position.set(point.x, point.y, point.z);
    scene.environment = null;
    cam.update(renderer, scene);

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileCubemapShader();
    const env = pmrem.fromCubemap(target.texture).texture;
    pmrem.dispose();
    target.dispose();

    scene.environment = env;
    return env;
  } catch (e) {
    console.warn('[env] capture failed, materials stay unreflective:', e);
    return null;
  }
}
```

- [ ] **Step 3: Call it once the bake resolves**

In `initApp`, extend the existing `window.__bakeReady` `.then()` — the capture must not run earlier:

```js
  window.__bakeReady = Baker.run(scene, Builder.bakeData, (p) => {
    goBtn.textContent = 'Baking light… ' + Math.round(p * 100) + '%';
  }).then(() => {
    const rc = (APT.roomCenter && APT.roomCenter.main) || { x: 0, z: 0 };
    const ec = (APT.env && APT.env.capture) || {};
    captureEnvironment(renderer, scene, {
      x: ec.x !== undefined ? ec.x : rc.x,
      y: ec.y !== undefined ? ec.y : 1.6,
      z: ec.z !== undefined ? ec.z : rc.z
    });
    goBtn.textContent = goText;
    goBtn.style.opacity = '1';
    doll.classify();
  });
```

- [ ] **Step 4: Verify the environment exists and metals respond**

```js
await window.__bakeReady;
const a = window.__app;
console.log('environment:', a.scene.environment ? 'present' : 'MISSING');
console.log('issues:', window.__issues);
```

Expected: `present`, and `[]`.

Then look at the chrome and glass directly — stand at the bathroom spot and screenshot:

```js
const c = a.controls;
c.pos.x = 2.7; c.pos.z = 1.25; c.ground = 0; c.yaw = 55 * Math.PI / 180;
c.update(0.001); a.renderer.render(a.scene, a.camera);
```

Expected: the tap, mirror and shower glass now carry gradients instead of reading as flat paint.

- [ ] **Step 5: Re-measure and confirm no regression**

```js
await window.__measure();
```

```bash
python tools/delta_e.py --apt serenity --phase a1-env
```

Expected: mean ΔE2000 at or below the baseline. Record the number in the commit message. If it rose, the capture point is probably inside a solid — check it against the `roomCenter` and the walls before proceeding.

- [ ] **Step 6: Check the draw-call budget, bump the version, commit**

```js
const c2 = a.controls;
c2.pos.x = 3.6; c2.pos.z = 0.8; c2.ground = 0; c2.yaw = Math.PI; c2.update(0.001);
a.renderer.render(a.scene, a.camera);
console.log('calls at entrance:', a.renderer.info.render.calls);
```

Expected: unchanged at ~55, well under 400.

Bump `?v=` on all `<script src>` tags in `tour/index.html` as the last edit.

```bash
git add tour/app.js tour/index.html docs/superpowers/metrics/serenity-a1-env.json
git commit -m "Capture the environment map from the apartment itself"
```

---

### Task 4: Chamfered edges on furniture

Real objects have a small chamfer that catches a highlight; perfectly sharp 90° edges are the strongest subconscious "this is CG" signal. This only reads because Task 3 gave the chamfer something to reflect — the two are multiplicative, which is why they are adjacent here.

**Files:**
- Modify: `tour/builder.js` (`box()` helper and `buildFurniture`)

**Interfaces:**
- Produces: `chamferBoxGeometry(w, h, d, c)` → `THREE.BufferGeometry` with `position`, `normal` and `uv` attributes, falling back to `THREE.BoxGeometry` when the box is too small to chamfer.
- Produces: module-level `CHAMFER` (metres, 0 = off), read by `box()`.

- [ ] **Step 1: Write the geometry generator**

In `tour/builder.js`, above `function box(`:

```js
  // A chamfered box: the 6 inset faces, 12 edge bevels and 8 corner
  // triangles. 44 triangles instead of 12, which is irrelevant here
  // because mergeStatic collapses everything anyway.
  //
  // A `uv` attribute is mandatory, not optional: mergeStatic takes its
  // attribute template from the first chunk in a bucket, so a geometry
  // missing `uv` beside geometries that have it merges to zeroed UVs and
  // silently destroys the texture mapping.
  function chamferBoxGeometry(w, h, d, c) {
    const H = [w / 2, h / 2, d / 2];
    c = Math.min(c, H[0] * 0.4, H[1] * 0.4, H[2] * 0.4);
    if (c <= 0.0005) return new T.BoxGeometry(w, h, d);

    const pos = [], nrm = [], uvs = [];

    // point with axis `ax` on its outer face, the two other axes inset by c
    function pt(ax, s, u, su, v, sv) {
      const p = [0, 0, 0];
      p[ax] = s * H[ax];
      p[u] = su * (H[u] - c);
      p[v] = sv * (H[v] - c);
      return p;
    }
    function norm(v) {
      const L = Math.hypot(v[0], v[1], v[2]) || 1;
      return [v[0] / L, v[1] / L, v[2] / L];
    }
    function emit(p, n) {
      pos.push(p[0], p[1], p[2]);
      nrm.push(n[0], n[1], n[2]);
      // planar projection along the dominant axis of the normal, which is
      // exact on the flat faces and adequate on the bevels
      const ax = (Math.abs(n[0]) >= Math.abs(n[1]) && Math.abs(n[0]) >= Math.abs(n[2])) ? 0
        : (Math.abs(n[1]) >= Math.abs(n[2]) ? 1 : 2);
      const u = (ax + 1) % 3, v = (ax + 2) % 3;
      uvs.push(p[u] / (2 * H[u]) + 0.5, p[v] / (2 * H[v]) + 0.5);
    }
    // Winding is derived, never reasoned about: if the geometric normal
    // opposes the intended one, swap two vertices.
    function tri(a, b, cc, n) {
      const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const e2 = [cc[0] - a[0], cc[1] - a[1], cc[2] - a[2]];
      const g = [e1[1] * e2[2] - e1[2] * e2[1],
                 e1[2] * e2[0] - e1[0] * e2[2],
                 e1[0] * e2[1] - e1[1] * e2[0]];
      if (g[0] * n[0] + g[1] * n[1] + g[2] * n[2] < 0) { const t = b; b = cc; cc = t; }
      emit(a, n); emit(b, n); emit(cc, n);
    }
    function quad(a, b, cc, dd, n) { tri(a, b, cc, n); tri(a, cc, dd, n); }

    for (let ax = 0; ax < 3; ax++) {
      const u = (ax + 1) % 3, v = (ax + 2) % 3;
      for (const s of [-1, 1]) {
        const n = [0, 0, 0]; n[ax] = s;
        quad(pt(ax, s, u, -1, v, -1), pt(ax, s, u, 1, v, -1),
             pt(ax, s, u, 1, v, 1), pt(ax, s, u, -1, v, 1), n);
      }
    }
    // 12 edge bevels: axes a and b outer, running along axis e
    for (let a1 = 0; a1 < 3; a1++) {
      for (let b1 = a1 + 1; b1 < 3; b1++) {
        const e = 3 - a1 - b1;
        for (const sa of [-1, 1]) {
          for (const sb of [-1, 1]) {
            const n = [0, 0, 0]; n[a1] = sa; n[b1] = sb;
            const nn = norm(n);
            quad(pt(a1, sa, b1, sb, e, -1), pt(a1, sa, b1, sb, e, 1),
                 pt(b1, sb, a1, sa, e, 1), pt(b1, sb, a1, sa, e, -1), nn);
          }
        }
      }
    }
    // 8 corners
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const s = [sx, sy, sz];
          tri(pt(0, sx, 1, sy, 2, sz), pt(1, sy, 0, sx, 2, sz), pt(2, sz, 0, sx, 1, sy),
              norm(s));
        }
      }
    }

    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    return geo;
  }
```

- [ ] **Step 2: Export the generator so it can be tested**

The generator lives inside the `builder.js` IIFE and is unreachable from the console, so add it to the returned object beside `M` from Task 2. It is a pure geometry helper; exporting it costs nothing and matches the project's existing debug-API convention:

```js
  return { build, colliders, atticH, bakeData, mergeStatic, openings: doorways,
           M, chamferBoxGeometry };
```

- [ ] **Step 3: Write and run the failing assertions**

Paste this in the console **before** wiring the generator into `box()`. It must fail first — a check that cannot fail proves nothing:

```js
(() => {
  const fail = [];
  const g = Builder.chamferBoxGeometry(1, 1, 1, 0.005);

  // 6 faces x 2 + 12 edge bevels x 2 + 8 corners x 1 = 44 triangles
  const n = g.attributes.position.count;
  if (n !== 132) fail.push('position count ' + n + ', expected 132');

  // the chamfer is an inset: the outer dimensions must be untouched
  g.computeBoundingBox();
  const bb = g.boundingBox;
  for (const [axis, lo, hi] of [['x', bb.min.x, bb.max.x],
                                ['y', bb.min.y, bb.max.y],
                                ['z', bb.min.z, bb.max.z]]) {
    if (Math.abs(lo + 0.5) > 1e-6 || Math.abs(hi - 0.5) > 1e-6) {
      fail.push('bbox ' + axis + ' = [' + lo + ', ' + hi + '], expected [-0.5, 0.5]');
    }
  }

  // a uv attribute is mandatory or mergeStatic silently zeroes the mapping
  const uv = g.attributes.uv;
  if (!uv) fail.push('no uv attribute');
  else {
    if (uv.count !== n) fail.push('uv count ' + uv.count + ' != position count ' + n);
    for (let i = 0; i < uv.array.length; i++) {
      if (uv.array[i] < -1e-6 || uv.array[i] > 1 + 1e-6) {
        fail.push('uv out of [0,1] at ' + i + ': ' + uv.array[i]);
        break;
      }
    }
  }

  // every normal must be unit length, or lighting goes wrong after merging
  const nm = g.attributes.normal;
  for (let i = 0; i < nm.count; i++) {
    const L = Math.hypot(nm.getX(i), nm.getY(i), nm.getZ(i));
    if (Math.abs(L - 1) > 1e-3) { fail.push('normal ' + i + ' length ' + L); break; }
  }

  // A box too small to chamfer must degrade, not produce a degenerate mesh.
  // Pick the dimension from the clamp, not by eye: c is first clamped to
  // 0.4 * half-extent, so the 0.0005 early-out is only reached when the
  // half-extent is at or below 0.00125 — a 2 mm cube, not a 10 mm one.
  const tiny = Builder.chamferBoxGeometry(0.002, 0.002, 0.002, 0.005);
  if (tiny.attributes.position.count !== 24) {
    fail.push('tiny box did not fall back to BoxGeometry (got ' +
              tiny.attributes.position.count + ' positions, expected 24)');
  }

  // The smallest box the production path will ever chamfer is 0.15 m, and it
  // must NOT fall back — otherwise the guard is swallowing real furniture.
  const smallest = Builder.chamferBoxGeometry(0.15, 0.15, 0.15, 0.005);
  if (smallest.attributes.position.count !== 132) {
    fail.push('smallest chamfered box fell back unexpectedly (got ' +
              smallest.attributes.position.count + ' positions, expected 132)');
  }

  console.log(fail.length ? 'FAIL:\n' + fail.join('\n') : 'PASS: all chamfer assertions hold');
  return fail.length === 0;
})();
```

Expected on the first run, before the generator exists: `Builder.chamferBoxGeometry is not a function`. After Step 1 and this step's export: `PASS`.

A bounding box smaller than requested means the inset was applied to the outer faces instead of the neighbouring axes — a sign error in `pt()`. `BoxGeometry` yields a `position.count` of 24, which is what the fallback must produce.

The two size cases are deliberately chosen from opposite sides of the guard, because a guard that never fires and a guard that fires too eagerly are both defects and a single case cannot tell them apart. The production path never reaches the fallback at all — `box()` refuses to chamfer anything whose smallest dimension is under 0.15 m — so this guard is purely defensive, which is exactly why it needs a test: `chamferBoxGeometry` is exported on `Builder` and nothing stops a later caller passing other values.

- [ ] **Step 4: Wire it into `box()` behind a flag**

Walls, floors and ceilings must **not** be chamfered — a bevel at every wall-segment join would open a visible groove along the whole flat. So the chamfer is scoped to furniture construction only:

```js
  let CHAMFER = 0;   // metres; 0 disables. Only furniture switches it on.

  function box(w, h, d, mat, x, y, z, group, rotY = 0) {
    const small = Math.min(w, h, d) < 0.15;
    const geo = (CHAMFER > 0 && !small)
      ? chamferBoxGeometry(w, h, d, CHAMFER)
      : new T.BoxGeometry(w, h, d);
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rotY) m.rotation.y = rotY;
    group.add(m);
    return m;
  }
```

The 0.15 m floor keeps drawer pulls, book spines and cutlery from receiving furniture-scale bevels.

In `buildFurniture`, bracket the loop. The reset goes in a `finally`, so a throwing furniture constructor cannot leave the flag stuck on for the rest of the module's life:

```js
  function buildFurniture(scene) {
    CHAMFER = 0.005;
    try {
      for (const item of APT.furniture) {
        /* unchanged body */
      }
    } finally {
      CHAMFER = 0;
    }
  }
```

Module-level mutable state that is only correct on the happy path is the kind of thing that stays inert for months and then surfaces as a mystery once someone adds a retry or a re-init path. One line removes the class of problem.

- [ ] **Step 5: Verify geometry, textures and the layout gate**

```js
await window.__bakeReady;
console.log('issues:', window.__issues);
let tris = 0;
window.__app.scene.traverse(o => { if (o.isMesh && o.geometry.attributes.position)
  tris += o.geometry.attributes.position.count / 3; });
console.log('triangles:', Math.round(tris));
```

Expected: `[]`, and a triangle count noticeably higher than before but still in the tens of thousands.

**Texture check — this is the step that catches the merge bug.** Screenshot the kitchen, where wood grain and marble meet:

```js
const a = window.__app, c = a.controls;
c.pos.x = 4.7; c.pos.z = 2.55; c.ground = 0; c.yaw = 12 * Math.PI / 180;
c.update(0.001); a.renderer.render(a.scene, a.camera);
```

Expected: wood and marble still show their grain. Flat untextured colour means the UV attribute did not survive `mergeStatic` — go back to Step 1 rather than continuing.

- [ ] **Step 6: Re-measure, bump the version, commit**

```js
await window.__measure();
```

```bash
python tools/delta_e.py --apt serenity --phase a2-chamfer
```

Check draw calls at the entrance again (expected: unchanged, since merging is by material). Confirm `?apt=kings-court&check=1` and `?apt=horkyone-10&check=1` still report `[]`.

Bump `?v=` on all `<script src>` tags in `tour/index.html` as the last edit.

```bash
git add tour/builder.js tour/index.html docs/superpowers/metrics/serenity-a2-chamfer.json
git commit -m "Chamfer furniture edges so they catch the environment highlight"
```

---

### Task 5: Ambient occlusion in the bake

Two separate defects, one pass. Floors get contact shadows so furniture stops hovering; merged furniture gets per-vertex AO so it stops living in a different light environment from the room it stands in. The occluder set already exists — 47 AABBs for Serenity — so this is a new pass over existing data.

**Files:**
- Modify: `tour/bake.js` (`aoAt`, use in `bakeSurface`, new `bakeFurnitureAO`)

**Interfaces:**
- Produces: `aoAt(P, N, occ, rays)` → number in `[0, 1]`, 1 meaning unoccluded.
- Produces: `bakeFurnitureAO(scene, data)`, called from `run()` after the wall pass.
- Consumes: `APT.quality.aoRays`, default 8.

- [ ] **Step 1: Record the failing state**

Screenshot the bedroom floor beside the bed and the living-room floor under the sofa. Furniture currently meets the floor with no darkening at all — objects read as pasted onto the image. Keep these two frames as the before pair.

- [ ] **Step 2: Implement the AO term**

In `tour/bake.js`, below `blocked`:

```js
  // Hemisphere directions in tangent space, cosine-ish spread.
  const AO_DIRS = [
    [0, 1, 0], [0.6, 0.8, 0], [-0.6, 0.8, 0], [0, 0.8, 0.6], [0, 0.8, -0.6],
    [0.45, 0.77, 0.45], [-0.45, 0.77, 0.45], [0.45, 0.77, -0.45]
  ];
  const AO_DIST = 0.6;   // metres; contact shadows only, not global darkening

  // Ambient occlusion at P with normal N. 1 = open, 0 = fully enclosed.
  const _A = new T.Vector3(), _B = new T.Vector3();
  function aoAt(P, N, occ, rays) {
    // Occluders containing P are this object's own box: counting them
    // would darken every surface uniformly and look like a bad exposure.
    const near = [];
    for (let i = 0; i < occ.length; i++) {
      const b = occ[i];
      const inside = P.x > b.x1 - 0.02 && P.x < b.x2 + 0.02 &&
                     P.y > b.y1 - 0.02 && P.y < b.y2 + 0.02 &&
                     P.z > b.z1 - 0.02 && P.z < b.z2 + 0.02;
      if (inside) continue;
      // cheap reject: box further than AO_DIST cannot occlude
      const dx = Math.max(b.x1 - P.x, 0, P.x - b.x2);
      const dy = Math.max(b.y1 - P.y, 0, P.y - b.y2);
      const dz = Math.max(b.z1 - P.z, 0, P.z - b.z2);
      if (dx * dx + dy * dy + dz * dz > AO_DIST * AO_DIST) continue;
      near.push(b);
    }
    if (!near.length) return 1;   // the common case, and it costs one loop

    // tangent basis around N
    const up = Math.abs(N.y) > 0.9 ? _A.set(1, 0, 0) : _A.set(0, 1, 0);
    const t1 = new T.Vector3().crossVectors(up, N).normalize();
    const t2 = new T.Vector3().crossVectors(N, t1);

    const n = Math.min(rays, AO_DIRS.length);
    let open = 0;
    for (let i = 0; i < n; i++) {
      const d = AO_DIRS[i];
      _B.set(
        P.x + (t1.x * d[0] + N.x * d[1] + t2.x * d[2]) * AO_DIST,
        P.y + (t1.y * d[0] + N.y * d[1] + t2.y * d[2]) * AO_DIST,
        P.z + (t1.z * d[0] + N.z * d[1] + t2.z * d[2]) * AO_DIST
      );
      if (!blocked(P, _B, near)) open++;
    }
    // never crush to black: contact shadows, not holes
    return 0.35 + 0.65 * (open / n);
  }
```

- [ ] **Step 3: Apply it to the floor and ceiling lightmaps**

In `bakeSurface`, immediately after the `lightAt` call:

```js
        const [r, g, b] = lightAt(P, N, occ, data, outdoor);
        const ao = aoAt(P, N, occ, (APT.quality && APT.quality.aoRays) || 8);
        const o = (j * W + i) * 4;
        px[o] = Math.min(255, r * ao / EXP * 255);
        px[o + 1] = Math.min(255, g * ao / EXP * 255);
        px[o + 2] = Math.min(255, b * ao / EXP * 255);
```

- [ ] **Step 4: Verify contact shadows appeared and the bake is still fast**

```js
const t0 = performance.now();
await window.__bakeReady;
console.log('bake ms:', Math.round(performance.now() - t0), 'issues:', window.__issues);
```

Expected: `[]`, and **under 3000 ms**. This is the global constraint that governs phase A. If it is over, cut `aoRays` to 5 in `serenity.json` under `quality` and re-measure — do not accept a slower start overlay.

Re-shoot the two before frames from Step 1. Expected: a soft darkening where the bed, sofa and wardrobe meet the floor.

- [ ] **Step 5: Add per-vertex AO on the merged furniture**

`mergeStatic` runs before the bake, so merged furniture meshes are already in the scene, identifiable by `userData.mergeLvl`. Add to `tour/bake.js`:

```js
  // Merged furniture carries no lightmap: it is lit dynamically while the
  // floor is baked, so it sits in a different light environment from the
  // room and reads as pasted on. Per-vertex AO puts it back in the room.
  function bakeFurnitureAO(scene, data) {
    const rays = (APT.quality && APT.quality.aoRays) || 8;
    const P = new T.Vector3(), N = new T.Vector3();
    scene.traverse((mesh) => {
      if (!mesh.isMesh || mesh.userData.mergeLvl === undefined) return;
      const g = mesh.geometry;
      const p = g.attributes.position, nAttr = g.attributes.normal;
      if (!p || !nAttr) return;

      g.computeBoundingBox();
      const bb = g.boundingBox.clone().expandByScalar(1.0);
      const occ = data.occluders.filter(b =>
        b.x2 > bb.min.x && b.x1 < bb.max.x &&
        b.y2 > bb.min.y && b.y1 < bb.max.y &&
        b.z2 > bb.min.z && b.z1 < bb.max.z);

      const col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        P.set(p.getX(i), p.getY(i), p.getZ(i));
        let ao = 1;
        // contact shadows live low; skip the expensive test up high
        if (P.y < 1.2 && occ.length) {
          N.set(nAttr.getX(i), nAttr.getY(i), nAttr.getZ(i));
          ao = aoAt(P, N, occ, rays);
        }
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = ao;
      }
      g.setAttribute('color', new T.BufferAttribute(col, 3));
      // Clone before enabling vertexColors: the material is shared across
      // the bucket, and a mesh with vertexColors but no colour attribute
      // renders undefined. One clone per merged mesh costs no draw calls.
      mesh.material = mesh.material.clone();
      mesh.material.vertexColors = true;
    });
  }
```

Call it in `run()` right after the wall pass completes, before the promise resolves.

- [ ] **Step 6: Verify furniture sits in the room, and nothing turned black**

```js
await window.__bakeReady;
const a = window.__app;
let withColor = 0, merged = 0;
a.scene.traverse(o => {
  if (o.isMesh && o.userData.mergeLvl !== undefined) {
    merged++;
    if (o.geometry.attributes.color) withColor++;
  }
});
console.log('merged meshes:', merged, 'with colour attribute:', withColor);
console.log('issues:', window.__issues);
```

Expected: `merged === withColor` — a mismatch is the exact condition that renders meshes undefined. And `[]`.

Screenshot the living room and the bedroom. Expected: furniture darkens gently where it meets the floor and in its own crevices. **Uniformly dark furniture means the self-occlusion skip in `aoAt` is not firing** — check the `inside` test before continuing.

- [ ] **Step 7: Re-measure, bump the version, commit**

```js
await window.__measure();
```

```bash
python tools/delta_e.py --apt serenity --phase a3-ao
```

Confirm bake time still under 3 s, draw calls unchanged, and both other apartments report `[]`.

Bump `?v=` on all `<script src>` tags in `tour/index.html` as the last edit.

```bash
git add tour/bake.js tour/index.html docs/superpowers/metrics/serenity-a3-ao.json
git commit -m "Bake ambient occlusion into floor lightmaps and furniture vertices"
```

---

### Task 6: Post-processing chain

A real camera produces bloom, grain and vignetting; their complete absence is part of what reads as "video game". Restraint is the whole game here — past a low threshold these read as cheap filters and cost more trust than they earn.

**Files:**
- Create: `tour/lib/` with six UMD files copied from the r128 examples
- Create: `tour/post.js`
- Modify: `tour/app.js` (build the chain, render through it, resize it, expose it)
- Modify: `tour/index.html` (script tags)
- Modify: `CLAUDE.md` (the screenshot recipe changes)

**Interfaces:**
- Produces: `Post.create(renderer, scene, camera)` → `{composer, setSize(w, h), enabled}` or `null` when disabled.
- Consumes: `THREE.EffectComposer`, `THREE.RenderPass`, `THREE.ShaderPass`, `THREE.CopyShader`, `THREE.UnrealBloomPass`, `THREE.LuminosityHighPassShader`.

- [ ] **Step 1: Vendor the example files**

Download these six files from the Three.js **r128** tag (`examples/js/`, the UMD build — not `examples/jsm/`, which is ES modules and will not load here) into `tour/lib/`:

```
shaders/CopyShader.js
shaders/LuminosityHighPassShader.js
postprocessing/EffectComposer.js
postprocessing/RenderPass.js
postprocessing/ShaderPass.js
postprocessing/UnrealBloomPass.js
```

Verify they are the UMD flavour: each must reference `THREE.` globals and contain no `import` statement.

```bash
grep -L "^import" tour/lib/*.js   # must list all six
```

- [ ] **Step 2: Write the chain**

Create `tour/post.js`:

```js
// ============================================================
// Post-processing: bloom on bright daylight, then film grain and
// vignette. Deliberately restrained — past a low threshold these
// read as cheap filters and cost more trust than they earn.
//
// No SSAO: bake.js bakes real ambient occlusion into the floors and
// the furniture vertices, and every object here is static, so a
// screen-space pass would recompute worse data at runtime.
// ============================================================

const Post = (() => {
  const T = THREE;

  const GrainVignetteShader = {
    uniforms: {
      tDiffuse: { value: null },
      amount: { value: 0.035 },
      vignette: { value: 0.55 },
      time: { value: 0 }
    },
    vertexShader: [
      'varying vec2 vUv;',
      'void main() {',
      '  vUv = uv;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D tDiffuse;',
      'uniform float amount;',
      'uniform float vignette;',
      'uniform float time;',
      'varying vec2 vUv;',
      'float rand(vec2 co) {',
      '  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);',
      '}',
      'void main() {',
      '  vec4 c = texture2D(tDiffuse, vUv);',
      '  float n = rand(vUv + fract(time)) - 0.5;',
      '  c.rgb += n * amount;',
      '  float d = distance(vUv, vec2(0.5));',
      '  c.rgb *= smoothstep(0.85, vignette * 0.5, d) * 0.25 + 0.75;',
      '  gl_FragColor = c;',
      '}'
    ].join('\n')
  };

  // Weak hardware gets the plain renderer. Checked once, cheaply.
  function capable(renderer) {
    try {
      const gl = renderer.getContext();
      if (!gl) return false;
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const name = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
      if (/SwiftShader|llvmpipe|Software/i.test(name)) return false;
      return renderer.capabilities.maxTextures >= 8;
    } catch (e) {
      return false;
    }
  }

  function create(renderer, scene, camera) {
    if (!T.EffectComposer || !T.UnrealBloomPass) {
      console.warn('[post] example files missing, rendering without the chain');
      return null;
    }
    if (!capable(renderer)) {
      console.warn('[post] weak GPU detected, rendering without the chain');
      return null;
    }
    const size = new T.Vector2();
    renderer.getSize(size);

    const composer = new T.EffectComposer(renderer);
    composer.addPass(new T.RenderPass(scene, camera));

    // strength, radius, threshold — threshold high so only real daylight blooms
    const bloom = new T.UnrealBloomPass(size, 0.22, 0.5, 0.92);
    composer.addPass(bloom);

    const grain = new T.ShaderPass(GrainVignetteShader);
    grain.renderToScreen = true;
    composer.addPass(grain);

    return {
      composer: composer,
      enabled: true,
      setSize: function (w, h) {
        composer.setSize(w, h);
        bloom.setSize(w, h);
      },
      update: function (t) { grain.uniforms.time.value = t; },
      render: function (t) { grain.uniforms.time.value = t; composer.render(); }
    };
  }

  return { create };
})();
```

- [ ] **Step 3: Wire it into `app.js`**

Add the script tags to `index.html` before `app.js`: the six `lib/` files, then `post.js`.

In `initApp`, after `resize()`:

```js
  const post = Post.create(renderer, scene, camera);
```

Extend `resize()`:

```js
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (post) post.setSize(w, h);
  }
```

In `loop()`, replace the render call:

```js
    if (post && post.enabled) post.render(now * 0.001);
    else renderer.render(scene, camera);
```

Expose it, because the debug recipes and `measure.js` both need it:

```js
  window.__app = { scene, camera, renderer, controls, doll, drawMap, roomName,
                   composer: post ? post.composer : null, post };
```

- [ ] **Step 4: Verify the chain runs and degrades correctly**

```js
await window.__bakeReady;
console.log('post:', window.__app.post ? 'active' : 'disabled (fallback path)');
console.log('issues:', window.__issues);
```

Expected: `active` on normal hardware, `[]` either way.

Now prove the fallback works rather than assuming it — temporarily rename `tour/lib/UnrealBloomPass.js`, reload, and confirm the tour still renders with a console warning and no black screen. Restore the file.

- [ ] **Step 5: Update the debug recipes**

`CLAUDE.md`'s screenshot recipe calls `renderer.render(scene, camera)` directly, which now bypasses the chain and would silently produce unrepresentative frames. Update the recipe in `CLAUDE.md` to prefer the composer:

```js
const a = window.__app;
a.renderer.setSize(1280, 820, false);
a.camera.aspect = 1280 / 820; a.camera.updateProjectionMatrix();
if (a.post) { a.post.setSize(1280, 820); a.post.render(0); }
else a.renderer.render(a.scene, a.camera);
```

- [ ] **Step 6: Re-measure, bump the version, commit**

```js
await window.__measure();
```

```bash
python tools/delta_e.py --apt serenity --phase a4-post
```

The bloom threshold and grain amount are the tuning knobs — if ΔE rose, lower `amount` toward 0.02 and raise the bloom threshold toward 0.95, then re-measure. Tune against the metric, not against taste.

Check draw calls; the chain adds passes, so expect a rise. Confirm it stays under 400.

Bump `?v=` on all `<script src>` tags in `tour/index.html` — including the six new `lib/` files and `post.js` — as the last edit.

```bash
git add tour/lib tour/post.js tour/app.js tour/index.html CLAUDE.md \
        docs/superpowers/metrics/serenity-a4-post.json
git commit -m "Add a restrained bloom, grain and vignette chain"
```

---

### Task 7: Exposure matched to the photographs

**Added after Task 3, on evidence Task 3 produced.** The luminance measurement taken during Task 3 showed the renders running at 0.6588 mean linear luminance against the photographs' 0.2945 — a factor of 2.24, about 1.2 stops. The gap predates all of this work; nothing in the original plan addressed it, because nobody had measured it.

It has to be fixed before the palette task, not after. That task samples colours straight out of the photographs and installs them as material albedo. But a colour in a photograph is an *already-lit* colour, recorded at that photograph's exposure. Feed it as albedo into a scene running 1.2 stops hotter and the error compounds instead of cancelling — the palette task would actively make resemblance worse while appearing to serve it.

**Files:**
- Modify: `tour/app.js` (exposure from config; suspend tone mapping around the capture)
- Modify: `tour/apartments/serenity.json` (`exposure`)
- Modify: `tools/luminance.py` (report the 5th percentile alongside the mean)

**Interfaces:**
- Consumes: `APT.exposure`, optional number, defaulting to the current 1.05 so apartments without photographs to match are untouched.
- Produces: nothing new; the environment capture keeps its existing signature.

- [ ] **Step 1: Break the exposure feedback loop first**

Do this before fitting anything, or the fit will chase its own tail.

Tone mapping is applied in the fragment shader for every material whose `toneMapped` is true, which is the default — including during the six `CubeCamera` face renders. So the captured environment currently stores display-referred, ACES-compressed values, which are then tone-mapped a second time when the scene is drawn. Two consequences: the environment carries less energy in its highlights than the real room does, and changing the exposure changes the captured environment, which changes the lighting, which changes the measured luminance. Fitting against a moving target converges slowly if at all.

In `captureEnvironment` in `tour/app.js`, suspend tone mapping for the duration of the capture and restore it afterwards, in a way that survives the exception path:

```js
  const prevToneMapping = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;
  try {
    // ... existing capture body ...
  } catch (e) {
    // ... existing handling ...
  } finally {
    renderer.toneMapping = prevToneMapping;
  }
```

This also resolves a finding deferred from Task 3, recorded in the ledger as the double tone-mapping of the capture.

Re-measure luminance after this change alone and report it. The number will move before you have fitted anything — that movement is this step's evidence, and it must be recorded separately from the fit, or the two effects become indistinguishable.

- [ ] **Step 2: Make exposure configurable**

In `initApp`, replace the hardcoded exposure with a config read, keeping the present value as the default so the two apartments without flagged photographs are unaffected:

```js
  renderer.toneMappingExposure = (APT.exposure !== undefined) ? APT.exposure : 1.05;
```

The JSON stays the single source of data; no fitted constant may live in the source.

- [ ] **Step 3: Fit the exposure, and fit it to luminance — not to ΔE**

Add `"exposure": <value>` to `tour/apartments/serenity.json` and iterate: set a value, reload so the environment is re-captured, run `window.__measure()`, then `python tools/luminance.py`.

The target is mean linear luminance within 10% of the photographs' 0.2945, measured over the same 11 spots.

Fit against luminance, never against ΔE2000. Luminance parity is a physical target with a defined right answer; ΔE is a 64-cell colour statistic, and tuning a global constant until it bottoms out is overfitting that would corrupt every later measurement in this plan. Report what ΔE does as a **consequence** of the fit.

Because the capture is now linear, the loop is broken and this should converge in two or three iterations. If it does not, stop and say so — that would mean something else is feeding back and it is worth understanding before proceeding.

- [ ] **Step 4: Check you have not crushed the shadows**

Lowering exposure darkens everything, including regions that were already correct. A render that matches on mean luminance while losing all shadow detail is worse, not better, and the mean cannot see it.

Extend `tools/luminance.py` to report the 5th percentile of the luminance distribution alongside the mean, and compare that percentile between the render and the photographs. If the render's 5th percentile falls well below the photographs', the fit has crushed the blacks — report it plainly rather than accepting the mean.

- [ ] **Step 5: Verify and commit**

Validator `[]` on all three apartments at a version-confirmed load. Confirm the two apartments without an `exposure` key render exactly as before — that is the whole point of the default. Draw calls unchanged.

Bump `?v=` on all `<script src>` tags as the last edit.

```bash
git add tour/app.js tour/apartments/serenity.json tools/luminance.py tour/index.html \
        docs/superpowers/metrics/serenity-a6-exposure.json
git commit -m "Match render exposure to the photographs"
```

---

### Task 8: Palette sampled from the photographs

The only change in this plan that serves resemblance directly rather than beauty generally, and it is available only because the flat exists and was photographed.

This task now runs **after** the exposure fit, and depends on it: sampling photographic colour into a scene whose exposure does not match the photographs compounds the error rather than correcting it.

**Files:**
- Create: `tools/sample_palette.py`
- Modify: `tour/materials.js` (consume `palette`)
- Modify: `tour/apartments/serenity.json` (add the `palette` block)

**Interfaces:**
- Consumes: `APT.palette`, an object of material key → hex string; every key optional.
- Produces: `Materials.init(palette)` now reads it, falling back to the current hardcoded value for any key absent.

- [ ] **Step 1: Write the sampler**

The mapping from photo region to material is manual and per-apartment — that is the day-per-premium-object budget being spent where it buys the most. Create `tools/sample_palette.py`:

```python
"""Sample material colours out of the real photographs.

Sample points are normalised (x, y) in [0,1] over the named photo, chosen
by eye on a flat, evenly lit patch of the material. Prints a `palette`
block to paste into the apartment config.

Run: python tools/sample_palette.py --apt serenity
"""
import argparse
import json
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# material key -> (photo file, x, y) with x,y normalised
SAMPLES = {
    'serenity': {
        'floorWood': ('5.webp', 0.42, 0.88),
        'wall':      ('5.webp', 0.88, 0.30),
        'ash':       ('7.webp', 0.55, 0.20),
        'sofa':      ('3.webp', 0.56, 0.33),
        'tileGray':  ('1.webp', 0.55, 0.20),
        'counter':   ('5.webp', 0.60, 0.30),
    },
}


def sample(path, x, y, r=6):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    cx, cy = int(x * w), int(y * h)
    arr = np.asarray(im, dtype=np.float64)
    patch = arr[max(0, cy - r):cy + r, max(0, cx - r):cx + r]
    med = np.median(patch.reshape(-1, 3), axis=0)
    return '#%02x%02x%02x' % tuple(int(round(v)) for v in med)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apt', required=True)
    args = ap.parse_args()
    cfg = json.load(open(os.path.join(ROOT, 'tour', 'apartments', args.apt + '.json'),
                         encoding='utf-8'))
    base = os.path.join(ROOT, 'tour', cfg['meta']['photoBase'])
    out = {}
    for key, (f, x, y) in SAMPLES[args.apt].items():
        out[key] = sample(os.path.join(base, f), x, y)
        print('%-12s %s   (from %s)' % (key, out[key], f))
    print()
    print('"palette": ' + json.dumps(out, indent=2))


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Run it and check the numbers against the photographs**

```bash
python tools/sample_palette.py --apt serenity
```

Open each source photo and confirm each sample point actually lands on the material it claims — a point that drifted onto a shadow or a highlight produces a plausible-looking hex that is simply wrong. Adjust the coordinates in `SAMPLES` and re-run until every value matches what you see.

- [ ] **Step 3: Consume the palette in materials**

In `tour/materials.js`, at the top of `init(palette)`:

```js
  function init(palette) {
    const P = palette || {};
    // every key optional; the previous hardcoded value is the fallback
    const col = (key, fallback) => {
      const v = P[key];
      if (typeof v !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(v)) return fallback;
      return parseInt(v.slice(1), 16);
    };
```

Then route the affected materials through it, for example:

```js
    M.wall = new T.MeshStandardMaterial({ color: col('wall', 0xe8e4db), roughness: 0.95 });
    M.white = new T.MeshStandardMaterial({ color: col('white', 0xf5f4f0), roughness: 0.6 });
```

For map-based materials, tint the map rather than replacing it, so grain survives:

```js
    M.floorWood = new T.MeshStandardMaterial({
      map: wood, color: col('floorWood', 0xffffff), roughness: 0.55, metalness: 0.04
    });
```

An invalid or absent value must fall through to today's constant — never throw, never render black.

- [ ] **Step 4: Add the block to the config and verify**

Paste the printed `palette` block into `tour/apartments/serenity.json`.

```js
await window.__bakeReady;
console.log('palette in config:', APT.palette);
console.log('issues:', window.__issues);
```

Expected: the block prints, and `[]`.

Then verify the fallback is real: temporarily set `"wall": "not-a-colour"` in the config, reload, and confirm the tour renders normally with the old wall tone. Remove it afterwards.

Confirm the other two apartments, which have no `palette` block at all, still render unchanged: `?apt=kings-court&check=1` and `?apt=horkyone-10&check=1` must report `[]` and look as before.

- [ ] **Step 5: Re-measure, bump the version, commit**

```js
await window.__measure();
```

```bash
python tools/delta_e.py --apt serenity --phase a5-palette
```

This is the task most likely to move the metric, because it targets colour directly and the metric measures colour. Expect the largest single drop here.

The version bump matters more here than anywhere else in the plan: this task changes `serenity.json`, and `main.js` fetches the config with the version read off its own script tag. Without the bump the browser serves the **old config** and the new palette silently never arrives. Bump `?v=` on all `<script src>` tags as the last edit, then confirm the config actually changed by comparing a field in the console against the file:

```js
console.log(APT.palette);   // must match the block you pasted into the JSON
```

```bash
git add tools/sample_palette.py tour/materials.js tour/apartments/serenity.json \
        tour/index.html docs/superpowers/metrics/serenity-a5-palette.json
git commit -m "Sample the material palette from the real photographs"
```

---

### Task 9: Close out phase A

**Files:**
- Create: `docs/superpowers/metrics/README.md`
- Modify: `CLAUDE.md`
- Modify: `tour/index.html` (final version bump)

- [ ] **Step 1: Run the full verification protocol**

Every gate, on all three apartments:

```js
await window.__bakeReady;
console.log('issues:', window.__issues);
```

Walk simulations into every room of Serenity, using the recipe in `CLAUDE.md`, asserting end coordinates. Sky-leak raycasts from each zone. Draw calls at the entrance and in two rooms, against the ≤400 desktop budget. Bake time under 3 s.

- [ ] **Step 2: Write the metrics summary**

Create `docs/superpowers/metrics/README.md` with a table of the mean ΔE2000 for each phase file in this directory, in order, plus the caveat that absolute values are meaningless and only the trend matters. State plainly whether the trend went down; if any task raised it, say which and why it was kept.

- [ ] **Step 3: Update the project documentation**

In `CLAUDE.md`: add `materials.js`, `post.js` and `measure.js` to the architecture table; record the revised draw-call budget (≤400 desktop, ≤250 mobile) and the reason it changed; add the resemblance-measurement recipe; note that furniture geometry is chamfered while walls and floors deliberately are not.

- [ ] **Step 4: Final cache bump**

Bump `?v=` on **all** `<script src>` tags in `tour/index.html` — including the new `materials.js`, `post.js` and the six `lib/` files. This must be the **last** edit before committing, or the new code caches under the old version.

Verify by comparing a field of `APT` in the console against the file on disk.

- [ ] **Step 5: Open the pull request**

```bash
git add CLAUDE.md tour/index.html docs/superpowers/metrics/README.md
git commit -m "Close out photorealism phase A: docs, metrics summary, cache bump"
git push -u origin photorealism-phase-a
```

Open a PR whose description states the mean ΔE2000 at baseline and after each task, the draw-call and bake-time numbers, what was verified, and the one documented deviation from the spec (SAO dropped in favour of the baked AO).

---

## Self-review

**Spec coverage.** A1 environment capture → Task 3. A2 chamfer → Task 4. A3 ambient occlusion, both floor contact shadows and per-vertex on furniture → Task 5. A4 post-processing → Task 6, minus SAO, deviation documented above. A5 palette from photographs → Task 8. The `materials.js` split the spec calls for → Task 2. The ΔE2000 resemblance metric with a baseline captured before any work → Task 1. Revised draw-call budget and the sub-3-second phase A bake → enforced in Tasks 3–6 and audited in Task 9.

**Task 7 is not in the spec**, and was added mid-execution on evidence produced by Task 3: the renders run about 1.2 stops brighter than the photographs, a gap that predates this work and that no spec item addressed because nobody had measured it. It is placed before the palette task because sampling photographic colour into a mis-exposed scene compounds the error instead of correcting it. Approved by the human partner before insertion. Error handling — every asset degrades to the procedural path — → Tasks 3, 6 and 7 each verify their own fallback explicitly.

Not covered here by design, and belonging to phase B: the engine migration, HDRI, KTX2 texture sets, GLTF furniture, two-bounce GI, and the render-versus-photo comparison slider in the UI. The slider is a user-facing feature rather than a rendering change; it rides on the same `compare` flag introduced in Task 1 and is planned separately.

**Placeholders.** None. Every code step carries the actual code; every verification step carries the actual command and its expected output.

**Type consistency.** `chamferBoxGeometry(w, h, d, c)` and the module-level `CHAMFER` are defined in Task 4 and used only there. `aoAt(P, N, occ, rays)` is defined in Task 5 Step 2 and used in Steps 3 and 5 with that exact signature. `Materials.init(palette)` is introduced with its final signature in Task 2 and only gains a body for `palette` in Task 7, so no call site changes. `window.__app.composer` and `window.__app.post` are produced in Task 6 and consumed by `measure.js`, which was written in Task 1 to check `a.composer` before using it — deliberately, so the harness works both before and after the chain exists.
