// ============================================================
// Hemisphere visibility sampler over a real BVH (three-mesh-bvh, vendored
// at tour/lib/three-mesh-bvh-0.9.14/), replacing the 47-AABB occlusion test
// in bake.js with the actual scene geometry.
//
// Pure geometry in, numbers out: build() takes THREE.Mesh objects and
// returns an opaque handle; visibility() and rayHit() query it. This file
// knows nothing about apartments, bake passes, materials or lightmaps --
// three consumers (the runtime bake at 8 rays, an offline baker at
// thousands, furniture vertex AO) each bring their own geometry and ray
// count. Not wired into bake.js by this task -- see task-1-brief.md.
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

  // Orthonormal tangent basis (_T1, _T2) perpendicular to N. Same
  // pick-an-axis-not-parallel-to-N trick bake.js's own aoAt() already uses:
  // N close to world Y (a floor/ceiling normal) would make a Y reference
  // degenerate, so swap to X there; anywhere else Y is safe.
  function tangentBasis(N) {
    const nearY = Math.abs(N.y) > 0.9;
    _T1.set(nearY ? 1 : 0, nearY ? 0 : 1, 0).cross(N).normalize();
    _T2.crossVectors(N, _T1);
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
    tangentBasis(normal);
    let open = 0;
    for (let i = 0; i < rays; i++) {
      // Malley's method: a uniform point on the unit disk, lifted onto the
      // hemisphere. (lx, ly, lz) is unit length by construction --
      // lx^2+ly^2+lz^2 = r^2*cos^2 + r^2*sin^2 + (1-r^2) = 1 -- so the
      // world-space direction below needs no further normalize(), which
      // matters at the ray counts the offline baker runs.
      const u1 = Math.random(), u2 = Math.random();
      const r = Math.sqrt(u1), theta = 2 * Math.PI * u2;
      const lx = r * Math.cos(theta), ly = r * Math.sin(theta), lz = Math.sqrt(Math.max(0, 1 - u1));
      _dir.set(
        _T1.x * lx + _T2.x * ly + normal.x * lz,
        _T1.y * lx + _T2.y * ly + normal.y * lz,
        _T1.z * lx + _T2.z * ly + normal.z * lz
      );
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

  // Geometry with a known answer: a single large floor plane under the
  // sample point. A hemisphere sampled from just above it, pointing up,
  // should see nothing -- visibility 1. Sampled from just above it pointing
  // DOWN, every ray hits immediately -- visibility 0. A point in the corner
  // of two perpendicular walls sees roughly half the hemisphere.
  //
  // These three are chosen because they are analytic: they do not depend on
  // ray count, jitter or the apartment, so a wrong answer means the sampler
  // is wrong rather than under-sampled.
  //
  // KNOWN RESULT, left un-"fixed" deliberately (task-1-report.md has the
  // full derivation): 'open hemisphere sees sky' fails, ~0.70-0.73 rather
  // than >0.95, because `wall` is not actually inert for this check. It
  // sits only 4m from P=(0,0.5,3) (the closest point on its z=-1 plane is
  // (0,0.5,-1)) and spans y in [-10,10], so a correct cosine-weighted
  // hemisphere around `up` genuinely puts ~28-30% of its (weighted) rays
  // into it -- confirmed by isolating floor-only (visibility 1.0 exactly)
  // from wall-only (reproduces the same ~0.70-0.73), and cross-checked
  // against an independent analytic case (a true 90-degree floor/wall
  // corner, bisector normal: cosine-weighted theory predicts exactly
  // cos(45 deg) = 0.7071; this sampler measures 0.71-0.72 there over
  // several 512-ray runs). The other three checks -- including
  // 'hemisphere into the floor is blocked', which the same wall could in
  // principle have spoiled the same way -- pass on every run. Changing
  // `wall`'s placement, P, or the 0.95 threshold to force a 4/4 pass would
  // just be moving the goalposts this task exists to guard against, so the
  // geometry below is exactly what the brief specified, unmodified.
  const selfTest = function () {
    const T = THREE;
    const floor = new T.Mesh(new T.PlaneGeometry(20, 20).rotateX(-Math.PI / 2));
    const wall = new T.Mesh(new T.PlaneGeometry(20, 20).translate(0, 0, -1));
    const h = Sampler.build([floor, wall]);
    const P = new T.Vector3(0, 0.5, 3);
    const up = new T.Vector3(0, 1, 0), down = new T.Vector3(0, -1, 0);
    const openSky = Sampler.visibility(P, up, 64, 50, h);
    const intoFloor = Sampler.visibility(P, down, 64, 50, h);
    const results = [
      ['open hemisphere sees sky', openSky > 0.95, openSky],
      ['hemisphere into the floor is blocked', intoFloor < 0.05, intoFloor],
      ['a downward ray hits the floor', Sampler.rayHit(P, down, 50, h) === true, null],
      ['an upward ray escapes', Sampler.rayHit(P, up, 50, h) === false, null]
    ];
    const failed = results.filter((r) => !r[1]);
    console.log('[sampler] selfTest', failed.length ? 'FAILED' : 'passed', results);
    return failed.length === 0;
  };

  return { build, visibility, rayHit, selfTest };
})();
