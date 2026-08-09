// ============================================================
// Режим «кукольный домик»: орбитальная камера над квартирой
// без крыши, срез по этажам, клик по полу — телепорт в точку.
// ============================================================

class DollMode {
  constructor(scene, camera, controls, dom) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.dom = dom;
    this.on = false;
    this.level = 'all';                       // '1' | 'all'
    this.orbit = { yaw: -Math.PI / 2, pitch: 0.95, dist: 17 };
    this.target = new THREE.Vector3(12.4, 1.2, 2.3);
    this.camPos = new THREE.Vector3();
    this.groups = { g1: [], g2: [], roof: [], walls1: null, walls2: null };
    this.ray = new THREE.Raycaster();
    this.drag = { active: false, moved: 0, x: 0, y: 0, dist2: 0 };
    this.bindInput();
  }

  // Раскладываем меши по «этажам» (после запекания)
  classify() {
    const box = new THREE.Box3();
    this.scene.traverse((o) => {
      if (!o.isMesh || o.parent !== this.scene) return;
      if (o.userData.doll === 'walls1') { this.groups.walls1 = o; return; }
      if (o.userData.doll === 'walls2') { this.groups.walls2 = o; return; }
      box.setFromObject(o);
      if (box.isEmpty()) return;
      const cy = (box.min.y + box.max.y) / 2;
      if (cy > 4.9) this.groups.roof.push(o);
      else if (cy > 2.55) this.groups.g2.push(o);
      else this.groups.g1.push(o);
    });
    // группы мебели лежат в scene как Group
    this.scene.children.forEach((o) => {
      if (o.isGroup) {
        box.setFromObject(o);
        if (box.isEmpty()) return;
        const cy = (box.min.y + box.max.y) / 2;
        if (cy > 4.9) this.groups.roof.push(o);
        else if (cy > 2.55) this.groups.g2.push(o);
        else this.groups.g1.push(o);
      }
    });
  }

  applyVisibility() {
    const showUpper = !this.on || this.level === 'all';
    for (const o of this.groups.g2) o.visible = showUpper;
    if (this.groups.walls2) this.groups.walls2.visible = showUpper;
    for (const o of this.groups.roof) o.visible = !this.on;
    for (const o of this.groups.g1) o.visible = true;
    if (this.groups.walls1) this.groups.walls1.visible = true;
  }

  enter() {
    this.on = true;
    this.controls.enabled = false;
    if (document.pointerLockElement) document.exitPointerLock();
    this.camPos.copy(this.camera.position);
    this.applyVisibility();
    document.getElementById('dollHud').style.display = 'flex';
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('joy').style.display = 'none';
    this.syncButtons();
  }

  exit(lockPointer) {
    this.on = false;
    this.controls.enabled = true;
    this.applyVisibility();
    document.getElementById('dollHud').style.display = 'none';
    if (this.controls.isTouch) {
      document.getElementById('joy').style.display = 'block';
    } else if (lockPointer) {
      this.controls.lock();
    }
  }

  setLevel(lvl) {
    this.level = lvl;
    this.applyVisibility();
    this.syncButtons();
  }

  syncButtons() {
    document.getElementById('dollLvl1').classList.toggle('act', this.level === '1');
    document.getElementById('dollLvlAll').classList.toggle('act', this.level === 'all');
  }

  // Клик/тап по полу — телепорт в точку
  teleport(clientX, clientY) {
    const r = this.dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - r.left) / r.width) * 2 - 1,
      -((clientY - r.top) / r.height) * 2 + 1
    );
    this.ray.setFromCamera(ndc, this.camera);
    const hits = this.ray.intersectObjects(this.scene.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o && o !== this.scene && !o.visible) o = o.parent;
      if (!h.object.visible) continue;
      if (!h.face || h.face.normal.clone().transformDirection(h.object.matrixWorld).y < 0.6) continue;
      const g = this.controls.groundAt(h.point.x, h.point.z, h.point.y);
      if (g === null || Math.abs(g - h.point.y) > 0.6) continue;
      this.controls.pos.x = h.point.x;
      this.controls.pos.z = h.point.z;
      this.controls.ground = g;
      this.exit(true);
      return true;
    }
    return false;
  }

  bindInput() {
    const d = this.dom;
    // мышь: drag — орбита, короткий клик — телепорт, колесо — зум
    d.addEventListener('mousedown', (e) => {
      if (!this.on) return;
      this.drag = { active: true, moved: 0, x: e.clientX, y: e.clientY };
    });
    d.addEventListener('mousemove', (e) => {
      if (!this.on || !this.drag.active) return;
      const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
      this.drag.moved += Math.abs(dx) + Math.abs(dy);
      this.drag.x = e.clientX; this.drag.y = e.clientY;
      this.orbit.yaw -= dx * 0.005;
      this.orbit.pitch = Math.max(0.3, Math.min(1.45, this.orbit.pitch + dy * 0.004));
    });
    d.addEventListener('mouseup', (e) => {
      if (!this.on || !this.drag.active) return;
      this.drag.active = false;
      if (this.drag.moved < 6) this.teleport(e.clientX, e.clientY);
    });
    d.addEventListener('wheel', (e) => {
      if (!this.on) return;
      this.orbit.dist = Math.max(6, Math.min(38, this.orbit.dist * (1 + e.deltaY * 0.001)));
      e.preventDefault();
    }, { passive: false });

    // тач: один палец — орбита, два — пинч-зум, тап — телепорт
    d.addEventListener('touchstart', (e) => {
      if (!this.on) return;
      if (e.touches.length === 1) {
        this.drag = { active: true, moved: 0, x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        this.drag.active = false;
        this.drag.dist2 = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY);
      }
      e.preventDefault();
    }, { passive: false });
    d.addEventListener('touchmove', (e) => {
      if (!this.on) return;
      if (e.touches.length === 1 && this.drag.active) {
        const t = e.touches[0];
        const dx = t.clientX - this.drag.x, dy = t.clientY - this.drag.y;
        this.drag.moved += Math.abs(dx) + Math.abs(dy);
        this.drag.x = t.clientX; this.drag.y = t.clientY;
        this.orbit.yaw -= dx * 0.006;
        this.orbit.pitch = Math.max(0.3, Math.min(1.45, this.orbit.pitch + dy * 0.005));
      } else if (e.touches.length === 2) {
        const nd = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY);
        if (this.drag.dist2 > 0) {
          this.orbit.dist = Math.max(6, Math.min(38, this.orbit.dist * this.drag.dist2 / nd));
        }
        this.drag.dist2 = nd;
      }
      e.preventDefault();
    }, { passive: false });
    d.addEventListener('touchend', (e) => {
      if (!this.on) return;
      if (this.drag.active && this.drag.moved < 8 && e.changedTouches.length === 1) {
        const t = e.changedTouches[0];
        this.teleport(t.clientX, t.clientY);
      }
      this.drag.active = false;
      e.preventDefault();
    }, { passive: false });
  }

  update() {
    if (!this.on) return;
    const o = this.orbit;
    const desired = new THREE.Vector3(
      this.target.x + Math.cos(o.yaw) * Math.cos(o.pitch) * o.dist,
      this.target.y + Math.sin(o.pitch) * o.dist,
      this.target.z + Math.sin(o.yaw) * Math.cos(o.pitch) * o.dist
    );
    this.camPos.lerp(desired, 0.14);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.target);
  }
}
