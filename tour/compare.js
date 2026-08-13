// ============================================================
// Render-versus-photograph comparison.
//
// Renders a photo spot from that photograph's own camera and lays
// the photograph over it behind a draggable divider. This is the
// only instrument that can see the defect class the DE2000 metric
// is blind to by construction: correct colour in the wrong place.
// It found the serenity living-room window during step 0.
//
// Two load paths reach this file: the acceptance/calibration harness
// (?compare=1, loaded by main.js's debug-flag loop) and the
// visitor-facing "compare with the photo" control in the photo
// gallery (app.js), which lazy-loads this file itself the first time
// someone opens a compare-eligible spot -- most visitors never do,
// so it is deliberately not part of the CLASSIC list main.js loads
// up front. Both paths end up calling the same window.__compare(file)
// defined below.
// ============================================================

window.__compare = (function () {
  const a = window.__app;
  let ui = null;

  // Photo-spot markers are scene objects (THREE.Points, one per level --
  // see app.js), so an unhidden render photographs the tour's own camera
  // icon into the frame. measure.js and refshots.js already hide them
  // during capture for the same reason; this view skipped it because it
  // started as an internal acceptance tool where the icon was a minor
  // nuisance. Now that a visitor sees this pane laid directly against the
  // real photograph -- which has no such icon in it -- leaving markers in
  // undercuts the exact trust argument the feature exists to make. Kept as
  // an independent copy rather than a shared module, matching measure.js
  // and refshots.js: the three harnesses are independently loadable and
  // none of them may depend on another (see task 2's ledger entry).
  function withMarkersHidden(fn) {
    const hidden = [];
    a.scene.traverse((o) => {
      if (o.isPoints && o.visible) { o.visible = false; hidden.push(o); }
    });
    try { return fn(); }
    finally { for (const o of hidden) o.visible = true; }
  }

  function build() {
    if (ui) return ui;
    const root = document.createElement('div');
    root.id = 'cmpRoot';
    root.style.cssText =
      'position:fixed;inset:0;z-index:99998;background:#111;display:none';
    // Canvas MUST come before the photo in source order: neither element
    // sets z-index, so plain DOM order decides stacking (verified: a later
    // sibling with no z-index always paints over an earlier one, even where
    // the earlier one's clip-path leaves it fully unclipped). The photo has
    // to be the element sitting "over" the render — clipped down to a
    // sliver where the divider says "render" and left unclipped where it
    // says "photo" — for a clipped-away region to reveal the canvas
    // beneath. Photo-before-canvas (the original order here) painted the
    // opaque, never-clipped canvas over the photo unconditionally, so the
    // photograph was never visible at any divider position — confirmed via
    // elementFromPoint at the photo side returning the canvas even with
    // clip-path at 0%.
    root.innerHTML =
      '<canvas id="cmpRender" style="position:absolute"></canvas>' +
      '<img id="cmpPhoto" style="position:absolute;' +
      'object-fit:cover;clip-path:inset(0 50% 0 0)">' +
      '<div id="cmpBar" style="position:absolute;top:0;bottom:0;width:2px;' +
      'background:#fff;box-shadow:0 0 8px #000;cursor:ew-resize"></div>' +
      '<div id="cmpLabel" style="position:absolute;left:12px;top:12px;padding:6px 12px;' +
      'border-radius:14px;background:rgba(0,0,0,.7);color:#fff;' +
      'font:13px system-ui,sans-serif"></div>' +
      '<button id="cmpClose" aria-label="Close comparison" style="position:absolute;' +
      'top:12px;right:12px;width:42px;height:42px;border:0;border-radius:50%;' +
      'cursor:pointer;background:rgba(20,22,26,0.78);color:#f2efe8;font-size:19px;' +
      'font-family:system-ui,sans-serif;display:flex;align-items:center;' +
      'justify-content:center;box-shadow:0 4px 18px rgba(0,0,0,0.4)">✕</button>';
    document.body.appendChild(root);
    const bar = root.querySelector('#cmpBar');
    let dragging = false;
    // Relative to the PHOTO's own current box, not root's. root is always
    // the full viewport, but the photo/canvas pair is only that size when
    // it happens to exactly fill the viewport -- see the display-scaling
    // comment in compare() below, added once a 375-wide viewport against a
    // landscape photo (native W computing to ~1444px) exposed this: root's
    // width and the photo's displayed width can differ by nearly 4x, so a
    // clip-path percentage (always relative to the photo's OWN box) and a
    // bar position expressed as a percentage of ROOT drift completely out
    // of sync -- the divider slid across empty letterboxed space while the
    // real clip boundary sat far off-screen, and no drag position ever
    // revealed the render at all.
    const setSplit = (x) => {
      const photo = root.querySelector('#cmpPhoto');
      const r = photo.getBoundingClientRect();
      const f = r.width ? Math.min(Math.max((x - r.left) / r.width, 0), 1) : 0.5;
      photo.style.clipPath = 'inset(0 ' + ((1 - f) * 100).toFixed(2) + '% 0 0)';
      bar.style.left = Math.round(r.left + f * r.width) + 'px';
    };
    bar.addEventListener('pointerdown', (e) => { dragging = true; e.preventDefault(); });
    window.addEventListener('pointerup', () => { dragging = false; });
    window.addEventListener('pointermove', (e) => { if (dragging) setSplit(e.clientX); });
    root.addEventListener('click', (e) => { if (e.target === root) setSplit(e.clientX); });

    // Task 1 shipped this view with no way to close it -- inert while
    // nothing but the console ever called compare() (reloading the page
    // was close enough there). The visitor control wired up in app.js
    // changes that, so close() is now the one path back out, and it owns
    // undoing everything compare() changes that outlives the single render
    // it takes: dollhouse mode (compare() unconditionally calls
    // a.doll.exit() below and, until now, never came back) and
    // controls.enabled. It does NOT touch renderer size / camera aspect /
    // pixelRatio -- those already restore themselves in compare()'s own
    // try/finally the instant the render is taken, not on close, so they
    // are correct with or without this button ever being clicked.
    //
    // Click/tap only -- no document-level Escape listener. This view can be
    // reached with the photo gallery still open underneath it, and
    // app.js's closePhoto() ALSO flips controls.enabled when the gallery
    // itself closes; a single Escape keypress would fire both document
    // handlers in the same tick with no ordering guarantee between them,
    // and whichever runs last would clobber the other's restore. A button
    // click only ever triggers this handler.
    function close() {
      root.style.display = 'none';
      const app = window.__app;
      if (!app) return;
      if (ui.wasDoll && app.doll) app.doll.enter();
      else app.controls.enabled = ui.wasControlsEnabled;
    }
    root.querySelector('#cmpClose').addEventListener('click', (e) => {
      e.stopPropagation();   // else root's own listener also reads e.target and drags the split
      close();
    });

    ui = { root: root, setSplit: setSplit, close: close, wasDoll: false, wasControlsEnabled: true };
    // NOT setSplit(window.innerWidth / 2) here: root is still display:none
    // at this point (see cssText above), and getBoundingClientRect() on a
    // display:none element is all-zero, so setSplit's (x - r.left) / r.width
    // divides by zero -> Infinity -> clamps to 1. That pinned the divider
    // at the far-right edge (100% photo, 0% render) on every first-ever
    // open, confirmed empirically (barLeft "100%", clip-path 0% on a fresh
    // load, before any interaction). Centering happens in compare() below,
    // once, right after root is actually made visible.
    return ui;
  }

  return async function compare(file) {
    const firstOpen = !ui;
    const u = build();
    const s = APT.photoSpots.find((p) => p.file === file);
    if (!s) throw new Error('no photo spot for ' + file);
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('cannot load ' + s.file));
      i.src = APT.meta.photoBase + s.file;
    });
    const H = window.innerHeight;
    const W = Math.round(H * img.naturalWidth / img.naturalHeight);

    // From here on the renderer/camera are mutated for the capture, so
    // everything that can restore them lives in `finally`: a mid-section
    // throw is not hypothetical -- reproduced while building this (a
    // transient 0x0 window mid-resize made drawImage below throw
    // InvalidStateError) -- and without try/finally that leaves the live
    // renderer at pixelRatio 1 and the capture's W x H forever, since
    // nothing here self-heals except an unrelated future browser resize
    // event. Same risk class measure.js's try/finally + restoreLiveView()
    // exists for.
    const prevRatio = a.renderer.getPixelRatio();
    const prevFov = a.camera.fov;
    try {
      const c = a.controls;
      // Captured before anything below clobbers them, so close() (see
      // build()) can put back whatever was actually live when this spot
      // was opened -- dollhouse if that is where the visitor came from,
      // otherwise just controls.enabled (false while the photo gallery
      // this control lives in is open, the same invariant openPhoto()
      // keeps in app.js).
      u.wasDoll = !!(a.doll && a.doll.on);
      u.wasControlsEnabled = c.enabled;
      if (a.doll && a.doll.on) a.doll.exit();
      c.enabled = true;
      c.pos.x = s.x; c.pos.z = s.z; c.ground = s.g || 0;
      c.yaw = s.yaw; c.pitch = 0; c.keys = {};
      c.update(0.001);

      a.renderer.setPixelRatio(1);
      a.renderer.setSize(W, H, false);
      a.camera.aspect = W / H;
      if (window.__spotFov) a.camera.fov = window.__spotFov(s, W / H);
      a.camera.updateProjectionMatrix();

      const cv = u.root.querySelector('#cmpRender');
      cv.width = W; cv.height = H;
      withMarkersHidden(() => {
        if (a.composer) { a.composer.setSize(W, H); a.composer.render(); }
        else a.renderer.render(a.scene, a.camera);
        cv.getContext('2d').drawImage(a.renderer.domElement, 0, 0, W, H);
      });
      const ph = u.root.querySelector('#cmpPhoto');
      ph.src = img.src;
      // Display size fits the render/photo pair inside the current
      // viewport, preserving the photograph's own aspect ratio -- computed
      // by hand since canvas and img are independent absolutely-positioned
      // siblings, not one element object-fit could size for us. W x H
      // above is the CAPTURE resolution and must stay locked to the
      // photograph's exact aspect ratio, or the fov comparison task 3
      // calibrated stops meaning anything -- this only scales how that
      // already-correct bitmap is displayed, never re-renders it. Needed
      // the instant viewport width is narrower than a landscape photo's
      // own W (see the long comment on setSplit above for what broke
      // without it); harmless and a no-op wherever W already fit.
      const dispScale = Math.min(1, window.innerWidth / W);
      const dispW = Math.round(W * dispScale);
      const dispH = Math.round(H * dispScale);
      const offX = Math.round((window.innerWidth - dispW) / 2);
      const offY = Math.round((window.innerHeight - dispH) / 2);
      for (const el of [cv, ph]) {
        el.style.left = offX + 'px'; el.style.top = offY + 'px';
        el.style.width = dispW + 'px'; el.style.height = dispH + 'px';
      }
      // Match the bar's own extent to the letterboxed content instead of
      // the full viewport height (its `top:0;bottom:0` from build()) --
      // purely cosmetic, a divider line poking out through the black
      // letterbox bars above and below reads as a rendering glitch, not a
      // slider. Setting top+height here overrides bottom per the CSS
      // over-constrained rule (both are declared, bottom loses), no need
      // to clear it separately. Looked up fresh (build()'s own `bar` local
      // is out of scope here, same as cv/ph above).
      const bar = u.root.querySelector('#cmpBar');
      bar.style.top = offY + 'px';
      bar.style.height = dispH + 'px';
      u.root.querySelector('#cmpLabel').textContent =
        s.file + (s.name ? ' · ' + s.name : '') +
        ' · fov ' + a.camera.fov.toFixed(1) + '° · drag the bar';
      u.root.style.display = 'block';
      // Centre the divider on the very first open, now that root is
      // actually laid out (see the comment in build() for why this can't
      // happen there). Only on firstOpen -- later calls (a different
      // photo, or __compareAll stepping through several spots) must leave
      // the divider wherever the user last dragged it.
      if (firstOpen) u.setSplit(window.innerWidth / 2);

      return { file: s.file, w: W, h: H };
    } finally {
      // Restoring pixelRatio and the fov *number* is not enough on its
      // own -- confirmed by comparing renderer/camera state before and
      // after a call on a 500x1000 window: aspect was left at 1.778 (the
      // photo's, from `a.camera.aspect = W / H` above) instead of the
      // live 0.5, and the renderer's drawing buffer stayed at the photo's
      // W x H. Both are invisible while #cmpRoot covers the canvas, but
      // neither self-heals until an actual browser resize event fires
      // `app.js`'s own resize() -- so any script that reads or renders
      // through `a.camera` / `a.renderer` right after a compare() call
      // (no page reload in between) gets a squashed, wrong-aspect result.
      // Also, fov alone was never re-applied to the projection matrix:
      // updateProjectionMatrix() was last called above with the *photo's*
      // aspect, and nothing calls it again after `a.camera.fov =
      // prevFov`, so the live camera's actual projection matrix stays the
      // compare view's until this runs. Recompute against the *current*
      // live window, not a value captured before the (awaited, so
      // potentially long) image load above -- the window can legitimately
      // have been resized in that gap.
      a.renderer.setPixelRatio(prevRatio);
      a.camera.fov = prevFov;
      const lw = window.innerWidth, lh = window.innerHeight;
      a.renderer.setSize(lw, lh, false);
      a.camera.aspect = lw / lh;
      a.camera.updateProjectionMatrix();
      if (a.composer) a.composer.setSize(lw, lh);
    }
  };
})();

window.__compareAll = async function () {
  const files = APT.photoSpots.filter((s) => s.compare).map((s) => s.file);
  for (const f of files) {
    await window.__compare(f);
    await new Promise((r) => setTimeout(r, 1500));
  }
  return files;
};
