// ============================================================
// Post-processing: bloom on bright daylight, then film grain and
// vignette. Deliberately restrained — past a low threshold these
// read as cheap filters and cost more trust than they earn.
//
// No SSAO: bake.js bakes real ambient occlusion into the floors and
// the furniture vertices, and every object here is static, so a
// screen-space pass would recompute worse data at runtime.
// ============================================================

const Post = (() => {
  const T = THREE;

  const GrainVignetteShader = {
    uniforms: {
      tDiffuse: { value: null },
      amount: { value: 0.035 },
      vignette: { value: 0.55 },
      time: { value: 0 }
    },
    vertexShader: [
      'varying vec2 vUv;',
      'void main() {',
      '  vUv = uv;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D tDiffuse;',
      'uniform float amount;',
      'uniform float vignette;',
      'uniform float time;',
      'varying vec2 vUv;',
      'float rand(vec2 co) {',
      '  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);',
      '}',
      'void main() {',
      '  vec4 c = texture2D(tDiffuse, vUv);',
      '  float n = rand(vUv + fract(time)) - 0.5;',
      '  c.rgb += n * amount;',
      '  float d = distance(vUv, vec2(0.5));',
      '  c.rgb *= smoothstep(0.85, vignette * 0.5, d) * 0.25 + 0.75;',
      '  gl_FragColor = c;',
      '}'
    ].join('\n')
  };

  // Weak hardware gets the plain renderer. Checked once, cheaply.
  function capable(renderer) {
    try {
      const gl = renderer.getContext();
      if (!gl) return false;
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const name = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
      if (/SwiftShader|llvmpipe|Software/i.test(name)) return false;
      return renderer.capabilities.maxTextures >= 8;
    } catch (e) {
      return false;
    }
  }

  function create(renderer, scene, camera) {
    const need = { EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, OutputPass };
    for (const k in need) {
      if (!need[k]) {
        console.warn('[post] ' + k + ' missing, rendering without the chain');
        return null;
      }
    }
    if (!capable(renderer)) {
      console.warn('[post] weak GPU detected, rendering without the chain');
      return null;
    }
    // The five-key guard above only rules out the classes this file
    // constructs being undefined; it cannot rule out the constructors
    // themselves throwing (WebGL resource limits, shader compilation
    // failures, driver quirks). An uncaught exception here would escape
    // Post.create into initApp and abort everything after it — no bake,
    // no window.__app, no render loop, a permanently stuck "Click to
    // enter" screen. Wrap the whole body so any construction failure
    // degrades to "no post chain" instead.
    try {
      const size = new T.Vector2();
      renderer.getSize(size);

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));

      // strength, radius, threshold. r128 ran its composer with the render
      // targets patched to sRGBEncoding (see git history of this file before
      // task 5), so RenderPass there emitted fully tonemapped+sRGB-encoded
      // pixels and UnrealBloomPass's LuminosityHighPassShader thresholded a
      // display-referred 0.92. On r185 RenderPass writes a *linear*,
      // untonemapped target -- OutputPass alone owns tonemap+encode, once,
      // at the end -- so the same literal 0.92 now compares against raw
      // scene radiance instead, and ~17-21% of the frame crosses it where
      // r128 was near-inert (measured task 5).
      //
      // Converted threshold, derived from the actual vendored ACES/sRGB
      // formulas (tour/lib/three-0.185.0's tonemapping_pars_fragment /
      // colorspace_pars_fragment), not tuned by eye:
      //   1. Undo sRGB OETF: encoded 0.92 -> y = ((0.92+0.055)/1.055)^2.4
      //                                       = 0.82757 (ACES-output space;
      //      matches this file's own pre-task-5 comment, "roughly 0.83 in
      //      linear light", independently derived at the time).
      //   2. Undo RRTAndODTFit (ACESFilmicToneMapping's rational fit) for a
      //      neutral/grey input -- exact for grey because both ACES 3x3
      //      matrices have row sums of 1.0, so they're a no-op on r=g=b:
      //      solve y = (x^2+0.0245786x-0.000090537)/(0.983729x^2+0.432951x+0.238081)
      //      for x, positive root: x = 2.263646.
      //   3. Undo the exposure/0.6 pre-scale: L = x * 0.6 / exposure.
      //      Calibrated at exposure 1.05 -- the app.js fallback default,
      //      and what kings-court and horkyone-10 actually run at (only
      //      serenity overrides exposure, to 0.33, which this single global
      //      constant can't also match; see task-6-report.md for the
      //      residual that leaves).
      //      L = 2.263646 * 0.6 / 1.05 = 1.293512.
      // Round-trip-verified: full_forward(1.293512, exposure=1.05) = 0.92
      // exactly (script in task-6-report.md).
      //
      // KNOWN UNCONVERTED RESIDUAL -- the `strength` 0.22 below.
      // The threshold conversion above fixes *which* pixels bloom. It does
      // not fix *how much* they add, and that moved domain too. The chain:
      //   LuminosityHighPassShader:  gl_FragColor = mix(black, texel, alpha)
      //       -- above threshold the whole texel passes through unscaled, at
      //          whatever magnitude the buffer holds;
      //   UnrealBloomPass composite: bloom = 3.0 * bloomStrength * sum(mips),
      //       blended with AdditiveBlending over the base.
      // So the pass adds `strength x (radiance of the bright pixels)` in the
      // domain it sits in. On r128 that domain was display-referred and
      // capped near 1.0, so 0.22 could add at most ~0.22. On r185 the same
      // pass sits in raw linear radiance, which this branch measured at up
      // to **15.32** max luminance / 17.01 max single channel at serenity's
      // bathroom spot, and 2.20 / 2.68 at its entrance (task-5-report.md,
      // determinism-checked across three renders and a reload). At 15.32
      // the additive term is ~3.4 where r128's was <=0.22 -- roughly 15x,
      // and higher again now that the direct lights carry their legacy PI
      // factor (builder.js).
      //
      // This is structurally the same additive-in-the-wrong-domain bug that
      // was found and fixed for GrainVignetteShader below, and it has the
      // same non-solution: no single `strength` reproduces r128's behaviour
      // for every pixel, because the needed factor depends on how bright
      // each bloomed pixel is. Grain was fixed by reordering it past
      // OutputPass. **Bloom cannot be reordered** -- it must read the HDR
      // buffer to have anything above 1.0 to bloom at all, and putting it
      // after OutputPass would defeat the whole pass.
      //
      // Deliberately NOT retuned here. Any "corrected" number would be
      // taste, not mechanism, and this plan's discipline is mechanism only.
      // Bloom tuning is plan 2's, alongside the exposure re-fit that changes
      // what these radiances even are. Recorded as an accepted, documented
      // r185 residual in docs/superpowers/metrics/r128-reference.md, the
      // same category as the point-light attenuation change and the BRDF/IBL
      // changes.
      const bloom = new UnrealBloomPass(size, 0.22, 0.5, 1.294);
      composer.addPass(bloom);

      // Tone mapping and the sRGB conversion happen here, once. This is
      // what replaces r128's per-material encoding and the render target
      // patch deleted in task 4.
      composer.addPass(new OutputPass());

      // Grain/vignette runs LAST, after OutputPass, not before it -- moved
      // here as a fix-round finding, not the original placement. r128's
      // patched composer (see git history of this file before task 5) fed
      // GrainVignetteShader fully tonemapped+sRGB-encoded pixels, and its
      // own pre-task-5 comment says so explicitly: "bloom and the
      // grain/vignette pass now read and write gamma-encoded (not linear)
      // values". Placed before OutputPass (this file's state through the
      // rest of task 6), the shader instead got raw linear HDR radiance --
      // the identical domain bug already found and fixed for the bloom
      // threshold, but for a full shader instead of one constant.
      //
      // A constant-conversion fix (compensate 0.035/0.55 for the linear
      // domain, the way 0.92 was converted to 1.294 above) is not just
      // harder here, it is not *possible* to make exact: the grain term is
      // ADDITIVE (`c.rgb += n * amount`), and ACESFilmicToneMapping+sRGB is
      // a nonlinear function of the pixel value it's added to, so the same
      // fixed linear offset produces a wildly different encoded-domain
      // delta depending on how bright the underlying pixel already is (a
      // large lift near black, negligible near white) -- there is no
      // single amount that reproduces a uniform ±0.035 in encoded space for
      // every pixel simultaneously. The vignette multiply has the same
      // shape of problem one level down (multiplying pre-tonemap changes
      // which part of the compressive ACES curve a pixel lands on).
      //
      // Reordering sidesteps both: it puts the shader back in the exact
      // domain its constants were always written for, with the constants
      // themselves untouched -- true behaviour preservation, not an
      // approximation of it. `OutputPass`'s own class doc says as much:
      // "If a pass requires sRGB input ... the pass must follow OutputPass
      // in the pass chain." EffectComposer.render() sets `renderToScreen`
      // on whichever pass is last and *enabled* on every call
      // (`isLastEnabledPass`), so grain still renders straight to the
      // canvas exactly as it did when task 5 removed its old, now-stale
      // `grain.renderToScreen = true` line -- nothing else needed.
      //
      // Measured (docs/superpowers/metrics/r128-reference.md): reordering
      // alone, no constant changed, dropped worst-of-30 MAD from 41.33 to
      // 34.97 and moved three frames under the 2.0 threshold outright.
      const grain = new ShaderPass(GrainVignetteShader);
      composer.addPass(grain);

      return {
        composer: composer,
        enabled: true,
        setSize: function (w, h) {
          // composer.setSize already resizes every pass (bloom included) at
          // width*pixelRatio — an extra bloom.setSize(w, h) here would
          // re-size just the bloom mip chain from CSS pixels, running it at
          // half resolution on a DPR-2 display while measure.js (which only
          // calls composer.setSize) scores a correctly-sized bloom. Do not
          // add that call back.
          composer.setSize(w, h);
        },
        update: function (t) { grain.uniforms.time.value = t; },
        render: function (t) { grain.uniforms.time.value = t; composer.render(); }
      };
    } catch (e) {
      console.warn('[post] failed to build the post-processing chain, rendering without it:', e);
      return null;
    }
  }

  return { create };
})();
