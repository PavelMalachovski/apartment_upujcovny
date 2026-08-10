// ============================================================
// Автопроверка планировки. Ловит классы багов, которые раньше
// доезжали до пользователя:
//   1. мебель стоит в дверном проёме (проход физически закрыт);
//   2. проём ведёт в пустоту — за ним нет пола;
//   3. комната недостижима пешком от стартовой точки.
//
// Запускается при загрузке, пишет отчёт в консоль. С ?check=1
// показывает плашку со списком проблем поверх тура.
// ============================================================

const Validate = (() => {
  const STEP = 0.25;        // шаг сетки проходимости
  const RADIUS = 0.24;      // радиус игрока (как в controls)
  const STEP_UP = 0.35;     // максимальный перепад между соседними ячейками

  function lvlsFor(y) {
    return y < 1.5 ? ['main', 'both'] : ['upper', 'terrace', 'both'];
  }

  // Высота пола в точке; near — ожидаемая высота (как в controls.groundAt)
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

  // Свободна ли точка от коллайдеров на своём уровне
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

  // ---------- 1-2. Проверка проёмов ----------
  function checkOpenings(colliders, issues) {
    for (const o of Builder.openings) {
      const near = o.baseY;
      // точки по обе стороны проёма
      const sides = [1, -1].map(s => ({
        x: o.x + o.nx * 0.55 * s,
        z: o.z + o.nz * 0.55 * s
      }));
      const grounds = sides.map(p => groundAt(p.x, p.z, near));
      if (grounds.some(g => g === null)) {
        issues.push({
          kind: 'проём в пустоту',
          where: `x ${o.x.toFixed(1)}, z ${o.z.toFixed(1)} (${o.lvl})`,
          detail: 'с одной из сторон нет пола'
        });
        continue;
      }
      // ширина непрерывного свободного участка внутри проёма
      const N = 12;
      let best = 0, cur = 0;
      for (let k = 0; k <= N; k++) {
        const t = (k / N - 0.5) * o.w;
        const px = o.x + o.ux * t, pz = o.z + o.uz * t;
        cur = free(px, pz, grounds[0], colliders) ? cur + 1 : 0;
        best = Math.max(best, cur);
      }
      // free() уже учитывает радиус игрока: любой свободный тексель = проходимо
      const clear = best / N * o.w;
      if (clear < 0.08) {
        issues.push({
          kind: 'проём заблокирован',
          where: `x ${o.x.toFixed(1)}, z ${o.z.toFixed(1)} (${o.lvl})`,
          detail: `свободного места нет (проём ${o.w.toFixed(2)} м)`
        });
      } else if (clear < 0.25) {
        issues.push({
          kind: 'проём сужен',
          where: `x ${o.x.toFixed(1)}, z ${o.z.toFixed(1)} (${o.lvl})`,
          detail: `свободно ${clear.toFixed(2)} м из ${o.w.toFixed(2)} м`
        });
      }
    }
  }

  // ---------- 3. Достижимость комнат ----------
  function checkReachability(colliders, issues) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const z of APT.groundZones) {
      minX = Math.min(minX, z.x1); maxX = Math.max(maxX, z.x2);
      minZ = Math.min(minZ, z.z1); maxZ = Math.max(maxZ, z.z2);
    }
    const W = Math.ceil((maxX - minX) / STEP), H = Math.ceil((maxZ - minZ) / STEP);
    const seen = new Map();                      // key -> высота
    // этаж входит в ключ: одна и та же клетка плана существует на двух уровнях
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
    // проверяем, что каждая точка меню комнат достижима
    for (const sp of APT.spawns) {
      const i = Math.round((sp.x - minX) / STEP), j = Math.round((sp.z - minZ) / STEP);
      // ищем достижимую клетку в радиусе метра: сама точка может стоять
      // вплотную к мебели, важно, что до комнаты можно дойти
      let ok = false, R = 4;
      for (let di = -R; di <= R && !ok; di++) {
        for (let dj = -R; dj <= R && !ok; dj++) {
          const v = seen.get(key(i + di, j + dj, sp.g));
          if (v !== undefined && Math.abs(v - sp.g) < 0.5) ok = true;
        }
      }
      if (!ok) {
        issues.push({
          kind: 'комната недостижима',
          where: sp.name,
          detail: `от старта пешком не дойти до x ${sp.x}, z ${sp.z}`
        });
      }
    }
    return seen.size;
  }

  function run(colliders) {
    const issues = [];
    checkOpenings(colliders, issues);
    const cells = checkReachability(colliders, issues);
    if (issues.length) {
      console.group('%cПроверка планировки: ' + issues.length + ' проблем(ы)', 'color:#d85c3a;font-weight:bold');
      console.table(issues);
      console.groupEnd();
    } else {
      console.log('%cПроверка планировки: всё чисто (' + Builder.openings.length +
        ' проёмов, ' + cells + ' проходимых ячеек)', 'color:#3a8f52;font-weight:bold');
    }
    // плашка только по запросу — клиенту она не нужна
    if (new URLSearchParams(location.search).get('check') === '1') {
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:14px;bottom:52px;z-index:30;max-width:420px;' +
        'background:rgba(20,22,26,0.92);color:#f2efe8;padding:12px 14px;border-radius:10px;' +
        'font:13px/1.5 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,0.5)';
      box.innerHTML = issues.length
        ? '<b style="color:#e8a05c">Проблемы планировки (' + issues.length + ')</b><br>' +
          issues.map(i => '• ' + i.kind + ' — ' + i.where).join('<br>')
        : '<b style="color:#8fd0a0">Планировка чистая</b><br>' +
          Builder.openings.length + ' проёмов, ' + cells + ' проходимых ячеек';
      document.body.appendChild(box);
    }
    return issues;
  }

  return { run };
})();
