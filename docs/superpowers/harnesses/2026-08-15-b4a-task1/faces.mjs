// docs/superpowers/harnesses/2026-08-15-b4a-task1/faces.mjs
// Paste into the console at ?apt=<id>, after `await window.__bakeReady`.
//
// Two functions:
//   __faces()    — the plan's harness, verbatim. Probes at world y 0.4/1.5/2.2.
//   __facesLvl() — same probe, but lifted onto each wall's own storey. The
//                  world-y probe cannot reach a `lvl:"upper"` wall at all
//                  (kings-court's upper floor starts at y 3.1), so __faces()
//                  measures ground-level walls only. See README.md.
window.__faces = function () {
  const a = window.__app, T = window.THREE;
  const rc = new T.Raycaster();
  rc.camera = a.camera;                       // required, or sprites throw
  const TH = 0.07;                            // half of WALL_TH 0.14
  const isWall = (o) => o.userData && (o.userData.doll === 'walls1' || o.userData.doll === 'walls2');
  const walls = window.APT.walls || [];
  const out = [], totals = { near: 0, far: 0, none: 0 };

  walls.forEach((w, i) => {
    const alongX = Math.abs(w.z2 - w.z1) < 1e-6;
    // perpendicular unit vector in the ground plane
    const px = alongX ? 0 : 1, pz = alongX ? 1 : 0;
    let near = 0, far = 0, none = 0;
    // sample along the wall and up its height; openings make single probes lie
    for (const t of [0.15, 0.35, 0.5, 0.65, 0.85]) {
      const cx = w.x1 + (w.x2 - w.x1) * t, cz = w.z1 + (w.z2 - w.z1) * t;
      for (const y of [0.4, 1.5, 2.2]) {
        if (y > w.h - 0.1) continue;
        for (const s of [1, -1]) {
          const o = new T.Vector3(cx + px * s, y, cz + pz * s);
          const d = new T.Vector3(-px * s, 0, -pz * s);
          rc.set(o, d);
          const h = rc.intersectObjects(a.scene.children, true)
                      .find(h => h.object.visible && isWall(h.object));
          if (!h) { none++; continue; }
          if (Math.abs(h.distance - (1 - TH)) < 0.02) near++;
          else if (Math.abs(h.distance - (1 + TH)) < 0.02) far++;
          else none++;                        // an opening, or another wall in front
        }
      }
    }
    totals.near += near; totals.far += far; totals.none += none;
    out.push({ i, alongX, near, far, none });
  });
  return { apt: new URLSearchParams(location.search).get('apt'), walls: out, totals };
};

// Elevation-aware variant. Identical probe geometry, but every ray is lifted
// by the wall's own base -- `APT.mainFloorY` or `APT.upperFloorY`, matching
// `builder.js:201`. Also confirms the hit landed on the probed wall's own
// centreline plane rather than on some other wall that happened to sit at the
// same range, which is exactly how an upper wall stacked over a ground-floor
// one can report a false `near` under __faces().
window.__facesLvl = function () {
  const a = window.__app, T = window.THREE;
  const rc = new T.Raycaster();
  rc.camera = a.camera;
  const TH = 0.07;
  const isWall = (o) => o.userData && (o.userData.doll === 'walls1' || o.userData.doll === 'walls2');
  const walls = window.APT.walls || [];
  const out = [], totals = { near: 0, far: 0, none: 0 };

  walls.forEach((w, i) => {
    const alongX = Math.abs(w.z2 - w.z1) < 1e-6;
    const px = alongX ? 0 : 1, pz = alongX ? 1 : 0;
    const baseY = w.lvl === 'main' ? (window.APT.mainFloorY || 0) : (window.APT.upperFloorY || 0);
    let near = 0, far = 0, none = 0;
    for (const t of [0.15, 0.35, 0.5, 0.65, 0.85]) {
      const cx = w.x1 + (w.x2 - w.x1) * t, cz = w.z1 + (w.z2 - w.z1) * t;
      for (const dy of [0.4, 1.5, 2.2]) {
        if (dy > w.h - 0.1) continue;
        for (const s of [1, -1]) {
          const o = new T.Vector3(cx + px * s, baseY + dy, cz + pz * s);
          const d = new T.Vector3(-px * s, 0, -pz * s);
          rc.set(o, d);
          const h = rc.intersectObjects(a.scene.children, true)
                      .find(h => h.object.visible && isWall(h.object));
          if (!h) { none++; continue; }
          // the hit must lie on THIS wall's centreline plane, not merely at
          // the right range from some unrelated wall
          const onLine = Math.abs((alongX ? h.point.z - cz : h.point.x - cx)) < 0.09;
          if (!onLine) { none++; continue; }
          if (Math.abs(h.distance - (1 - TH)) < 0.02) near++;
          else if (Math.abs(h.distance - (1 + TH)) < 0.02) far++;
          else none++;
        }
      }
    }
    totals.near += near; totals.far += far; totals.none += none;
    out.push({ i, alongX, lvl: w.lvl, near, far, none });
  });
  return { apt: new URLSearchParams(location.search).get('apt'), walls: out, totals };
};
