// src/scene/nebulaUtils.js
import * as THREE from 'three';

export function createNebulaTexture(colorHex, density = 60) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  const color = new THREE.Color(colorHex);
  const r = Math.floor(color.r * 255);
  const g = Math.floor(color.g * 255);
  const b = Math.floor(color.b * 255);

  const baseGradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    20,
    size / 2,
    size / 2,
    size / 2
  );

  baseGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.12)`);
  baseGradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.07)`);
  baseGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < density; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 30 + Math.random() * 90;
    const alpha = 0.02 + Math.random() * 0.05;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    grad.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, ${alpha * 0.45})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;

  return texture;
}

export function createNebulaSprite(colorHex, x, y, z, scale, opacity) {
  const material = new THREE.SpriteMaterial({
    map: createNebulaTexture(colorHex),
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const sprite = new THREE.Sprite(material);
  sprite.position.set(x, y, z);
  sprite.scale.set(scale, scale, 1);

  return sprite;
}