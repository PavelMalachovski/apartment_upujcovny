// ============================================================
// Automatic layout check. Catches the bug classes that used to
// reach users:
//   1. furniture standing in a doorway (passage physically blocked);
//   2. an opening leading into the void — no floor behind it;
//   3. a room unreachable on foot from the start point;
//   4. a photo spot or teleport point buried inside furniture
//      (a bathroom rearrangement once left a photo spot in the tub).
//
// Runs on load, reports to the console. With ?check=1 it also
// shows an issue list on top of the tour.
// ============================================================

const Validate = (() => {
  const STEP = 0.25;        // walkability grid step
  const RADIUS = 0.24;      // player radius (same as controls)
  const STEP_UP = 0.35;     // max height difference between neighbour cells

  function lvlsFor(y) {
    return y < 1.5 ? ['main', 'both'] : ['upper', 'terrace', 'both'];
  }

  // Floor height at a point; near — expected height (same as controls.groundAt)
  function groundAt(x, z, near) {
    let best = null, bestDiff = Infinity;
    for (const zn of APT.groundZones) {
      if (x < zn.x1 || x > zn.x2 || z < zn.z1 || z > zn.z2) continue;
      let y;
      if (zn.ramp) {
        const r = zn.ramp;
        const t = Math.max(0, Math.min(1, ((r.axis === 'x' ? x : z) - r.from) / (r.to - r.from)));
        y = r.y0 + t * (r.y1 - r.y0);
      } else y = zn.y;
      const diff = Math.abs(y - near);
      if (diff < bestDiff) { bestDiff = diff; best = y; }
    }
    return (best === null || bestDiff > 1.4) ? null : best;
  }

  // Is a point free of colliders on its level
  function free(x, z, y, colliders) {
    const lv = lvlsFor(y);
    for (const b of colliders.boxes) {
      if (!lv.includes(b.lvl)) continue;
      if (x > b.x1 - RADIUS && x < b.x2 + RADIUS && z > b.z1 - RADIUS && z < b.z2 + RADIUS) return false;
    }
    for (const s of colliders.segs) {
      if (!lv.includes(s.lvl)) continue;
      const dx = s.x2 - s.x1, dz = s.z2 - s.z1;
      const len2 = dx * dx + dz * dz;
      if (len2 < 1e-9) continue;
      let t = ((x - s.x1) * dx + (z - s.z1) * dz) / len2;
      t = Math.max(0, Math.min(1, t));
      const ddx = x - (s.x1 + t * dx), ddz = z - (s.z1 + t * dz);
      if (ddx * ddx + ddz * ddz < RADIUS * RADIUS) return false;
    }
    return true;
  }

  // Is a point buried inside a solid? Unlike free() this ignores the
  // player radius: standing 20 cm from a counter is fine, being inside
  // the bathtub is not. Walls are lines, so they keep a half-thickness.
  function insideSolid(x, z, y, colliders) {
    const lv = lvlsFor(y);
    for (const b of colliders.boxes) {
      if (!lv.includes(b.lvl)) continue;
      if (x > b.x1 && x < b.x2 && z > b.z1 && z < b.z2) return true;
    }
    const HALF = 0.12;
    for (const s of colliders.segs) {
      if (!lv.includes(s.lvl)) continue;
      const dx = s.x2 - s.x1, dz = s.z2 - s.z1;
      const len2 = dx * dx + dz * dz;
      if (len2 < 1e-9) continue;
      let t = ((x - s.x1) * dx + (z - s.z1) * dz) / len2;
      t = Math.max(0, Math.min(1, t));
      const ddx = x - (s.x1 + t * dx), ddz = z - (s.z1 + t * dz);
      if (ddx * ddx + ddz * ddz < HALF * HALF) return true;
    }
    return false;
  }

  // ---------- 4. Markers: photo spots and teleport points ----------
  function checkMarkers(colliders, issues) {
    const scan = (list, kind) => {
      for (const m of list || []) {
        const g = m.g || 0;
        const floor = groundAt(m.x, m.z, g);
        if (floor === null) {
          issues.push({
            kind: kind + ' off floor',
            where: m.name,
            detail: `x ${m.x}, z ${m.z} has no floor at level ${g}`
          });
          continue;
        }
        if (insideSolid(m.x, m.z, floor, colliders)) {
          issues.push({
            kind: kind + ' inside furniture',
            where: m.name,
            detail: `x ${m.x}, z ${m.z} sits inside a solid object`
          });
        }
      }
    };
    scan(APT.spawns, 'teleport point');
    scan(APT.photoSpots, 'photo spot');
  }

  // ---------- 1-2. Opening checks ----------
  function checkOpenings(colliders, issues) {
    for (const o of Builder.openings) {
      const near = o.baseY;
      // points on both sides of the opening
      const sides = [1, -1].map(s => ({
        x: o.x + o.nx * 0.55 * s,
        z: o.z + o.nz * 0.55 * s
      }));
      const grounds = sides.map(p => groundAt(p.x, p.z, near));
      if (grounds.some(g => g === null)) {
        issues.push({
          kind: 'opening into void',
          where: `x ${o.x.toFixed(1)}, z ${o.z.toFixed(1)} (${o.lvl})`,
          detail: 'no floor on one side'
        });
        continue;
      }
      // width of the widest continuous free stretch inside the opening
      const N = 12;
      let best = 0, cur = 0;
      for (let k = 0; k <= N; k++) {
        const t = (k / N - 0.5) * o.w;
        const px = o.x + o.ux * t, pz = o.z + o.uz * t;
        cur = free(px, pz, grounds[0], colliders) ? cur + 1 : 0;
        best = Math.max(best, cur);
      }
      // free() already includes the player radius: any free texel = passable
      const clear = best / N * o.w;
      if (clear < 0.08) {
        issues.push({
          kind: 'opening blocked',
          where: `x ${o.x.toFixed(1)}, z ${o.z.toFixed(1)} (${o.lvl})`,
          detail: `no free space (opening ${o.w.toFixed(2)} m)`
        });
      } else if (clear < 0.25) {
        issues.push({
          kind: 'opening narrowed',
          where: `x ${o.x.toFixed(1)}, z ${o.z.toFixed(1)} (${o.lvl})`,
          detail: `${clear.toFixed(2)} m free of ${o.w.toFixed(2)} m`
        });
      }
    }
  }

  // ---------- 3. Room reachability ----------
  function checkReachability(colliders, issues) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const z of APT.groundZones) {
      minX = Math.min(minX, z.x1); maxX = Math.max(maxX, z.x2);
      minZ = Math.min(minZ, z.z1); maxZ = Math.max(maxZ, z.z2);
    }
    const W = Math.ceil((maxX - minX) / STEP), H = Math.ceil((maxZ - minZ) / STEP);
    const seen = new Map();                      // key -> height
    // the floor level is part of the key: the same plan cell exists on two levels
    const key = (i, j, y) => (i * (H + 2) + j) * 2 + (y < 1.5 ? 0 : 1);
    const start = APT.start;
    const sy = groundAt(start.x, start.z, 0) || 0;
    const si = Math.round((start.x - minX) / STEP), sj = Math.round((start.z - minZ) / STEP);
    const queue = [[si, sj, sy]];
    seen.set(key(si, sj, sy), sy);
    window.__reach = { seen, key, minX, minZ, STEP, start: [si, sj, sy] };
    while (queue.length) {
      const [i, j, y] = queue.pop();
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni > W || nj > H) continue;
        const x = minX + ni * STEP, z = minZ + nj * STEP;
        const g = groundAt(x, z, y);
        if (g === null || Math.abs(g - y) > STEP_UP) continue;
        if (seen.has(key(ni, nj, g))) continue;
        if (!free(x, z, g, colliders)) continue;
        seen.set(key(ni, nj, g), g);
        queue.push([ni, nj, g]);
      }
    }
    // every rooms-menu point must be reachable
    for (const sp of APT.spawns) {
      const i = Math.round((sp.x - minX) / STEP), j = Math.round((sp.z - minZ) / STEP);
      // look for a reachable cell within a metre: the point itself may sit
      // right next to furniture — what matters is that the room can be reached
      let ok = false, R = 4;
      for (let di = -R; di <= R && !ok; di++) {
        for (let dj = -R; dj <= R && !ok; dj++) {
          const v = seen.get(key(i + di, j + dj, sp.g));
          if (v !== undefined && Math.abs(v - sp.g) < 0.5) ok = true;
        }
      }
      if (!ok) {
        issues.push({
          kind: 'room unreachable',
          where: sp.name,
          detail: `no walkable path from start to x ${sp.x}, z ${sp.z}`
        });
      }
    }
    return seen.size;
  }

  function run(colliders) {
    const issues = [];
    checkOpenings(colliders, issues);
    checkMarkers(colliders, issues);
    const cells = checkReachability(colliders, issues);
    if (issues.length) {
      console.group('%cLayout check: ' + issues.length + ' issue(s)', 'color:#d85c3a;font-weight:bold');
      console.table(issues);
      console.groupEnd();
    } else {
      console.log('%cLayout check: all clear (' + Builder.openings.length +
        ' openings, ' + cells + ' walkable cells)', 'color:#3a8f52;font-weight:bold');
    }
    // badge only on request — clients don't need it
    if (new URLSearchParams(location.search).get('check') === '1') {
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:14px;bottom:52px;z-index:30;max-width:420px;' +
        'background:rgba(20,22,26,0.92);color:#f2efe8;padding:12px 14px;border-radius:10px;' +
        'font:13px/1.5 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,0.5)';
      box.innerHTML = issues.length
        ? '<b style="color:#e8a05c">Layout issues (' + issues.length + ')</b><br>' +
          issues.map(i => '• ' + i.kind + ' — ' + i.where).join('<br>')
        : '<b style="color:#8fd0a0">Layout clean</b><br>' +
          Builder.openings.length + ' openings, ' + cells + ' walkable cells';
      document.body.appendChild(box);
    }
    return issues;
  }

  return { run };
})();
