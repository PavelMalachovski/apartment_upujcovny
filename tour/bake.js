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

    const P = new T.Vector3(), Q = new T.Vector3(), N = new T.Vector3();
    // нормаль поверхности в мире
    N.set(0, 0, 1).transformDirection(mw);

    // предфильтр окклюдеров: рядом с bbox поверхности (с запасом высоты света)
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox.clone().applyMatrix4(mw).expandByScalar(9);
    const occ = data.occluders.filter(b =>
      b.x2 > bb.min.x && b.x1 < bb.max.x &&
      b.y2 > bb.min.y - 4 && b.y1 < bb.max.y + 4 &&
      b.z2 > bb.min.z && b.z1 < bb.max.z);

    const EXP = 1.7; // запас HDR: lightMapIntensity компенсирует

    for (let j = 0; j < H; j++) {
      // PlaneGeometry: v растёт вверх, канвас — вниз
      const v = 1 - (j + 0.5) / H;
      for (let i = 0; i < W; i++) {
        const u = (i + 0.5) / W;
        P.set((u - 0.5) * w, (v - 0.5) * h, 0).applyMatrix4(mw);
        // отступ от поверхности вдоль нормали
        P.x += N.x * 0.03; P.y += N.y * 0.03; P.z += N.z * 0.03;

        let r, g, b;
        if (outdoor) { r = 0.66; g = 0.70; b = 0.78; }       // небо на террасе
        else { r = 0.40; g = 0.385; b = 0.36; }              // переотражения в комнатах

        // --- лампы ---
        for (const L of data.lights) {
          const ddx = L.x - P.x, ddy = L.y - P.y, ddz = L.z - P.z;
          const d2 = ddx * ddx + ddy * ddy + ddz * ddz;
          if (d2 > 70) continue;
          const d = Math.sqrt(d2);
          const cos = (ddx * N.x + ddy * N.y + ddz * N.z) / d;
          if (cos <= 0) continue;
          let vis = 0;
          for (const [jx, jz] of JIT) {
            Q.set(L.x + jx, L.y, L.z + jz);
            if (!blocked(P, Q, occ)) vis++;
          }
          if (!vis) continue;
          const e = (L.int || 1) * 2.1 / (1 + d2 * 0.55) * cos * (vis / JIT.length);
          r += e; g += e * 0.90; b += e * 0.74;              // тёплый свет
        }

        // --- окна: холодный дневной свет ---
        for (const Wn of data.windows) {
          const ddx = Wn.x - P.x, ddy = Wn.y - P.y, ddz = Wn.z - P.z;
          const d2 = ddx * ddx + ddy * ddy + ddz * ddz;
          if (d2 > 55) continue;
          const d = Math.sqrt(d2);
          const cos = (ddx * N.x + ddy * N.y + ddz * N.z) / d;
          if (cos <= 0) continue;
          // приёмник должен быть с внутренней стороны окна
          if ((P.x - Wn.x) * Wn.nx + (P.z - Wn.z) * Wn.nz < 0) continue;
          let vis = 0;
          for (const [jx, jz] of JIT) {
            Q.set(Wn.x + jx * 0.5, Wn.y + jz, Wn.z + jx * 0.5 * Math.abs(Wn.nx));
            if (!blocked(P, Q, occ)) vis++;
          }
          if (!vis) continue;
          const e = Wn.area * 0.16 / (1 + d2 * 0.5) * cos * (vis / JIT.length);
          r += e * 0.82; g += e * 0.90; b += e;              // холодный свет
        }

        // --- солнце на террасе ---
        if (outdoor) {
          const cos = SUN.x * N.x + SUN.y * N.y + SUN.z * N.z;
          if (cos > 0) {
            Q.set(P.x + SUN.x * 40, P.y + SUN.y * 40, P.z + SUN.z * 40);
            if (!blocked(P, Q, occ)) {
              r += 0.62 * cos; g += 0.59 * cos; b += 0.52 * cos;
            }
          }
        }

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

  // Асинхронный проход по поверхностям, чтобы страница успевала рисоваться
  function run(data, onProgress) {
    return new Promise((resolve) => {
      const list = data.surfaces.slice();
      const total = list.length;
      let done = 0;
      const step = () => {
        const t0 = performance.now();
        while (list.length && performance.now() - t0 < 120) {
          bakeSurface(list.shift(), data);
          done++;
        }
        if (onProgress) onProgress(done / total);
        if (list.length) setTimeout(step, 0);
        else resolve();
      };
      step();
    });
  }

  return { run };
})();
