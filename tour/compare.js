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
    //
    // That fixed a single open. It did not fix switching photos: only
    // firstOpen (below) ever called setSplit, so opening a second,
    // differently-shaped photo left bar.style.left at its last literal
    // pixel value while the photo box it was measured against had moved --
    // e.g. dragged to x=200 against a landscape photo spanning x 40-1240,
    // still x=200 after switching to a portrait photo spanning x 320-960,
    // now ~120px inside the LEFT letterbox instead of ~85px inside the
    // photo. The clip-path percentage stayed numerically correct (it is
    // relative to the photo's own box, which resizes itself), so bar and
    // clip-path were each individually right and mutually out of sync.
    // Fixed by keeping the split as a fraction -- ui.frac, the one piece
    // of state that survives a resize or a new photo -- and re-deriving
    // BOTH the bar position and the clip-path from it and the photo's
    // CURRENT rect every time that rect can have changed: every open
    // (layout(), called from compare() below) and every window resize
    // (listener below), not only the first open.
    const applyFrac = (f) => {
      ui.frac = f;
      const photo = root.querySelector('#cmpPhoto');
      const r = photo.getBoundingClientRect();
      photo.style.clipPath = 'inset(0 ' + ((1 - f) * 100).toFixed(2) + '% 0 0)';
      bar.style.left = Math.round(r.left + f * r.width) + 'px';
    };
    const setSplit = (x) => {
      const r = root.querySelector('#cmpPhoto').getBoundingClientRect();
      applyFrac(r.width ? Math.min(Math.max((x - r.left) / r.width, 0), 1) : 0.5);
    };
    // Re-lays out canvas + photo + bar for the current viewport against
    // the LAST CAPTURED frame (ui.W/ui.H -- the actual render resolution,
    // fixed per-open and never touched here; see the capture-vs-display
    // comment in compare()), then re-applies the current split fraction so
    // the bar ends up on the photo's new box, not the old one. This is the
    // same dispScale/dispW/dispH/offX/offY math that used to live only
    // inline in compare(), factored out so both compare() (every open) and
    // the resize listener below can run it. No-op before the first
    // successful compare() call: ui.W is still its initial falsy 0.
    const layout = () => {
      if (!ui.W) return;
      const dispScale = Math.min(1, window.innerWidth / ui.W);
      const dispW = Math.round(ui.W * dispScale);
      const dispH = Math.round(ui.H * dispScale);
      const offX = Math.round((window.innerWidth - dispW) / 2);
      const offY = Math.round((window.innerHeight - dispH) / 2);
      for (const el of [root.querySelector('#cmpRender'), root.querySelector('#cmpPhoto')]) {
        el.style.left = offX + 'px'; el.style.top = offY + 'px';
        el.style.width = dispW + 'px'; el.style.height = dispH + 'px';
      }
      // Match the bar's own extent to the letterboxed content instead of
      // the full viewport height (its `top:0;bottom:0` from build()) --
      // purely cosmetic, a divider line poking out through the black
      // letterbox bars above and below reads as a rendering glitch, not a
      // slider. Setting top+height here overrides bottom per the CSS
      // over-constrained rule (both are declared, bottom loses), no need
      // to clear it separately.
      bar.style.top = offY + 'px';
      bar.style.height = dispH + 'px';
      applyFrac(ui.frac);
    };
    bar.addEventListener('pointerdown', (e) => { dragging = true; e.preventDefault(); });
    window.addEventListener('pointerup', () => { dragging = false; });
    window.addEventListener('pointermove', (e) => { if (dragging) setSplit(e.clientX); });
    root.addEventListener('click', (e) => { if (e.target === root) setSplit(e.clientX); });
    // The only way pane geometry changes WITHOUT a new compare() call:
    // canvas/photo/bar are all sized in absolute px, not %, so root's own
    // inset:0 tracking the viewport does not move or resize them, and they
    // would otherwise sit frozen at whatever compare() last computed for a
    // since-resized window. Guarded on visibility -- layout() is harmless
    // but pointless while root is display:none (the photo rect is
    // all-zero then, same as the setSplit guard above), and there is
    // nothing to sync until the next open lays the pane out for real.
    window.addEventListener('resize', () => {
      if (root.style.display !== 'none') layout();
    });

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
      if (ui.wasDoll && app.doll) {
        app.doll.enter();
        return;
      }
      // ui.wasControlsEnabled is a snapshot of controls.enabled from the
      // moment compare() opened -- normally false, because openPhoto() in
      // app.js had already disabled it for the gallery this control lives
      // in. But the photo gallery can close itself in the meantime: its own
      // Escape handler (app.js closePhoto()) runs while this pane is still
      // covering the screen (compare.js deliberately has no Escape listener
      // of its own, see the comment above), sets photoView to display:none
      // AND controls.enabled = true, correctly, for a screen with nothing
      // open. Restoring the stale snapshot here would clobber that with
      // false, leaving nothing open on screen but the visitor unable to
      // walk -- reproduced live on serenity (Escape, then click this ✕) and
      // fixed by this check. Only trust the snapshot while the gallery it
      // was captured under is still actually open; otherwise whatever
      // already closed it also already decided the right value (true).
      const photoView = document.getElementById('photoView');
      const galleryStillOpen = !!photoView && photoView.style.display !== 'none';
      app.controls.enabled = galleryStillOpen ? ui.wasControlsEnabled : true;
    }
    root.querySelector('#cmpClose').addEventListener('click', (e) => {
      e.stopPropagation();   // else root's own listener also reads e.target and drags the split
      close();
    });

    ui = {
      root: root, setSplit: setSplit, layout: layout, close: close,
      frac: 0.5, W: 0, H: 0, wasDoll: false, wasControlsEnabled: true
    };
    // NOT u.layout() here: root is still display:none at this point (see
    // cssText above), so getBoundingClientRect() on the photo is all-zero
    // and applyFrac's (x - r.left) / r.width divides by zero -- the same
    // failure setSplit(window.innerWidth / 2) hit here before layout()
    // existed, confirmed empirically (barLeft "100%", clip-path 0% on a
    // fresh load, before any interaction: divide-by-zero -> Infinity ->
    // clamps to 1, i.e. 100% photo). ui.W is also still its initial 0, so
    // layout() would no-op even called blind. compare() below sets
    // ui.W/ui.H from the actual capture and calls u.layout() itself, once,
    // right after root is actually made visible.
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
      //
      // Stored on u (not a local const) so build()'s layout() -- run again
      // below, and from the resize listener there -- can redo this same
      // scaling later without a new capture. This is the only place either
      // is written.
      u.W = W; u.H = H;
      u.root.querySelector('#cmpLabel').textContent =
        s.file + (s.name ? ' · ' + s.name : '') +
        ' · fov ' + a.camera.fov.toFixed(1) + '° · drag the bar';
      u.root.style.display = 'block';
      // Lays out canvas + photo + bar for the current viewport (see
      // layout() in build()) and re-applies the split. Centre on the very
      // first open only, now that root is actually laid out (see the
      // comment in build() for why this can't happen there) -- later calls
      // (a different photo, __compareAll stepping through several spots,
      // or the same photo reopened after a resize) must leave the divider
      // wherever the user last dragged it, which is exactly what
      // re-applying the stored u.frac instead of resetting it to 0.5 does.
      if (firstOpen) u.frac = 0.5;
      u.layout();

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
