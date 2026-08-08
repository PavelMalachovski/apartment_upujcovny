// ============================================================
// Инициализация сцены, цикл, мини-карта, подпись комнаты
// ============================================================

(function () {
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
  const controls = new WalkControls(camera, canvas, colliders);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  document.getElementById('overlay').addEventListener('click', () => controls.lock());
  if (controls.isTouch) {
    document.getElementById('overlayText').innerHTML =
      'Двухуровневые апартаменты с террасой, восстановленные по фотографиям и поэтажному плану.<br>' +
      'Левая половина экрана — джойстик ходьбы, правая — осмотр.<br>' +
      'Лестница на второй этаж — за раздвижной дверью у кухни.';
    document.getElementById('goBtn').textContent = 'Коснись, чтобы войти';
  }

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

  window.__app = { scene, camera, renderer, controls, drawMap, roomName };

  let last = performance.now();
  let frame = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    controls.update(dt);
    renderer.render(scene, camera);
    if ((frame++ & 3) === 0) {
      drawMap();
      roomEl.textContent = roomName();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
