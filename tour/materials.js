// ============================================================
// Material palette and procedural textures.
//
// Split out of builder.js because materials are the subject of the
// photorealism work and editing them inside a 74 KB file is where
// mistakes happen. Behaviour is identical to the previous inline
// version.
// ============================================================

const Materials = (() => {
  const T = THREE;
  const M = {};

  // ---------- Procedural textures ----------
  function canvasTex(w, h, draw, repX = 1, repY = 1) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    // Deliberately no texture.colorSpace: these canvases were authored against
    // r128's linear default, and tagging them sRGB shifts every colour in the
    // scene. Revisit with the resemblance metric watching, not during a
    // migration whose gate is "nothing changed". See
    // docs/superpowers/plans/2026-08-12-phase-b1-migration.md task 4.
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
  // `base` is an optional [r,g,b] plank colour. Absent -> (184,149,95), the
  // honey oak every apartment has always had, so a config that does not ask
  // for one renders exactly as before. serenity asks for one because its
  // photographs show a pale grey-washed oak, and `palette.floorWood` cannot
  // reach it: that key is a multiplier on the map, and no multiplier can
  // raise a channel (the render needs MORE green and blue than the honey
  // base has, not less).
  function floorTex(base) {
    const R0 = base ? base[0] : 184, G0 = base ? base[1] : 149, B0 = base ? base[2] : 95;
    return canvasTex(1024, 1024, (g) => {
      const rowH = 128;
      for (let y = 0; y < 1024; y += rowH) {
        let x = (y / rowH) % 2 === 0 ? 0 : -180;
        while (x < 1024) {
          const len = 260 + Math.random() * 300;
          const tone = 0.82 + Math.random() * 0.36;
          const r = Math.min(255, R0 * tone), gr = Math.min(255, G0 * tone), b = Math.min(255, B0 * tone);
          g.fillStyle = `rgb(${r | 0},${gr | 0},${b | 0})`;
          g.fillRect(x, y, len, rowH);
          // grain
          for (let i = 0; i < 26; i++) {
            g.strokeStyle = base
              ? `rgba(150,132,112,${0.03 + Math.random() * 0.06})`
              : `rgba(110,80,50,${0.04 + Math.random() * 0.08})`;
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
      } else if (style === 'urchin' || style === 'starfish' || style === 'shell') {
        // The three nautical canvases above the sofa in 3.webp/4.webp/9.webp:
        // indigo line art on an off-white canvas, one motif per panel.
        g.fillStyle = '#efece5'; g.fillRect(0, 0, 256, 320);
        g.strokeStyle = '#2c4272'; g.fillStyle = '#2c4272';
        const cx = 128, cy = 160;
        if (style === 'urchin') {
          g.lineWidth = 2;
          for (let i = 0; i < 44; i++) {
            const a = i / 44 * Math.PI * 2;
            g.beginPath(); g.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
            g.lineTo(cx + Math.cos(a) * 96, cy + Math.sin(a) * 96); g.stroke();
          }
          for (const r of [30, 52, 74, 96]) {
            g.lineWidth = 1.5;
            g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
          }
        } else if (style === 'starfish') {
          g.beginPath();
          for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + i / 10 * Math.PI * 2;
            const r = (i % 2 === 0) ? 100 : 38;
            const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
            if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
          }
          g.closePath(); g.lineWidth = 3; g.stroke();
          g.globalAlpha = 0.18; g.fill(); g.globalAlpha = 1;
          for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + i / 5 * Math.PI * 2;
            g.lineWidth = 1.2;
            g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 92, cy + Math.sin(a) * 92); g.stroke();
          }
        } else {
          g.lineWidth = 2;
          for (let i = 0; i < 16; i++) {
            const a = Math.PI * (0.08 + i / 16 * 0.84);
            g.beginPath(); g.moveTo(cx, cy + 84);
            g.quadraticCurveTo(cx + Math.cos(a) * -70, cy - 10, cx + Math.cos(a) * -96, cy + 84);
            g.stroke();
          }
          g.lineWidth = 3;
          g.beginPath(); g.arc(cx, cy + 84, 98, Math.PI, 0); g.stroke();
        }
      } else { // mono
        g.fillStyle = '#e8e6e1'; g.fillRect(0, 0, 256, 320);
        g.fillStyle = '#b9bdc2'; g.beginPath(); g.ellipse(120, 130, 75, 95, 0.3, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#2e2e30'; g.beginPath(); g.ellipse(150, 180, 45, 60, -0.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.65)'; g.beginPath(); g.ellipse(110, 110, 40, 50, 0.5, 0, Math.PI * 2); g.fill();
      }
    });
  }

  // ---- textures added for the serenity photorealism pass ----------------
  // All of these are new functions with new callers; nothing below replaces
  // a texture another apartment already renders.

  // Large-format stone-look wall tile: the bathroom in 1.webp/8.webp is clad
  // floor-to-ceiling in it, and the platform had no wall tile at all.
  // `cols`/`rows` are tiles per texture repeat, so the grout pitch follows
  // the panel the material is mapped onto rather than being baked in.
  function stoneTileTex(cols = 2, rows = 4, base = '#d9d6d0', grout = '#bdb9b2') {
    return canvasTex(512, 512, (g) => {
      g.fillStyle = base; g.fillRect(0, 0, 512, 512);
      // cloudy mineral mottling, low contrast -- the photograph's tile is
      // almost flat and a strong marble vein reads as a different material
      for (let i = 0; i < 130; i++) {
        const x = Math.random() * 512, y = Math.random() * 512;
        const r = 18 + Math.random() * 70;
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        const d = Math.random() < 0.5 ? 0 : 255;
        grd.addColorStop(0, `rgba(${d},${d},${d},${0.015 + Math.random() * 0.035})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
      g.strokeStyle = grout; g.lineWidth = 2;
      for (let i = 0; i <= cols; i++) {
        const x = i * 512 / cols;
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke();
      }
      for (let i = 0; i <= rows; i++) {
        const y = i * 512 / rows;
        g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke();
      }
    });
  }

  // Kitchen splashback mosaic (5.webp): small grey squares on a dark grout.
  function mosaicTex() {
    return canvasTex(256, 256, (g) => {
      g.fillStyle = '#6f7377'; g.fillRect(0, 0, 256, 256);
      const n = 16, s = 256 / n;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const t = 0.78 + Math.random() * 0.44;
          const v = Math.min(255, 176 * t);
          g.fillStyle = `rgb(${v | 0},${(v * 0.99) | 0},${(v * 0.97) | 0})`;
          g.fillRect(x * s + 1.2, y * s + 1.2, s - 2.4, s - 2.4);
        }
      }
    });
  }

  // Woven rattan/wicker: the terrace lounger and side table in 2.webp and
  // 10.webp both read as weave, not as a flat plastic slab.
  function wickerTex(base = '#b6a993') {
    return canvasTex(256, 256, (g) => {
      g.fillStyle = base; g.fillRect(0, 0, 256, 256);
      const s = 16;
      for (let y = 0; y < 256; y += s) {
        for (let x = 0; x < 256; x += s) {
          const over = ((x / s) + (y / s)) % 2 === 0;
          g.fillStyle = over ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.16)';
          if (over) g.fillRect(x + 1, y + 3, s - 2, s - 6);
          else g.fillRect(x + 3, y + 1, s - 6, s - 2);
        }
      }
      g.strokeStyle = 'rgba(0,0,0,0.10)'; g.lineWidth = 1;
      for (let y = 0; y <= 256; y += s) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
      for (let x = 0; x <= 256; x += s) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
    });
  }

  // Macrame wall hanging (11.webp): a dowel, a grid of navy/white discs and
  // a cream fringe. Drawn with alpha so the fringe silhouette is real
  // rather than a rectangle of cream.
  function macrameTex() {
    return canvasTex(256, 256, (g) => {
      g.clearRect(0, 0, 256, 256);
      g.fillStyle = '#c9b79c'; g.fillRect(24, 18, 208, 14);   // dowel
      const cols = 5;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < cols - r; c++) {
          const x = 128 + (c - (cols - r - 1) / 2) * 34;
          const y = 56 + r * 30;
          g.fillStyle = ((r + c) % 2) ? '#f2efe8' : '#27407a';
          g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fill();
        }
      }
      g.strokeStyle = '#efe9dc'; g.lineWidth = 4; g.lineCap = 'round';
      for (let i = 0; i < 26; i++) {
        const x = 40 + i * 7;
        const drop = 150 + Math.sin(i * 0.55) * 34;
        g.beginPath(); g.moveTo(x, 140); g.lineTo(x + Math.sin(i) * 3, drop + 90); g.stroke();
      }
    }, 1, 1);
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

  // Fired-clay terrace tiles ("červená pálená" per the Horky One standards)
  function terracottaTex() {
    return canvasTex(512, 512, (g) => {
      const T2 = 128;
      for (let y = 0; y < 512; y += T2) {
        for (let x = 0; x < 512; x += T2) {
          const tone = 0.86 + Math.random() * 0.28;
          g.fillStyle = `rgb(${Math.min(255, 178 * tone) | 0},${(96 * tone) | 0},${(66 * tone) | 0})`;
          g.fillRect(x, y, T2, T2);
          for (let i = 0; i < 14; i++) {
            g.fillStyle = `rgba(120,55,35,${0.05 + Math.random() * 0.1})`;
            g.beginPath();
            g.ellipse(x + Math.random() * T2, y + Math.random() * T2,
              4 + Math.random() * 14, 2 + Math.random() * 6, Math.random() * Math.PI, 0, Math.PI * 2);
            g.fill();
          }
          g.strokeStyle = 'rgba(90,45,30,0.75)'; g.lineWidth = 3;
          g.strokeRect(x + 1, y + 1, T2 - 2, T2 - 2);
        }
      }
    });
  }

  // Matte concrete-look 600×600 tiles (Macroni Factor, bathroom)
  function tileGrayTex() {
    return canvasTex(512, 512, (g) => {
      const T2 = 256;
      for (let y = 0; y < 512; y += T2) {
        for (let x = 0; x < 512; x += T2) {
          const tone = 0.92 + Math.random() * 0.14;
          g.fillStyle = `rgb(${(158 * tone) | 0},${(158 * tone) | 0},${(160 * tone) | 0})`;
          g.fillRect(x, y, T2, T2);
          for (let i = 0; i < 60; i++) {
            g.fillStyle = `rgba(${110 + Math.random() * 90 | 0},${110 + Math.random() * 90 | 0},${115 + Math.random() * 90 | 0},0.07)`;
            g.beginPath();
            g.ellipse(x + Math.random() * T2, y + Math.random() * T2,
              8 + Math.random() * 40, 5 + Math.random() * 22, Math.random() * Math.PI, 0, Math.PI * 2);
            g.fill();
          }
          g.strokeStyle = 'rgba(105,105,108,0.6)'; g.lineWidth = 2;
          g.strokeRect(x + 1, y + 1, T2 - 2, T2 - 2);
        }
      }
    });
  }

  // Bed throw-blanket patterns, cached per pattern name. Furniture-facing
  // (only F.bed in builder.js calls this), but it is a canvasTex-based
  // texture generator like the others above, so it lives here too.
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
      } else if (pat === 'stripes') {
        // sage and terracotta bands — bedroom 3's accent
        g.fillStyle = '#eae6dc'; g.fillRect(0, 0, 256, 256);
        const cols = ['#7f8c73', '#c98b62', '#eae6dc', '#9aa88d', '#eae6dc'];
        for (let r = 0; r < 12; r++) {
          g.fillStyle = cols[r % 5];
          g.fillRect(0, r * 22, 256, r % 5 === 1 ? 7 : 14);
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

  // Terrace-chair polka-dot cushion (photo 18). Lazily built on first use —
  // not every apartment has a terrace chair — and cached after that, exactly
  // as the inline version in builder.js behaved.
  let dotsMatCache = null;
  function dotsMat() {
    if (!dotsMatCache) {
      dotsMatCache = new T.MeshStandardMaterial({
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
    return dotsMatCache;
  }

  // ---------- Materials ----------
  // `palette` is APT.palette from the apartment config: material key -> hex
  // string, sampled from the real photographs by tools/sample_palette.py
  // (Task 8). Every key is optional; an absent or invalid value falls back
  // to the hardcoded constant it always had, so an apartment with no
  // palette block renders exactly as before.
  //
  // Reads APT.palette directly (rather than the `palette` argument below)
  // so it can also be called as Materials.color() from outside init() --
  // bake.js's merged wall mesh (see bakeWalls()) needs the same validated
  // hex lookup for its own base tint, since wall pieces are baked straight
  // from wallPieces data and never touch M.wall. Keeping the hex
  // parsing/validation in this one place avoids a second copy of the
  // regex drifting out of sync.
  function color(key, fallback) {
    const v = APT.palette && APT.palette[key];
    if (typeof v !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(v)) return fallback;
    return parseInt(v.slice(1), 16);
  }

  // Same validated-hex lookup as color(), but returned as an [r,g,b] triple
  // for the procedural texture generators, which draw with CSS colour
  // strings rather than a THREE.Color. Absent/invalid -> null, and every
  // caller falls back to the constant it always had.
  function rgb(key) {
    const v = APT.palette && APT.palette[key];
    if (typeof v !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(v)) return null;
    const n = parseInt(v.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function init(palette) {
    const col = color;

    const wood = floorTex(rgb('floorWoodBase'));
    wood.repeat.set(3, 3);
    M.floorWood = new T.MeshStandardMaterial({ map: wood, color: col('floorWood', 0xffffff), roughness: 0.55, metalness: 0.04 });
    const ash = woodTex('#cdbc9f', 'rgba(150,130,105,0)', false);
    ash.repeat.set(1.2, 1.2);
    M.ash = new T.MeshStandardMaterial({ map: ash, color: col('ash', 0xffffff), roughness: 0.75 });
    const ashV = woodTex('#c6b394', 'rgba(150,130,105,0)', false);
    ashV.repeat.set(1.2, 1.2); ashV.rotation = Math.PI / 2;
    M.ashV = new T.MeshStandardMaterial({ map: ashV, color: col('ash', 0xffffff), roughness: 0.75 });
    M.wall = new T.MeshStandardMaterial({ color: col('wall', 0xe8e4db), roughness: 0.95 });
    M.ceil = new T.MeshStandardMaterial({ color: 0xf7f6f2, roughness: 0.95 });
    M.marbleW = new T.MeshStandardMaterial({ map: marbleTex('#e9e9eb', 'rgba(120,125,135,A)'), roughness: 0.35 });
    M.marbleB = new T.MeshStandardMaterial({ map: marbleTex('#1a1a1e', 'rgba(220,220,225,A)', 16), roughness: 0.4 });
    M.deck = new T.MeshStandardMaterial({ map: deckTex(), roughness: 0.85 });
    M.terracotta = new T.MeshStandardMaterial({ map: terracottaTex(), roughness: 0.8 });
    M.tileGray = new T.MeshStandardMaterial({ map: tileGrayTex(), color: col('tileGray', 0xffffff), roughness: 0.4 });
    M.white = new T.MeshStandardMaterial({ color: 0xf5f4f0, roughness: 0.6 });
    M.counter = new T.MeshStandardMaterial({ map: marbleTex('#eceded', 'rgba(140,140,145,A)', 14), color: col('counter', 0xffffff), roughness: 0.3 });
    M.black = new T.MeshStandardMaterial({ color: 0x17171a, roughness: 0.5 });
    M.tv = new T.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.25, metalness: 0.4 });
    M.chrome = new T.MeshStandardMaterial({ color: 0xd8dadf, roughness: 0.25, metalness: 0.9 });
    M.glass = new T.MeshStandardMaterial({ color: 0xcfe4ea, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22, side: T.DoubleSide });
    M.winGlass = new T.MeshStandardMaterial({ color: 0xcfe2ee, emissive: 0x9fc4dd, emissiveIntensity: 0.4, roughness: 0.2, transparent: true, opacity: 0.9, side: T.DoubleSide });
    M.cream = new T.MeshStandardMaterial({ color: 0xe6e0d4, roughness: 0.9 });
    // M.navy is also the serenity sofa's fabric colour (F.sofa in
    // builder.js, o.col === 'navy'), so it doubles as the 'sofa' palette
    // key; it is reused for a handful of navy decor accents too, which is
    // fine since they read as the same fabric hue.
    M.navy = new T.MeshStandardMaterial({ color: col('sofa', 0x233054), roughness: 0.85 });
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
    // Exterior: pool basin and the planting/fence mass behind it (plan 4c
    // task 1). New keys only -- no existing entry above or below is touched,
    // because task 4 re-fits `exposure` and a silently altered old colour
    // would land inside that fit and be unattributable.
    M.poolCoping = new T.MeshStandardMaterial({ color: col('poolCoping', 0xcfc9bd), roughness: 0.82, metalness: 0.02 });
    M.poolWall = new T.MeshStandardMaterial({ color: col('poolWall', 0xd8eff1), roughness: 0.35 });
    // Ripple, not a flat fill. 10.webp's water is the largest single surface
    // in that frame and a constant colour reads as painted concrete at any
    // exposure -- the caustic banding is what makes it read as water.
    const ripple = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#0fe6ff'; g.fillRect(0, 0, w, h);
      g.globalAlpha = 0.16;
      for (let i = 0; i < 90; i++) {
        const y = (i * 37) % h;
        g.strokeStyle = i % 3 ? '#7df4ff' : '#00a8c8';
        g.lineWidth = 1 + (i % 4);
        g.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const yy = y + Math.sin((x / w) * Math.PI * (2 + (i % 5)) + i) * (3 + (i % 6));
          if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy);
        }
        g.stroke();
      }
      g.globalAlpha = 1;
    }, 6, 6);
    // roughness 0.10 + metalness 0.20 concentrated the sun into one blown
    // white blob on the surface; the photographs' water is finely rippled
    // with no single specular hotspot.
    M.poolWater = new T.MeshStandardMaterial({ map: ripple, color: col('poolWater', 0xffffff), roughness: 0.34, metalness: 0.06 });
    M.hedgeDark = new T.MeshStandardMaterial({ color: col('hedgeDark', 0x3f5f3a), roughness: 0.95 });
    // Canopy fronds. These are crossed quads, and with an opaque material
    // they read as a green skyline of rectangles -- measured, not guessed:
    // the first build of this exterior did exactly that. The alpha cut-out
    // is what turns them into planting. alphaTest rather than transparent,
    // so they need no depth sorting against the water plane behind them.
    const frondAlpha = canvasTex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const cx = w / 2;
      for (let s = 0; s < 19; s++) {
        const a = (-0.5 + s / 18) * 2.5;                 // fan of leaf blades
        const len = h * (0.40 + 0.10 * Math.cos(a * 1.6));
        g.save();
        g.translate(cx, h * 0.96);
        g.rotate(a);
        const grd = g.createLinearGradient(0, 0, 0, -len);
        grd.addColorStop(0, '#3d6b39');
        grd.addColorStop(1, '#7fb45f');
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(-len * 0.30, -len * 0.55, 0, -len);
        g.quadraticCurveTo(len * 0.30, -len * 0.55, 0, 0);
        g.fill();
        g.strokeStyle = 'rgba(30,55,28,0.85)';
        g.lineWidth = 2;
        for (let t = 0.15; t < 1; t += 0.12) {           // leaflet notches
          g.beginPath();
          g.moveTo(0, -len * t);
          g.lineTo((s % 2 ? 1 : -1) * len * 0.13, -len * (t + 0.05));
          g.stroke();
        }
        g.restore();
      }
    });
    frondAlpha.wrapS = frondAlpha.wrapT = T.ClampToEdgeWrapping;
    M.frond = new T.MeshStandardMaterial({
      map: frondAlpha, alphaTest: 0.45, roughness: 0.95, side: T.DoubleSide
    });
    const palmAlpha = canvasTex(256, 128, (g) => {
      g.clearRect(0, 0, 256, 128);
      // rachis
      g.strokeStyle = '#3d5c2e'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(4, 64); g.quadraticCurveTo(140, 34, 252, 70); g.stroke();
      // leaflets, shorter toward the tip
      for (let i = 0; i < 34; i++) {
        const t = i / 33;
        const x = 4 + t * 248;
        const y = 64 + (t * t * 40) - t * 48;
        const len = 44 * Math.sin(Math.PI * Math.min(1, t * 1.25)) + 6;
        g.strokeStyle = `rgb(${58 + i % 3 * 7},${96 + i % 4 * 8},${44 + i % 3 * 6})`;
        g.lineWidth = 3.2;
        for (const s of [-1, 1]) {
          g.beginPath(); g.moveTo(x, y);
          g.quadraticCurveTo(x + 10 * s * 0.2, y + s * len * 0.55, x + 16, y + s * len);
          g.stroke();
        }
      }
    });
    palmAlpha.wrapS = palmAlpha.wrapT = T.ClampToEdgeWrapping;
    M.palmLeaf = new T.MeshStandardMaterial({
      map: palmAlpha, alphaTest: 0.4, roughness: 0.92, side: T.DoubleSide
    });
    M.fenceWhite = new T.MeshStandardMaterial({ color: col('fenceWhite', 0xe4e1d8), roughness: 0.9 });
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

    // ---- serenity photorealism pass: new materials, no existing one
    // replaced. Every one of these is reached only from a new opt-in
    // constructor or a new opt-in flag, so kings-court and horkyone-10
    // never touch them.
    const stoneWall = stoneTileTex(2, 4, '#bab6ae', '#9d9992');
    stoneWall.repeat.set(1, 1);
    M.stoneTile = new T.MeshStandardMaterial({ map: stoneWall, color: col('stoneTile', 0xffffff), roughness: 0.42 });
    const stoneFl = stoneTileTex(3, 3, '#c6c3bd', '#a9a59e');
    M.stoneFloorTile = new T.MeshStandardMaterial({ map: stoneFl, color: col('stoneTile', 0xffffff), roughness: 0.38 });
    M.mosaic = new T.MeshStandardMaterial({ map: mosaicTex(), roughness: 0.35, metalness: 0.05 });
    M.wicker = new T.MeshStandardMaterial({ map: wickerTex(col2('wicker', '#b6a993')), roughness: 0.92 });
    M.wickerDark = new T.MeshStandardMaterial({ map: wickerTex('#8a6a4a'), roughness: 0.9 });
    M.macrame = new T.MeshStandardMaterial({ map: macrameTex(), roughness: 1, transparent: true, side: T.DoubleSide });
    M.walnut = new T.MeshStandardMaterial({ map: woodTex('#7d6247', 'rgba(45,32,20,0.5)', false), roughness: 0.62 });
    M.oakPale = new T.MeshStandardMaterial({ map: woodTex('#cfc3ad', 'rgba(150,135,110,0.3)', false), roughness: 0.7 });
    // A mirror in a scene with no reflection probe of its own still has the
    // apartment's captured environment map, so a smooth low-roughness metal
    // reads as a mirror rather than as a grey card.
    M.mirror = new T.MeshStandardMaterial({ color: 0xdfe6ea, roughness: 0.10, metalness: 0.45 });
    M.tintGlass = new T.MeshStandardMaterial({ color: 0x6fada8, roughness: 0.08, metalness: 0.25, transparent: true, opacity: 0.42, side: T.DoubleSide });
    M.sheer = new T.MeshStandardMaterial({ color: 0xf8f8f4, roughness: 1, transparent: true, opacity: 0.30, side: T.DoubleSide });
    M.palmTrunk = new T.MeshStandardMaterial({ map: woodTex('#8b7f68', 'rgba(60,50,35,0.5)', false), roughness: 0.95 });
    M.terracottaPot = new T.MeshStandardMaterial({ color: 0xc9c4bb, roughness: 0.85 });
    M.acBody = new T.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.45 });
    M.rust = new T.MeshStandardMaterial({ color: 0xa8492f, roughness: 0.92 });
    M.petrol = new T.MeshStandardMaterial({ color: 0x2f5f7e, roughness: 0.94 });
    M.steelDark = new T.MeshStandardMaterial({ color: 0xb9bcc0, roughness: 0.35, metalness: 0.75 });
    M.doorGray = new T.MeshStandardMaterial({ map: woodTex('#9c9a97', 'rgba(90,88,86,0.35)', false), roughness: 0.72 });
    M.doorSlate = new T.MeshStandardMaterial({ map: woodTex('#6e7175', 'rgba(45,47,50,0.4)', false), roughness: 0.6 });
  }

  // CSS-string sibling of color(): the canvas generators need '#rrggbb',
  // not a THREE colour int, and the same validation has to gate both.
  function col2(key, fallback) {
    const v = APT.palette && APT.palette[key];
    return (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) ? v : fallback;
  }

  return { M, init, canvasTex, artTex, throwMat, dotsMat, color };
})();
