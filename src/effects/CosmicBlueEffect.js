// src/effects/CosmicBlueEffect.js
import * as THREE from 'three';

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function createInnerVortexTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'lighter';

  const baseGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
  baseGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.98)');
  baseGrad.addColorStop(0.16, 'rgba(0, 3, 16, 0.94)');
  baseGrad.addColorStop(0.36, 'rgba(0, 10, 44, 0.78)');
  baseGrad.addColorStop(0.64, 'rgba(0, 22, 92, 0.34)');
  baseGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 24; i++) {
    const radius = 44 + i * 16;
    const start = -2.7 + i * 0.2;
    const end = start + Math.PI * (0.78 + i * 0.018);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, end);

    const alpha = Math.max(0.025, 0.18 - i * 0.005);
    ctx.strokeStyle = `rgba(${5 + i * 2}, ${48 + i * 6}, ${150 + i * 5}, ${alpha})`;
    ctx.lineWidth = Math.max(1.6, 9 - i * 0.24);
    ctx.shadowColor = 'rgba(0, 100, 255, 0.55)';
    ctx.shadowBlur = 18;
    ctx.stroke();
  }

  for (let i = 0; i < 120; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.pow(Math.random(), 0.75) * size * 0.42;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    const radius = 16 + Math.random() * 78;

    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, 'rgba(0, 115, 255, 0.13)');
    g.addColorStop(0.25, 'rgba(0, 70, 220, 0.08)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.22);
  core.addColorStop(0.0, 'rgba(0, 0, 0, 0.9)');
  core.addColorStop(0.22, 'rgba(0, 16, 70, 0.42)');
  core.addColorStop(0.48, 'rgba(0, 80, 255, 0.16)');
  core.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.23, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return texture;
}

function createRadialTexture(stops, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    4,
    size / 2,
    size / 2,
    size / 2
  );

  for (const [offset, color] of stops) {
    gradient.addColorStop(offset, color);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createGlowSprite(stops, opacity = 1, size = 512) {
  const texture = createRadialTexture(stops, size);

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Sprite(material);
}

function createRingGlowSprite() {
  return createGlowSprite(
    [
      [0.0, 'rgba(0,0,0,0)'],
      [0.74, 'rgba(0,0,0,0)'],
      [0.82, 'rgba(0,25,140,0.10)'],
      [0.88, 'rgba(0,80,255,0.26)'],
      [0.92, 'rgba(20,155,255,0.72)'],
      [0.945, 'rgba(170,235,255,0.96)'],
      [0.975, 'rgba(0,85,255,0.22)'],
      [1.0, 'rgba(0,0,0,0)'],
    ],
    0,
    1024
  );
}

function createParticleSystem(count, size = 0.01) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3)
  );

  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(colors, 3)
  );

  const material = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  return { points, count };
}

function fillParticleColors(system, baseHex, hotHex = 0xffffff) {
  const colors = system.points.geometry.attributes.color.array;
  const base = new THREE.Color(baseHex);
  const hot = new THREE.Color(hotHex);
  const mixed = new THREE.Color();

  for (let i = 0; i < system.count; i++) {
    const t = i / Math.max(system.count - 1, 1);
    mixed.copy(base).lerp(hot, (1 - t) * 0.42);

    colors[i * 3] = mixed.r;
    colors[i * 3 + 1] = mixed.g;
    colors[i * 3 + 2] = mixed.b;
  }

  system.points.geometry.attributes.color.needsUpdate = true;
}

function pseudoNoise(x, y) {
  const v =
    Math.sin(x * 6.7 + y * 4.3) * 0.35 +
    Math.sin(x * 12.2 - y * 8.4) * 0.25 +
    Math.sin((x + y) * 15.1) * 0.2 +
    Math.cos(Math.hypot(x - 0.5, y - 0.5) * 18.0) * 0.2;

  return (v + 1) * 0.5;
}

function createBluePlanetTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  const data = image.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;

      const n1 = pseudoNoise(nx * 1.0, ny * 1.0);
      const n2 = pseudoNoise(nx * 2.1 + 0.31, ny * 2.1 - 0.17);
      const n3 = pseudoNoise(nx * 4.4 - 0.12, ny * 4.2 + 0.44);

      const marble = n1 * 0.42 + n2 * 0.34 + n3 * 0.24;

      const bands =
        0.5 +
        0.5 *
          Math.sin(
            nx * 18 +
            Math.sin(ny * 7.5) * 1.8 +
            marble * 4.0
          );

      const crack =
        Math.abs(
          Math.sin(nx * 28 + marble * 3.5) *
          Math.cos(ny * 22 - marble * 2.2)
        );

      const detail = marble * 0.7 + bands * 0.3;
      const glowLine = Math.pow(crack, 10.0);
      const electric = Math.pow(glowLine, 0.72);

      const r = Math.floor(0 + detail * 5 + electric * 8);
      const g = Math.floor(8 + detail * 42 + electric * 95);
      const b = Math.floor(54 + detail * 185 + electric * 190);

      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);

  const overlay = ctx.createRadialGradient(
    size * 0.65,
    size * 0.28,
    10,
    size * 0.5,
    size * 0.5,
    size * 0.65
  );
  overlay.addColorStop(0.0, 'rgba(80, 200, 255, 0.20)');
  overlay.addColorStop(0.18, 'rgba(0, 105, 255, 0.14)');
  overlay.addColorStop(0.48, 'rgba(0, 35, 190, 0.07)');
  overlay.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return texture;
}

function createBlueCloudTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < 140; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 24 + Math.random() * 120;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, 'rgba(120, 230, 255, 0.14)');
    grad.addColorStop(0.18, 'rgba(40, 180, 255, 0.10)');
    grad.addColorStop(0.42, 'rgba(10, 110, 255, 0.05)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 50 + Math.random() * 180;
    const ang = Math.random() * Math.PI * 2;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(ang + 0.8) * len * 0.45,
      y + Math.sin(ang + 0.8) * len * 0.45,
      x + Math.cos(ang) * len,
      y + Math.sin(ang) * len
    );
    ctx.strokeStyle = `rgba(90, 220, 255, ${0.03 + Math.random() * 0.06})`;
    ctx.lineWidth = 2 + Math.random() * 4;
    ctx.shadowColor = 'rgba(90, 220, 255, 0.40)';
    ctx.shadowBlur = 10;
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return texture;
}

function createIrregularShardGeometry() {
  const geometry = new THREE.BufferGeometry();

  const length = 0.06 + Math.random() * 0.12;
  const width = 0.012 + Math.random() * 0.026;
  const skew = (Math.random() - 0.5) * 0.04;
  const tipJitter = (Math.random() - 0.5) * 0.02;

  const vertices = new Float32Array([
    -width, 0, 0,
    width * 0.7, width * 0.55, 0,
    length + tipJitter, skew, 0,

    -width * 0.75, -width * 0.4, 0,
    -width, 0, 0,
    length + tipJitter, skew, 0,
  ]);

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(vertices, 3)
  );

  geometry.computeVertexNormals();
  return geometry;
}

function createDebrisShardMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0x0a1631,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createDebrisGlowSprite() {
  return createGlowSprite(
    [
      [0, 'rgba(80, 200, 255, 0.86)'],
      [0.18, 'rgba(0, 110, 255, 0.44)'],
      [0.55, 'rgba(0, 35, 190, 0.14)'],
      [1, 'rgba(0,0,0,0)'],
    ],
    0
  );
}

function createDebrisSystem(count) {
  const group = new THREE.Group();
  const shards = [];

  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(
      createIrregularShardGeometry(),
      createDebrisShardMaterial()
    );

    const glow = createDebrisGlowSprite();
    glow.scale.setScalar(0.07 + Math.random() * 0.09);

    const holder = new THREE.Group();
    holder.add(mesh);
    holder.add(glow);

    const angle = Math.random() * Math.PI * 2;
    const radius = 2.2 + Math.random() * 4.6;

    const meta = {
      holder,
      mesh,
      glow,
      baseAngle: angle,
      baseRadius: radius,
      speed: 0.48 + Math.random() * 1.55,
      fallSpeed: 0.20 + Math.random() * 0.38,
      depth: -0.45 + Math.random() * 0.9,
      squash: 0.56 + Math.random() * 0.32,
      scale: 0.7 + Math.random() * 1.5,
      seed: Math.random() * 100,
      spinX: -1.5 + Math.random() * 3.0,
      spinY: -1.5 + Math.random() * 3.0,
      spinZ: -1.5 + Math.random() * 3.0,
    };

    holder.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * meta.squash,
      meta.depth
    );

    holder.scale.setScalar(meta.scale);

    group.add(holder);
    shards.push(meta);
  }

  return { group, shards };
}

export class CosmicBlueEffect {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.active = false;
    this.targetCharge = 0;
    this.displayCharge = 0;
    this.prevDisplayCharge = 0;

    this.collapseActive = false;
    this.collapseMix = 0;
    this.collapseTime = 0;

    this.time = 0;
    this.targetPosition = new THREE.Vector3();

    this.cameraShake = 0;
    this.flashStrength = 0;

    this.rippleATime = -1;
    this.rippleBTime = -1;
    this.rippleCTime = -1;

    this.nebulaMist = createGlowSprite(
      [
        [0, 'rgba(120,235,255,0.44)'],
        [0.14, 'rgba(60,170,255,0.24)'],
        [0.52, 'rgba(0,80,200,0.08)'],
        [1, 'rgba(0,0,0,0)'],
      ],
      0
    );
    this.nebulaMist.scale.set(0.8, 0.8, 1);

    this.outerAura = createGlowSprite(
      [
        [0, 'rgba(185,245,255,0.16)'],
        [0.18, 'rgba(80,200,255,0.12)'],
        [0.48, 'rgba(0,100,255,0.05)'],
        [1, 'rgba(0,0,0,0)'],
      ],
      0
    );
    this.outerAura.scale.set(0.58, 0.58, 1);

    this.blackHalo = createGlowSprite(
      [
        [0, 'rgba(0,0,0,1.0)'],
        [0.14, 'rgba(0,0,0,0.99)'],
        [0.34, 'rgba(0,3,12,0.95)'],
        [0.54, 'rgba(0,12,50,0.34)'],
        [0.72, 'rgba(0,70,180,0.10)'],
        [1, 'rgba(0,0,0,0)'],
      ],
      0
    );
    this.blackHalo.scale.set(0.2, 0.2, 1);

    this.rimGlow = createRingGlowSprite();
    this.rimGlow.scale.set(0.24, 0.24, 1);

    this.eventHorizon = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 72, 72),
      new THREE.MeshBasicMaterial({
        color: 0x00020a,
        transparent: true,
        opacity: 0,
      })
    );

    this.planetSurfaceTexture = createBluePlanetTexture();
    this.planetCloudTexture = createBlueCloudTexture();
    this.innerFlowTextureA = createInnerVortexTexture();
    this.innerFlowTextureB = createInnerVortexTexture();

    this.planetSurface = new THREE.Mesh(
      new THREE.SphereGeometry(0.182, 72, 72),
      new THREE.MeshBasicMaterial({
        map: this.planetSurfaceTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );

    this.planetClouds = new THREE.Mesh(
      new THREE.SphereGeometry(0.187, 72, 72),
      new THREE.MeshBasicMaterial({
        map: this.planetCloudTexture,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    this.innerVoid = new THREE.Mesh(
      new THREE.SphereGeometry(0.142, 60, 60),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0,
      })
    );

    this.innerFlowA = new THREE.Mesh(
      new THREE.SphereGeometry(0.138, 64, 64),
      new THREE.MeshBasicMaterial({
        map: this.innerFlowTextureA,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    this.innerFlowB = new THREE.Mesh(
      new THREE.SphereGeometry(0.132, 64, 64),
      new THREE.MeshBasicMaterial({
        map: this.innerFlowTextureB,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    this.coreGlow = createGlowSprite(
      [
        [0, 'rgba(130,235,255,0.58)'],
        [0.08, 'rgba(0,165,255,0.48)'],
        [0.22, 'rgba(0,70,255,0.34)'],
        [0.42, 'rgba(0,20,160,0.16)'],
        [1, 'rgba(0,0,0,0)'],
      ],
      0
    );
    this.coreGlow.scale.set(0.12, 0.12, 1);

    this.rippleA = createGlowSprite(
      [
        [0, 'rgba(0,0,0,0)'],
        [0.40, 'rgba(0,0,0,0)'],
        [0.48, 'rgba(90,220,255,0.50)'],
        [0.5, 'rgba(255,255,255,0.82)'],
        [0.56, 'rgba(40,150,255,0.26)'],
        [1, 'rgba(0,0,0,0)'],
      ],
      0
    );

    this.rippleB = createGlowSprite(
      [
        [0, 'rgba(0,0,0,0)'],
        [0.42, 'rgba(0,0,0,0)'],
        [0.49, 'rgba(100,215,255,0.40)'],
        [0.5, 'rgba(255,255,255,0.70)'],
        [0.56, 'rgba(50,140,255,0.22)'],
        [1, 'rgba(0,0,0,0)'],
      ],
      0
    );

    this.rippleC = createGlowSprite(
      [
        [0, 'rgba(0,0,0,0)'],
        [0.43, 'rgba(0,0,0,0)'],
        [0.49, 'rgba(100,215,255,0.28)'],
        [0.5, 'rgba(255,255,255,0.52)'],
        [0.56, 'rgba(40,120,255,0.14)'],
        [1, 'rgba(0,0,0,0)'],
      ],
      0
    );

    this.collapseFlash = createGlowSprite(
      [
        [0, 'rgba(255,255,255,1)'],
        [0.08, 'rgba(180,240,255,0.88)'],
        [0.22, 'rgba(80,180,255,0.42)'],
        [0.6, 'rgba(0,70,210,0.12)'],
        [1, 'rgba(0,0,0,0)'],
      ],
      0
    );

    this.group.add(this.nebulaMist);
    this.group.add(this.outerAura);
    this.group.add(this.blackHalo);

    this.group.add(this.eventHorizon);
    this.group.add(this.planetSurface);
    this.group.add(this.planetClouds);
    this.group.add(this.innerVoid);
    this.group.add(this.innerFlowA);
    this.group.add(this.innerFlowB);
    this.group.add(this.rimGlow);
    this.group.add(this.coreGlow);

    this.group.add(this.rippleA);
    this.group.add(this.rippleB);
    this.group.add(this.rippleC);
    this.group.add(this.collapseFlash);

    this.debris = createDebrisSystem(72);
    this.group.add(this.debris.group);

    this.vortexParticles = createParticleSystem(480, 0.01);
    fillParticleColors(this.vortexParticles, 0x006cff, 0xd8f7ff);

    this.vortexMeta = [];
    for (let i = 0; i < this.vortexParticles.count; i++) {
      this.vortexMeta.push({
        baseRadius: 0.65 + Math.random() * 4.0,
        baseAngle: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 2.8,
        depth: -0.4 + Math.random() * 0.8,
        seed: Math.random() * 100,
        squash: 0.42 + Math.random() * 0.38,
      });
    }

    this.group.add(this.vortexParticles.points);

    this.eventHorizon.renderOrder = 1;
    this.planetSurface.renderOrder = 2;
    this.planetClouds.renderOrder = 3;
    this.innerVoid.renderOrder = 4;
    this.innerFlowA.renderOrder = 5;
    this.innerFlowB.renderOrder = 6;
    this.rimGlow.renderOrder = 7;
    this.coreGlow.renderOrder = 8;

    this.group.visible = false;
  }

  setActive(active) {
    this.active = active;
  }

  setCharge(charge) {
    this.targetCharge = clamp01(charge);
  }

  setCollapseActive(active) {
    if (active && !this.collapseActive) {
      this.collapseTime = 0;
      this.rippleCTime = 0;
    }
    this.collapseActive = active;
  }

  setAnchor(position) {
    this.targetPosition.copy(position);
  }

  isSpellNameVisible() {
    return this.displayCharge > 0.96 || this.collapseMix > 0.12;
  }

  getCameraShake() {
    return this.cameraShake;
  }

  getBurstFlashStrength() {
    return this.flashStrength;
  }

  getCosmosPullIntensity() {
    if (!this.group.visible) return 0;

    return (
      0.40 +
      this.displayCharge * 2.7 +
      this.collapseMix * 4.3
    );
  }

  getCosmosVisibility() {
    return 1;
  }

  getCosmosAbsorption() {
    if (!this.group.visible) return 0;

    const preAbsorb =
      clamp01((this.displayCharge - 0.18) / 0.82) * 0.70;

    const collapseAbsorb = this.collapseMix * 0.92;

    return clamp01(preAbsorb + collapseAbsorb);
  }

  getDistortionStrength() {
    return 0;
  }

  updateRipples(deltaTime) {
    const updateOne = (
      timeValue,
      ripple,
      duration,
      maxScale,
      maxOpacity
    ) => {
      if (timeValue < 0) {
        ripple.material.opacity = 0;
        return -1;
      }

      timeValue += deltaTime;
      const t = Math.min(timeValue / duration, 1);

      ripple.material.opacity = (1 - t) * maxOpacity;
      ripple.scale.setScalar(0.3 + t * maxScale);

      if (t >= 1) {
        ripple.material.opacity = 0;
        return -1;
      }

      return timeValue;
    };

    this.rippleATime = updateOne(
      this.rippleATime,
      this.rippleA,
      0.95,
      2.9,
      0.62
    );

    this.rippleBTime = updateOne(
      this.rippleBTime,
      this.rippleB,
      1.15,
      3.35,
      0.50
    );

    this.rippleCTime = updateOne(
      this.rippleCTime,
      this.rippleC,
      1.2,
      3.8,
      0.42
    );
  }

  updateVortexParticles(charge, compressed, collapse) {
    const positions =
      this.vortexParticles.points.geometry.attributes.position.array;

    for (let i = 0; i < this.vortexParticles.count; i++) {
      const meta = this.vortexMeta[i];
      const idx = i * 3;

      const contraction =
        1 -
        charge * 0.24 -
        compressed * 0.26 -
        collapse * 0.42;

      const radius =
        meta.baseRadius *
          Math.max(0.08, contraction) *
          (1 + Math.sin(this.time * 2.4 + meta.seed) * 0.05) +
        Math.sin(this.time * 1.9 + meta.seed) * 0.035;

      const angle =
        meta.baseAngle +
        this.time * meta.speed * (1.0 + charge * 1.7 + collapse * 3.4) +
        collapse * 6.8;

      positions[idx] =
        Math.cos(angle) * radius +
        Math.sin(this.time + meta.seed) * 0.02;

      positions[idx + 1] =
        Math.sin(angle) * radius * meta.squash +
        Math.cos(this.time * 1.6 + meta.seed) * 0.02;

      positions[idx + 2] =
        meta.depth +
        Math.sin(this.time * 1.25 + meta.seed) * 0.04;
    }

    this.vortexParticles.points.geometry.attributes.position.needsUpdate = true;

    this.vortexParticles.points.material.opacity =
      0.02 +
      charge * 0.12 +
      compressed * 0.20 +
      collapse * 0.28;

    this.vortexParticles.points.material.size =
      0.004 +
      charge * 0.007 +
      compressed * 0.010 +
      collapse * 0.008;
  }

  updateDebris(charge, compressed, collapse) {
    if (!this.debris) return;

    const absorb = clamp01((this.displayCharge - 0.05) / 0.95);
    const intensity = clamp01(
      absorb * 0.65 +
      compressed * 0.55 +
      collapse * 0.85
    );

    this.debris.group.visible = intensity > 0.02;

    for (const shard of this.debris.shards) {
      const chargePull =
        1 -
        absorb * 0.18 -
        compressed * 0.30 -
        collapse * 0.44;

      let radius =
        shard.baseRadius *
        Math.max(0.12, chargePull) *
        (1 + Math.sin(this.time * 1.8 + shard.seed) * 0.06);

      const angle =
        shard.baseAngle +
        this.time * shard.speed * (0.55 + intensity * 2.0) +
        collapse * 4.8;

      if (collapse > 0.1) {
        radius *= Math.max(
          0.08,
          1 - collapse * shard.fallSpeed * (1.2 + collapse * 2.4)
        );
      }

      shard.holder.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * shard.squash,
        shard.depth + Math.sin(this.time * 1.1 + shard.seed) * 0.08
      );

      shard.holder.lookAt(0, 0, 0);

      shard.holder.rotation.x +=
        0.012 * shard.spinX * (1 + intensity * 1.8);
      shard.holder.rotation.y +=
        0.012 * shard.spinY * (1 + intensity * 1.8);
      shard.holder.rotation.z +=
        0.012 * shard.spinZ * (1 + intensity * 1.8);

      const scale =
        shard.scale *
        (0.28 + intensity * 0.84) *
        (1 + Math.sin(this.time * 2.2 + shard.seed) * 0.06);

      shard.holder.scale.setScalar(scale);

      shard.mesh.material.opacity =
        0.06 + intensity * 0.74;

      shard.mesh.material.color.set(
        collapse > 0.3 ? 0x0b2248 : 0x0a1631
      );

      shard.glow.material.opacity =
        0.03 + intensity * 0.24 + collapse * 0.14;

      shard.glow.scale.setScalar(
        0.05 + intensity * 0.10 + collapse * 0.08
      );
    }
  }

  update(deltaTime) {
    const visibleTarget =
      this.active ? Math.max(this.targetCharge, 0.05) : 0;

    this.displayCharge = THREE.MathUtils.lerp(
      this.displayCharge,
      visibleTarget,
      this.active ? 0.14 : 0.08
    );

    this.collapseMix = THREE.MathUtils.lerp(
      this.collapseMix,
      this.collapseActive ? 1 : 0,
      this.collapseActive ? 0.16 : 0.08
    );

    if (this.collapseActive) {
      this.collapseTime += deltaTime;
    } else {
      this.collapseTime = 0;
    }

    this.group.position.lerp(this.targetPosition, 0.16);
    this.group.visible =
      this.displayCharge > 0.02 || this.collapseMix > 0.02;

    if (!this.group.visible) {
      this.cameraShake = 0;
      this.flashStrength = 0;
      return;
    }

    this.time += deltaTime;

    const charge = easeOutCubic(this.displayCharge);
    const compressed = clamp01((this.displayCharge - 0.42) / 0.58);
    const complete = clamp01((this.displayCharge - 0.82) / 0.18);
    const collapse = easeInOutCubic(this.collapseMix);

    if (this.prevDisplayCharge < 0.45 && this.displayCharge >= 0.45) {
      this.rippleATime = 0;
    }

    if (this.prevDisplayCharge < 0.76 && this.displayCharge >= 0.76) {
      this.rippleBTime = 0;
    }

    this.prevDisplayCharge = this.displayCharge;

    const pulse =
      1 +
      Math.sin(this.time * 5.5) * 0.02 * compressed +
      Math.sin(this.time * 12.5) * 0.015 * collapse;

    this.group.rotation.z -= deltaTime * (
      0.03 +
      charge * 0.05 +
      collapse * 0.08
    );

    this.nebulaMist.material.opacity = 0.01 + charge * 0.13;
    this.nebulaMist.scale.setScalar((0.34 + charge * 0.86) * pulse);

    this.outerAura.material.opacity =
      0.008 + charge * 0.055 + complete * 0.045;
    this.outerAura.scale.setScalar(0.26 + charge * 0.76);

    const sphereScale =
      0.35 +
      charge * 0.95 +
      compressed * 1.05 +
      complete * 0.60;

    this.blackHalo.material.opacity =
      0.22 + compressed * 0.42 + collapse * 0.20;
    this.blackHalo.scale.setScalar(sphereScale * 1.28);

    this.eventHorizon.scale.setScalar(sphereScale * 1.22);
    this.eventHorizon.material.opacity =
      0.24 + compressed * 0.42;

    this.planetSurface.scale.setScalar(sphereScale * 1.05);
    this.planetSurface.material.opacity =
      0.18 + compressed * 0.42 + collapse * 0.06;

    this.planetClouds.scale.setScalar(sphereScale * 1.08);
    this.planetClouds.material.opacity =
      0.010 + charge * 0.016 + compressed * 0.035 + collapse * 0.025;

    this.innerVoid.scale.setScalar(sphereScale * 0.94);
    this.innerVoid.material.opacity =
      0.54 + compressed * 0.28 + collapse * 0.05;

    this.innerFlowA.scale.setScalar(sphereScale * 0.90);
    this.innerFlowB.scale.setScalar(sphereScale * 0.84);

    this.innerFlowA.material.opacity =
      0.08 + charge * 0.10 + compressed * 0.18 + collapse * 0.06;

    this.innerFlowB.material.opacity =
      0.06 + charge * 0.08 + compressed * 0.14 + collapse * 0.05;

    this.innerFlowA.rotation.y += deltaTime * (0.22 + collapse * 0.18);
    this.innerFlowA.rotation.z += deltaTime * (0.10 + collapse * 0.10);

    this.innerFlowB.rotation.y -= deltaTime * (0.16 + collapse * 0.14);
    this.innerFlowB.rotation.x += deltaTime * (0.07 + collapse * 0.08);

    if (this.innerFlowA.material.map) {
      this.innerFlowA.material.map.offset.x = (this.time * 0.010) % 1;
      this.innerFlowA.material.map.offset.y = (this.time * 0.006) % 1;
    }

    if (this.innerFlowB.material.map) {
      this.innerFlowB.material.map.offset.x =
        (1 - (this.time * 0.008) % 1) % 1;
      this.innerFlowB.material.map.offset.y =
        (Math.sin(this.time * 0.25) * 0.03 + 1) % 1;
    }

    const rimAppear = clamp01((this.displayCharge - 0.28) / 0.72);

    this.rimGlow.material.opacity =
      rimAppear * (0.28 + compressed * 0.52 + collapse * 0.18);

    this.rimGlow.scale.setScalar(
      sphereScale * (1.11 + rimAppear * 0.07)
    );

    this.coreGlow.material.opacity =
      0.07 + charge * 0.18 + compressed * 0.26 + collapse * 0.10;
    this.coreGlow.scale.setScalar(sphereScale * 0.52 * pulse);

    this.planetSurface.rotation.y += deltaTime * (0.18 + collapse * 0.35);
    this.planetSurface.rotation.x =
      Math.sin(this.time * 0.22) * 0.08;

    this.planetClouds.rotation.y -= deltaTime * (0.28 + collapse * 0.65);
    this.planetClouds.rotation.z += deltaTime * (0.08 + collapse * 0.28);

    if (this.planetSurface.material.map) {
      this.planetSurface.material.map.offset.x =
        (this.time * 0.0035) % 1;
      this.planetSurface.material.map.offset.y =
        (Math.sin(this.time * 0.12) * 0.02 + 1) % 1;
    }

    if (this.planetClouds.material.map) {
      this.planetClouds.material.map.offset.x =
        (1 - (this.time * 0.0065) % 1) % 1;
      this.planetClouds.material.map.offset.y =
        (Math.cos(this.time * 0.16) * 0.018 + 1) % 1;
    }

    this.collapseFlash.material.opacity =
      collapse *
      Math.max(0, 1 - this.collapseTime / 0.9) *
      0.78;

    this.collapseFlash.scale.setScalar(
      sphereScale * (1.8 + collapse * 1.1)
    );

    this.updateRipples(deltaTime);
    this.updateVortexParticles(charge, compressed, collapse);
    this.updateDebris(charge, compressed, collapse);

    this.cameraShake =
      collapse * (
        0.018 +
        Math.sin(this.time * 29.0) * 0.008 +
        Math.cos(this.time * 37.0) * 0.006
      );

    this.flashStrength =
      (0.04 + complete * 0.18) +
      collapse *
      Math.max(0, 1 - this.collapseTime / 0.8) *
      0.55;
  }
}