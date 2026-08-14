// ============================================================
// Hemisphere visibility sampler over a real BVH (three-mesh-bvh, vendored
// at tour/lib/three-mesh-bvh-0.9.14/), replacing the 47-AABB occlusion test
// in bake.js with the actual scene geometry.
//
// Pure geometry in, numbers out: build() takes THREE.Mesh objects and
// returns an opaque handle; visibility(), rayHit() and rayFirst() query it.
// This file knows nothing about apartments, bake passes, materials or
// lightmaps -- each consumer brings its own geometry and ray count. Two of
// them exist: bake.js's runtime ambient (16 rays, AMB_DIST), and
// tools/bake_lightmaps.mjs's offline path integrator (thousands of rays,
// bounces). The integrator itself lives in that tool, not here: it needs
// albedo, lamps and occluders, and this file deliberately knows about none
// of those. What it needs from here is rayFirst -- the hit point and normal
// a bounce continues from -- and one shared cosine-weighted direction
// sampler, so the offline paths and the runtime hemisphere draw from the
// same distribution rather than two copies of it.
// ============================================================

const Sampler = (() => {
  const T = THREE;

  // ---------- build: merge every mesh's triangles into one BVH ----------
  // Only positions matter to a BVH -- normals, UVs, materials stay the
  // caller's business. Each mesh's own matrixWorld is baked into the
  // merged positions, so the handle is queried in the same world space
  // bake.js already samples in (no per-query transform needed).
  const _v = new T.Vector3();
  function mergeToPositions(meshes) {
    const positions = [];
    for (const mesh of meshes) {
      mesh.updateMatrixWorld(true);
      const geo = mesh.geometry;
      const pos = geo.attributes.position;
      const idx = geo.index;
      const mat = mesh.matrixWorld;
      const n = idx ? idx.count : pos.count;
      for (let i = 0; i < n; i++) {
        const vi = idx ? idx.getX(i) : i;
        _v.fromBufferAttribute(pos, vi).applyMatrix4(mat);
        positions.push(_v.x, _v.y, _v.z);
      }
    }
    return positions;
  }

  // Builds a BVH over the merged geometry of `meshes`. Returns an opaque
  // handle -- callers pass it back into visibility()/rayHit() unmodified.
  function build(meshes) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(mergeToPositions(meshes), 3));
    // MeshBVH indexes a non-indexed geometry itself (ensureIndex); no need
    // to build one here.
    const bvh = new MeshBVH(geometry);
    return { bvh, geometry };
  }

  // ---------- shared raycasting scratch ----------
  const _T1 = new T.Vector3(), _T2 = new T.Vector3(), _dir = new T.Vector3();
  const _ray = new T.Ray();

  // Orthonormal tangent basis (T1, T2) perpendicular to N. Same
  // pick-an-axis-not-parallel-to-N trick bake.js's own aoAt() already uses:
  // N close to world Y (a floor/ceiling normal) would make a Y reference
  // degenerate, so swap to X there; anywhere else Y is safe.
  //
  // The basis vectors are the caller's, not module scratch, because a
  // recursive caller (a bounce integrator) needs one basis per path depth
  // and shared scratch would be overwritten by the deeper call. visibility()
  // still passes the module pair and still builds the basis once per call,
  // not once per ray.
  function tangentBasis(N, T1, T2) {
    const nearY = Math.abs(N.y) > 0.9;
    T1.set(nearY ? 1 : 0, nearY ? 0 : 1, 0).cross(N).normalize();
    T2.crossVectors(N, T1);
  }

  // One cosine-weighted direction about N, written into `out`, given a
  // tangent basis already built for that N.
  //
  // Malley's method: a uniform point on the unit disk, lifted onto the
  // hemisphere. (lx, ly, lz) is unit length by construction --
  // lx^2+ly^2+lz^2 = r^2*cos^2 + r^2*sin^2 + (1-r^2) = 1 -- so the
  // world-space direction below needs no further normalize(), which matters
  // at the ray counts the offline baker runs.
  //
  // One implementation, two callers: visibility() below and the offline
  // baker's path integrator. The distribution is what selfTest's 90-degree
  // corner case measures (0.7071 cosine-weighted against 0.48-0.51 for a
  // uniform-z sampler), so a second copy of this would be a second copy that
  // nothing tests.
  function cosineDir(N, T1, T2, out) {
    const u1 = Math.random(), u2 = Math.random();
    const r = Math.sqrt(u1), theta = 2 * Math.PI * u2;
    const lx = r * Math.cos(theta), ly = r * Math.sin(theta), lz = Math.sqrt(Math.max(0, 1 - u1));
    out.set(
      T1.x * lx + T2.x * ly + N.x * lz,
      T1.y * lx + T2.y * ly + N.y * lz,
      T1.z * lx + T2.z * ly + N.z * lz
    );
    return out;
  }

  // Occluders are tested double-sided: a surface should block a hemisphere
  // ray approaching from either face, the same as the AABBs it replaces
  // were solid from every direction regardless of the mesh's winding.
  const SIDE = T.DoubleSide;

  // A ray whose origin sits exactly on the surface it was sampled from
  // would immediately re-hit its own triangle to floating-point noise.
  // Clipping the raycast's own `near` bound past that noise floor avoids
  // it without moving `point` itself -- nudging the origin along the
  // normal instead risks pushing it through a thin wall or past a concave
  // corner into whatever sits behind it (e.g. a floor/wall joint).
  const SELF_HIT_EPS = 1e-4;

  // Fraction of a cosine-weighted hemisphere about `normal`, sampled from
  // `point`, that escapes to `maxDist` without hitting handle's geometry.
  function visibility(point, normal, rays, maxDist, handle) {
    tangentBasis(normal, _T1, _T2);
    let open = 0;
    for (let i = 0; i < rays; i++) {
      cosineDir(normal, _T1, _T2, _dir);
      _ray.set(point, _dir);
      const hit = handle.bvh.raycastFirst(_ray, SIDE, SELF_HIT_EPS, maxDist);
      if (!hit) open++;
    }
    return open / rays;
  }

  // A single raycastFirst: true if the ray hits handle's geometry before
  // maxDist. No implicit epsilon -- unlike visibility(), the caller
  // supplies origin and direction directly, so avoiding self-intersection
  // (or not) is the caller's call, exactly as it is today in bake.js's own
  // blocked(), which jitters and offsets its own endpoints before testing.
  function rayHit(origin, dir, maxDist, handle) {
    _ray.set(origin, _dir.copy(dir).normalize());
    return !!handle.bvh.raycastFirst(_ray, SIDE, 0, maxDist);
  }

  // The same cast as rayHit, but reporting WHERE it landed:
  //   { point, normal, distance } or null.
  //
  // This is the primitive a bounce integrator needs and rayHit cannot give
  // it -- to continue a light path you have to stand on the surface you hit
  // and know which way it faces. The BVH is a merged triangle soup with no
  // normal attribute (build() copies positions only), so `normal` is the
  // triangle's GEOMETRIC normal, and it is flipped to oppose `dir` -- i.e.
  // it always faces back toward where the ray came from. That is the only
  // defensible convention here: occluders are tested DoubleSide, and the
  // wall meshes in this project are known to be wound backwards on 8 of
  // their 12 faces (see bake.js's bakeWalls), so triangle winding cannot be
  // trusted to say which side a ray arrived on. Where the ray came from can.
  //
  // `point` and `normal` are freshly allocated by the BVH on every hit, not
  // module scratch, so a recursive caller can hold one hit while tracing the
  // next -- shared scratch would be overwritten by the deeper call.
  //
  // `near` defaults to SELF_HIT_EPS rather than rayHit's 0, because every
  // caller of this function is by construction standing on a surface it has
  // just hit and would otherwise re-hit that same triangle immediately.
  function rayFirst(origin, dir, maxDist, handle, near) {
    _ray.set(origin, _dir.copy(dir).normalize());
    const hit = handle.bvh.raycastFirst(_ray, SIDE, near === undefined ? SELF_HIT_EPS : near, maxDist);
    if (!hit) return null;
    const n = hit.face.normal;
    if (n.dot(_ray.direction) > 0) n.multiplyScalar(-1);
    return { point: hit.point, normal: n, distance: hit.distance };
  }

  // ---- Case group 1: a single floor, analytic either-or answers ----
  // A single large floor plane under the sample point. A hemisphere
  // sampled from just above it, pointing up, sees nothing above it at all
  // -- there is no occluder anywhere in the upper hemisphere, so this is
  // exactly 1, not just "usually clear" -- no sampling noise to tolerate.
  // Pointed DOWN, every ray hits the floor within its first fraction of a
  // metre -- exactly 0. A single ray straight down hits it; a single ray
  // straight up escapes.
  //
  // Floor-only, unlike the original brief's floor+wall combination: that
  // `wall` sat only 4m from P=(0,0.5,3) and spanned +-10m in y, so a
  // correct cosine-weighted hemisphere around `up` genuinely put ~28-30%
  // of its rays into it and >0.95 was never achievable there -- confirmed
  // by isolating floor-only (measured exactly 1.0) from wall-only
  // (reproduced the same ~0.70-0.73). That was the test's geometry being
  // wrong, not the sampler (task-1-report.md has the full diagnosis), so
  // the fix is to remove the wall from this case, not to lower the
  // threshold: both thresholds stay >0.95/<0.05 because both answers are
  // still exactly 1/0 analytically on this geometry.

  // ---- Case group 2: a true 90-degree corner, its own geometry ----
  // Floor (y=0) meeting a perpendicular wall (x=0), sampled from just
  // inside the corner with the normal on the bisector. This one is not
  // all-or-nothing -- the wall genuinely occludes a known fraction of the
  // hemisphere -- so it needs a derived number and a real tolerance
  // instead of a >0.95/<0.05 cliff. It is also the only case here
  // sensitive to the sampling *distribution* rather than just whether the
  // tangent basis is non-zero: see the perturbation note below.
  //
  // Derivation. In the tangent frame visibility() builds around this N
  // (T1=(0,0,-1), T2=(-.7071,.7071,0), both perpendicular to N via
  // tangentBasis's own construction), a ray escapes iff it misses BOTH
  // infinite planes, which reduces to lz >= |ly| in tangent space --
  // independent of lx. Substituting Malley's method (r=sqrt(u1) on the
  // unit disk, lz=sqrt(1-u1)) and integrating over theta:
  //   P(escape) = (1/2pi) * integral[0,2pi] dtheta / (1 + sin^2 theta)
  //             = (1/2pi) * (2pi/sqrt(2)) = 1/sqrt(2) = 0.70710678...
  // This matches task-1-report.md's own number (0.7071) though not the
  // formula it wrote down for it ("1 - sin(45deg)" evaluates to 0.2929,
  // not 0.7071 -- a transcription slip in the report's prose, not in the
  // number, which this derivation confirms independently).
  //
  // Geometry scale. Finite planes over-count escapes relative to the
  // ideal above: a ray that grazes nearly parallel to a plane can cross
  // its *infinite* extension beyond where the finite mesh (or maxDist)
  // actually reaches, and gets counted as escaped when the idealized
  // answer would still block it. Measured directly, mean visibility over
  // 8-20 runs at 4096 rays: 20m planes / maxDist 50 (the original brief's
  // scale) -> 0.720; 200m/300 -> 0.712-0.715; 4000m/5000 -> 0.7085. The
  // bias shrinks with scale but is still present at 200m -- 200m/maxDist
  // 300 (used below) is where it's small enough to fold into the
  // tolerance rather than dominate it.
  //
  // Tolerance. 20 runs at the exact parameters below (1024 rays): range
  // 0.678-0.730, mean 0.7125, max deviation from the 0.70710678 target
  // 0.0294, sample std 0.0138. 0.06 is ~2x that observed max and ~4.3
  // sample-sigma -- comfortable headroom above both the Monte Carlo noise
  // and the finite-geometry bias above -- while staying under a third of
  // the gap to what a *wrong* distribution gives here: a sampler that
  // draws z uniformly instead of cosine-weighting (a believable bug --
  // exactly the "naive uniform-angle" answer this derivation is already
  // contrasted against) measures 0.48-0.51 on this identical geometry,
  // ~0.2 off. task-1-report.md's addendum has the perturbation test
  // proving this specific assertion fails when it should.
  const selfTest = function () {
    const T = THREE;

    const floor = new T.Mesh(new T.PlaneGeometry(20, 20).rotateX(-Math.PI / 2));
    const hFloor = Sampler.build([floor]);
    const P = new T.Vector3(0, 0.5, 3);
    const up = new T.Vector3(0, 1, 0), down = new T.Vector3(0, -1, 0);
    const openSky = Sampler.visibility(P, up, 64, 50, hFloor);
    const intoFloor = Sampler.visibility(P, down, 64, 50, hFloor);

    const cornerFloor = new T.Mesh(new T.PlaneGeometry(200, 200).rotateX(-Math.PI / 2));
    const cornerWall = new T.Mesh(new T.PlaneGeometry(200, 200).rotateY(Math.PI / 2));
    const hCorner = Sampler.build([cornerFloor, cornerWall]);
    const cornerP = new T.Vector3(0.3, 0.3, 0);
    const cornerN = new T.Vector3(1, 1, 0).normalize();
    const CORNER_EXPECTED = 1 / Math.sqrt(2);   // 0.70710678..., see derivation above
    const CORNER_TOL = 0.06;                    // see "Tolerance" above
    const cornerVis = Sampler.visibility(cornerP, cornerN, 1024, 300, hCorner);

    // ---- Case group 3: rayFirst, exact hit geometry both ways round ----
    // The same 20x20 floor at y=0. From P=(0,0.5,3) straight down and from
    // Pu=(0,-0.5,3) straight up the hit distance is exactly 0.5 in both
    // cases -- no sampling, no tolerance beyond float noise. The pair exists
    // for the NORMAL, not the distance: the plane's geometric normal is +y
    // for both casts (one set of triangles, one winding), so the downward
    // cast needs no flip and the upward cast needs one. A rayFirst that
    // returned the raw triangle normal would pass the first and fail the
    // second, which is exactly the bug that would send a bounce ray onward
    // THROUGH the surface it just hit instead of back into the room.
    const hitDown = Sampler.rayFirst(P, down, 50, hFloor);
    const hitUp = Sampler.rayFirst(new T.Vector3(0, -0.5, 3), up, 50, hFloor);

    const results = [
      ['open hemisphere sees sky', openSky > 0.95, openSky],
      ['hemisphere into the floor is blocked', intoFloor < 0.05, intoFloor],
      ['a downward ray hits the floor', Sampler.rayHit(P, down, 50, hFloor) === true, null],
      ['an upward ray escapes', Sampler.rayHit(P, up, 50, hFloor) === false, null],
      ['a 90-degree corner matches the cosine-weighted derivation',
        Math.abs(cornerVis - CORNER_EXPECTED) < CORNER_TOL, cornerVis],
      ['rayFirst lands on the floor at the derived distance, from both sides',
        !!hitDown && !!hitUp && Math.abs(hitDown.distance - 0.5) < 1e-6 &&
        Math.abs(hitUp.distance - 0.5) < 1e-6,
        hitDown && hitUp ? [hitDown.distance, hitUp.distance] : null],
      ['rayFirst turns the hit normal back toward the ray it came from',
        !!hitDown && !!hitUp && hitDown.normal.y > 0.999 && hitUp.normal.y < -0.999,
        hitDown && hitUp ? [hitDown.normal.y, hitUp.normal.y] : null],
      ['rayFirst reports nothing where rayHit reports nothing',
        Sampler.rayFirst(P, up, 50, hFloor) === null, null]
    ];
    const failed = results.filter((r) => !r[1]);
    console.log('[sampler] selfTest', failed.length ? 'FAILED' : 'passed', results);
    return failed.length === 0;
  };

  return { build, visibility, rayHit, rayFirst, tangentBasis, cosineDir, selfTest };
})();
