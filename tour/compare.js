// ============================================================
// Render-versus-photograph comparison. Loaded under ?compare=1.
//
// Renders a photo spot from that photograph's own camera and lays
// the photograph over it behind a draggable divider. This is the
// only instrument that can see the defect class the DE2000 metric
// is blind to by construction: correct colour in the wrong place.
// It found the serenity living-room window during step 0.
// ============================================================

window.__compare = (function () {
  const a = window.__app;
  let ui = null;

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
      '<canvas id="cmpRender" style="position:absolute;left:0;top:0;height:100%"></canvas>' +
      '<img id="cmpPhoto" style="position:absolute;left:0;top:0;height:100%;' +
      'object-fit:cover;clip-path:inset(0 50% 0 0)">' +
      '<div id="cmpBar" style="position:absolute;top:0;bottom:0;width:2px;' +
      'background:#fff;box-shadow:0 0 8px #000;cursor:ew-resize"></div>' +
      '<div id="cmpLabel" style="position:absolute;left:12px;top:12px;padding:6px 12px;' +
      'border-radius:14px;background:rgba(0,0,0,.7);color:#fff;' +
      'font:13px system-ui,sans-serif"></div>';
    document.body.appendChild(root);
    const bar = root.querySelector('#cmpBar');
    let dragging = false;
    const setSplit = (x) => {
      const r = root.getBoundingClientRect();
      const f = Math.min(Math.max((x - r.left) / r.width, 0), 1);
      root.querySelector('#cmpPhoto').style.clipPath =
        'inset(0 ' + ((1 - f) * 100).toFixed(2) + '% 0 0)';
      bar.style.left = (f * 100).toFixed(2) + '%';
    };
    bar.addEventListener('pointerdown', (e) => { dragging = true; e.preventDefault(); });
    window.addEventListener('pointerup', () => { dragging = false; });
    window.addEventListener('pointermove', (e) => { if (dragging) setSplit(e.clientX); });
    root.addEventListener('click', (e) => { if (e.target === root) setSplit(e.clientX); });
    ui = { root: root, setSplit: setSplit };
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
      if (a.composer) { a.composer.setSize(W, H); a.composer.render(); }
      else a.renderer.render(a.scene, a.camera);

      const cv = u.root.querySelector('#cmpRender');
      cv.width = W; cv.height = H;
      cv.getContext('2d').drawImage(a.renderer.domElement, 0, 0, W, H);
      const ph = u.root.querySelector('#cmpPhoto');
      ph.src = img.src;
      ph.style.width = W + 'px';
      cv.style.width = W + 'px';
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
