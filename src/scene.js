import * as THREE from 'three';

function createNebulaTexture(colorHex, density = 60) {
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

function createNebulaSprite(colorHex, x, y, z, scale, opacity) {
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

function createReactiveStarLayer(
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

function updateReactiveLayer(
  layer,
  singularity,
  intensity,
  deltaTime,
  time,
  absorption = 0
) {
  const positions = layer.positions;
  const basePositions = layer.basePositions;
  const velocities = layer.velocities;
  const colors = layer.colors;
  const baseColors = layer.baseColors;
  const seeds = layer.seeds;
  const absorbed = layer.absorbed;

  const hotRed = new THREE.Color(0xff0f0f);
  const hotGlow = new THREE.Color(0xff6a6a);
  const whiteHot = new THREE.Color(0xfff0f0);
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

  const starsBack = createReactiveStarLayer(
    2200,
    90,
    55,
    -140,
    -70,
    0.032,
    0.9
  );

  const starsMid = createReactiveStarLayer(
    1500,
    62,
    40,
    -65,
    -18,
    0.045,
    0.76
  );

  const starsFront = createReactiveStarLayer(
    680,
    35,
    23,
    -16,
    8,
    0.062,
    0.44
  );

  scene.add(starsBack.points);
  scene.add(starsMid.points);
  scene.add(starsFront.points);

  const nebulaGroup = new THREE.Group();
  scene.add(nebulaGroup);

  nebulaGroup.add(createNebulaSprite(0x244a9b, -10, 5, -42, 26, 0.16));
  nebulaGroup.add(createNebulaSprite(0x2d5bb8, 9, -4, -38, 22, 0.13));

  nebulaGroup.add(createNebulaSprite(0x5b2d91, 6, 4, -34, 18, 0.11));
  nebulaGroup.add(createNebulaSprite(0x7a3ca2, -7, -5, -30, 16, 0.09));

  nebulaGroup.add(createNebulaSprite(0x9a3450, 0, 1, -28, 14, 0.06));
  nebulaGroup.add(createNebulaSprite(0xb44a38, 4, 0, -26, 12, 0.04));

  nebulaGroup.add(createNebulaSprite(0xb89958, -2, -3, -32, 15, 0.035));

  const foregroundMist = new THREE.Group();
  scene.add(foregroundMist);

  foregroundMist.add(createNebulaSprite(0x1f3f7a, -6, 3, -8, 10, 0.035));
  foregroundMist.add(createNebulaSprite(0x4d2c6e, 5, -2, -7, 9, 0.03));
  foregroundMist.add(createNebulaSprite(0x7a2a36, 0, 0, -6, 8, 0.02));

  const cosmos = {
    starsBack,
    starsMid,
    starsFront,
    nebulaGroup,
    foregroundMist,
    singularity: new THREE.Vector3(0, 0, -1.2),
    intensity: 0,
    absorption: 0,
    visibility: 1,
    time: 0,

    setVisibility(visibility) {
      this.visibility = THREE.MathUtils.clamp(visibility, 0, 1);
    },

    setAbsorption(absorption) {
      this.absorption = THREE.MathUtils.clamp(absorption, 0, 1);
    },

    setSingularity(position, intensity) {
      this.singularity.copy(position);
      this.intensity = THREE.MathUtils.lerp(this.intensity, intensity, 0.16);
    },

    update(deltaTime) {
      this.time += deltaTime;

      updateReactiveLayer(
        this.starsBack,
        this.singularity,
        this.intensity * 0.82,
        deltaTime,
        this.time,
        this.absorption
      );

      updateReactiveLayer(
        this.starsMid,
        this.singularity,
        this.intensity * 1.16,
        deltaTime,
        this.time,
        this.absorption
      );

      updateReactiveLayer(
        this.starsFront,
        this.singularity,
        this.intensity * 1.55,
        deltaTime,
        this.time,
        this.absorption
      );

      this.nebulaGroup.rotation.y += deltaTime * 0.003;
      this.nebulaGroup.rotation.z += deltaTime * 0.0012;

      this.foregroundMist.rotation.z -= deltaTime * 0.002;
      this.foregroundMist.rotation.y += deltaTime * 0.001;

      for (let i = 0; i < this.nebulaGroup.children.length; i++) {
        const sprite = this.nebulaGroup.children[i];

        sprite.position.x += Math.sin(this.time * 0.08 + i) * 0.002;
        sprite.position.y += Math.cos(this.time * 0.06 + i * 0.7) * 0.0015;
      }

      this.starsBack.points.material.opacity = 0.9 * this.visibility;
      this.starsMid.points.material.opacity = 0.76 * this.visibility;
      this.starsFront.points.material.opacity = 0.44 * this.visibility;
    },
  };

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