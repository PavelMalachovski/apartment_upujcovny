// ============================================================
// Scene builder: turns APT data into Three.js objects.
//
// Structure:
//   1. Procedural canvas textures: parquet, marble, fabrics, paintings
//   2. Materials (M.*) — the project's single palette
//   3. Walls with openings (doors/windows/passages) + attic slopes
//   4. Floors, ceilings, stairs, terrace
//   5. Furniture (F.*) — parametric constructors + blob shadows
//   6. Light: hemisphere + sun + per-room points
//
// Every impassable object adds a collider (segs — walls,
// boxes — furniture) with a level: 'main' | 'upper' | 'terrace' | 'both'.
// ============================================================

const Builder = (() => {
  const T = THREE;
  const colliders = { segs: [], boxes: [] }; // segs: {x1,z1,x2,z2,lvl}; boxes: {x1,z1,x2,z2,lvl}
  // Light-baking data (see bake.js)
  const bakeData = { occluders: [], lights: [], windows: [], surfaces: [], wallPieces: [] };
  // Openings (doors/passages) for the layout check: see validate.js
  const doorways = [];
  function addOccluder(cx, cy, cz, sx, sy, sz) {
    bakeData.occluders.push({
      x1: cx - sx / 2, y1: cy - sy / 2, z1: cz - sz / 2,
      x2: cx + sx / 2, y2: cy + sy / 2, z2: cz + sz / 2
    });
  }

  // ---------- Procedural textures ----------
  function canvasTex(w, h, draw, repX = 1, repY = 1) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(repX, repY);
    t.anisotropy = 4;
    return t;
  }

  function woodTex(base, dark, plank = true) {
    return canvasTex(512, 512, (g) => {
      g.fillStyle = base; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 260; i++) {
        g.strokeStyle = `rgba(120,90,60,${0.03 + Math.random() * 0.05})`;
        g.lineWidth = 1 + Math.random() * 2;
        const y = Math.random() * 512;
        g.beginPath(); g.moveTo(0, y);
        g.bezierCurveTo(170, y + Math.random() * 8 - 4, 340, y + Math.random() * 8 - 4, 512, y);
        g.stroke();
      }
      if (plank) {
        g.strokeStyle = dark; g.lineWidth = 2;
        for (let y = 0; y < 512; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
        for (let y = 32; y < 512; y += 64) {
          const x = (Math.random() * 512) | 0;
          g.beginPath(); g.moveTo(x, y - 32); g.lineTo(x, y + 32); g.stroke();
        }
      }
    });
  }

  // Parquet: boards with individual tone, seams and lively grain
  function floorTex() {
    return canvasTex(1024, 1024, (g) => {
      const rowH = 128;
      for (let y = 0; y < 1024; y += rowH) {
        let x = (y / rowH) % 2 === 0 ? 0 : -180;
        while (x < 1024) {
          const len = 260 + Math.random() * 300;
          const tone = 0.82 + Math.random() * 0.36;
          const r = Math.min(255, 184 * tone), gr = Math.min(255, 149 * tone), b = Math.min(255, 95 * tone);
          g.fillStyle = `rgb(${r | 0},${gr | 0},${b | 0})`;
          g.fillRect(x, y, len, rowH);
          // grain
          for (let i = 0; i < 26; i++) {
            g.strokeStyle = `rgba(110,80,50,${0.04 + Math.random() * 0.08})`;
            g.lineWidth = 0.8 + Math.random() * 1.6;
            const yy = y + Math.random() * rowH;
            g.beginPath();
            g.moveTo(x, yy);
            g.bezierCurveTo(x + len * 0.3, yy + (Math.random() - 0.5) * 10, x + len * 0.7, yy + (Math.random() - 0.5) * 10, x + len, yy);
            g.stroke();
          }
          // occasional knots
          if (Math.random() < 0.3) {
            g.fillStyle = 'rgba(100,70,45,0.35)';
            g.beginPath();
            g.ellipse(x + len * (0.2 + Math.random() * 0.6), y + rowH * (0.3 + Math.random() * 0.4),
              3 + Math.random() * 4, 2 + Math.random() * 2, Math.random() * Math.PI, 0, Math.PI * 2);
            g.fill();
          }
          // end seam
          g.fillStyle = 'rgba(70,50,30,0.5)';
          g.fillRect(x + len - 2, y, 2, rowH);
          x += len;
        }
        // long seam
        g.fillStyle = 'rgba(70,50,30,0.55)';
        g.fillRect(0, y + rowH - 2, 1024, 2);
      }
    });
  }

  function marbleTex(bg, vein, n = 26) {
    return canvasTex(512, 512, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, 512, 512);
      // large soft veins with blur
      for (let i = 0; i < Math.max(4, n / 4); i++) {
        g.save();
        g.shadowColor = vein.replace('A', '0.5');
        g.shadowBlur = 10 + Math.random() * 14;
        g.strokeStyle = vein.replace('A', (0.25 + Math.random() * 0.3).toFixed(2));
        g.lineWidth = 2 + Math.random() * 3.5;
        let x = Math.random() * 512, y = -20;
        g.beginPath(); g.moveTo(x, y);
        while (y < 540) {
          x += (Math.random() - 0.5) * 130; y += 60 + Math.random() * 80;
          g.lineTo(x, y);
        }
        g.stroke();
        g.restore();
      }
      // thin sharp veinlets
      for (let i = 0; i < n; i++) {
        g.strokeStyle = vein.replace('A', (0.08 + Math.random() * 0.18).toFixed(2));
        g.lineWidth = 0.5 + Math.random() * 1.2;
        let x = Math.random() * 512, y = Math.random() * 512;
        g.beginPath(); g.moveTo(x, y);
        for (let s = 0; s < 6; s++) {
          x += (Math.random() - 0.5) * 200; y += (Math.random() - 0.5) * 200;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      // tile seams
      g.strokeStyle = 'rgba(150,150,150,0.3)'; g.lineWidth = 1.5;
      g.strokeRect(0, 0, 256, 256); g.strokeRect(256, 256, 256, 256);
    });
  }

  // Abstract paintings in the spirit of the photos
  function artTex(style) {
    return canvasTex(256, 320, (g) => {
      if (style === 'warm') {
        g.fillStyle = '#ded7c9'; g.fillRect(0, 0, 256, 320);
        g.fillStyle = '#c07a33'; g.fillRect(140, 40, 90, 120);
        g.fillStyle = '#2b2b2b'; g.fillRect(60, 70, 110, 150);
        g.fillStyle = 'rgba(192,122,51,0.8)'; g.fillRect(100, 190, 100, 80);
        g.fillStyle = 'rgba(43,43,43,0.6)'; g.fillRect(170, 150, 60, 110);
      } else if (style === 'leaf') {
        g.fillStyle = '#f4f2ee'; g.fillRect(0, 0, 256, 320);
        g.strokeStyle = '#5a6b52'; g.lineWidth = 3;
        for (let i = 0; i < 7; i++) {
          const x = 50 + i * 26, len = 80 + Math.random() * 90;
          g.beginPath(); g.moveTo(x, 280);
          g.quadraticCurveTo(x + 20, 280 - len / 2, x - 10, 280 - len);
          g.stroke();
          for (let j = 0; j < 5; j++) {
            g.beginPath();
            g.ellipse(x + 4 - j * 3, 260 - j * len / 5, 8, 3, -0.6, 0, Math.PI * 2);
            g.stroke();
          }
        }
      } else { // mono
        g.fillStyle = '#e8e6e1'; g.fillRect(0, 0, 256, 320);
        g.fillStyle = '#b9bdc2'; g.beginPath(); g.ellipse(120, 130, 75, 95, 0.3, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#2e2e30'; g.beginPath(); g.ellipse(150, 180, 45, 60, -0.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.65)'; g.beginPath(); g.ellipse(110, 110, 40, 50, 0.5, 0, Math.PI * 2); g.fill();
      }
    });
  }

  // Wavy "fabric" for curtains
  function wavyPlane(w, h, mat, folds = 5) {
    const geo = new T.PlaneGeometry(w, h, 24, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, Math.sin((x / w) * folds * Math.PI * 2) * 0.05);
    }
    geo.computeVertexNormals();
    const m = new T.Mesh(geo, mat);
    return m;
  }

  function quiltTex(base, line) {
    return canvasTex(256, 256, (g) => {
      g.fillStyle = base; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = line; g.lineWidth = 3;
      for (let i = 0; i <= 256; i += 64) {
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
        g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
      }
      const grd = g.createRadialGradient(128, 128, 10, 128, 128, 180);
      grd.addColorStop(0, 'rgba(255,255,255,0.10)'); grd.addColorStop(1, 'rgba(0,0,0,0.10)');
      g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    }, 2, 2);
  }

  function rugTex(kind) {
    return canvasTex(256, 256, (g) => {
      if (kind === 'grayblue') {
        g.fillStyle = '#b9c0c4'; g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 900; i++) {
          g.fillStyle = ['#8fa3ad', '#a9b4ba', '#7d95a3', '#c7cdd1'][i % 4];
          g.globalAlpha = 0.25;
          g.fillRect(Math.random() * 256, Math.random() * 256, 20, 3);
        }
      } else {
        g.fillStyle = '#d8d4cc'; g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 700; i++) {
          g.fillStyle = ['#c9c4ba', '#e2ded6', '#bfbab0'][i % 3];
          g.globalAlpha = 0.3;
          g.fillRect(Math.random() * 256, Math.random() * 256, 16, 3);
        }
      }
      g.globalAlpha = 1;
    });
  }

  function jungleTex() {
    return canvasTex(256, 256, (g) => {
      g.fillStyle = '#22301f'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * 256, y = Math.random() * 256;
        g.fillStyle = ['#3c5232', '#54683b', '#8a7442', '#b08d4f', '#2e4429'][i % 5];
        g.globalAlpha = 0.8;
        g.beginPath();
        g.ellipse(x, y, 4 + Math.random() * 10, 12 + Math.random() * 18, Math.random() * Math.PI, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }, 2, 2);
  }

  function deckTex() {
    return canvasTex(512, 512, (g) => {
      g.fillStyle = '#8a6844'; g.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 512; y += 42) {
        g.fillStyle = `rgba(70,50,30,${0.15 + Math.random() * 0.1})`;
        g.fillRect(0, y, 512, 4);
        for (let i = 0; i < 40; i++) {
          g.strokeStyle = `rgba(60,40,25,${0.05 + Math.random() * 0.1})`;
          const yy = y + 6 + Math.random() * 30;
          g.beginPath(); g.moveTo(0, yy); g.lineTo(512, yy); g.stroke();
        }
      }
    });
  }

  // ---------- Materials ----------
  const M = {};
  function initMaterials() {
    const wood = floorTex();
    wood.repeat.set(3, 3);
    M.floorWood = new T.MeshStandardMaterial({ map: wood, roughness: 0.55, metalness: 0.04 });
    const ash = woodTex('#cdbc9f', 'rgba(150,130,105,0)', false);
    ash.repeat.set(1.2, 1.2);
    M.ash = new T.MeshStandardMaterial({ map: ash, roughness: 0.75 });
    const ashV = woodTex('#c6b394', 'rgba(150,130,105,0)', false);
    ashV.repeat.set(1.2, 1.2); ashV.rotation = Math.PI / 2;
    M.ashV = new T.MeshStandardMaterial({ map: ashV, roughness: 0.75 });
    M.wall = new T.MeshStandardMaterial({ color: 0xe8e4db, roughness: 0.95 });
    M.ceil = new T.MeshStandardMaterial({ color: 0xf7f6f2, roughness: 0.95 });
    M.marbleW = new T.MeshStandardMaterial({ map: marbleTex('#e9e9eb', 'rgba(120,125,135,A)'), roughness: 0.35 });
    M.marbleB = new T.MeshStandardMaterial({ map: marbleTex('#1a1a1e', 'rgba(220,220,225,A)', 16), roughness: 0.4 });
    M.deck = new T.MeshStandardMaterial({ map: deckTex(), roughness: 0.85 });
    M.white = new T.MeshStandardMaterial({ color: 0xf5f4f0, roughness: 0.6 });
    M.counter = new T.MeshStandardMaterial({ map: marbleTex('#eceded', 'rgba(140,140,145,A)', 14), roughness: 0.3 });
    M.black = new T.MeshStandardMaterial({ color: 0x17171a, roughness: 0.5 });
    M.tv = new T.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.25, metalness: 0.4 });
    M.chrome = new T.MeshStandardMaterial({ color: 0xd8dadf, roughness: 0.25, metalness: 0.9 });
    M.glass = new T.MeshStandardMaterial({ color: 0xcfe4ea, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22, side: T.DoubleSide });
    M.winGlass = new T.MeshStandardMaterial({ color: 0xcfe2ee, emissive: 0x9fc4dd, emissiveIntensity: 0.4, roughness: 0.2, transparent: true, opacity: 0.9, side: T.DoubleSide });
    M.cream = new T.MeshStandardMaterial({ color: 0xe6e0d4, roughness: 0.9 });
    M.navy = new T.MeshStandardMaterial({ color: 0x233054, roughness: 0.85 });
    M.navyQuilt = new T.MeshStandardMaterial({ map: quiltTex('#26334f', 'rgba(10,16,30,0.8)'), roughness: 0.85 });
    M.beigeQuilt = new T.MeshStandardMaterial({ map: quiltTex('#cec0ab', 'rgba(150,135,110,0.8)'), roughness: 0.9 });
    M.sage = new T.MeshStandardMaterial({ color: 0x8d968a, roughness: 0.9 });
    M.taupe = new T.MeshStandardMaterial({ color: 0x9b8d7c, roughness: 0.9 });
    M.graybrown = new T.MeshStandardMaterial({ color: 0x7a7168, roughness: 0.9 });
    M.blueFab = new T.MeshStandardMaterial({ color: 0x51617a, roughness: 0.9 });
    M.gray = new T.MeshStandardMaterial({ color: 0x9aa0a3, roughness: 0.9 });
    M.bedding = new T.MeshStandardMaterial({ color: 0xfbfaf7, roughness: 0.95 });
    M.blanket = new T.MeshStandardMaterial({ color: 0xcfc4b0, roughness: 0.95 });
    M.rugGB = new T.MeshStandardMaterial({ map: rugTex('grayblue'), roughness: 1 });
    M.rugL = new T.MeshStandardMaterial({ map: rugTex('light'), roughness: 1 });
    M.jungle = new T.MeshStandardMaterial({ map: jungleTex(), roughness: 0.95 });
    M.metalBlack = new T.MeshStandardMaterial({ color: 0x222226, roughness: 0.4, metalness: 0.7 });
    M.rattan = new T.MeshStandardMaterial({ map: woodTex('#5a452e', 'rgba(30,20,10,0.6)', false), roughness: 0.95 });
    M.fenceWood = new T.MeshStandardMaterial({ map: woodTex('#a58757', 'rgba(60,45,25,0.4)', false), roughness: 0.95 });
    M.plantGreen = new T.MeshStandardMaterial({ color: 0x4f7042, roughness: 0.95, side: T.DoubleSide });
    M.pot = new T.MeshStandardMaterial({ color: 0xefefec, roughness: 0.8 });
    M.curtainBeige = new T.MeshStandardMaterial({ color: 0xc4b49e, roughness: 1, side: T.DoubleSide });
    M.curtainGreen = new T.MeshStandardMaterial({ color: 0x2f5044, roughness: 1, side: T.DoubleSide });
    M.curtainGray = new T.MeshStandardMaterial({ color: 0x9a9da0, roughness: 1, side: T.DoubleSide });
    M.doorWood = new T.MeshStandardMaterial({ map: woodTex('#d5c8b2', 'rgba(150,130,105,0)', false), roughness: 0.7 });
    M.lampShade = new T.MeshStandardMaterial({ color: 0xf5f2ea, emissive: 0xffe8c0, emissiveIntensity: 0.5, roughness: 0.9 });
    M.smoke = new T.MeshStandardMaterial({ color: 0x8f9298, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 });
    // decor
    M.yellow = new T.MeshStandardMaterial({ color: 0xd0a23f, roughness: 0.9 });
    M.olive = new T.MeshStandardMaterial({ color: 0xa8a06b, roughness: 0.9 });
    M.lightBlue = new T.MeshStandardMaterial({ color: 0xaebfc7, roughness: 0.9 });
    M.pink = new T.MeshStandardMaterial({ color: 0xd8a0a8, roughness: 0.9 });
    M.knit = new T.MeshStandardMaterial({ color: 0x8e9499, roughness: 1 });
    M.pampas = new T.MeshStandardMaterial({ color: 0xcbb493, roughness: 1, side: T.DoubleSide });
    M.stemGreen = new T.MeshStandardMaterial({ color: 0x476b3f, roughness: 0.9 });
    M.amberGlass = new T.MeshStandardMaterial({ color: 0x9a6a2f, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.75 });
    M.artFrame = new T.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.6 });
    M.clearGlass = new T.MeshStandardMaterial({ color: 0xe8f0f2, roughness: 0.05, metalness: 0.05, transparent: true, opacity: 0.35, side: T.DoubleSide });
  }

  // ---------- Helpers ----------
  function box(w, h, d, mat, x, y, z, group, rotY = 0) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (rotY) m.rotation.y = rotY;
    group.add(m);
    return m;
  }
  function cyl(rt, rb, h, mat, x, y, z, group, seg = 20) {
    const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  }
  function addBoxCollider(x, z, w, d, lvl, rot = 0) {
    if (rot % Math.PI !== 0 && Math.abs(rot % (Math.PI / 2)) > 0.01) {
      const r = Math.max(w, d) / 2;
      colliders.boxes.push({ x1: x - r, z1: z - r, x2: x + r, z2: z + r, lvl });
    } else {
      const sw = (Math.abs(Math.sin(rot)) > 0.5) ? d : w;
      const sd = (Math.abs(Math.sin(rot)) > 0.5) ? w : d;
      colliders.boxes.push({ x1: x - sw / 2, z1: z - sd / 2, x2: x + sw / 2, z2: z + sd / 2, lvl });
    }
  }

  // Attic ceiling height (above the upper floor) at point z
  function atticH(z) {
    const a = APT.attic;
    if (z <= a.ridgeZ) {
      const t = (z - a.northZ) / (a.ridgeZ - a.northZ);
      return a.northH + t * (a.ridgeH - a.northH);
    }
    const t = (z - a.ridgeZ) / (a.southZ - a.ridgeZ);
    return a.ridgeH - t * (a.ridgeH - a.southH);
  }

  // ---------- Walls ----------
  const WALL_TH = 0.14;
  const DOOR_H = 2.05, PASS_H = 2.2, WIN_SILL = 0.85, WIN_HEAD = 2.45;

  function curtainColorFor(lvl, cx) {
    if (lvl !== 'main') return null;
    if (cx < 7.4) return M.curtainGreen;
    if (cx < 11.4) return M.curtainGray;
    if (cx < 18.2) return M.curtainBeige;
    return null;
  }

  function buildWall(scene, w) {
    const dx = w.x2 - w.x1, dz = w.z2 - w.z1;
    const L = Math.hypot(dx, dz);
    const ang = Math.atan2(dz, dx);
    const ux = dx / L, uz = dz / L;
    const baseY = w.lvl === 'main' ? APT.mainFloorY : APT.upperFloorY;
    const isUpper = w.lvl === 'upper';
    const openings = (w.openings || []).slice().sort((a, b) => a.at - b.at);

    // Split into solid pieces
    let cursor = 0;
    const pieces = [];
    for (const o of openings) {
      if (o.at > cursor) pieces.push({ from: cursor, to: o.at, solid: true });
      pieces.push({ from: o.at, to: o.at + o.w, opening: o });
      cursor = o.at + o.w;
    }
    if (cursor < L) pieces.push({ from: cursor, to: L, solid: true });

    const segMat = M.wall;
    function place(from, to, y0, y1) {
      const len = to - from;
      if (len <= 0.01 || y1 - y0 <= 0.01) return null;
      const cx = w.x1 + ux * (from + len / 2);
      const cz = w.z1 + uz * (from + len / 2);
      const cy = baseY + (y0 + y1) / 2;
      // walls are axis-aligned: register an AABB piece; Baker builds
      // and bakes the meshes (merged geometry with per-vertex light)
      const alongX = Math.abs(ux) > 0.5;
      const sx = alongX ? len : WALL_TH, sz = alongX ? WALL_TH : len;
      addOccluder(cx, cy, cz, sx, y1 - y0, sz);
      bakeData.wallPieces.push({
        x1: cx - sx / 2, y1: cy - (y1 - y0) / 2, z1: cz - sz / 2,
        x2: cx + sx / 2, y2: cy + (y1 - y0) / 2, z2: cz + sz / 2,
        alongX
      });
      return null;
    }
    // Wall piece under the attic slope (upper level): cut into strips
    // Upper part of a wall (above an opening) respecting the attic slope
    function placeTop(from, to, y0, flatTop, mat) {
      if (!isUpper) { place(from, to, y0, flatTop, mat); return; }
      // coarse step: the wall overlaps the slope outside; inside only the slope shows
      const step = 0.6;
      for (let s = from; s < to; s += step) {
        const e = Math.min(s + step, to);
        const hA = atticH(w.z1 + uz * s), hB = atticH(w.z1 + uz * e);
        const hh = Math.min(w.h, Math.max(hA, hB) + 0.02);
        if (hh > y0) place(s, e, y0, hh, mat);
      }
    }
    function placeClamped(from, to, mat) {
      if (!isUpper) { place(from, to, 0, w.h, mat); return; }
      // coarse step: the wall overlaps the slope outside; inside only the slope shows
      const step = 0.6;
      for (let s = from; s < to; s += step) {
        const e = Math.min(s + step, to);
        // take the max height over the span so the wall covers the slope without gaps
        const hA = atticH(w.z1 + uz * s), hB = atticH(w.z1 + uz * e);
        const hh = Math.min(w.h, Math.max(0.0, Math.max(hA, hB) + 0.02));
        place(s, e, 0, hh, mat);
      }
    }

    const colLvl = (w.h && w.h > 4) ? 'both' : w.lvl;
    for (const p of pieces) {
      if (p.solid) {
        placeClamped(p.from, p.to, segMat);
        colliders.segs.push({
          x1: w.x1 + ux * p.from, z1: w.z1 + uz * p.from,
          x2: w.x1 + ux * p.to, z2: w.z1 + uz * p.to, lvl: colLvl
        });
        continue;
      }
      const o = p.opening;
      const midZ = w.z1 + uz * ((p.from + p.to) / 2);
      const topH = isUpper ? Math.min(w.h, atticH(midZ) - 0.01) : w.h;
      if (o.type === 'win') {
        // sill + lintel + glass + frame
        place(p.from, p.to, 0, WIN_SILL, segMat);
        placeTop(p.from, p.to, Math.min(WIN_HEAD, topH), topH, segMat);
        const winTop = Math.min(WIN_HEAD, topH - 0.05);
        const cx = w.x1 + ux * ((p.from + p.to) / 2);
        const cz = w.z1 + uz * ((p.from + p.to) / 2);
        const g = new T.Mesh(new T.PlaneGeometry(o.w - 0.08, winTop - WIN_SILL - 0.08), M.winGlass);
        g.position.set(cx, baseY + (WIN_SILL + winTop) / 2, cz);
        g.rotation.y = -ang;
        scene.add(g);
        // frame
        const fr = new T.Mesh(new T.BoxGeometry(o.w, winTop - WIN_SILL, 0.06), M.white);
        fr.position.copy(g.position); fr.rotation.y = -ang;
        const inner = new T.Mesh(new T.BoxGeometry(o.w - 0.12, winTop - WIN_SILL - 0.12, 0.09), M.winGlass);
        inner.position.copy(g.position); inner.rotation.y = -ang;
        scene.add(fr); scene.add(inner);
        // mullion
        const mull = new T.Mesh(new T.BoxGeometry(0.05, winTop - WIN_SILL - 0.1, 0.1), M.white);
        mull.position.copy(g.position); mull.rotation.y = -ang; scene.add(mull);
        // a window is an area daylight source for baking
        {
          // normal points into the room: toward the floor centre
          const roomC = w.lvl === 'main' ? { x: 12, z: 3.2 } : { x: 10, z: 2.5 };
          let nx = uz, nz = -ux;
          if ((roomC.x - cx) * nx + (roomC.z - cz) * nz < 0) { nx = -nx; nz = -nz; }
          bakeData.windows.push({
            x: cx + nx * 0.1, y: baseY + (WIN_SILL + winTop) / 2, z: cz + nz * 0.1,
            nx, nz, area: o.w * (winTop - WIN_SILL), lvl: w.lvl
          });
        }
        // curtains
        const cc = w.ext && Math.abs(uz) < 0.5 && w.z1 > 5 ? curtainColorFor(w.lvl, cx) : null;
        if (cc) {
          for (const side of [-1, 1]) {
            const px = cx + ux * side * (o.w / 2 + 0.14);
            const pz = cz + uz * side * (o.w / 2 + 0.14);
            const cur = wavyPlane(0.55, topH - 0.18, cc, 5);
            cur.position.set(px - Math.sin(ang) * 0.2, baseY + (topH - 0.18) / 2 + 0.06, pz - Math.cos(ang) * 0.2);
            cur.rotation.y = -ang;
            scene.add(cur);
          }
          // curtain rod
          const rod = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, o.w + 1.5, 8), M.metalBlack);
          rod.rotation.z = Math.PI / 2;
          rod.rotation.y = -ang;
          rod.position.set(cx - Math.sin(ang) * 0.2, baseY + topH - 0.06, cz - Math.cos(ang) * 0.2);
          scene.add(rod);
        }
        // windows are impassable
        colliders.segs.push({
          x1: w.x1 + ux * p.from, z1: w.z1 + uz * p.from,
          x2: w.x1 + ux * p.to, z2: w.z1 + uz * p.to, lvl: colLvl
        });
      } else {
        // door or passage: lintel above
        const hh = o.type === 'door' ? DOOR_H : PASS_H;
        placeTop(p.from, p.to, Math.min(hh, topH), topH, segMat);
        const cx = w.x1 + ux * ((p.from + p.to) / 2);
        const cz = w.z1 + uz * ((p.from + p.to) / 2);
        if (!o.entrance) {
          doorways.push({
            x: cx, z: cz, w: o.w, type: o.type, lvl: w.lvl,
            nx: uz, nz: -ux,                 // wall normal
            ux, uz, baseY                    // direction along the wall and floor level
          });
        }
        if (o.type === 'door') {
          // door frame
          for (const side of [-1, 1]) {
            const jx = w.x1 + ux * (p.from + (side < 0 ? 0.02 : o.w - 0.02));
            const jz = w.z1 + uz * (p.from + (side < 0 ? 0.02 : o.w - 0.02));
            const jamb = new T.Mesh(new T.BoxGeometry(0.06, hh, WALL_TH + 0.06), M.white);
            jamb.position.set(jx, baseY + hh / 2, jz);
            jamb.rotation.y = -ang;
            scene.add(jamb);
          }
          if (o.entrance) {
            // the entrance door stays closed
            const leaf = new T.Mesh(new T.BoxGeometry(o.w - 0.08, hh - 0.05, 0.06), M.doorWood);
            leaf.position.set(cx, baseY + hh / 2, cz);
            leaf.rotation.y = -ang;
            scene.add(leaf);
            colliders.segs.push({
              x1: w.x1 + ux * p.from, z1: w.z1 + uz * p.from,
              x2: w.x1 + ux * p.to, z2: w.z1 + uz * p.to, lvl: colLvl
            });
          }
          // interior door leaves are not rendered: openings read as open
        }
        if (o.slider) {
          // sliding panel, fully parked beside the opening
          const park = p.from - o.w * 0.42;
          const sx = w.x1 + ux * park;
          const sz = w.z1 + uz * park;
          const ph = (o.type === 'door' ? DOOR_H : PASS_H) + 0.2;
          const panel = new T.Mesh(new T.BoxGeometry(o.w * 0.8, ph, 0.05), M.ashV);
          panel.position.set(sx - Math.sin(ang) * (WALL_TH / 2 + 0.06), baseY + ph / 2, sz - Math.cos(ang) * (WALL_TH / 2 + 0.06));
          panel.rotation.y = -ang;
          scene.add(panel);
        }
      }
    }
  }

  // ---------- Floors, ceilings (with bakeable overlays) ----------
  const albedoCache = {};
  function bakedPlane(scene, cx, cy, cz, w, h, rotX, matKey, res, lvl, outdoor, tile) {
    // overlay with uv2 and its own albedo; Baker assigns the lightMap
    let mat;
    if (matKey === 'white') {
      mat = new T.MeshBasicMaterial({ color: 0xf3f2ee });
    } else {
      const key = matKey + '|' + Math.round(w / tile * 4) + '|' + Math.round(h / tile * 4);
      if (!albedoCache[key]) {
        const src = { wood: M.floorWood, marbleW: M.marbleW, deck: M.deck }[matKey];
        const map = src.map.clone();
        map.needsUpdate = true;
        map.repeat.set(w / tile, h / tile);
        albedoCache[key] = map;
      }
      mat = new T.MeshBasicMaterial({ map: albedoCache[key] });
    }
    const geo = new T.PlaneGeometry(w, h);
    geo.setAttribute('uv2', new T.BufferAttribute(geo.attributes.uv.array.slice(), 2));
    const mesh = new T.Mesh(geo, mat);
    mesh.rotation.x = rotX;
    mesh.position.set(cx, cy, cz);
    mesh.userData.baked = 1; // don't merge: it has its own lightMap
    scene.add(mesh);
    bakeData.surfaces.push({ mesh, w, h, res, lvl, outdoor });
    return mesh;
  }

  function buildFloors(scene) {
    const matOf = { wood: M.floorWood, marbleW: M.marbleW, deck: M.deck };
    const tiles = { wood: 4.2, marbleW: 2.2, deck: 3.2 };
    for (const [lvlName, list] of Object.entries(APT.floors)) {
      const y = lvlName === 'main' ? APT.mainFloorY : lvlName === 'upper' ? APT.upperFloorY : APT.terraceY;
      for (const f of list) {
        const w = f.x2 - f.x1, d = f.z2 - f.z1;
        const mesh = new T.Mesh(new T.BoxGeometry(w, 0.1, d), matOf[f.mat]);
        const yy = f.over ? y + 0.012 : y;
        mesh.position.set((f.x1 + f.x2) / 2, yy - 0.05, (f.z1 + f.z2) / 2);
        scene.add(mesh);
        // the inter-floor slab blocks light
        addOccluder((f.x1 + f.x2) / 2, yy - 0.05, (f.z1 + f.z2) / 2, w, 0.1, d);
        // bakeable overlay on top
        bakedPlane(scene, (f.x1 + f.x2) / 2, yy + 0.004, (f.z1 + f.z2) / 2,
          w, d, -Math.PI / 2, f.mat, f.mat === 'wood' ? 9 : 7,
          lvlName, lvlName === 'terrace', tiles[f.mat]);
      }
    }
    // Ground-floor ceilings
    const ceilRects = APT.mainCeil;
    for (const c of ceilRects) {
      const w = c.x2 - c.x1, d = c.z2 - c.z1;
      const mesh = new T.Mesh(new T.BoxGeometry(w, 0.08, d), M.ceil);
      mesh.position.set((c.x1 + c.x2) / 2, APT.mainCeilH + 0.04, (c.z1 + c.z2) / 2);
      scene.add(mesh);
      addOccluder((c.x1 + c.x2) / 2, APT.mainCeilH + 0.04, (c.z1 + c.z2) / 2, w, 0.08, d);
      // bakeable overlay underneath
      bakedPlane(scene, (c.x1 + c.x2) / 2, APT.mainCeilH - 0.004, (c.z1 + c.z2) / 2,
        w, d, Math.PI / 2, 'white', 5, 'main', false, 1);
    }

    // Attic ceiling: two bakeable slopes
    const a = APT.attic, y0 = APT.upperFloorY;
    const x1 = 3.9, x2 = 17.2;
    function slope(zA, hA, zB, hB) {
      const len = Math.hypot(zB - zA, hB - hA) + 0.3;
      const geo = new T.PlaneGeometry(x2 - x1, len);
      geo.setAttribute('uv2', new T.BufferAttribute(geo.attributes.uv.array.slice(), 2));
      const mat = new T.MeshBasicMaterial({ color: 0xf3f2ee, side: T.DoubleSide });
      const mesh = new T.Mesh(geo, mat);
      const zM = (zA + zB) / 2, hM = (hA + hB) / 2;
      mesh.position.set((x1 + x2) / 2, y0 + hM, zM);
      const pitch = Math.atan2(hB - hA, zB - zA);
      // π/2 - pitch: the plane normal faces down into the room (matters for baking)
      mesh.rotation.x = Math.PI / 2 - pitch;
      mesh.userData.baked = 1;
      scene.add(mesh);
      bakeData.surfaces.push({ mesh, w: x2 - x1, h: len, res: 5, lvl: 'upper', outdoor: false });
    }
    slope(a.northZ, a.northH, a.ridgeZ, a.ridgeH);
    slope(a.ridgeZ, a.ridgeH, a.southZ, a.southH);
  }

  // ---------- Stairs ----------
  // lowX/highX set the climb direction (bottom -> top). Without them —
  // legacy behaviour: bottom at x2, climbing west.
  function buildStairs(scene) {
    const s = APT.stairs;
    const lowX = (s.lowX !== undefined) ? s.lowX : s.x2;
    const highX = (s.highX !== undefined) ? s.highX : s.x1;
    const run = Math.abs(highX - lowX);
    const dir = Math.sign(highX - lowX);
    const n = 17, tread = run / n, riser = s.rise / n;
    const width = s.z2 - s.z1;
    const zc = (s.z1 + s.z2) / 2;
    for (let i = 0; i < n; i++) {
      const x = lowX + dir * tread * (i + 0.5);
      const y = riser * (i + 1);
      box(tread, riser, width, M.floorWood, x, y - riser / 2, zc, scene);
    }
    // the stairs as an occluder: 4 stepped blocks
    for (let k = 0; k < 4; k++) {
      const xa = lowX + dir * run * k / 4, xb = lowX + dir * run * (k + 1) / 4;
      addOccluder((xa + xb) / 2, s.rise * (k + 1) / 8, zc,
        Math.abs(xb - xa), s.rise * (k + 1) / 4, width);
    }
    // handrail along the south edge
    const railY = 0.95;
    for (let i = 0; i <= n; i += 2) {
      const x = lowX + dir * tread * i;
      const y = riser * i;
      cyl(0.015, 0.015, railY, M.metalBlack, x, y + railY / 2, s.z2 - 0.05, scene, 8);
    }
    const rail = new T.Mesh(new T.BoxGeometry(Math.hypot(run, s.rise) + 0.3, 0.04, 0.06), M.ash);
    rail.position.set((lowX + highX) / 2, s.rise / 2 + railY, s.z2 - 0.05);
    rail.rotation.z = Math.atan2(s.rise, run * dir);
    scene.add(rail);
  }

  // ---------- Terrace fence and surroundings ----------
  function buildTerrace(scene) {
    const t = APT.floors.terrace[0];
    const y = APT.terraceY;
    // slatted fence
    function fence(x1, z1, x2, z2) {
      const L = Math.hypot(x2 - x1, z2 - z1);
      const ang = Math.atan2(z2 - z1, x2 - x1);
      const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
      for (let i = 0; i < 13; i++) {
        const m = new T.Mesh(new T.BoxGeometry(L, 0.11, 0.03), M.fenceWood);
        m.position.set(cx, y + 0.16 + i * 0.125, cz);
        m.rotation.y = -ang;
        scene.add(m);
      }
      const nPosts = Math.max(2, Math.round(L / 1.6) + 1);
      for (let i = 0; i < nPosts; i++) {
        const f = i / (nPosts - 1);
        cyl(0.04, 0.04, 1.75, M.fenceWood, x1 + (x2 - x1) * f, y + 0.875, z1 + (z2 - z1) * f, scene, 8);
      }
      colliders.segs.push({ x1, z1, x2, z2, lvl: 'terrace' });
    }
    fence(t.x1, t.z1, t.x2 - 0.9, t.z1);       // north (up to the house)
    fence(t.x1, t.z1, t.x1, t.z2);             // west
    fence(t.x1, t.z2, t.x2, t.z2);             // south
    // step by the door
    const st = APT.terraceSteps;
    box(0.8, 0.12, st.z2 - st.z1, M.deck, st.doorX - 0.4, y + 0.06, (st.z1 + st.z2) / 2, scene);
    // surroundings: neighbouring roofs
    const bldg = new T.MeshStandardMaterial({ color: 0xcbb9a4, roughness: 0.95 });
    const bldg2 = new T.MeshStandardMaterial({ color: 0xb5a08c, roughness: 0.95 });
    box(16, 7.0, 7, bldg, -5, y + 1.2, -7, scene);
    box(12, 5.5, 6, bldg2, -9, y + 0.4, 10, scene);
    box(9, 4.2, 14, bldg, -11, y, 1, scene);
    box(11, 6.0, 6, bldg2, 9, y + 0.6, -11, scene);
    addOccluder(-5, y + 1.2, -7, 16, 7.0, 7);
    addOccluder(-9, y + 0.4, 10, 12, 5.5, 6);
    addOccluder(-11, y, 1, 9, 4.2, 14);
    // chimneys
    box(0.8, 1.8, 0.8, bldg2, -3.6, y + 5.6, -4.6, scene);
    box(0.6, 1.4, 0.6, bldg, -6.5, y + 3.9, 9.0, scene);
  }

  // ---------- Furniture ----------
  const F = {};

  // ---------- Decor ----------
  const artCache = {};
  F.painting = (o, g) => {
    const w = o.w || 0.8, h = o.h || 1.0;
    box(w + 0.07, h + 0.07, 0.035, o.light ? M.white : M.artFrame, 0, 1.55, 0, g);
    if (!artCache[o.style]) artCache[o.style] = new T.MeshStandardMaterial({ map: artTex(o.style), roughness: 0.9 });
    const art = new T.Mesh(new T.PlaneGeometry(w, h), artCache[o.style]);
    art.position.set(0, 1.55, 0.022);
    g.add(art);
    return { noCollide: true };
  };

  F.books = (o, g) => {
    const y = o.h || 0;
    const n = o.n || 5;
    for (let i = 0; i < n; i++) {
      const bh = 0.16 + Math.random() * 0.08;
      const mat = [M.navy, M.olive, M.pink, M.gray, M.artFrame][i % 5];
      box(0.028, bh, 0.13, mat, -0.09 + i * 0.033, y + bh / 2, 0, g);
    }
    if (o.candle) {
      cyl(0.032, 0.032, 0.09, M.amberGlass, 0.15, y + 0.045, 0.02, g, 10);
    }
    return { noCollide: true };
  };

  F.vaseFlowers = (o, g) => {
    const y = o.h || 0;
    const kind = o.kind || 'gerbera';
    if (kind === 'pampas') {
      cyl(0.07, 0.05, 0.32, M.amberGlass, 0, y + 0.16, 0, g, 12);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const stem = cyl(0.004, 0.004, 0.7, M.pampas, Math.cos(a) * 0.03, y + 0.6, Math.sin(a) * 0.03, g, 5);
        stem.rotation.z = Math.cos(a) * 0.22; stem.rotation.x = Math.sin(a) * 0.22;
        const plume = new T.Mesh(new T.ConeGeometry(0.045, 0.3, 7), M.pampas);
        plume.position.set(Math.cos(a) * 0.14, y + 0.98, Math.sin(a) * 0.14);
        plume.rotation.z = Math.cos(a) * 0.22; plume.rotation.x = Math.sin(a) * 0.22;
        g.add(plume);
      }
    } else if (kind === 'lily') {
      cyl(0.05, 0.04, 0.26, M.clearGlass, 0, y + 0.13, 0, g, 12);
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        cyl(0.004, 0.004, 0.34, M.stemGreen, Math.cos(a) * 0.02, y + 0.36, Math.sin(a) * 0.02, g, 5);
        const fl = new T.Mesh(new T.ConeGeometry(0.05, 0.09, 6, 1, true), M.white);
        fl.position.set(Math.cos(a) * 0.08, y + 0.55, Math.sin(a) * 0.08);
        fl.rotation.x = Math.PI + Math.sin(a) * 0.4;
        fl.rotation.z = Math.cos(a) * 0.4;
        g.add(fl);
      }
    } else if (kind === 'roses') {
      cyl(0.045, 0.035, 0.16, M.pink, 0, y + 0.08, 0, g, 12);
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2 + 0.4;
        cyl(0.003, 0.003, 0.2, M.stemGreen, Math.cos(a) * 0.02, y + 0.24, Math.sin(a) * 0.02, g, 5);
        const bud = new T.Mesh(new T.SphereGeometry(0.028, 8, 6), M.pink);
        bud.position.set(Math.cos(a) * 0.05, y + 0.35, Math.sin(a) * 0.05);
        g.add(bud);
      }
    } else { // gerbera
      cyl(0.05, 0.04, 0.22, M.white, 0, y + 0.11, 0, g, 12);
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * Math.PI * 2 + 0.3;
        const st = cyl(0.004, 0.004, 0.3, M.stemGreen, Math.cos(a) * 0.02, y + 0.32, Math.sin(a) * 0.02, g, 5);
        st.rotation.z = Math.cos(a) * 0.18; st.rotation.x = Math.sin(a) * 0.18;
        const head = cyl(0.045, 0.045, 0.012, M.white, Math.cos(a) * 0.07, y + 0.47, Math.sin(a) * 0.07, g, 10);
        head.rotation.x = Math.sin(a) * 0.5; head.rotation.z = Math.cos(a) * 0.5 + 0.2;
        const core = new T.Mesh(new T.SphereGeometry(0.012, 6, 5), M.artFrame);
        core.position.set(Math.cos(a) * 0.07, y + 0.478, Math.sin(a) * 0.07);
        g.add(core);
      }
    }
    return { noCollide: true };
  };

  F.fruitBowl = (o, g) => {
    const y = o.h || 0;
    const bowl = new T.Mesh(new T.SphereGeometry(0.13, 16, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), M.white);
    bowl.position.y = y + 0.1; bowl.scale.y = 0.7;
    g.add(bowl);
    cyl(0.05, 0.06, 0.02, M.white, 0, y + 0.01, 0, g, 10);
    const fruits = [[0xd8462f, 0.038], [0x8bc34a, 0.036], [0xe8a33d, 0.037], [0x7a3fa0, 0.028], [0xd8462f, 0.034]];
    fruits.forEach(([col, r], i) => {
      const a = i / fruits.length * Math.PI * 2;
      const f = new T.Mesh(new T.SphereGeometry(r, 10, 8),
        new T.MeshStandardMaterial({ color: col, roughness: 0.6 }));
      f.position.set(Math.cos(a) * 0.05, y + 0.09 + (i % 2) * 0.02, Math.sin(a) * 0.05);
      g.add(f);
    });
    return { noCollide: true };
  };

  F.coffeeMachine = (o, g) => {
    const y = o.h || 0.9;
    box(0.16, 0.24, 0.3, M.black, 0, y + 0.12, 0, g);
    box(0.05, 0.06, 0.1, M.chrome, 0, y + 0.27, 0.06, g);
    // cups beside it
    for (const s of [-1, 1]) {
      cyl(0.028, 0.022, 0.05, M.white, s * 0.15, y + 0.025, 0.05, g, 10);
    }
    return { noCollide: true };
  };

  F.kettle = (o, g) => {
    const y = o.h || 0.9;
    cyl(0.07, 0.085, 0.16, M.chrome, 0, y + 0.08, 0, g, 14);
    box(0.02, 0.1, 0.03, M.black, 0.09, y + 0.1, 0, g);
    return { noCollide: true };
  };

  F.knifeBlock = (o, g) => {
    const y = o.h || 0.9;
    const bl = box(0.09, 0.2, 0.14, M.doorWood, 0, y + 0.1, 0, g);
    bl.rotation.z = 0.15;
    for (let i = 0; i < 3; i++) {
      box(0.008, 0.09, 0.02, M.chrome, -0.02 + i * 0.025, y + 0.24, 0, g);
    }
    return { noCollide: true };
  };

  F.towels = (o, g) => {
    const y = o.h || 0.9;
    // stack of folded towels
    for (let i = 0; i < (o.n || 3); i++) {
      box(0.3, 0.05, 0.22, M.bedding, 0, y + 0.03 + i * 0.055, 0, g);
    }
    return { noCollide: true };
  };

  F.towelRoll = (o, g) => {
    const y = o.h || 0.9;
    for (let i = 0; i < 2; i++) {
      const r = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 0.26, 10), M.bedding);
      r.rotation.z = Math.PI / 2;
      r.position.set(0, y + 0.045, i * 0.1 - 0.05);
      g.add(r);
    }
    return { noCollide: true };
  };

  F.toiletries = (o, g) => {
    const y = o.h || 0.9;
    const cols = [M.olive, M.amberGlass, M.white, M.olive, M.amberGlass];
    for (let i = 0; i < 5; i++) {
      cyl(0.014, 0.014, 0.07 + (i % 2) * 0.02, cols[i], -0.08 + i * 0.04, y + 0.04, 0, g, 8);
    }
    return { noCollide: true };
  };

  F.bathMat = (o, g) => {
    box(0.7, 0.015, 0.45, M.bedding, 0, 0.008, 0, g);
    return { noCollide: true };
  };

  F.throwBlanket = (o, g) => {
    const y = o.h || 0.45;
    const b = box(0.5, 0.05, 0.7, o.col === 'knit' ? M.knit : M.blanket, 0, y, 0, g);
    b.rotation.y = 0.3;
    const tail = box(0.42, 0.04, 0.4, o.col === 'knit' ? M.knit : M.blanket, 0.1, y - 0.22, 0.32, g);
    tail.rotation.x = 1.2;
    return { noCollide: true };
  };

  F.cushions = (o, g) => {
    const y = o.h || 0.5;
    const mats = { yellow: M.yellow, navy: M.navy, olive: M.olive, blue: M.lightBlue, dots: M.gray };
    (o.set || ['yellow', 'navy']).forEach((c, i) => {
      const p = box(0.4, 0.4, 0.12, mats[c] || M.gray, -0.25 + i * 0.42, y + 0.2, 0, g);
      p.rotation.x = -0.18;
      p.rotation.y = (i % 2 ? -1 : 1) * 0.12;
    });
    return { noCollide: true };
  };

  F.wineSet = (o, g) => {
    const y = o.h || 0.44;
    // ice bucket
    cyl(0.07, 0.055, 0.14, M.chrome, -0.12, y + 0.07, 0, g, 12);
    const bottle = cyl(0.028, 0.028, 0.2, M.stemGreen, -0.12, y + 0.2, 0, g, 10);
    bottle.rotation.z = 0.35;
    // glasses
    for (const s of [0, 1]) {
      cyl(0.004, 0.03, 0.07, M.clearGlass, 0.08 + s * 0.09, y + 0.1, 0.02, g, 8);
      cyl(0.032, 0.03, 0.055, M.clearGlass, 0.08 + s * 0.09, y + 0.16, 0.02, g, 8);
    }
    return { noCollide: true };
  };

  F.stringLights = (o, g) => {
    // string lights sagging along the group's x axis
    const L = o.w || 3.5, n = Math.round(L / 0.3);
    const glow = new T.MeshStandardMaterial({ color: 0xffe9c0, emissive: 0xffd98a, emissiveIntensity: 0.9, roughness: 0.5 });
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const sag = Math.sin(t * Math.PI) * 0.18;
      const b = new T.Mesh(new T.SphereGeometry(0.022, 8, 6), glow);
      b.position.set(-L / 2 + t * L, (o.h || 1.55) - sag, 0);
      g.add(b);
    }
    return { noCollide: true };
  };

  F.wallPanel = (o, g) => {
    const mat = o.mat === 'black' ? M.marbleB : M.marbleW;
    const h = o.h || 2.6;
    box(o.w, h, 0.04, mat, 0, h / 2, 0, g);
    return { noCollide: true };
  };

  F.rug = (o, g) => {
    const mat = o.pat === 'grayblue' ? M.rugGB : M.rugL;
    const m = new T.Mesh(new T.BoxGeometry(o.w, 0.02, o.d), mat);
    m.position.y = 0.01; g.add(m);
    return { noCollide: true };
  };
  F.runner = (o, g) => F.rug(Object.assign({ pat: 'light' }, o), g);

  const throwMats = {};
  function throwMat(pat) {
    if (throwMats[pat]) return throwMats[pat];
    const tex = canvasTex(256, 256, (g) => {
      if (pat === 'zigzag') {
        // yellow-black zigzag (photo 11)
        g.fillStyle = '#e8e2d2'; g.fillRect(0, 0, 256, 256);
        const cols = ['#2b2b2b', '#d9b23c', '#9a9488', '#2b2b2b', '#cfc7b4'];
        for (let r = 0; r < 10; r++) {
          g.strokeStyle = cols[r % 5]; g.lineWidth = 7;
          g.beginPath();
          for (let x = 0; x <= 256; x += 16) {
            const y = r * 26 + ((x / 16) % 2 ? 8 : -8);
            x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
          }
          g.stroke();
        }
      } else {
        // blue-gray squares (photo 12)
        g.fillStyle = '#e9e6df'; g.fillRect(0, 0, 256, 256);
        const cols = ['#31456e', '#7b8794', '#4a6076', '#b9b2a4'];
        for (let yy = 8; yy < 256; yy += 24) {
          for (let xx = 8; xx < 256; xx += 24) {
            g.fillStyle = cols[(xx * 7 + yy * 13) % 4 | 0];
            g.fillRect(xx, yy, 11, 11);
          }
        }
      }
    }, 2, 2);
    throwMats[pat] = new T.MeshStandardMaterial({ map: tex, roughness: 0.95 });
    return throwMats[pat];
  }

  F.bed = (o, g) => {
    const L = o.len, W = o.w;
    // headboard
    const quilt = o.head === 'navy' ? M.navyQuilt : M.beigeQuilt;
    box(W + 0.5, 1.35, 0.12, quilt, 0, 0.675, -L / 2 - 0.06, g);
    box(W, 0.32, L, M.gray, 0, 0.16, 0, g);          // base
    box(W - 0.06, 0.22, L - 0.06, M.bedding, 0, 0.43, 0, g); // mattress + linen
    const bl = o.throwPat ? throwMat(o.throwPat) : M.blanket;
    box(W - 0.06, 0.08, L * 0.45, bl, 0, 0.55, L * 0.22, g); // throw
    if (o.throwPat) {
      // draping throw edges
      const drape = box(W - 0.04, 0.42, 0.05, bl, 0, 0.32, L * 0.445, g);
      drape.rotation.x = 0.06;
    }
    for (const s of [-1, 1]) {
      const p = new T.Mesh(new T.BoxGeometry(W / 2 - 0.12, 0.12, 0.4), M.bedding);
      p.position.set(s * W / 4, 0.60, -L / 2 + 0.28);
      p.rotation.x = -0.25;
      g.add(p);
    }
    return { w: W + 0.5, d: L + 0.15 };
  };

  F.sideTable = (o, g) => {
    if (o.skip) return { noCollide: true };
    box(0.5, 0.42, 0.4, M.ash, 0, 0.21, 0, g);
    cyl(0.09, 0.09, 0.3, M.smoke, 0.05, 0.57, 0, g, 12);
    cyl(0.13, 0.13, 0.16, M.lampShade, 0.05, 0.78, 0, g, 12);
    return { w: 0.5, d: 0.4 };
  };

  F.wardrobe = (o, g) => {
    box(o.w, 2.5, o.d, M.ashV, 0, 1.25, 0, g);
    const nDoors = Math.max(1, Math.round(o.d / 0.6));
    for (let i = 0; i < nDoors; i++) {
      box(0.02, 2.4, 0.02, M.white, o.w / 2 + 0.005, 1.25, -o.d / 2 + (i + 0.5) * (o.d / nDoors), g);
    }
    return { w: o.w, d: o.d };
  };

  F.wardrobeTv = (o, g) => {
    box(o.w, 2.5, o.d, M.ashV, 0, 1.25, 0, g);
    // TV niche
    box(o.w * 0.55, 0.75, 0.06, M.tv, 0, 1.45, o.d / 2 + 0.035, g);
    return { w: o.w, d: o.d };
  };

  F.sofaL = (o, g) => {
    // main block along x, chaise at the west end pointing forward (north)
    box(o.w, 0.4, o.d, M.cream, 0, 0.25, 0, g);
    box(o.w, 0.45, 0.22, M.cream, 0, 0.62, o.d / 2 - 0.11, g);
    for (const s of [-1, 1]) box(0.22, 0.55, o.d, M.cream, s * (o.w / 2 - 0.11), 0.5, 0, g);
    // cushions
    for (let i = 0; i < 4; i++) {
      box(o.w / 4 - 0.08, 0.13, o.d - 0.3, M.bedding, -o.w / 2 + (i + 0.5) * o.w / 4, 0.51, -0.05, g);
    }
    // chaise
    box(o.chaiseW, 0.4, o.chaiseD, M.cream, -o.w / 2 + o.chaiseW / 2, 0.25, -o.chaiseD / 2 - o.d / 2 + 0.2, g);
    box(o.chaiseW - 0.1, 0.12, o.chaiseD - 0.2, M.bedding, -o.w / 2 + o.chaiseW / 2, 0.47, -o.chaiseD / 2 - o.d / 2 + 0.2, g);
    return { custom: [
      { x1: -o.w / 2, z1: -o.d / 2, x2: o.w / 2, z2: o.d / 2 },
      { x1: -o.w / 2, z1: -o.d / 2 - o.chaiseD + 0.2, x2: -o.w / 2 + o.chaiseW, z2: -o.d / 2 }
    ] };
  };

  F.sofa = (o, g) => {
    const col = M[o.col] || M.taupe;
    box(o.w, 0.4, o.d, col, 0, 0.25, 0, g);
    box(o.w, 0.42, 0.2, col, 0, 0.6, o.d / 2 - 0.1, g);
    for (const s of [-1, 1]) box(0.2, 0.52, o.d, col, s * (o.w / 2 - 0.1), 0.48, 0, g);
    box(o.w - 0.44, 0.12, o.d - 0.26, M.bedding, 0, 0.5, -0.04, g);
    return { w: o.w, d: o.d };
  };

  F.armchair = (o, g) => {
    const col = { navy: M.navy, gray: M.gray, sage: M.sage, graybrown: M.graybrown, blue: M.blueFab }[o.col] || M.gray;
    box(0.72, 0.34, 0.7, col, 0, 0.3, 0, g);
    box(0.72, 0.5, 0.16, col, 0, 0.68, 0.3, g);
    for (const s of [-1, 1]) box(0.14, 0.3, 0.6, col, s * 0.31, 0.55, 0, g);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      cyl(0.02, 0.015, 0.18, M.metalBlack, sx * 0.28, 0.09, sz * 0.26, g, 8);
    }
    return { w: 0.8, d: 0.8 };
  };

  F.roundTable = (o, g) => {
    const top = o.glass ? M.smoke : M.black;
    cyl(o.r, o.r, 0.035, top, 0, 0.42, 0, g, 28);
    if (o.glass) {
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * Math.PI * 2;
        const leg = cyl(0.015, 0.015, 0.42, M.chrome, Math.cos(a) * o.r * 0.6, 0.21, Math.sin(a) * o.r * 0.6, g, 8);
        leg.rotation.z = 0.35 * Math.cos(a); leg.rotation.x = 0.35 * Math.sin(a);
      }
    } else {
      cyl(0.05, 0.05, 0.42, M.metalBlack, 0, 0.21, 0, g, 10);
      cyl(o.r * 0.7, o.r * 0.7, 0.03, M.metalBlack, 0, 0.02, 0, g, 24);
    }
    return { w: o.r * 2, d: o.r * 2 };
  };

  F.diningTable = (o, g) => {
    box(o.w, 0.05, o.d, M.white, 0, 0.73, 0, g);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = cyl(0.03, 0.02, 0.72, M.doorWood, sx * (o.w / 2 - 0.25), 0.36, sz * (o.d / 2 - 0.18), g, 8);
      leg.rotation.z = sx * 0.12; leg.rotation.x = -sz * 0.1;
    }
    // chairs: 3 per long side + 2 ends
    const chairAt = (cx, cz, rot) => {
      const ch = new T.Group();
      box(0.42, 0.05, 0.4, M.white, 0, 0.45, 0, ch);
      const back = new T.Mesh(new T.BoxGeometry(0.4, 0.45, 0.04), M.white);
      back.position.set(0, 0.7, -0.19); back.rotation.x = 0.12; ch.add(back);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        cyl(0.018, 0.014, 0.44, M.doorWood, sx * 0.17, 0.22, sz * 0.16, ch, 6);
      }
      ch.position.set(cx, 0, cz); ch.rotation.y = rot;
      g.add(ch);
    };
    for (let i = 0; i < 3; i++) {
      const x = -o.w / 2 + (i + 0.5) * o.w / 3;
      chairAt(x, o.d / 2 + 0.25, Math.PI);
      chairAt(x, -o.d / 2 - 0.25, 0);
    }
    chairAt(o.w / 2 + 0.3, 0, -Math.PI / 2);
    chairAt(-o.w / 2 - 0.3, 0, Math.PI / 2);
    // table setting: plates, glasses, napkins
    const plateAt = (px, pz) => {
      cyl(0.115, 0.1, 0.012, M.white, px, 0.762, pz, g, 16);
      cyl(0.085, 0.085, 0.006, M.counter, px, 0.772, pz, g, 14);
      box(0.14, 0.008, 0.09, M.bedding, px, 0.76, pz + (pz > 0 ? 0.16 : -0.16), g);
      cyl(0.004, 0.028, 0.08, M.clearGlass, px + 0.16, 0.8, pz, g, 8);
      cyl(0.03, 0.028, 0.06, M.clearGlass, px + 0.16, 0.87, pz, g, 8);
    };
    for (let i = 0; i < 3; i++) {
      const x = -o.w / 2 + (i + 0.5) * o.w / 3;
      plateAt(x, o.d / 2 - 0.22);
      plateAt(x, -o.d / 2 + 0.22);
    }
    return { w: o.w + 1.1, d: o.d + 1.1 };
  };

  F.pendants = (o, g) => {
    const ceilY = 2.8;
    for (let i = 0; i < o.n; i++) {
      const x = -o.w / 2 + (i + 0.5) * o.w / o.n;
      const dropH = 1.1 + (i % 2) * 0.15;
      cyl(0.003, 0.003, dropH, M.metalBlack, x, ceilY - dropH / 2, 0, g, 6);
      const globe = new T.Mesh(new T.SphereGeometry(0.11, 18, 14), M.smoke.clone());
      globe.material.emissive = new T.Color(0xffd9a0);
      globe.material.emissiveIntensity = 0.7;
      globe.position.set(x, ceilY - dropH - 0.1, 0);
      g.add(globe);
    }
    return { noCollide: true };
  };

  F.kitchenRun = (o, g) => {
    // base cabinets + counter + splashback + wall cabinets
    box(o.w, 0.86, o.d, M.ash, 0, 0.43, 0, g);
    box(o.w, 0.04, o.d + 0.04, M.counter, 0, 0.9, 0.02, g);
    box(o.w, 0.6, 0.02, M.ashV, 0, 1.3, -o.d / 2 + 0.01, g);         // splashback
    box(o.w, 0.75, 0.35, M.ash, 0, 2.1, -o.d / 2 + 0.18, g);          // uppers
    // open shelf with dishes (schematic)
    box(o.w * 0.4, 0.02, 0.25, M.ashV, -o.w * 0.1, 1.62, -o.d / 2 + 0.14, g);
    // sink + tap
    box(0.5, 0.02, 0.4, M.chrome, -o.w / 2 + 0.5, 0.915, 0, g);
    const tap = cyl(0.015, 0.015, 0.3, M.chrome, -o.w / 2 + 0.5, 1.05, -0.15, g, 8);
    tap.rotation.x = 0.0;
    // the hob is on the island — this column holds the oven/microwave
    return { w: o.w, d: o.d };
  };

  F.tallUnits = (o, g) => {
    box(o.w, 2.5, o.d, M.ash, 0, 1.25, 0, g);
    box(0.55, 0.45, 0.02, M.black, 0, 1.5, o.d / 2 + 0.01, g); // oven/microwave front
    return { w: o.w, d: o.d };
  };

  F.island = (o, g) => {
    box(o.w, 0.88, o.d, M.ashV, 0, 0.44, 0, g);
    box(o.w + 0.15, 0.05, o.d + 0.15, M.counter, 0, 0.925, 0, g);
    // hob
    box(0.7, 0.01, 0.5, M.black, -o.w / 4, 0.955, 0, g);
    return { w: o.w + 0.2, d: o.d + 0.2 };
  };

  F.hood = (o, g) => {
    // ceiling box with built-in hood (photo 6)
    box(o.w + 0.3, 0.22, o.d + 0.35, M.wall, 0, 2.69, 0, g);
    box(o.w * 0.55, 0.02, o.d * 0.5, M.metalBlack, 0, 2.57, 0, g);
    return { noCollide: true };
  };

  F.barStool = (o, g) => {
    cyl(0.2, 0.24, 0.04, M.chrome, 0, 0.04, 0, g, 16);
    cyl(0.02, 0.02, 0.55, M.chrome, 0, 0.32, 0, g, 8);
    const seat = new T.Mesh(new T.SphereGeometry(0.19, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.white);
    seat.position.y = 0.6; seat.scale.y = 0.55; g.add(seat);
    box(0.34, 0.3, 0.03, M.white, 0, 0.78, -0.15, g);
    return { w: 0.42, d: 0.42 };
  };

  F.tvPanel = (o, g) => {
    // wooden wall panel + TV (face: which way it looks; h: panel height)
    const sign = o.face === 'e' ? 1 : -1;
    const h = o.h || 2.3;
    box(0.06, h, o.w, M.ashV, 0, h / 2 + 0.02, 0, g);
    box(0.02, 0.75, 1.3, M.tv, sign * 0.045, Math.min(h * 0.62, h - 0.45), 0, g);
    box(0.35, 0.35, o.w * 0.85, M.ash, sign * 0.22, 0.18, 0, g); // console
    return { w: 0.6, d: o.w };
  };

  // Living-room TV wall with shelving niches on the sides (photo 2)
  F.tvWallUnit = (o, g) => {
    const sign = o.face === 'e' ? 1 : -1;
    const W = o.w || 3.0;
    box(0.07, 2.35, W, M.ashV, 0, 1.35, 0, g);
    box(0.02, 0.78, 1.35, M.tv, sign * 0.05, 1.5, 0, g);
    // side niches: dark backing + shelves + decor
    for (const side of [-1, 1]) {
      const zc = side * (W / 2 - 0.26);
      box(0.06, 1.7, 0.4, M.artFrame, sign * 0.012, 1.45, zc, g);
      for (let i = 0; i < 4; i++) {
        const y = 0.85 + i * 0.44;
        box(0.1, 0.025, 0.4, M.ashV, sign * 0.03, y, zc, g);
        // mini decor: books or a small vase
        if (i % 2 === 0) {
          for (let b = 0; b < 3; b++) {
            box(0.02, 0.16, 0.08, [M.navy, M.olive, M.pink][b], sign * 0.06, y + 0.1, zc - 0.1 + b * 0.05, g);
          }
        } else {
          cyl(0.035, 0.028, 0.12, M.white, sign * 0.06, y + 0.08, zc, g, 10);
        }
      }
    }
    // long low console
    box(0.38, 0.32, W * 0.9, M.white, sign * 0.22, 0.17, 0, g);
    return { w: 0.65, d: W };
  };

  // Narrow shelf column with decor (bedroom 1, photo 8)
  F.shelfTower = (o, g) => {
    box(0.36, 2.45, 0.5, M.ash, 0, 1.225, 0, g);
    for (let i = 0; i < 5; i++) {
      const y = 0.35 + i * 0.44;
      box(0.3, 0.02, 0.42, M.ashV, 0.02, y, 0, g);
      if (i % 2 === 0) {
        for (let b = 0; b < 3; b++) {
          box(0.02, 0.17, 0.09, [M.olive, M.gray, M.navy][b], 0.05, y + 0.1, -0.1 + b * 0.06, g);
        }
      } else if (i === 1) {
        cyl(0.04, 0.032, 0.13, M.white, 0.04, y + 0.08, 0, g, 10);
      } else {
        const leaf = new T.Mesh(new T.PlaneGeometry(0.16, 0.2), M.plantGreen);
        leaf.position.set(0.04, y + 0.12, 0);
        g.add(leaf);
        cyl(0.035, 0.028, 0.07, M.pot, 0.04, y + 0.045, 0, g, 10);
      }
    }
    return { w: 0.4, d: 0.55 };
  };

  // Cups and glasses on the open kitchen shelf (photo 6)
  F.cups = (o, g) => {
    const y = o.h || 1.63;
    for (let i = 0; i < 5; i++) {
      cyl(0.032, 0.026, 0.07, M.white, -0.4 + i * 0.16, y + 0.035, 0, g, 10);
    }
    for (let i = 0; i < 4; i++) {
      cyl(0.026, 0.024, 0.1, M.clearGlass, -0.32 + i * 0.16, y + 0.28, 0, g, 10);
    }
    return { noCollide: true };
  };

  // Hanging planter with trailing greenery (terrace, photo 18)
  F.hangingPlant = (o, g) => {
    const y = o.h || 1.45;
    cyl(0.07, 0.055, 0.1, M.pot, 0, y, 0, g, 10);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      const vine = new T.Mesh(new T.PlaneGeometry(0.07, 0.3 + (i % 3) * 0.12), M.plantGreen);
      vine.position.set(Math.cos(a) * 0.06, y - 0.18 - (i % 3) * 0.05, Math.sin(a) * 0.06);
      vine.rotation.y = a;
      g.add(vine);
    }
    return { noCollide: true };
  };

  F.tvOnWall = (o, g) => {
    box(o.w, 0.62, 0.05, M.tv, 0, 1.5, 0, g);
    return { noCollide: true };
  };

  F.sideboard = (o, g) => {
    box(o.w, 0.45, o.d, M.ash, 0, 0.28, 0, g);
    return { w: o.w, d: o.d };
  };

  F.deskNook = (o, g) => {
    // jungle wallpaper + desktop + chair + shelves
    box(o.w, 2.5, 0.04, M.jungle, 0, 1.25, o.d / 2, g);
    box(o.w, 0.04, o.d, M.ash, 0, 0.74, 0, g);
    box(o.w * 0.7, 0.03, 0.2, M.white, 0, 1.35, o.d / 4, g);
    const ch = new T.Group();
    box(0.42, 0.05, 0.4, M.white, 0, 0.45, 0, ch);
    box(0.4, 0.42, 0.04, M.white, 0, 0.68, 0.18, ch);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(0.018, 0.014, 0.44, M.metalBlack, sx * 0.17, 0.22, sz * 0.16, ch, 6);
    ch.position.set(0, 0, -0.55); g.add(ch);
    return { w: o.w, d: o.d + 0.9 };
  };

  F.tub = (o, g) => {
    box(o.w, 0.58, o.d, M.marbleW, 0, 0.29, 0, g);
    const inner = new T.Mesh(new T.BoxGeometry(o.w - 0.2, 0.3, o.d - 0.2), M.white);
    inner.position.y = 0.45; g.add(inner);
    cyl(0.015, 0.015, 0.25, M.chrome, o.w / 2 - 0.2, 0.7, 0, g, 8);
    return { w: o.w, d: o.d };
  };

  F.shower = (o, g) => {
    // glass cabin: tray, pole, head, glass on 2 sides
    box(o.w, 0.04, o.d, M.marbleW, 0, 0.02, 0, g);
    const gl1 = new T.Mesh(new T.PlaneGeometry(o.w, 2.0), M.glass);
    gl1.position.set(0, 1.04, o.d / 2); g.add(gl1);
    const gl2 = new T.Mesh(new T.PlaneGeometry(o.d, 2.0), M.glass);
    gl2.rotation.y = Math.PI / 2;
    gl2.position.set(o.w / 2, 1.04, 0); g.add(gl2);
    cyl(0.012, 0.012, 1.9, M.chrome, -o.w / 2 + 0.1, 0.99, -o.d / 2 + 0.1, g, 8);
    const head = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.02, 16), M.chrome);
    head.position.set(-o.w / 2 + 0.3, 2.0, -o.d / 2 + 0.25); g.add(head);
    return { w: o.w, d: o.d };
  };

  F.vanity = (o, g) => {
    const top = o.dark ? M.black : M.white;
    box(o.w, 0.45, o.d, M.doorWood, 0, 0.55, 0, g);
    box(o.w, 0.1, o.d + 0.03, top, 0, 0.85, 0.015, g);
    if (o.dark) {
      box(0.55, 0.06, 0.35, M.black, 0, 0.93, 0, g);
    } else {
      const b = new T.Mesh(new T.CylinderGeometry(0.19, 0.16, 0.14, 20), M.white);
      b.position.set(0, 0.97, 0); g.add(b);
    }
    // backlit mirror
    const mir = new T.Mesh(new T.BoxGeometry(o.w * 0.55, 0.9, 0.02), M.smoke);
    mir.position.set(0, 1.75, -o.d / 2 - 0.0); g.add(mir);
    const halo = new T.Mesh(new T.BoxGeometry(o.w * 0.55 + 0.08, 0.98, 0.005), M.lampShade);
    halo.position.set(0, 1.75, -o.d / 2 - 0.012); g.add(halo);
    cyl(0.012, 0.012, 0.18, M.chrome, 0, 1.12, -o.d / 2 + 0.05, g, 8);
    return { w: o.w, d: o.d };
  };

  F.wc = (o, g) => {
    box(o.w, 0.4, o.d, M.white, 0, 0.2, 0, g);
    const lid = new T.Mesh(new T.BoxGeometry(o.w - 0.04, 0.05, o.d - 0.1), M.white);
    lid.position.set(0, 0.43, 0.02); g.add(lid);
    box(o.w, 0.28, 0.14, M.white, 0, 0.55, -o.d / 2 + 0.07, g);
    return { w: o.w, d: o.d };
  };

  F.washerDryer = (o, g) => {
    for (const s of [-1, 1]) {
      box(0.6, 0.85, 0.6, M.white, s * 0.33, 0.425, 0, g);
      const door = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 0.03, 20), M.smoke);
      door.rotation.x = Math.PI / 2;
      door.position.set(s * 0.33, 0.45, 0.31);
      g.add(door);
    }
    return { w: 1.35, d: 0.65 };
  };

  F.bench = (o, g) => {
    box(o.w, 0.42, o.d, M.cream, 0, 0.3, 0, g);
    for (const s of [-1, 1]) cyl(0.02, 0.02, 0.2, M.metalBlack, s * (o.w / 2 - 0.1), 0.1, 0, g, 8);
    return { w: o.w, d: o.d };
  };

  F.plant = (o, g) => {
    const y = o.h || 0;
    const scale = o.h ? 0.4 : 1; // on a counter — a small basil pot
    const h = (o.big ? 1.3 : 0.8) * scale;
    cyl(0.14 * scale, 0.11 * scale, 0.3 * scale, M.pot, 0, y + 0.15 * scale, 0, g, 14);
    for (let i = 0; i < 7; i++) {
      const leaf = new T.Mesh(new T.PlaneGeometry(0.28 * scale, h * 0.75), M.plantGreen);
      const a = i / 7 * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 0.1 * scale, y + (0.35 + h * 0.35 / scale) * scale, Math.sin(a) * 0.1 * scale);
      leaf.rotation.y = a;
      leaf.rotation.x = -0.3;
      g.add(leaf);
    }
    if (o.h) return { noCollide: true };
    return { w: 0.35, d: 0.35 };
  };

  F.floorLamp = (o, g) => {
    cyl(0.18, 0.22, 0.03, M.metalBlack, 0, 0.015, 0, g, 16);
    const pole = cyl(0.015, 0.015, 1.9, M.metalBlack, 0, 0.95, 0, g, 8);
    pole.rotation.z = 0.25;
    cyl(0.22, 0.28, 0.28, M.lampShade, -0.45, 1.85, 0, g, 18);
    return { w: 0.4, d: 0.4 };
  };

  let dotsMat = null;
  F.terraceChair = (o, g) => {
    box(0.7, 0.45, 0.7, M.rattan, 0, 0.25, 0, g);
    box(0.7, 0.5, 0.14, M.rattan, 0, 0.65, 0.28, g);
    for (const s of [-1, 1]) box(0.14, 0.35, 0.7, M.rattan, s * 0.28, 0.55, 0, g);
    box(0.55, 0.1, 0.5, M.cream, 0, 0.52, -0.03, g);
    box(0.5, 0.35, 0.08, M.cream, 0, 0.78, 0.24, g);
    // polka-dot cushion (photo 18)
    if (!dotsMat) {
      dotsMat = new T.MeshStandardMaterial({
        map: canvasTex(128, 128, (gc) => {
          gc.fillStyle = '#ece5d8'; gc.fillRect(0, 0, 128, 128);
          const cols = ['#2b2b2b', '#c07a33', '#8a8f4a', '#d9c26a'];
          for (let i = 0; i < 14; i++) {
            gc.fillStyle = cols[i % 4];
            gc.beginPath();
            gc.arc(Math.random() * 128, Math.random() * 128, 9 + Math.random() * 5, 0, Math.PI * 2);
            gc.fill();
          }
        }), roughness: 0.95
      });
    }
    const pil = box(0.4, 0.38, 0.1, dotsMat, 0, 0.72, 0.18, g);
    pil.rotation.x = -0.25;
    return { w: 0.75, d: 0.75 };
  };

  F.terraceTable = (o, g) => {
    box(o.w, 0.06, o.d, M.rattan, 0, 0.4, 0, g);
    box(o.w - 0.15, 0.34, o.d - 0.15, M.rattan, 0, 0.2, 0, g);
    box(o.w - 0.2, 0.01, o.d - 0.2, M.smoke, 0, 0.435, 0, g);
    return { w: o.w, d: o.d };
  };

  F.planter = (o, g) => {
    cyl(0.2, 0.16, 0.45, M.pot, 0, 0.22, 0, g, 14);
    for (let i = 0; i < 9; i++) {
      const leaf = new T.Mesh(new T.PlaneGeometry(0.35, 1.1), M.plantGreen);
      const a = i / 9 * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 0.12, 0.85, Math.sin(a) * 0.12);
      leaf.rotation.y = a; leaf.rotation.x = -0.25;
      g.add(leaf);
    }
    return { w: 0.45, d: 0.45 };
  };

  F.lantern = (o, g) => {
    box(0.3, 0.5, 0.3, M.metalBlack, 0, 0.25, 0, g);
    const glow = new T.Mesh(new T.SphereGeometry(0.08, 10, 8), M.lampShade);
    glow.position.y = 0.25; g.add(glow);
    return { w: 0.35, d: 0.35 };
  };

  // Furniture heights for light occlusion (shadows bake into the floor)
  const OCC_H = {
    bed: 0.65, sofaL: 0.8, sofa: 0.8, armchair: 0.85, roundTable: 0.45,
    diningTable: 0.76, island: 0.95, kitchenRun: 2.45, tallUnits: 2.5,
    wardrobe: 2.5, wardrobeTv: 2.5, barStool: 0.8, tub: 0.6, vanity: 1.0,
    wc: 0.45, washerDryer: 0.9, bench: 0.45, sideboard: 0.5, sideTable: 0.45,
    deskNook: 0.78, tvPanel: 2.3, terraceChair: 0.8, terraceTable: 0.45,
    planter: 1.2
  };
  const OCC_SKIP = ['shower', 'plant', 'floorLamp', 'lantern'];

  const furnGroups = [];
  function buildFurniture(scene) {
    for (const item of APT.furniture) {
      const fn = F[item.type];
      if (!fn) continue;
      const g = new T.Group();
      furnGroups.push(g);
      const baseY = item.lvl === 'main' ? APT.mainFloorY : item.lvl === 'upper' ? APT.upperFloorY : APT.terraceY;
      g.position.set(item.x, baseY, item.z);
      g.rotation.y = item.rot || 0;
      const res = fn(item, g) || {};
      scene.add(g);
      const clvl = item.lvl;
      const occH = OCC_H[item.type] || 0.8;
      const canOcclude = !OCC_SKIP.includes(item.type);
      if (res.custom) {
        // rotated custom AABBs unsupported — used as-is (rot=0 for sofaL)
        for (const b of res.custom) {
          colliders.boxes.push({ x1: item.x + b.x1, z1: item.z + b.z1, x2: item.x + b.x2, z2: item.z + b.z2, lvl: clvl });
          if (canOcclude) addOccluder(item.x + (b.x1 + b.x2) / 2, baseY + occH / 2, item.z + (b.z1 + b.z2) / 2,
            b.x2 - b.x1, occH, b.z2 - b.z1);
        }
      } else if (!res.noCollide) {
        addBoxCollider(item.x, item.z, res.w || item.w || 0.5, res.d || item.d || 0.5, clvl, item.rot || 0);
        if (canOcclude) {
          const bb = colliders.boxes[colliders.boxes.length - 1];
          addOccluder((bb.x1 + bb.x2) / 2, baseY + occH / 2, (bb.z1 + bb.z2) / 2,
            bb.x2 - bb.x1, occH, bb.z2 - bb.z1);
        }
      }
    }
  }

  // ---------- Light ----------
  function buildLights(scene) {
    scene.add(new T.AmbientLight(0xfff2e2, 0.22));
    const hemi = new T.HemisphereLight(0xdfeaf5, 0x8a7a66, 0.38);
    scene.add(hemi);
    const sun = new T.DirectionalLight(0xfff0d8, 0.55);
    sun.position.set(-30, 40, 20);
    scene.add(sun);
    for (const l of APT.lights) {
      let y;
      if (l.lvl === 'main') y = APT.mainCeilH - 0.3;
      else if (l.lvl === 'stair') y = 4.6;
      else y = APT.upperFloorY + Math.min(2.3, atticH(l.z) - 0.3);
      // only lights marked dyn stay dynamic — the rest live in the bake
      if (l.dyn) {
        const pt = new T.PointLight(0xffe4c0, 0.42, 7.0, 1.6);
        pt.position.set(l.x, y, l.z);
        scene.add(pt);
      }
      bakeData.lights.push({ x: l.x, y: y - 0.15, z: l.z, int: 1 });
      // small ceiling cap
      const dot = new T.Mesh(new T.CylinderGeometry(0.06, 0.08, 0.05, 12), M.lampShade);
      dot.position.set(l.x, y + 0.22, l.z);
      scene.add(dot);
    }
  }

  // ---------- Static merging: the main FPS win ----------
  // All furniture, frame, curtain, stair and fence meshes merge per
  // (material, floor) pair into a few big meshes. Only meshes with their
  // own lightmaps (userData.baked) and merged walls (userData.doll) are skipped.
  function mergeStatic(scene) {
    const buckets = new Map();
    const toRemove = [];
    const box = new T.Box3();

    function collect(mesh) {
      if (!mesh.isMesh || mesh.userData.doll || mesh.userData.baked) return;
      mesh.updateWorldMatrix(true, false);
      const geo = (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone());
      geo.applyMatrix4(mesh.matrixWorld);
      box.setFromBufferAttribute(geo.attributes.position);
      const lvl = (box.min.y + box.max.y) / 2 < 2.55 ? 1 : 2;
      const key = mesh.material.uuid + '|' + lvl;
      let b = buckets.get(key);
      if (!b) { b = { mat: mesh.material, lvl, chunks: [] }; buckets.set(key, b); }
      b.chunks.push(geo);
    }

    for (const child of scene.children.slice()) {
      if (child.isGroup && furnGroups.includes(child)) {
        child.traverse((m) => collect(m));
        toRemove.push(child);
      } else if (child.isMesh && !child.userData.doll && !child.userData.baked) {
        collect(child);
        toRemove.push(child);
      }
    }
    for (const o of toRemove) scene.remove(o);

    for (const b of buckets.values()) {
      let vtx = 0;
      for (const c of b.chunks) vtx += c.attributes.position.count;
      const geo = new T.BufferGeometry();
      for (const name of ['position', 'normal', 'uv']) {
        const item = b.chunks[0].attributes[name];
        if (!item) continue;
        const size = item.itemSize;
        const arr = new Float32Array(vtx * size);
        let off = 0;
        for (const c of b.chunks) {
          const a = c.attributes[name];
          if (a) arr.set(a.array, off);
          off += c.attributes.position.count * size;
        }
        geo.setAttribute(name, new T.BufferAttribute(arr, size));
      }
      const mesh = new T.Mesh(geo, b.mat);
      mesh.userData.mergeLvl = b.lvl;
      scene.add(mesh);
      for (const c of b.chunks) c.dispose();
    }
  }

  // Entry point: builds the whole scene, returns colliders for the controls
  function build(scene) {
    initMaterials();
    buildFloors(scene);
    for (const w of APT.walls) buildWall(scene, w);
    buildStairs(scene);
    buildTerrace(scene);
    buildFurniture(scene);
    buildLights(scene);
    return colliders;
  }

  return { build, colliders, atticH, bakeData, mergeStatic, openings: doorways };
})();
