// ============================================================
// Запекание света (лайтмаппер).
//
// Считает освещённость по текселям для полов, потолков и скатов
// мансарды: прямой свет ламп с проверкой видимости (мягкие тени),
// окна как площадные источники холодного света, солнце на террасе,
// постоянная составляющая переотражений. Результат — CanvasTexture,
// подключается как lightMap (uv2) к MeshBasicMaterial, так что
// запечённые поверхности не тратят GPU на динамический свет.
//
// Вход: Builder.bakeData = { occluders, lights, windows, surfaces }
//   occluder: {x1,y1,z1, x2,y2,z2}
//   light:    {x,y,z, int}
//   window:   {x,y,z, nx,nz, area, lvl}
//   surface:  {mesh, w, h, res, lvl, outdoor}
// ============================================================

const Baker = (() => {
  const T = THREE;

  // Луч p→q против набора AABB (slab-тест), t в (0.02, 0.98)
  function blocked(p, q, boxes) {
    const dx = q.x - p.x, dy = q.y - p.y, dz = q.z - p.z;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      let tmin = 0.02, tmax = 0.98;
      // X
      if (Math.abs(dx) < 1e-9) {
        if (p.x < b.x1 || p.x > b.x2) continue;
      } else {
        let t1 = (b.x1 - p.x) / dx, t2 = (b.x2 - p.x) / dx;
        if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }
      // Y
      if (Math.abs(dy) < 1e-9) {
        if (p.y < b.y1 || p.y > b.y2) continue;
      } else {
        let t1 = (b.y1 - p.y) / dy, t2 = (b.y2 - p.y) / dy;
        if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }
      // Z
      if (Math.abs(dz) < 1e-9) {
        if (p.z < b.z1 || p.z > b.z2) continue;
      } else {
        let t1 = (b.z1 - p.z) / dz, t2 = (b.z2 - p.z) / dz;
        if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }
      return true;
    }
    return false;
  }

  // Смещения для мягких теней (джиттер позиции источника)
  const JIT = [[0, 0], [0.14, -0.1], [-0.12, 0.13]];
  const SUN = { x: -0.55, y: 0.72, z: 0.42 }; // нормированное направление НА солнце
  const EXP = 1.7; // запас HDR: lightMapIntensity компенсирует

  // Освещённость точки P с нормалью N (общая для лайтмапов и вершин стен)
  const _Q = new T.Vector3();
  function lightAt(P, N, occ, data, outdoor) {
    let r, g, b;
    if (outdoor) { r = 0.66; g = 0.70; b = 0.78; }
    else { r = 0.40; g = 0.385; b = 0.36; }

    for (const L of data.lights) {
      const ddx = L.x - P.x, ddy = L.y - P.y, ddz = L.z - P.z;
      const d2 = ddx * ddx + ddy * ddy + ddz * ddz;
      if (d2 > 70) continue;
      const d = Math.sqrt(d2);
      const cos = (ddx * N.x + ddy * N.y + ddz * N.z) / d;
      if (cos <= 0) continue;
      let vis = 0;
      for (const [jx, jz] of JIT) {
        _Q.set(L.x + jx, L.y, L.z + jz);
        if (!blocked(P, _Q, occ)) vis++;
      }
      if (!vis) continue;
      const e = (L.int || 1) * 2.1 / (1 + d2 * 0.55) * cos * (vis / JIT.length);
      r += e; g += e * 0.90; b += e * 0.74;
    }

    for (const Wn of data.windows) {
      const ddx = Wn.x - P.x, ddy = Wn.y - P.y, ddz = Wn.z - P.z;
      const d2 = ddx * ddx + ddy * ddy + ddz * ddz;
      if (d2 > 55) continue;
      const d = Math.sqrt(d2);
      const cos = (ddx * N.x + ddy * N.y + ddz * N.z) / d;
      if (cos <= 0) continue;
      if ((P.x - Wn.x) * Wn.nx + (P.z - Wn.z) * Wn.nz < 0) continue;
      let vis = 0;
      for (const [jx, jz] of JIT) {
        _Q.set(Wn.x + jx * 0.5, Wn.y + jz, Wn.z + jx * 0.5 * Math.abs(Wn.nx));
        if (!blocked(P, _Q, occ)) vis++;
      }
      if (!vis) continue;
      const e = Wn.area * 0.16 / (1 + d2 * 0.5) * cos * (vis / JIT.length);
      r += e * 0.82; g += e * 0.90; b += e;
    }

    if (outdoor) {
      const cos = SUN.x * N.x + SUN.y * N.y + SUN.z * N.z;
      if (cos > 0) {
        _Q.set(P.x + SUN.x * 40, P.y + SUN.y * 40, P.z + SUN.z * 40);
        if (!blocked(P, _Q, occ)) {
          r += 0.62 * cos; g += 0.59 * cos; b += 0.52 * cos;
        }
      }
    }
    return [r, g, b];
  }

  function bakeSurface(surf, data) {
    const { mesh, w, h, res, outdoor } = surf;
    mesh.updateMatrixWorld(true);
    const mw = mesh.matrixWorld;
    const W = Math.max(4, Math.round(w * res));
    const H = Math.max(4, Math.round(h * res));
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(W, H);
    const px = img.data;

    const P = new T.Vector3(), N = new T.Vector3();
    // нормаль поверхности в мире
    N.set(0, 0, 1).transformDirection(mw);

    // предфильтр окклюдеров: рядом с bbox поверхности (с запасом высоты света)
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox.clone().applyMatrix4(mw).expandByScalar(9);
    const occ = data.occluders.filter(b =>
      b.x2 > bb.min.x && b.x1 < bb.max.x &&
      b.y2 > bb.min.y - 4 && b.y1 < bb.max.y + 4 &&
      b.z2 > bb.min.z && b.z1 < bb.max.z);

    for (let j = 0; j < H; j++) {
      // PlaneGeometry: v растёт вверх, канвас — вниз
      const v = 1 - (j + 0.5) / H;
      for (let i = 0; i < W; i++) {
        const u = (i + 0.5) / W;
        P.set((u - 0.5) * w, (v - 0.5) * h, 0).applyMatrix4(mw);
        P.x += N.x * 0.03; P.y += N.y * 0.03; P.z += N.z * 0.03;
        const [r, g, b] = lightAt(P, N, occ, data, outdoor);
        const o = (j * W + i) * 4;
        px[o] = Math.min(255, r / EXP * 255);
        px[o + 1] = Math.min(255, g / EXP * 255);
        px[o + 2] = Math.min(255, b / EXP * 255);
        px[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // лёгкое размытие убирает ступенчатость теней
    ctx.globalAlpha = 0.5;
    ctx.drawImage(canvas, 0, 0);
    ctx.globalAlpha = 1;

    const tex = new T.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
    tex.minFilter = T.LinearFilter;
    tex.magFilter = T.LinearFilter;
    mesh.material.lightMap = tex;
    mesh.material.lightMapIntensity = 1.7;
    mesh.material.needsUpdate = true;
  }

  // ---------- Стены: слитая геометрия с повершинным светом ----------
  // Все куски стен собираются в ОДИН меш (1 draw call). Каждая грань
  // сегментируется ~0.45м, в вершины пишется запечённая освещённость.
  function bakeWalls(scene, data) {
    // два ведра: стены нижнего уровня и верхнего — для среза в режиме макета
    const buckets = { low: { pos: [], nrm: [], col: [] }, high: { pos: [], nrm: [], col: [] } };
    let cur;
    const pos = { push: (...a) => cur.pos.push(...a) };
    const nrm = { push: (...a) => cur.nrm.push(...a) };
    const col = { push: (...a) => cur.col.push(...a) };
    const P = new T.Vector3(), N = new T.Vector3();
    const SEG = 0.45;
    const WEXP = 1.25; // стены не пересвечиваются — меньший HDR-запас, чем у полов

    // квадратная сетка: origin + u*uVec + v*vVec, нормаль n
    function grid(o, uVec, vVec, n, su, sv, occ, shade) {
      N.set(n[0], n[1], n[2]);
      const c = [];
      for (let j = 0; j <= sv; j++) {
        c.push([]);
        for (let i = 0; i <= su; i++) {
          P.set(
            o[0] + uVec[0] * i / su + vVec[0] * j / sv + N.x * 0.03,
            o[1] + uVec[1] * i / su + vVec[1] * j / sv + N.y * 0.03,
            o[2] + uVec[2] * i / su + vVec[2] * j / sv + N.z * 0.03
          );
          const L = shade ? lightAt(P, N, occ, data, false) : [0.5, 0.48, 0.46];
          c[j].push(L);
        }
      }
      for (let j = 0; j < sv; j++) {
        for (let i = 0; i < su; i++) {
          const pts = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j], [i + 1, j + 1], [i, j + 1]];
          for (const [ii, jj] of pts) {
            pos.push(
              o[0] + uVec[0] * ii / su + vVec[0] * jj / sv,
              o[1] + uVec[1] * ii / su + vVec[1] * jj / sv,
              o[2] + uVec[2] * ii / su + vVec[2] * jj / sv
            );
            nrm.push(N.x, N.y, N.z);
            const L = c[jj][ii];
            col.push(Math.min(1, L[0] / WEXP), Math.min(1, L[1] / WEXP), Math.min(1, L[2] / WEXP));
          }
        }
      }
    }

    for (const p of data.wallPieces) {
      cur = ((p.y1 + p.y2) / 2 < 2.55) ? buckets.low : buckets.high;
      const w = p.x2 - p.x1, h = p.y2 - p.y1, d = p.z2 - p.z1;
      const occ = data.occluders.filter(b =>
        b.x2 > p.x1 - 8 && b.x1 < p.x2 + 8 &&
        b.y2 > p.y1 - 4 && b.y1 < p.y2 + 4 &&
        b.z2 > p.z1 - 8 && b.z1 < p.z2 + 8);
      const su = Math.max(1, Math.round((p.alongX ? w : d) / SEG));
      const sv = Math.max(1, Math.round(h / SEG));
      if (p.alongX) {
        grid([p.x1, p.y1, p.z2], [w, 0, 0], [0, h, 0], [0, 0, 1], su, sv, occ, true);   // юг
        grid([p.x2, p.y1, p.z1], [-w, 0, 0], [0, h, 0], [0, 0, -1], su, sv, occ, true); // север
        // торцы (откосы) и верх/низ — по одному кваду
        grid([p.x1, p.y1, p.z1], [0, 0, d], [0, h, 0], [-1, 0, 0], 1, 1, occ, true);
        grid([p.x2, p.y1, p.z2], [0, 0, -d], [0, h, 0], [1, 0, 0], 1, 1, occ, true);
        grid([p.x1, p.y2, p.z1], [w, 0, 0], [0, 0, d], [0, 1, 0], 1, 1, occ, false);
        grid([p.x1, p.y1, p.z2], [w, 0, 0], [0, 0, -d], [0, -1, 0], 1, 1, occ, true);
      } else {
        grid([p.x2, p.y1, p.z1], [0, 0, d], [0, h, 0], [1, 0, 0], su, sv, occ, true);   // восток
        grid([p.x1, p.y1, p.z2], [0, 0, -d], [0, h, 0], [-1, 0, 0], su, sv, occ, true); // запад
        grid([p.x1, p.y1, p.z1], [w, 0, 0], [0, h, 0], [0, 0, -1], 1, 1, occ, true);
        grid([p.x2, p.y1, p.z2], [-w, 0, 0], [0, h, 0], [0, 0, 1], 1, 1, occ, true);
        grid([p.x1, p.y2, p.z1], [w, 0, 0], [0, 0, d], [0, 1, 0], 1, 1, occ, false);
        grid([p.x1, p.y1, p.z2], [w, 0, 0], [0, 0, -d], [0, -1, 0], 1, 1, occ, true);
      }
    }

    for (const [key, b] of Object.entries(buckets)) {
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(b.pos, 3));
      geo.setAttribute('normal', new T.Float32BufferAttribute(b.nrm, 3));
      geo.setAttribute('color', new T.Float32BufferAttribute(b.col, 3));
      const mat = new T.MeshBasicMaterial({ vertexColors: true, color: 0xfdfbf6 });
      const mesh = new T.Mesh(geo, mat);
      mesh.userData.doll = key === 'low' ? 'walls1' : 'walls2';
      scene.add(mesh);
    }
  }

  // Асинхронный проход, чтобы страница успевала рисоваться
  function run(scene, data, onProgress) {
    return new Promise((resolve) => {
      const list = data.surfaces.slice();
      const total = list.length + 3; // стены ~3 «шага» прогресса
      let done = 0;
      const step = () => {
        const t0 = performance.now();
        while (list.length && performance.now() - t0 < 120) {
          bakeSurface(list.shift(), data);
          done++;
        }
        if (onProgress) onProgress(done / total);
        if (list.length) { setTimeout(step, 0); return; }
        // финальный этап — стены единым мешем
        setTimeout(() => {
          bakeWalls(scene, data);
          if (onProgress) onProgress(1);
          resolve();
        }, 0);
      };
      step();
    });
  }

  return { run };
})();
