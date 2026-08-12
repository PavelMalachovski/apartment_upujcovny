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
    const size = new T.Vector2();
    renderer.getSize(size);

    const composer = new T.EffectComposer(renderer);
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
        composer.setSize(w, h);
        bloom.setSize(w, h);
      },
      update: function (t) { grain.uniforms.time.value = t; },
      render: function (t) { grain.uniforms.time.value = t; composer.render(); }
    };
  }

  return { create };
})();
