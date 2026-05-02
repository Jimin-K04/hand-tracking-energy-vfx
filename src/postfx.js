import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  VignetteEffect,
  ChromaticAberrationEffect,
} from 'postprocessing';

export function createPostFX(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new BloomEffect({
    intensity: 1.15,
    luminanceThreshold: 0.08,
    luminanceSmoothing: 0.2,
    mipmapBlur: true,
  });

  const vignette = new VignetteEffect({
    offset: 0.32,
    darkness: 0.68,
  });

  const chromatic = new ChromaticAberrationEffect({
    offset: new THREE.Vector2(0.00012, 0.00012),
  });

  const effectPass = new EffectPass(
    camera,
    bloom,
    vignette,
    chromatic
  );

  effectPass.renderToScreen = true;
  composer.addPass(effectPass);

  function resize() {
    composer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener('resize', resize);
  resize();

  return { composer, bloom };
}