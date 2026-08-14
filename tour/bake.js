// ============================================================
// Light baking (the lightmapper).
//
// Computes per-texel lighting for floors, ceilings and attic slopes:
// direct lamp light with visibility tests (soft shadows), windows as
// cool-light area sources, sun on the terrace, and an indoor bounce term
// scaled by hemisphere visibility. The result is a CanvasTexture attached
// as a lightMap (uv2) to MeshBasicMaterial, so baked surfaces spend no GPU
// on dynamic light.
//
// Input: Builder.bakeData = { occluders, lights, windows, surfaces }
//   occluder: {x1,y1,z1, x2,y2,z2}
//   light:    {x,y,z, int}
//   window:   {x,y,z, nx,nz, area, lvl}
//   surface:  {mesh, w, h, res, lvl, outdoor}
//
// The indoor ambient term is no longer a constant: it is scaled by
// hemisphere visibility sampled against the real scene geometry through
// sampler.js. See "Ambient visibility" below.
// ============================================================

const Baker = (() => {
  const T = THREE;

  // Ray p→q against the AABB set (slab test), t in (0.02, 0.98)
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

  // Offsets for soft shadows (light-position jitter)
  const JIT = [[0, 0], [0.14, -0.1], [-0.12, 0.13]];
  const SUN = { x: -0.55, y: 0.72, z: 0.42 }; // normalized direction TOWARD the sun
  const EXP = 1.7; // HDR headroom: lightMapIntensity compensates

  // Hemisphere directions in tangent space, cosine-ish spread.
  const AO_DIRS = [
    [0, 1, 0], [0.6, 0.8, 0], [-0.6, 0.8, 0], [0, 0.8, 0.6], [0, 0.8, -0.6],
    [0.45, 0.77, 0.45], [-0.45, 0.77, 0.45], [0.45, 0.77, -0.45]
  ];
  const AO_DIST = 0.6;   // metres; contact shadows only, not global darkening

  // Ambient occlusion at P with normal N. 1 = open, 0 = fully enclosed.
  const _A = new T.Vector3(), _B = new T.Vector3();
  const _T1 = new T.Vector3(), _T2 = new T.Vector3();
  function aoAt(P, N, occ, rays) {
    // Occluders containing P are this object's own box: counting them
    // would darken every surface uniformly and look like a bad exposure.
    const near = [];
    for (let i = 0; i < occ.length; i++) {
      const b = occ[i];
      const inside = P.x > b.x1 - 0.02 && P.x < b.x2 + 0.02 &&
                     P.y > b.y1 - 0.02 && P.y < b.y2 + 0.02 &&
                     P.z > b.z1 - 0.02 && P.z < b.z2 + 0.02;
      if (inside) continue;
      // Cull boxes lying entirely behind the sample plane (P, N): every
      // hemisphere ray leaves along +N, so a box that doesn't reach past
      // that plane can never occlude one. This is exact (uses the box's
      // furthest corner along N, not its centre) and output-neutral -- it
      // just stops e.g. a floor slab, which sits immediately behind every
      // floor texel, from being carried into `near` on every single texel.
      const fx = N.x >= 0 ? b.x2 : b.x1;
      const fy = N.y >= 0 ? b.y2 : b.y1;
      const fz = N.z >= 0 ? b.z2 : b.z1;
      const maxDot = N.x * (fx - P.x) + N.y * (fy - P.y) + N.z * (fz - P.z);
      if (maxDot <= 0) continue;
      // cheap reject: box further than AO_DIST cannot occlude
      const dx = Math.max(b.x1 - P.x, 0, P.x - b.x2);
      const dy = Math.max(b.y1 - P.y, 0, P.y - b.y2);
      const dz = Math.max(b.z1 - P.z, 0, P.z - b.z2);
      if (dx * dx + dy * dy + dz * dz > AO_DIST * AO_DIST) continue;
      near.push(b);
    }
    if (!near.length) return 1;   // the common case, and it costs one loop

    // tangent basis around N
    const up = Math.abs(N.y) > 0.9 ? _A.set(1, 0, 0) : _A.set(0, 1, 0);
    const t1 = _T1.crossVectors(up, N).normalize();
    const t2 = _T2.crossVectors(N, t1);

    const n = Math.min(rays, AO_DIRS.length);
    let open = 0;
    for (let i = 0; i < n; i++) {
      const d = AO_DIRS[i];
      _B.set(
        P.x + (t1.x * d[0] + N.x * d[1] + t2.x * d[2]) * AO_DIST,
        P.y + (t1.y * d[0] + N.y * d[1] + t2.y * d[2]) * AO_DIST,
        P.z + (t1.z * d[0] + N.z * d[1] + t2.z * d[2]) * AO_DIST
      );
      if (!blocked(P, _B, near)) open++;
    }
    // A fully enclosed sample returns a true 0. This used to be floored at
    // 0.35 ("never crush to black"), which put a hard lower bound on every
    // render's darkest 5% -- the lifted blacks phase B3 exists to fix.
    //
    // No epsilon. `near` only ever holds boxes this sample can actually see
    // (the containing-box skip and the behind-the-plane cull above) and the
    // empty case returned 1 before this line, so a 0 here means the
    // hemisphere really is closed -- under a sofa, inside a cabinet -- and
    // black is right there. Checked rather than assumed: with the floor gone
    // 15% of serenity's lightmap texels and 14% of its furniture vertices
    // reach 0, and every one of them was looked at in a render. They read as
    // contact shadow. The one place a zero DID misbehave was the boundary
    // texel of a floor or ceiling plate, and that is an edge-filtering
    // problem with its own fix -- see the dilation pass in bakeSurface.
    return open / n;
  }

  // ---------- Ambient visibility ----------
  // The indoor ambient term used to be a constant: every sample got the same
  // 0.40/0.385/0.36 no matter what was above it, so nothing could occlude it
  // and no corner could darken. It is now scaled by how much of the sample's
  // own hemisphere is open. A cosine-weighted ray that travels AMB_DIST
  // without hitting anything has reached either the sky or the far side of
  // the room -- both lit, and both are what the constant stood in for. A ray
  // blocked before that is in a crevice, under furniture or against a
  // neighbouring surface, and brings back much less.
  //
  // AMB_DIST exists to keep the magnitude in the open unchanged, and it is
  // bound by the NARROWEST room in the catalogue, not by ceiling height.
  // A floor texel in the middle of a room reaches the nearest wall at
  // half that room's smaller dimension, so anything beyond that half-width
  // dims the whole room uniformly -- the per-room version of exactly the
  // global darkening this term must not cause.
  //
  // Measured over every roomLabels rect in all three configs, smallest
  // dimension first: kings-court Bedroom 2 1.40 m, serenity Bathroom 1.41,
  // kings-court Hallway 1.80 and Stairs 1.80, Laundry 1.90, horkyone-10
  // Hall 2.01, Bathroom 2.21, serenity Pool Terrace 2.40, kings-court Guest
  // WC 2.40. The binding case is 1.40 m -> half-width 0.70 m, so 0.65 with
  // a little margin. Ceilings (serenity 2.60, horkyone-10 2.62, kings-court
  // 2.80) are nowhere near binding and never were.
  //
  // This was 1.2 m in the first version of this change, justified by a
  // claim that no room is narrower than 2.4 m. That claim was false against
  // the repo's own configs: at 1.2 m serenity's whole bathroom floor and
  // ceiling scored 0.70 at their brightest point and lost 30% of their
  // ambient uniformly. If a narrower room is ever added, this constant is
  // what has to move -- re-run the roomLabels sweep, do not assume.
  const AMB_DIST = 0.65;
  // The sampler is Monte Carlo, so this sets the noise floor, and it is the
  // whole cost of the change. Ray count against bake time, kings-court (the
  // largest flat, and the one rule 4a already records as slow), median of
  // three page loads, swept while every lightAt caller was sampling:
  // 8.4 s unsampled -> 11.5 / 15.6 / 23.2 s at 8 / 16 / 32 rays. As shipped
  // (16 rays, lightmapped surfaces only) the medians are serenity
  // 2.0 -> 3.5 s, kings-court 8.4 -> 16.8 s, horkyone-10 2.6 -> 6.3 s, on a
  // machine whose run-to-run spread on the same build reached 2x -- treat
  // the ratios, not the absolute seconds, as the measurement.
  //
  // 16 buys the quiet without the top of that. Measured on serenity's indoor
  // lightmaps, RMS second difference / sqrt(6) -- which cancels any smooth
  // gradient, so what is left is sampling noise: 15.25 / 14.55 / 13.99 /
  // 13.86 of 255 at 8 / 16 / 32 / 64 rays. Those fit sigma^2 = detail^2 + K/n
  // for a per-texel noise of 6.8 / 4.8 / 3.4 / 2.4 against 13.7 of
  // non-sampling roughness the bake already had, so even 8 rays only moves
  // the total 10%. The binding consumer is not the lightmap though: walls are
  // per-vertex at 0.45 m and interpolate, so their noise reads as broad
  // mottling rather than speckle, and by eye 8 rays visibly mottles
  // horkyone-10's wall panels where 16 is indistinguishable from 32.
  const AMB_RAYS = 16;

  // Sampler handle over the scene's real geometry, built in run() and torn
  // down when the bake finishes. Null means no sampler (the library or the
  // file failed to load), in which case the ambient falls back to the flat
  // constant it was before -- a dimmer-looking bake is a worse failure than
  // an older-looking one.
  let ambHandle = null;
  function ambientVis(P, N) {
    if (!ambHandle) return 1;
    return Sampler.visibility(P, N, AMB_RAYS, AMB_DIST, ambHandle);
  }

  // Every opaque mesh in the scene, plus one box per wall piece. The boxes
  // are not optional: bakeWalls() does not build the wall meshes until the
  // very end of the bake, so a BVH over the scene alone would see an
  // apartment with no walls in it.
  //
  // Transparency is the ONLY exclusion. Glass must not shadow the daylight
  // coming through it, which is the same call builder.js already makes by
  // never adding an occluder for window glass.
  //
  // In particular `userData.dollRoof` is NOT excluded, though an earlier
  // version of this function excluded it as a "dollhouse overlay a visitor
  // never sees". It is nothing of the kind: builder.js sets it on the attic
  // slope planes (:490) and skylight frames -- the actual roof a visitor in
  // the attic stands under, and per hard rule 5 the south knee is below head
  // height. Dropping it left kings-court's and horkyone-10's attics with no
  // roof in the sampler, so the surfaces that should be the most occluded in
  // the apartment scored ~1. `userData.doll` is not tested either: bake.js
  // is its only writer and it writes it after this runs, so the clause was
  // dead code that read like a live filter.
  function ambientMeshes(scene, data) {
    const meshes = [];
    scene.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      if (o.material && (o.material.transparent || o.material.opacity < 1)) return;
      meshes.push(o);
    });
    for (const p of data.wallPieces) {
      const m = new T.Mesh(new T.BoxGeometry(p.x2 - p.x1, p.y2 - p.y1, p.z2 - p.z1));
      m.position.set((p.x1 + p.x2) / 2, (p.y1 + p.y2) / 2, (p.z1 + p.z2) / 2);
      meshes.push(m);
    }
    return meshes;
  }

  // Lighting at point P with normal N (shared by lightmaps and wall vertices)
  //
  // `sampled` asks for the visibility-scaled indoor ambient above. Only the
  // lightmapped surfaces pass true. bakeWalls passes FALSE and keeps the old
  // flat constant, and that is a measured decision, not an oversight -- see
  // the block above bakeWalls for what happens when walls opt in and why
  // closing it needs the wall atlas (the plan's task 4).
  const _Q = new T.Vector3();
  function lightAt(P, N, occ, data, outdoor, sampled) {
    let r, g, b;
    if (outdoor) { r = 0.66; g = 0.70; b = 0.78; }
    else {
      const v = sampled ? ambientVis(P, N) : 1;
      r = 0.40 * v; g = 0.385 * v; b = 0.36 * v;
    }

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
      // skip points behind the window plane (ny: skylights face downward)
      if ((P.x - Wn.x) * Wn.nx + (P.y - Wn.y) * (Wn.ny || 0) + (P.z - Wn.z) * Wn.nz < 0) continue;
      let vis = 0;
      for (const [jx, jz] of JIT) {
        _Q.set(Wn.x + jx * 0.5, Wn.y + jz, Wn.z + jx * 0.5 * Math.abs(Wn.nx));
        if (!blocked(P, _Q, occ)) vis++;
      }
      if (!vis) continue;
      // Amplitude and falloff are tuned together: a flat window term makes
      // every room read the same, so daylight is strong at the glass and
      // drops away fast. Peak stays under the EXP headroom even where the
      // south wall puts four windows within reach of one point.
      const e = Wn.area * 0.26 / (1 + d2 * 0.56) * cos * (vis / JIT.length);
      r += e * 0.80; g += e * 0.89; b += e;
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
    // surface normal in world space
    N.set(0, 0, 1).transformDirection(mw);

    // occluder prefilter: near the surface bbox (with light-height margin)
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox.clone().applyMatrix4(mw).expandByScalar(9);
    const occ = data.occluders.filter(b =>
      b.x2 > bb.min.x && b.x1 < bb.max.x &&
      b.y2 > bb.min.y - 4 && b.y1 < bb.max.y + 4 &&
      b.z2 > bb.min.z && b.z1 < bb.max.z);

    // No aoAt() here any more, and that is the whole point rather than an
    // omission. aoAt and the sampled ambient inside lightAt now estimate the
    // SAME quantity -- what fraction of this point's hemisphere is closed --
    // at almost the same radius (AO_DIST 0.6, AMB_DIST 0.65). Multiplying
    // both in squared the occlusion: a texel at 0.75 visibility and 0.70 AO
    // came out at 0.52, darker than either estimator says, and it compounded
    // hardest exactly where aoAt's 0.35 floor had just been removed. Of the
    // two, the sampled one is strictly better -- 16 cosine-weighted rays
    // against the real triangles, versus 8 fixed directions against 47-odd
    // AABBs -- so it is the one kept.
    //
    // The direct terms lose nothing by it. aoAt used to multiply lamp and
    // window light too, which was always double counting: lightAt already
    // shadow-tests every lamp and every window with jittered visibility
    // rays. aoAt survives unchanged for furniture vertices (bakeFurnitureAO),
    // which have no lightmap and no sampled ambient of their own, and that is
    // still the only consumer of APT.quality.aoRays.
    for (let j = 0; j < H; j++) {
      // PlaneGeometry: v grows upward, canvas grows downward
      const v = 1 - (j + 0.5) / H;
      for (let i = 0; i < W; i++) {
        const u = (i + 0.5) / W;
        P.set((u - 0.5) * w, (v - 0.5) * h, 0).applyMatrix4(mw);
        P.x += N.x * 0.03; P.y += N.y * 0.03; P.z += N.z * 0.03;
        const [r, g, b] = lightAt(P, N, occ, data, outdoor, true);
        const o = (j * W + i) * 4;
        px[o] = Math.min(255, r / EXP * 255);
        px[o + 1] = Math.min(255, g / EXP * 255);
        px[o + 2] = Math.min(255, b / EXP * 255);
        px[o + 3] = 255;
      }
    }

    // Edge dilation (the lightmap "gutter"), PER TEXEL and only where the
    // texel is actually spoiled.
    //
    // The problem it fixes: where a plate runs to a wall CENTRELINE, its
    // outermost texel footprint overlaps the wall, so half that texel's
    // hemisphere is wall and its value falls off a cliff. The texture is
    // ClampToEdge + LinearFilter, so that one dark texel is then stretched
    // across the last half-texel of visible surface -- every ceiling in the
    // catalogue picked up a hard black rim. Copying the inward neighbour
    // over it drops the spoiled texel and lets the gradient from the first
    // clean one run to the edge.
    //
    // Doing that to EVERY boundary texel was wrong, because plenty of plate
    // edges have no wall on them. Floors are re-listed as several rectangles
    // (hard rule 2f) -- horkyone-10's Hall is two plates meeting at x=8.33
    // in the middle of the room -- and horkyone-10's terrace is four 0.63 m
    // strips that clamp to W=4, where a blanket border overwrites half the
    // columns of each strip. Both would get a duplicated plateau planted
    // down an interior seam. So each boundary texel is tested against the
    // wall footprints and only dilated if it overlaps one. `outdoor`
    // surfaces skip the pass outright: they take no sampled ambient, so they
    // cannot have the artefact this exists to remove.
    if (!outdoor) {
      const line = W * 4;
      const hx = w / W / 2, hz = h / H / 2;   // half a texel, plate-local
      // Texel (i, j) overlaps a wall piece? Tested in world XZ with the
      // wall box grown by half a texel, which is the same thing as asking
      // whether the texel's own footprint touches the wall.
      const _E = new T.Vector3();
      const onWall = (i, j) => {
        _E.set(((i + 0.5) / W - 0.5) * w, (1 - (j + 0.5) / H - 0.5) * h, 0).applyMatrix4(mw);
        const mx = Math.max(hx, hz), mz = mx;   // plate may be rotated; use the larger
        for (const p of data.wallPieces) {
          if (_E.x > p.x1 - mx && _E.x < p.x2 + mx &&
              _E.z > p.z1 - mz && _E.z < p.z2 + mz) return true;
        }
        return false;
      };
      const copy = (dst, src) => { for (let k = 0; k < 4; k++) px[dst + k] = px[src + k]; };
      for (let i = 0; i < W; i++) {
        if (onWall(i, 0)) copy(i * 4, line + i * 4);
        if (onWall(i, H - 1)) copy((H - 1) * line + i * 4, (H - 2) * line + i * 4);
      }
      for (let j = 0; j < H; j++) {
        if (onWall(0, j)) copy(j * line, j * line + 4);
        if (onWall(W - 1, j)) copy(j * line + (W - 1) * 4, j * line + (W - 2) * 4);
      }
    }

    ctx.putImageData(img, 0, 0);
    // a light blur removes shadow banding
    ctx.globalAlpha = 0.5;
    ctx.drawImage(canvas, 0, 0);
    ctx.globalAlpha = 1;

    const tex = new T.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
    tex.minFilter = T.LinearFilter;
    tex.magFilter = T.LinearFilter;
    mesh.material.lightMap = tex;
    // r128's MeshBasicMaterial lightmap chunk was a plain multiply:
    // indirectDiffuse += lightMapTexel.rgb * lightMapIntensity. r185's
    // (tour/lib/three-0.185.0/build/three.module.js, fragment$a, the
    // meshbasic_frag USE_LIGHTMAP branch) inserted a further
    // * RECIPROCAL_PI (0.3183098861837907, i.e. 1/PI) -- the same
    // physically-correct-units move as PointLight's decay default,
    // just for baked lightmaps instead of dynamic point lights, and one
    // this task's brief didn't anticipate because it's a shader-chunk
    // change, invisible from application code. Left uncompensated this
    // dims every baked floor/ceiling/attic-slope surface (walls are
    // vertexColors, a different chunk, unaffected -- confirmed visually:
    // ceilings shifted cool/grey against r128, walls did not) to roughly
    // a third of its r128 brightness. Multiplying by PI here exactly
    // cancels the new factor (1.7 * PI * RECIPROCAL_PI === 1.7),
    // reproducing r128's lightmap contribution unchanged. EXP above is a
    // separate, bake-time-only concern (how far the written texture is
    // compressed into the 0-255 byte range) and is untouched.
    mesh.material.lightMapIntensity = 1.7 * Math.PI;
    mesh.material.needsUpdate = true;
  }

  // ---------- Walls: merged geometry with per-vertex light ----------
  // All wall pieces merge into ONE mesh (1 draw call). Every face is
  // segmented at ~0.45 m and baked lighting is written into the vertices.
  //
  // Walls do NOT take the visibility-scaled ambient: they pass sampled=false
  // to lightAt and keep the flat constant. That is a measured decision, not
  // an oversight. It was tried, and it broke on two defects in THIS function
  // that the flat constant had been hiding, neither of them in the ambient
  // term itself:
  //
  //   1. WINDING. `pts` below emits one fixed triangle order, so a quad's
  //      geometric winding follows uVec x vVec whatever `n` says, and the
  //      renderer (MeshBasicMaterial, FrontSide) obeys the winding. Working
  //      through all twelve grid() calls:
  //        else branch (walls along z): ALL SIX faces are reversed -- both
  //          large faces, both end reveals, top and bottom.
  //        alongX branch: the four vertical faces agree, but TOP AND BOTTOM
  //          are reversed as well.
  //      So the fix is not "reverse the else branch": that would leave top
  //      and bottom broken on every wall in every apartment. Reverse the
  //      quad when (uVec x vVec) . n < 0, which covers all eight cases and
  //      leaves the four correct ones alone.
  //      Measured on the unmodified tip, standing 1 m off each wall's
  //      centreline and raycasting at it: along-x walls show the near face
  //      6/6 (serenity) and 14/16 (kings-court); along-z walls show the far
  //      face 8/8 and 17/18. So the surface a visitor looks at is shaded
  //      from a sample point 14 cm away on the OTHER side of that wall --
  //      outside the building, for a shell wall. Under a flat ambient the
  //      two sides differ only in the direct terms and it never showed.
  //      Under a visibility-scaled one the outdoor sample sees a hedge 20 cm
  //      away and returns ~0: serenity's living-room wall band rendered at
  //      pixel value 1 where it had been 85.
  //   2. RESOLUTION. Quads are shaded from their four geometric corners and
  //      Gouraud-interpolated at 0.45 m, and each end reveal, top and bottom
  //      is a single quad however large. Corners that sit on hidden surfaces
  //      -- a reveal butted into the wall it meets, an underside buried in
  //      the floor slab -- returned 0.32 under the constant and ~0 now, and
  //      that zero is smeared 0.45 m across wall a visitor is looking
  //      straight at. 14% of serenity's wall vertices went to a true zero.
  //
  // Defect 1 has to be fixed before walls can take any position-sensitive
  // shading at all, including the plan's task 4 atlas -- an atlas baked onto
  // inside-out walls records the wrong side. Defect 2 is precisely what that
  // atlas replaces. Until both are done the honest state is the one
  // CLAUDE.md already records: floors and furniture carry occlusion, walls
  // do not, and a floor-to-wall corner darkens on the floor side only.
  function bakeWalls(scene, data) {
    // two buckets: lower- and upper-level walls — for the dollhouse cutaway
    const buckets = { low: { pos: [], nrm: [], col: [] }, high: { pos: [], nrm: [], col: [] } };
    let cur;
    const pos = { push: (...a) => cur.pos.push(...a) };
    const nrm = { push: (...a) => cur.nrm.push(...a) };
    const col = { push: (...a) => cur.col.push(...a) };
    const P = new T.Vector3(), N = new T.Vector3();
    const SEG = 0.45;
    const WEXP = 1.25; // walls don't overexpose — less HDR headroom than floors

    // square grid: origin + u*uVec + v*vVec, normal n
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
          const L = shade ? lightAt(P, N, occ, data, false, false) : [0.5, 0.48, 0.46];
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
        grid([p.x1, p.y1, p.z2], [w, 0, 0], [0, h, 0], [0, 0, 1], su, sv, occ, true);   // south
        grid([p.x2, p.y1, p.z1], [-w, 0, 0], [0, h, 0], [0, 0, -1], su, sv, occ, true); // north
        // ends (reveals) and top/bottom — one quad each
        grid([p.x1, p.y1, p.z1], [0, 0, d], [0, h, 0], [-1, 0, 0], 1, 1, occ, true);
        grid([p.x2, p.y1, p.z2], [0, 0, -d], [0, h, 0], [1, 0, 0], 1, 1, occ, true);
        grid([p.x1, p.y2, p.z1], [w, 0, 0], [0, 0, d], [0, 1, 0], 1, 1, occ, false);
        grid([p.x1, p.y1, p.z2], [w, 0, 0], [0, 0, -d], [0, -1, 0], 1, 1, occ, true);
      } else {
        grid([p.x2, p.y1, p.z1], [0, 0, d], [0, h, 0], [1, 0, 0], su, sv, occ, true);   // east
        grid([p.x1, p.y1, p.z2], [0, 0, -d], [0, h, 0], [-1, 0, 0], su, sv, occ, true); // west
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
      // Base tint for the merged wall mesh. Fallback is this file's own
      // long-standing constant, NOT M.wall's -- the baked per-vertex light
      // in this function was tuned against 0xfdfbf6, so defaulting to
      // M.wall's 0xe8e4db would silently relight every apartment's walls,
      // including the two with no palette block at all. Only an apartment
      // that sets palette.wall moves off this constant. Materials.color()
      // holds the one copy of the hex validation (Task 8 fix round 1).
      const mat = new T.MeshBasicMaterial({ vertexColors: true, color: Materials.color('wall', 0xfdfbf6) });
      const mesh = new T.Mesh(geo, mat);
      mesh.userData.doll = key === 'low' ? 'walls1' : 'walls2';
      scene.add(mesh);
    }
  }

  // ---------- Furniture: per-vertex AO on the merged meshes ----------
  // Merged furniture carries no lightmap: it is lit dynamically while the
  // floor is baked, so it sits in a different light environment from the
  // room and reads as pasted on. Per-vertex AO puts it back in the room.
  function bakeFurnitureAO(scene, data) {
    const rays = (APT.quality && APT.quality.aoRays) || 8;
    const P = new T.Vector3(), N = new T.Vector3();
    scene.traverse((mesh) => {
      if (!mesh.isMesh || mesh.userData.mergeLvl === undefined) return;
      const g = mesh.geometry;
      const p = g.attributes.position, nAttr = g.attributes.normal;
      if (!p || !nAttr) return;

      g.computeBoundingBox();
      const floorY = g.boundingBox.min.y; // this level's floor -- world y, NOT 0 on the upper storey
      const bb = g.boundingBox.clone().expandByScalar(1.0);
      const occ = data.occluders.filter(b =>
        b.x2 > bb.min.x && b.x1 < bb.max.x &&
        b.y2 > bb.min.y && b.y1 < bb.max.y &&
        b.z2 > bb.min.z && b.z1 < bb.max.z);

      const col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        P.set(p.getX(i), p.getY(i), p.getZ(i));
        let ao = 1;
        // contact shadows live low; skip the expensive test up high. Height
        // is measured from this merged mesh's own floor, not world y=0 --
        // world y is the upper storey's floor plane on level 2, so an
        // absolute cutoff silently skipped every upper-level vertex.
        if (P.y - floorY < 1.2 && occ.length) {
          N.set(nAttr.getX(i), nAttr.getY(i), nAttr.getZ(i));
          ao = aoAt(P, N, occ, rays);
        }
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = ao;
      }
      g.setAttribute('color', new T.BufferAttribute(col, 3));
      // Clone before enabling vertexColors: the material is shared across
      // the bucket, and a mesh with vertexColors but no colour attribute
      // renders undefined. One clone per merged mesh costs no draw calls.
      mesh.material = mesh.material.clone();
      mesh.material.vertexColors = true;
    });
  }

  // Async pass so the page keeps painting
  function run(scene, data, onProgress) {
    // Built before the first surface is baked, because lightAt() reads it on
    // every sample. Anything going wrong here (sampler.js absent, MeshBVH
    // missing from the module graph, a degenerate geometry) degrades to the
    // flat pre-B3 ambient rather than aborting the bake: no __bakeReady
    // means a permanently stuck overlay, which is far worse than a flat one.
    const temps = [];
    try {
      const meshes = ambientMeshes(scene, data);
      for (const m of meshes) if (!m.parent) temps.push(m);
      ambHandle = Sampler.build(meshes);
    } catch (e) {
      ambHandle = null;
      console.warn('[bake] no hemisphere sampler, ambient falls back to a flat constant:', e);
    }
    // Published so a run can ASSERT the sampler was live, not just hope.
    // Without it a throw here is invisible from outside: ambientVis returns
    // 1, the bake completes, and the render comes out bit-identical to the
    // pre-B3 build -- so a harness would happily score the old code and
    // report it as "after", a flawless no-regression result that measured
    // nothing. Set before the bake rather than after, so it is readable from
    // the same moment window.__issues is (app.js sets that synchronously).
    window.__ambSampled = !!ambHandle;
    if (!ambHandle && Array.isArray(window.__issues)) {
      window.__issues.push('bake: hemisphere sampler unavailable, ambient is the flat pre-B3 constant');
    }
    return new Promise((resolve) => {
      const list = data.surfaces.slice();
      const total = list.length + 3; // walls ≈ 3 progress steps
      let done = 0;
      const step = () => {
        const t0 = performance.now();
        while (list.length && performance.now() - t0 < 120) {
          bakeSurface(list.shift(), data);
          done++;
        }
        if (onProgress) onProgress(done / total);
        if (list.length) { setTimeout(step, 0); return; }
        // final stage — walls as a single mesh
        setTimeout(() => {
          bakeWalls(scene, data);
          bakeFurnitureAO(scene, data);
          // The BVH and its merged copy of every triangle in the apartment
          // are worth several MB on the largest flat and are read only
          // during the bake. Release them before handing control back.
          if (ambHandle) ambHandle.geometry.dispose();
          for (const m of temps) m.geometry.dispose();
          ambHandle = null;
          if (onProgress) onProgress(1);
          resolve();
        }, 0);
      };
      step();
    });
  }

  return { run };
})();
