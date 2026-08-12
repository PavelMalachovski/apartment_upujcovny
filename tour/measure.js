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
