// ============================================================
// Инициализация сцены, цикл, мини-карта, подпись комнаты
// ============================================================

window.initApp = function () {
  const canvas = document.getElementById('view');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbcd5e8);
  scene.fog = new THREE.Fog(0xbcd5e8, 40, 90);

  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 120);

  const colliders = Builder.build(scene);
  Builder.mergeStatic(scene);
  const controls = new WalkControls(camera, canvas, colliders);
  // на тач-устройствах ограничиваем плотность пикселей ради FPS
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, controls.isTouch ? 1.6 : 2));
  resize();

  // Запекание света: асинхронно, с прогрессом на оверлее
  const goBtn = document.getElementById('goBtn');
  const goText = goBtn.textContent;
  goBtn.textContent = 'Запекаем свет… 0%';
  goBtn.style.opacity = '0.6';
  const doll = new DollMode(scene, camera, controls, canvas);
  window.__bakeReady = Baker.run(scene, Builder.bakeData, (p) => {
    goBtn.textContent = 'Запекаем свет… ' + Math.round(p * 100) + '%';
  }).then(() => {
    goBtn.textContent = goText;
    goBtn.style.opacity = '1';
    doll.classify();
  });

  // ---------- Режим макета ----------
  document.getElementById('dollBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!doll.on) doll.enter();
  });
  document.getElementById('dollExit').addEventListener('click', (e) => {
    e.stopPropagation();
    doll.exit(true);
  });
  document.getElementById('dollLvl1').addEventListener('click', (e) => { e.stopPropagation(); doll.setLevel('1'); });
  document.getElementById('dollLvlAll').addEventListener('click', (e) => { e.stopPropagation(); doll.setLevel('all'); });
  document.getElementById('dollMeasure').addEventListener('click', (e) => {
    e.stopPropagation();
    doll.setMeasure(!doll.measure);
  });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && doll.on) doll.exit(false);
  });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  document.getElementById('overlay').addEventListener('click', () => controls.lock());

  // ---------- Меню «Комнаты»: телепорт по точкам ----------
  const roomsBtn = document.getElementById('roomsBtn');
  const roomsPanel = document.getElementById('roomsPanel');
  let lastLvl = null;
  for (const s of APT.spawns) {
    const lvl = s.g === 0 ? '1 этаж' : s.g === 2.62 ? 'Улица' : '2 этаж';
    if (lvl !== lastLvl) {
      const hdr = document.createElement('div');
      hdr.className = 'lvl';
      hdr.textContent = lvl;
      roomsPanel.appendChild(hdr);
      lastLvl = lvl;
    }
    const b = document.createElement('button');
    b.textContent = s.name;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (doll.on) doll.exit(false);
      controls.pos.x = s.x; controls.pos.z = s.z;
      controls.yaw = s.yaw; controls.pitch = 0;
      controls.ground = s.g;
      roomsPanel.style.display = 'none';
    });
    roomsPanel.appendChild(b);
  }
  roomsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    roomsPanel.style.display = roomsPanel.style.display === 'block' ? 'none' : 'block';
  });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') roomsPanel.style.display = 'none';
  });
  if (controls.isTouch) {
    document.getElementById('overlayText').innerHTML =
      'Двухуровневые апартаменты с террасой, восстановленные по фотографиям и поэтажному плану.<br>' +
      'Левая половина экрана — джойстик ходьбы, правая — осмотр.<br>' +
      'Кнопки сверху слева: <b>☰ Комнаты</b> — телепорт, <b>⌂ Макет</b> — вид сверху.<br>' +
      'Значки 📷 в комнатах показывают реальные фотографии.';
    document.getElementById('goBtn').textContent = 'Коснись, чтобы войти';
  }

  // ---------- Фото-споты: маркеры + просмотр ----------
  const photoBtn = document.getElementById('photoBtn');
  const photoView = document.getElementById('photoView');
  // Чёткая векторная иконка камеры (256px + мипмапы)
  const camTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(22,24,28,0.88)';
    g.beginPath(); g.arc(128, 128, 118, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#e8e2d5'; g.lineWidth = 10;
    g.beginPath(); g.arc(128, 128, 118, 0, Math.PI * 2); g.stroke();
    // корпус камеры
    g.fillStyle = '#f2efe8';
    g.beginPath(); g.roundRect(58, 96, 140, 92, 16); g.fill();
    // выступ видоискателя
    g.beginPath(); g.roundRect(98, 74, 60, 30, 10); g.fill();
    // объектив
    g.fillStyle = '#16181c';
    g.beginPath(); g.arc(128, 142, 34, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#f2efe8'; g.lineWidth = 8;
    g.beginPath(); g.arc(128, 142, 20, 0, Math.PI * 2); g.stroke();
    // вспышка
    g.fillStyle = '#16181c';
    g.beginPath(); g.arc(180, 112, 8, 0, Math.PI * 2); g.fill();
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  })();
  for (const s of APT.photoSpots) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: camTex, depthTest: true }));
    sp.position.set(s.x, s.g + 1.9, s.z);
    sp.scale.set(0.34, 0.34, 1);
    scene.add(sp);
  }
  let nearSpot = null;
  function checkPhotoSpot() {
    if (doll.on) { photoBtn.style.display = 'none'; nearSpot = null; return; }
    let best = null, bd = 1.6;
    for (const s of APT.photoSpots) {
      if (Math.abs(s.g - controls.ground) > 0.6) continue;
      const d = Math.hypot(s.x - controls.pos.x, s.z - controls.pos.z);
      if (d < bd) { bd = d; best = s; }
    }
    nearSpot = best;
    photoBtn.style.display = best ? 'block' : 'none';
    if (best) photoBtn.textContent = '📷 Фото: ' + best.name;
  }
  function openPhoto(s) {
    const base = (APT.meta && APT.meta.photoBase) || 'photos/';
    document.getElementById('photoImg').src = base + s.file;
    document.getElementById('photoCap').textContent = s.name + ' — реальное фото квартиры';
    photoView.style.display = 'flex';
    if (document.pointerLockElement) document.exitPointerLock();
  }
  photoBtn.addEventListener('click', (e) => { e.stopPropagation(); if (nearSpot) openPhoto(nearSpot); });
  photoView.addEventListener('click', () => {
    photoView.style.display = 'none';
  });
  // F — фото рядом (когда курсор захвачен и кнопку не нажать)
  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyF' && nearSpot && photoView.style.display !== 'flex') openPhoto(nearSpot);
    if (e.code === 'KeyM' && photoView.style.display !== 'flex') {
      if (doll.on) doll.exit(false); else doll.enter();
    }
  });

  // ---------- Мини-карта ----------
  const mapC = document.getElementById('minimap');
  const mg = mapC.getContext('2d');
  const MAP = { x1: 0.0, z1: -2.6, x2: 24.4, z2: 7.2 };
  function mapPt(x, z) {
    const sx = mapC.width / (MAP.x2 - MAP.x1);
    const sz = mapC.height / (MAP.z2 - MAP.z1);
    const s = Math.min(sx, sz);
    return [ (x - MAP.x1) * s, (z - MAP.z1) * s ];
  }
  function drawMap() {
    const upper = controls.ground >= 1.5;
    mg.clearRect(0, 0, mapC.width, mapC.height);
    mg.fillStyle = 'rgba(20,22,26,0.78)';
    mg.fillRect(0, 0, mapC.width, mapC.height);
    // полы
    const lists = upper
      ? [...APT.floors.upper, ...APT.floors.terrace]
      : APT.floors.main;
    mg.fillStyle = upper ? 'rgba(190,175,150,0.25)' : 'rgba(190,175,150,0.25)';
    for (const f of lists) {
      const [a, b] = mapPt(f.x1, f.z1), [c, d] = mapPt(f.x2, f.z2);
      mg.fillRect(a, b, c - a, d - b);
    }
    // стены
    mg.strokeStyle = '#e8e2d5';
    mg.lineWidth = 1.6;
    for (const w of APT.walls) {
      const isUp = w.lvl === 'upper';
      if (isUp !== upper) continue;
      const [a, b] = mapPt(w.x1, w.z1), [c, d] = mapPt(w.x2, w.z2);
      mg.beginPath(); mg.moveTo(a, b); mg.lineTo(c, d); mg.stroke();
    }
    // лестница
    mg.strokeStyle = 'rgba(232,226,213,0.5)';
    const s = APT.stairs;
    for (let i = 0; i <= 8; i++) {
      const x = s.x1 + (s.x2 - s.x1) * i / 8;
      const [a, b] = mapPt(x, s.z1), [c, d] = mapPt(x, s.z2);
      mg.beginPath(); mg.moveTo(a, b); mg.lineTo(c, d); mg.stroke();
    }
    // игрок
    const [px, py] = mapPt(controls.pos.x, controls.pos.z);
    mg.fillStyle = '#ffb454';
    mg.beginPath();
    mg.arc(px, py, 4, 0, Math.PI * 2);
    mg.fill();
    const a2 = controls.yaw;
    mg.strokeStyle = '#ffb454';
    mg.lineWidth = 2;
    mg.beginPath();
    mg.moveTo(px, py);
    mg.lineTo(px - Math.sin(a2) * 10, py - Math.cos(a2) * 10);
    mg.stroke();
    // подпись этажа
    mg.fillStyle = '#fff';
    mg.font = '11px system-ui';
    mg.fillText(upper ? '2 этаж · терраса' : '1 этаж', 8, mapC.height - 8);
  }

  // ---------- Подпись комнаты ----------
  const roomEl = document.getElementById('room');
  function roomName() {
    const g = controls.ground;
    for (const r of APT.roomLabels) {
      const okLvl = (r.y === -1)
        ? (g > 0.2 && g < 2.9)
        : (Math.abs((r.y) - g) < 0.6);
      if (!okLvl) continue;
      if (controls.pos.x >= r.x1 && controls.pos.x <= r.x2 && controls.pos.z >= r.z1 && controls.pos.z <= r.z2) return r.name;
    }
    return '';
  }

  window.__app = { scene, camera, renderer, controls, doll, drawMap, roomName };

  let last = performance.now();
  let frame = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    controls.update(dt);
    doll.update();
    renderer.render(scene, camera);
    if ((frame++ & 3) === 0) {
      drawMap();
      checkPhotoSpot();
      roomEl.textContent = doll.on
        ? (doll.measure ? 'Рулетка · два клика по полу — расстояние' : 'Режим макета · клик по полу — войти')
        : roomName();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
};
