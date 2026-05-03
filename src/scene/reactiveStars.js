// src/scene/reactiveStars.js
import * as THREE from 'three';

function createStarSpriteTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
  glow.addColorStop(0.0, 'rgba(255,255,255,1.0)');
  glow.addColorStop(0.08, 'rgba(255,255,255,1.0)');
  glow.addColorStop(0.22, 'rgba(255,245,235,0.95)');
  glow.addColorStop(0.45, 'rgba(255,220,200,0.45)');
  glow.addColorStop(0.75, 'rgba(255,180,160,0.12)');
  glow.addColorStop(1.0, 'rgba(255,255,255,0.0)');

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = 'lighter';

  const flareH = ctx.createLinearGradient(0, cy, size, cy);
  flareH.addColorStop(0.0, 'rgba(255,255,255,0)');
  flareH.addColorStop(0.5, 'rgba(255,245,240,0.32)');
  flareH.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = flareH;
  ctx.fillRect(0, cy - 1, size, 2);

  const flareV = ctx.createLinearGradient(cx, 0, cx, size);
  flareV.addColorStop(0.0, 'rgba(255,255,255,0)');
  flareV.addColorStop(0.5, 'rgba(255,245,240,0.22)');
  flareV.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = flareV;
  ctx.fillRect(cx - 1, 0, 2, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;

  return texture;
}

export function createReactiveStarLayer(
  count,
  spreadX,
  spreadY,
  zMin,
  zMax,
  size,
  opacity
) {
  const geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(count * 3);
  const basePositions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const baseColors = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const absorbed = new Float32Array(count);

  const white = new THREE.Color(0xf7f9ff);
  const blue = new THREE.Color(0xd6e6ff);
  const warm = new THREE.Color(0xffebcf);
  const pink = new THREE.Color(0xffd6e7);
  const mixed = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * spreadX;
    const y = (Math.random() - 0.5) * spreadY;
    const z = THREE.MathUtils.lerp(zMin, zMax, Math.random());

    const idx = i * 3;

    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;

    basePositions[idx] = x;
    basePositions[idx + 1] = y;
    basePositions[idx + 2] = z;

    velocities[idx] = 0;
    velocities[idx + 1] = 0;
    velocities[idx + 2] = 0;

    absorbed[i] = 0;
    seeds[i] = Math.random() * 1000;

    mixed.copy(white).lerp(blue, Math.random() * 0.42);
    mixed.lerp(warm, Math.random() * 0.05);
    mixed.lerp(pink, Math.random() * 0.03);

    colors[idx] = mixed.r;
    colors[idx + 1] = mixed.g;
    colors[idx + 2] = mixed.b;

    baseColors[idx] = mixed.r;
    baseColors[idx + 1] = mixed.g;
    baseColors[idx + 2] = mixed.b;
  }

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3)
  );

  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(colors, 3)
  );

  const starTexture = createStarSpriteTexture();

  const material = new THREE.PointsMaterial({
    size,
    map: starTexture,
    alphaMap: starTexture,
    vertexColors: true,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    alphaTest: 0.02,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  return {
    points,
    positions,
    basePositions,
    velocities,
    colors,
    baseColors,
    seeds,
    absorbed,
    count,
  };
}

function getThemeColors(theme) {
  if (theme === 'blue') {
    return {
      hotRed: new THREE.Color(0x1f8cff),
      hotGlow: new THREE.Color(0x7ce8ff),
      whiteHot: new THREE.Color(0xeaffff),
    };
  }

  if (theme === 'purple') {
    return {
      hotRed: new THREE.Color(0x9b35ff),
      hotGlow: new THREE.Color(0xd18cff),
      whiteHot: new THREE.Color(0xf5e8ff),
    };
  }

  return {
    hotRed: new THREE.Color(0xff0f0f),
    hotGlow: new THREE.Color(0xff6a6a),
    whiteHot: new THREE.Color(0xfff0f0),
  };
}

export function updateReactiveLayer(
  layer,
  singularity,
  intensity,
  deltaTime,
  time,
  absorption = 0,
  theme = 'red'
) {
  const positions = layer.positions;
  const basePositions = layer.basePositions;
  const velocities = layer.velocities;
  const colors = layer.colors;
  const baseColors = layer.baseColors;
  const seeds = layer.seeds;
  const absorbed = layer.absorbed;

  const { hotRed, hotGlow, whiteHot } = getThemeColors(theme);
  const mixed = new THREE.Color();

  const captureRadius = 0.13;

  for (let i = 0; i < layer.count; i++) {
    const idx = i * 3;

    let x = positions[idx];
    let y = positions[idx + 1];
    let z = positions[idx + 2];

    let vx = velocities[idx];
    let vy = velocities[idx + 1];
    let vz = velocities[idx + 2];

    const bx = basePositions[idx];
    const by = basePositions[idx + 1];
    const bz = basePositions[idx + 2];

    if (absorption <= 0.001) {
      absorbed[i] = 0;
    }

    if (absorbed[i] > 0.5) {
      positions[idx] = singularity.x;
      positions[idx + 1] = singularity.y;
      positions[idx + 2] = singularity.z;

      velocities[idx] = 0;
      velocities[idx + 1] = 0;
      velocities[idx + 2] = 0;

      colors[idx] += (0 - colors[idx]) * 0.45;
      colors[idx + 1] += (0 - colors[idx + 1]) * 0.45;
      colors[idx + 2] += (0 - colors[idx + 2]) * 0.45;

      continue;
    }

    if (intensity <= 0.001) {
      vx *= 0.9;
      vy *= 0.9;
      vz *= 0.9;

      x += (bx - x) * deltaTime * 0.58 + vx * deltaTime;
      y += (by - y) * deltaTime * 0.58 + vy * deltaTime;
      z += (bz - z) * deltaTime * 0.58 + vz * deltaTime;

      colors[idx] += (baseColors[idx] - colors[idx]) * 0.07;
      colors[idx + 1] += (baseColors[idx + 1] - colors[idx + 1]) * 0.07;
      colors[idx + 2] += (baseColors[idx + 2] - colors[idx + 2]) * 0.07;
    } else {
      const dx = singularity.x - x;
      const dy = singularity.y - y;
      const dz = singularity.z - z;

      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.0001;

      const influence = Math.max(0, 1 - dist / 6.4);
      const falloff = influence * influence;

      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;

      const tx = -ny;
      const ty = nx;
      const tz = Math.sin(time * 1.2 + seeds[i]) * 0.05;

      const noiseX =
        Math.sin(time * 2.0 + seeds[i] + x * 2.2) * 0.04 +
        Math.cos(time * 1.1 + seeds[i] + y * 2.0) * 0.025;

      const noiseY =
        Math.cos(time * 1.8 + seeds[i] + y * 2.5) * 0.04 +
        Math.sin(time * 0.95 + seeds[i] + x * 2.1) * 0.025;

      const absorptionBoost = 1 + absorption * 5.2;

      const pull =
        (0.9 + falloff * 12.5) *
        intensity *
        absorptionBoost;

      const swirl =
        (0.22 + falloff * 2.8) *
        intensity *
        (1 - absorption * 0.82);

      const snap =
        dist < 0.9
          ? (0.9 + (0.9 - dist) * 9.0) * intensity * absorptionBoost
          : 0;

      vx =
        vx * (0.91 - absorption * 0.12) +
        (nx * (pull + snap) + tx * swirl + noiseX) * deltaTime * 10.8;

      vy =
        vy * (0.91 - absorption * 0.12) +
        (ny * (pull + snap) + ty * swirl + noiseY) * deltaTime * 10.8;

      vz =
        vz * (0.92 - absorption * 0.1) +
        (nz * (pull + snap) * 0.34 + tz * swirl * 0.16) *
          deltaTime *
          10.8;

      x += vx * deltaTime;
      y += vy * deltaTime;
      z += vz * deltaTime;

      if (dist < captureRadius) {
        if (absorption > 0.01) {
          absorbed[i] = 1;

          x = singularity.x;
          y = singularity.y;
          z = singularity.z;

          vx = 0;
          vy = 0;
          vz = 0;

          colors[idx] = 0;
          colors[idx + 1] = 0;
          colors[idx + 2] = 0;
        } else {
          const angle = Math.random() * Math.PI * 2;
          const radius = 4.2 + Math.random() * 2.6;

          x = singularity.x + Math.cos(angle) * radius;
          y = singularity.y + Math.sin(angle) * radius * 0.82;
          z = bz;

          vx = 0;
          vy = 0;
          vz = 0;

          colors[idx] = baseColors[idx];
          colors[idx + 1] = baseColors[idx + 1];
          colors[idx + 2] = baseColors[idx + 2];
        }
      }

      const heat = Math.min(1, falloff * 2.6 + intensity * 0.45);

      mixed.setRGB(
        baseColors[idx],
        baseColors[idx + 1],
        baseColors[idx + 2]
      );

      mixed.lerp(hotRed, heat * 0.95);
      mixed.lerp(hotGlow, heat * 0.55);
      mixed.lerp(whiteHot, Math.max(0, heat - 0.78) * 0.35);

      colors[idx] += (mixed.r - colors[idx]) * 0.18;
      colors[idx + 1] += (mixed.g - colors[idx + 1]) * 0.18;
      colors[idx + 2] += (mixed.b - colors[idx + 2]) * 0.18;
    }

    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;

    velocities[idx] = vx;
    velocities[idx + 1] = vy;
    velocities[idx + 2] = vz;
  }

  layer.points.geometry.attributes.position.needsUpdate = true;
  layer.points.geometry.attributes.color.needsUpdate = true;
}