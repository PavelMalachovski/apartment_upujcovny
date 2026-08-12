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

  function init(palette) {
    const col = color;

    const wood = floorTex();
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

  return { M, init, canvasTex, artTex, throwMat, dotsMat, color };
})();
