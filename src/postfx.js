// src/postfx.js
import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  VignetteEffect,
  ChromaticAberrationEffect,
} from 'postprocessing';
import { PinchDistortionEffect } from './effects/PinchDistortionEffect.js';

export function createPostFX(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const pinch = new PinchDistortionEffect();
  pinch.setStrength(0);
  pinch.setRadius(0.38);

  // UV 변형 효과는 따로 분리
  const distortionPass = new EffectPass(camera, pinch);
  composer.addPass(distortionPass);

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

  const visualPass = new EffectPass(
    camera,
    bloom,
    vignette,
    chromatic
  );

  visualPass.renderToScreen = true;
  composer.addPass(visualPass);

  function resize() {
    composer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener('resize', resize);
  resize();

  return {
    composer,
    bloom,
    vignette,
    chromatic,
    pinch,
  };
}