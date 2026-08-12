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
    if (!T.EffectComposer || !T.UnrealBloomPass) {
      console.warn('[post] example files missing, rendering without the chain');
      return null;
    }
    if (!capable(renderer)) {
      console.warn('[post] weak GPU detected, rendering without the chain');
      return null;
    }
    // The two-name check above only covers the two files whose absence
    // leaves THREE.UnrealBloomPass/EffectComposer undefined before any
    // constructor runs. RenderPass.js, ShaderPass.js, CopyShader.js and
    // LuminosityHighPassShader.js each fail differently and only once
    // something below tries to use them (new T.RenderPass(...) throwing
    // TypeError, EffectComposer's internal `new THREE.ShaderPass(CopyShader)`
    // throwing, UnrealBloomPass's constructor calling
    // UniformsUtils.clone(undefined.uniforms), etc.) — those exceptions
    // would otherwise escape past Post.create into initApp and abort
    // everything after it: no bake, no window.__app, no render loop, a
    // permanently stuck "Click to enter" screen. Wrapping the whole body
    // catches all six failure shapes the same way, not just the two the
    // name guard happens to catch before construction even starts.
    try {
      const size = new T.Vector2();
      renderer.getSize(size);

      const composer = new T.EffectComposer(renderer);

      // EffectComposer's auto-created render targets default to
      // LinearEncoding regardless of renderer.outputEncoding. None of the
      // full-screen-quad shaders in this chain (UnrealBloomPass's internal
      // passes, our own grain/vignette pass) apply sRGB encoding themselves
      // — they are hand-written GLSL with no <encodings_fragment> chunk, so
      // nothing in the chain ever encodes. Three.js derives the *scene*
      // shader's output encoding from the currently bound render target's
      // texture.encoding, not from renderer.outputEncoding directly — so
      // with an unpatched (Linear) target, RenderPass's scene materials
      // compile with an identity linearToOutputTexel and the sRGB encode
      // that should happen there simply never runs, rather than a decode
      // running that shouldn't. Numerically the same missing step either
      // way, but worth being precise about: there is no stray decode
      // anywhere in this chain to go hunting for. Measured directly: the
      // same surface reads ~148 out of 255 rendered straight to the screen
      // but ~76 through an unpatched composer target — matches leaving that
      // one encode out. Match the render targets' encoding to the
      // renderer's so RenderPass actually performs it.
      //
      // Consequence worth knowing if these tuning numbers ever need
      // revisiting: bloom and the grain/vignette pass now read and write
      // gamma-encoded (not linear) values, since nothing downstream decodes
      // before operating on them and nothing re-encodes after. The 0.92
      // bloom threshold therefore acts on encoded values — roughly 0.83 in
      // linear light. The corner vignette factor (~0.789, see
      // GrainVignetteShader) is correspondingly closer to 0.57x in linear
      // terms than its face-value 0.79 suggests.
      composer.renderTarget1.texture.encoding = renderer.outputEncoding;
      composer.renderTarget2.texture.encoding = renderer.outputEncoding;

      composer.addPass(new T.RenderPass(scene, camera));

      // strength, radius, threshold — threshold high so only real daylight blooms
      const bloom = new T.UnrealBloomPass(size, 0.22, 0.5, 0.92);
      composer.addPass(bloom);

      const grain = new T.ShaderPass(GrainVignetteShader);
      grain.renderToScreen = true;
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
