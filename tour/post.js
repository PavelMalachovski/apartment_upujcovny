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

      // strength, radius, threshold. The threshold is re-derived in step 3 of
      // this task: on r185 the chain runs in linear light and OutputPass does
      // tone mapping at the end, so the value that acted on encoded pixels in
      // r128 does not mean the same thing here.
      const bloom = new UnrealBloomPass(size, 0.22, 0.5, 0.92);
      composer.addPass(bloom);

      const grain = new ShaderPass(GrainVignetteShader);
      composer.addPass(grain);

      // Tone mapping and the sRGB conversion happen here, once, at the end.
      // This is what replaces r128's per-material encoding and the render
      // target patch deleted in task 4.
      composer.addPass(new OutputPass());

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
