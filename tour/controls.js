// ============================================================
// First-person controls: drag-look, WASD, collisions, floor levels
// ============================================================

class WalkControls {
  constructor(camera, dom, colliders) {
    this.camera = camera;
    this.dom = dom;
    this.colliders = colliders;
    this.yaw = APT.start.yaw;
    this.pitch = 0;
    this.pos = { x: APT.start.x, z: APT.start.z };
    this.ground = 0;          // floor height under the player
    this.eye = 1.6;
    this.keys = {};
    this.locked = false;
    this.radius = 0.24;
    this.enabled = true;   // false in dollhouse mode
    this.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    this.touch = { moveId: null, lookId: null, ox: 0, oy: 0, mx: 0, mz: 0, lx: 0, ly: 0 };

    document.addEventListener('keydown', e => { this.keys[e.code] = true; });
    document.addEventListener('keyup', e => { this.keys[e.code] = false; });

    // Drag-look: the cursor stays visible, buttons stay clickable
    this.dragLook = false;
    this._lx = 0; this._ly = 0;
    dom.style.cursor = 'grab';
    dom.addEventListener('mousedown', (e) => {
      if (!this.enabled || e.button !== 0) return;
      this.dragLook = true;
      this._lx = e.clientX; this._ly = e.clientY;
      dom.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.dragLook || !this.enabled) return;
      this.yaw -= (e.clientX - this._lx) * 0.005;
      this.pitch -= (e.clientY - this._ly) * 0.005;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
      this._lx = e.clientX; this._ly = e.clientY;
    });
    document.addEventListener('mouseup', () => {
      this.dragLook = false;
      dom.style.cursor = 'grab';
    });

    // --- Touch controls: left half — joystick, right half — look ---
    const joy = document.getElementById('joy');
    const knob = document.getElementById('joyKnob');
    const JR = 55; // joystick radius, px
    const onStart = (e) => {
      if (!this.enabled) return;
      for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth / 2 && this.touch.moveId === null) {
          this.touch.moveId = t.identifier;
          this.touch.ox = t.clientX; this.touch.oy = t.clientY;
          this.touch.mx = 0; this.touch.mz = 0;
          if (joy) {
            joy.classList.remove('docked');
            joy.style.display = 'block';
            joy.style.left = (t.clientX - JR) + 'px';
            joy.style.top = (t.clientY - JR) + 'px';
            joy.style.bottom = 'auto';
            knob.style.transform = 'translate(0px,0px)';
          }
        } else if (this.touch.lookId === null) {
          this.touch.lookId = t.identifier;
          this.touch.lx = t.clientX; this.touch.ly = t.clientY;
        }
      }
      e.preventDefault();
    };
    const onMove = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.touch.moveId) {
          let dx = t.clientX - this.touch.ox, dy = t.clientY - this.touch.oy;
          const d = Math.hypot(dx, dy);
          if (d > JR) { dx = dx / d * JR; dy = dy / d * JR; }
          this.touch.mx = dx / JR;
          this.touch.mz = -dy / JR;
          if (knob) knob.style.transform = `translate(${dx}px,${dy}px)`;
        } else if (t.identifier === this.touch.lookId) {
          this.yaw -= (t.clientX - this.touch.lx) * 0.006;
          this.pitch -= (t.clientY - this.touch.ly) * 0.006;
          this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
          this.touch.lx = t.clientX; this.touch.ly = t.clientY;
        }
      }
      e.preventDefault();
    };
    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.touch.moveId) {
          this.touch.moveId = null; this.touch.mx = 0; this.touch.mz = 0;
          if (joy) { joy.classList.add('docked'); knob.style.transform = 'translate(0px,0px)'; }
        } else if (t.identifier === this.touch.lookId) {
          this.touch.lookId = null;
        }
      }
      e.preventDefault();
    };
    this.dom.addEventListener('touchstart', onStart, { passive: false });
    this.dom.addEventListener('touchmove', onMove, { passive: false });
    this.dom.addEventListener('touchend', onEnd, { passive: false });
    this.dom.addEventListener('touchcancel', onEnd, { passive: false });
    // On touch devices the joystick is always visible (docked in the corner)
    if (this.isTouch && joy) {
      joy.classList.add('docked');
      joy.style.display = 'block';
    }
  }

  lock() {
    // no pointer lock anymore — just hide the start overlay
    document.getElementById('overlay').style.display = 'none';
  }

  // Floor height at a point
  groundAt(x, z, current) {
    let best = null, bestDiff = Infinity;
    for (const zn of APT.groundZones) {
      if (x < zn.x1 || x > zn.x2 || z < zn.z1 || z > zn.z2) continue;
      let y;
      if (zn.ramp) {
        const r = zn.ramp;
        const t = Math.max(0, Math.min(1, ((r.axis === 'x' ? x : z) - r.from) / (r.to - r.from)));
        y = r.y0 + t * (r.y1 - r.y0);
      } else y = zn.y;
      const diff = Math.abs(y - current);
      if (diff < bestDiff) { bestDiff = diff; best = y; }
    }
    // no "teleporting" between floors through a slab
    if (best === null || bestDiff > 1.4) return null;
    return best;
  }

  activeLvls() {
    if (this.ground < 1.5) return ['main', 'both'];
    return ['upper', 'terrace', 'both'];
  }

  collide(nx, nz) {
    const lvls = this.activeLvls();
    const r = this.radius;
    // wall segments
    for (const s of this.colliders.segs) {
      if (!lvls.includes(s.lvl)) continue;
      const dx = s.x2 - s.x1, dz = s.z2 - s.z1;
      const len2 = dx * dx + dz * dz;
      if (len2 < 1e-9) continue;
      let t = ((nx - s.x1) * dx + (nz - s.z1) * dz) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = s.x1 + t * dx, pz = s.z1 + t * dz;
      const ddx = nx - px, ddz = nz - pz;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 < r * r && d2 > 1e-9) {
        const d = Math.sqrt(d2);
        nx = px + ddx / d * r;
        nz = pz + ddz / d * r;
      }
    }
    // furniture AABBs
    for (const b of this.colliders.boxes) {
      if (!lvls.includes(b.lvl)) continue;
      const cx = Math.max(b.x1, Math.min(nx, b.x2));
      const cz = Math.max(b.z1, Math.min(nz, b.z2));
      const ddx = nx - cx, ddz = nz - cz;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 < r * r) {
        if (d2 > 1e-9) {
          const d = Math.sqrt(d2);
          nx = cx + ddx / d * r;
          nz = cz + ddz / d * r;
        } else {
          // inside the box — push out to the nearest face
          const dl = nx - b.x1, dr = b.x2 - nx, dt = nz - b.z1, db = b.z2 - nz;
          const m = Math.min(dl, dr, dt, db);
          if (m === dl) nx = b.x1 - r; else if (m === dr) nx = b.x2 + r;
          else if (m === dt) nz = b.z1 - r; else nz = b.z2 + r;
        }
      }
    }
    return { x: nx, z: nz };
  }

  update(dt) {
    if (!this.enabled) return;
    const speed = (this.keys.ShiftLeft || this.keys.ShiftRight) ? 3.4 : 1.9;
    let mx = 0, mz = 0;
    if (this.keys.KeyW || this.keys.ArrowUp) mz += 1;
    if (this.keys.KeyS || this.keys.ArrowDown) mz -= 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) mx -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) mx += 1;
    if (this.touch.moveId !== null) { mx += this.touch.mx; mz += this.touch.mz; }
    if (mx || mz) {
      const len = Math.hypot(mx, mz);
      const mag = Math.min(len, 1); // analog joystick speed
      mx = mx / len * mag; mz = mz / len * mag;
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      // yaw=0 looks along -z; the camera uses euler below; forward direction:
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      let nx = this.pos.x + (fx * mz + rx * mx) * speed * dt;
      let nz = this.pos.z + (fz * mz + rz * mx) * speed * dt;
      const c = this.collide(nx, nz);
      // floor check: no floor under the new point — no move
      const g = this.groundAt(c.x, c.z, this.ground);
      if (g !== null) {
        this.pos.x = c.x; this.pos.z = c.z;
        this.ground += (g - this.ground) * Math.min(1, dt * 10);
        if (Math.abs(g - this.ground) < 0.02) this.ground = g;
      }
    }
    let eyeY = this.ground + this.eye;
    // in the attic, clamp the camera under the roof slope
    if (this.ground > 2.9 && this.pos.x > 4.2 && this.pos.x < 15.6 && window.Builder) {
      eyeY = Math.min(eyeY, 3.1 + Builder.atticH(this.pos.z) - 0.12);
    }
    this.camera.position.set(this.pos.x, eyeY, this.pos.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }
}
