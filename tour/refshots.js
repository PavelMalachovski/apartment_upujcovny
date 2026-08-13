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
      // WalkControls.update() sets rotation.order/.y/.x from yaw/pitch but
      // never touches .z -- safe everywhere else in the app because the
      // dollhouse orbit camera's own lookAt() (doll.js update()) never
      // points straight down (orbit.pitch is clamped to [0.3, 1.45] rad,
      // never the vertical pi/2) and so never perturbs it. The doll-kind
      // branch below points the camera exactly straight down with a
      // sideways `up` for a clean plan view -- a gimbal-lock-adjacent case
      // whose lookAt() leaves a large, persistent roll in rotation.z
      // (~3.09 rad measured) that update() above does not clear. Left
      // alone, a second __refshots() call in the same page session (no
      // reload) renders every walk view rolled ~180 degrees, because the
      // previous call's doll views ran last and polluted it. Confirmed by
      // rendering two same-session captures back to back: the second
      // set's walk frames came out upside down until this line was added.
      a.camera.rotation.z = 0;
    }
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    withMarkersHidden(() => {
      // a.post.render(t), not a.composer.render(): the grain/vignette pass's
      // `time` uniform is otherwise only ever advanced by app.js's own
      // requestAnimationFrame loop (post.render(now*0.001)), which keeps
      // running in the background across our awaited fetch() calls. Two
      // captures of the identical scene taken moments apart then differ by a
      // few MAD purely from the grain dice roll, not from anything a
      // migration could regress -- confirmed by a same-session repeat
      // landing at MAD ~2.4-2.6 (just over the default 2.0 threshold) before
      // this fix. Pinning t makes repeats comparable; a real visitor still
      // sees the same grain amount, just not frozen at this instant.
      // a.post can be null (weak GPU / missing vendor files, see post.js),
      // matching the a.composer-null fallback below it.
      if (a.post) a.post.render(0);
      else if (a.composer) a.composer.render();
      else a.renderer.render(a.scene, a.camera);
      cv.getContext('2d').drawImage(a.renderer.domElement, 0, 0, W, H);
    });
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
      // Undo the same rotation.z pollution the walk branch guards against
      // above -- the sequence always ends on a doll-kind view (see views()),
      // so without this the live game loop resumes with the camera rolled
      // until the next WalkControls.update(), which never clears .z either.
      a.camera.rotation.z = 0;
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
