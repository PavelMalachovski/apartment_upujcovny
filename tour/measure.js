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

  // Photo-spot markers are scene objects, so a capture photographs them and
  // the scorer counts them as part of the room. Hidden for the duration of
  // each capture and restored afterwards, including on the exception path.
  function withMarkersHidden(fn) {
    const hidden = [];
    a.scene.traverse((o) => {
      if (o.isPoints && o.visible) { o.visible = false; hidden.push(o); }
    });
    try { return fn(); }
    finally { for (const o of hidden) o.visible = true; }
  }

  function renderAt(spot, W, H) {
    const c = a.controls;
    c.enabled = true;
    c.pos.x = spot.x;
    c.pos.z = spot.z;
    c.ground = spot.g || 0;
    c.yaw = spot.yaw;          // main.js has already converted to radians
    // Optional per-spot downward tilt, also already in radians. This was a
    // hard 0 until plan 4c task 1b, which made the harness unable to
    // reproduce any photograph shot looking down -- see main.js's note where
    // the conversion happens. Spots with no `pitch` are unchanged.
    c.pitch = spot.pitch || 0;
    c.update(0.001);
    // initApp sets renderer.setPixelRatio(min(devicePixelRatio, 2)), so on
    // a DPR-2 (retina) machine setSize(W, H, false) leaves
    // domElement.width/height at W*2/H*2 -- a following
    // drawImage(domElement, 0, 0) with no destination size draws at the
    // canvas's natural (device-pixel) size, so the capture canvas (sized
    // W x H below) only receives the top-left quarter of the frame. Force
    // pixel ratio to 1 for the capture so domElement is exactly W x H,
    // and restore it afterwards -- this function runs once per compare
    // spot and leaves the live view resized at the end regardless, so the
    // ratio has to come back before that final resize for the live view
    // to render at its normal density again.
    const prevRatio = a.renderer.getPixelRatio();
    const prevFov = a.camera.fov;
    a.renderer.setPixelRatio(1);
    a.renderer.setSize(W, H, false);
    a.camera.aspect = W / H;
    // ?fov=legacy reproduces the pre-fix camera (fixed 72 vertical, aspect-
    // only, no per-photograph fov): the PR #27 merge gate's thresholds
    // (serenity <=16.58, kings-court <=22.44) were themselves measured
    // under that exact camera -- see "What this means for the merge
    // condition" in docs/superpowers/metrics/README.md. Removed once, in
    // commit 0181023, on the belief task 9's gate reading was the last time
    // this would be needed; restored here because it wasn't -- plan 3
    // (docs/superpowers/plans/2026-08-13-phase-b3-light.md) re-runs this
    // same gate after every task that touches light, and each of those
    // re-runs needs this exact camera to stay comparable to the threshold.
    // Not a one-off bridge this time: a permanent capability.
    const legacyFov = new URLSearchParams(location.search).get('fov') === 'legacy';
    if (!legacyFov && window.__spotFov) a.camera.fov = window.__spotFov(spot, W / H);
    a.camera.updateProjectionMatrix();
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    withMarkersHidden(() => {
      // render through the post chain when one exists, so the score
      // reflects what a visitor actually sees
      if (a.composer) {
        a.composer.setSize(W, H);
        a.composer.render();
      } else {
        a.renderer.render(a.scene, a.camera);
      }
      cv.getContext('2d').drawImage(a.renderer.domElement, 0, 0, W, H);
    });
    a.renderer.setPixelRatio(prevRatio);
    a.camera.fov = prevFov;
    return cv.toDataURL('image/jpeg', 0.92);
  }

  // Restore the live view to a normal full-window size/aspect/pixel-ratio
  // once every spot is captured. Without this, __measure() leaves the
  // renderer at the last capture's 1024xH from renderAt() -- correct
  // pixel ratio now (the fix above restores that per-call), but still the
  // wrong canvas size -- until the next window resize event happens to
  // fire.
  function restoreLiveView() {
    const w = window.innerWidth, h = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio, a.controls.isTouch ? 1.6 : 2);
    a.renderer.setPixelRatio(ratio);
    a.renderer.setSize(w, h, false);
    a.camera.aspect = w / h;
    a.camera.updateProjectionMatrix();
    if (a.composer) a.composer.setSize(w, h);
  }

  return (async () => {
    const out = [];
    try {
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
    } finally {
      restoreLiveView();
    }
    console.log('[measure] captured ' + out.length + ' spots');
    return out;
  })();
};
