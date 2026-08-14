// ============================================================
// Post-processing: bloom on bright daylight, then film grain and
// vignette. Deliberately restrained — past a low threshold these
// read as cheap filters and cost more trust than they earn.
//
// No SSAO: bake.js bakes real ambient occlusion into the floors and
// the furniture vertices, and every object here is static, so a
// screen-space pass would recompute worse data at runtime. That
// reasoning holds for the surfaces the bake reaches; walls it does
// not reach — bakeWalls() calls lightAt() alone, so a floor-to-wall
// corner darkens on the floor side only (see bake.js).
//
// SCREEN-SPACE AO WAS MEASURED AND REJECTED — do not re-add it
// without reading why. Phase B plan 3 task 3 vendored GTAOPass from
// three 0.185.0, wired it in here between RenderPass and the bloom
// pass, and measured it on all three apartments. Rejected on two
// grounds of unequal reach: (1) it blackens whole walls, on every
// device — GTAO is the first thing in this pipeline that reads scene
// normals, and the walls present their far face (the deferred winding
// defect in bake.js grid()); (2) its depth/normal prepass is a second
// full scene pass, taking kings-court to 282 mobile draw calls
// against a hard ≤250 (desktop 311 against ≤400 is inside budget).
// Ground 1 is what closes it today. Numbers, causal proof and the
// preserved working code: the OUTCOME block under task 3 in
// docs/superpowers/plans/2026-08-13-phase-b3-light.md, and
// docs/superpowers/rejected/2026-08-13-b3-task3-gtao/.
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

      // strength, radius, threshold -- fitted empirically, task 7 of plan 2
      // (full sweep data: .superpowers/sdd/2026-08-13-phase-b2-measurement-
      // exposure/task-7-report.md). Both constants moved from where phase B1
      // left them (0.22, 0.5, 1.294); history below.
      //
      // BACKGROUND: r128 ran its composer with the render targets patched to
      // sRGBEncoding (see git history of this file before task 5 of phase
      // B1), so RenderPass there emitted fully tonemapped+sRGB-encoded
      // pixels and UnrealBloomPass's LuminosityHighPassShader thresholded a
      // display-referred 0.92. On r185 RenderPass writes a *linear*,
      // untonemapped target -- OutputPass alone owns tonemap+encode, once,
      // at the end -- so the literal 0.92 compared against raw scene
      // radiance instead of the intended display-referred value. Phase B1
      // derived a like-for-like replacement analytically from the vendored
      // ACES/sRGB formulas: undo the sRGB OETF, undo RRTAndODTFit for a
      // neutral input, undo the exposure/0.6 pre-scale -- giving 1.293512,
      // calibrated at exposure 1.05 (full derivation, superseded, in this
      // file's git history before this commit). `strength` was left
      // unconverted at 0.22 in the same commit, flagged as a known residual:
      // the additive term it controls (`strength * radiance of the
      // thresholded pixels`) was capped near 1.0 in r128's display-referred
      // domain but not in r185's raw linear one, measured there at up to
      // **15.32** at serenity's bathroom spot (task-5-report.md, phase B1).
      //
      // WHY 1.293512 DOESN'T SURVIVE PLAN 2: that derivation solved for one
      // threshold at one shared exposure (1.05, the only value any apartment
      // ran at when it was written). Task 7 fits exposure *per apartment*
      // instead -- serenity 0.326, kings-court 0.56, horkyone-10 0.45. All
      // three are fitted, not two: horkyone-10 has no `compare` spots to fit
      // an exposure against by resemblance, so it is fitted on mean scene
      // luminance landing within ±10 of the other two instead (see the
      // apartment JSONs and metrics/README.md) -- not left at the 1.05
      // default.
      // There is no single exposure left to solve the analytic derivation's
      // step 3 against, so task 7 measured empirically instead of re-solving
      // it: reproduced RenderPass's own call pattern (setRenderTarget to an
      // offscreen FloatType target, render, read back) to get the same
      // pre-tonemap linear buffer LuminosityHighPassShader thresholds, then
      // swept threshold and read the fraction of frame area above it across
      // both fitted apartments' spawns plus known specular spots, tracking
      // fraction over threshold rather than the peak pixel (the peak is a
      // single specular sample whose magnitude is unstable across
      // render-target sizes; the fraction is not -- established phase B1).
      //
      // At the old 1.294, serenity's entrance -- ordinary daylight, not a
      // highlight -- measured 10.51% of frame area over threshold at its
      // fitted exposure (0.326): a visibly blown-out ceiling wash, confirmed
      // by eye, not the near-inert result r128 had there. The wash has a
      // sharp edge around luminance 1.6-1.7; **threshold 1.8** clears it
      // (entrance and every other ordinary position tested, both fitted
      // apartments, land at <=0.05% of frame area) while the one apartment's
      // one known specular highlight -- the backlit bathroom mirror, plan 1
      // -- keeps a small, real crossing (0.19-0.21% of frame), close to
      // r128's own reference behaviour for that same highlight (0.17%,
      // metrics/README.md "Is bloom still doing anything?"). Also checked
      // against horkyone-10 (the apartment likeliest to push a shared
      // threshold too low): every spawn measured 0% over threshold at its
      // exposure then -- the un-fit 1.05 default; it is fitted now, to
      // 0.45, see above -- so 1.8 holds regardless of which value was live:
      // this buffer sits before OutputPass, the one stage that reads
      // toneMappingExposure, so no apartment's own exposure moves what
      // bloom thresholds against.
      //
      // With threshold fixed, **strength 0.1** (down from 0.22) was chosen
      // by rendering the bathroom highlight through the full composited,
      // tonemapped chain with bloom on vs off and looking at the frames: 0.22
      // produced a visibly soft, spreading halo dominating the highlight
      // (about 16% of that frame's pixels changed vs bloom-off) where 0.1
      // reads as a contained glint on the mirror and the shower glass, much
      // closer to r128's own reference proportion for the same comparison
      // (~5.96%, metrics/README.md). Confirmed on both serenity and
      // kings-court; frames in task-7-report.md.
      //
      // These are global constants, not per-apartment -- there is one bloom
      // pass for all three flats, at three different fitted (or unfitted)
      // exposures, so "fitted" here means "verified inert-or-glint-shaped at
      // ordinary positions across all three," not tuned against any one
      // apartment's photographs the way exposure itself is.
      const bloom = new UnrealBloomPass(size, 0.1, 0.5, 1.8);
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
