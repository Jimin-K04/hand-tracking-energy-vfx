// src/scene.js
import * as THREE from 'three';
import { createCosmos } from './scene/createCosmos.js';

export function createScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    220
  );

  camera.position.z = 6.5;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.03;

  const energyCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0xdfe8ff,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );

  scene.add(energyCore);

  const ambientParticles = new THREE.Group();
  scene.add(ambientParticles);

  for (let i = 0; i < 36; i++) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.008, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0xe8efff,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    particle.position.set(
      (Math.random() - 0.5) * 7,
      (Math.random() - 0.5) * 4.5,
      (Math.random() - 0.5) * 3
    );

    ambientParticles.add(particle);
  }

  const cosmos = createCosmos(scene);

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  window.addEventListener('resize', resize);

  return {
    scene,
    camera,
    renderer,
    energyCore,
    ambientParticles,
    cosmos,
  };
}