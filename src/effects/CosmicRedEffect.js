import * as THREE from 'three';

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function hexToRGBA(hex, alpha) {
  const c = new THREE.Color(hex);
  return `rgba(${Math.floor(c.r * 255)}, ${Math.floor(c.g * 255)}, ${Math.floor(
    c.b * 255
  )}, ${alpha})`;
}

function createRadialTexture(stops) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    6,
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

function createGlowSprite(stops, opacity = 1) {
  const texture = createRadialTexture(stops);

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Sprite(material);
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
    mixed.copy(base).lerp(hot, (1 - t) * 0.34);

    colors[i * 3] = mixed.r;
    colors[i * 3 + 1] = mixed.g;
    colors[i * 3 + 2] = mixed.b;
  }

  system.points.geometry.attributes.color.needsUpdate = true;
}

/**
 * 중심은 얇고 바깥으로 갈수록 퍼지는 광선 텍스처
 */
function createBeamTexture(mainHex, accentHex) {
  const width = 1024;
  const height = 320;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  const cy = height / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'lighter';

  const beamGrad = ctx.createLinearGradient(0, 0, width, 0);
  beamGrad.addColorStop(0.0, hexToRGBA(accentHex, 0.0));
  beamGrad.addColorStop(0.02, hexToRGBA(accentHex, 0.96));
  beamGrad.addColorStop(0.12, hexToRGBA(mainHex, 0.62));
  beamGrad.addColorStop(0.45, hexToRGBA(mainHex, 0.22));
  beamGrad.addColorStop(1.0, hexToRGBA(mainHex, 0.0));

  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(width, cy - 86);
  ctx.lineTo(width, cy + 86);
  ctx.closePath();
  ctx.fill();

  const coreGrad = ctx.createLinearGradient(0, 0, width, 0);
  coreGrad.addColorStop(0.0, hexToRGBA(0xffffff, 0.0));
  coreGrad.addColorStop(0.015, hexToRGBA(0xffffff, 0.98));
  coreGrad.addColorStop(0.06, hexToRGBA(accentHex, 0.86));
  coreGrad.addColorStop(0.28, hexToRGBA(mainHex, 0.3));
  coreGrad.addColorStop(1.0, hexToRGBA(mainHex, 0.0));

  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(width, cy - 12);
  ctx.lineTo(width, cy + 12);
  ctx.closePath();
  ctx.fill();

  const flare = ctx.createRadialGradient(0, cy, 0, 0, cy, 95);
  flare.addColorStop(0, hexToRGBA(0xffffff, 1.0));
  flare.addColorStop(0.12, hexToRGBA(accentHex, 0.9));
  flare.addColorStop(0.4, hexToRGBA(mainHex, 0.26));
  flare.addColorStop(1, hexToRGBA(mainHex, 0));

  ctx.fillStyle = flare;
  ctx.beginPath();
  ctx.arc(0, cy, 95, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
}

function createBeamSprite(mainHex, accentHex, opacity = 1) {
  const texture = createBeamTexture(mainHex, accentHex);

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.02, 0.5);

  return sprite;
}

export class CosmicRedEffect {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.active = false;
    this.charge = 0;
    this.time = 0;
    this.activeTime = 0;
    this.targetPosition = new THREE.Vector3();

    this.darkSphereBaseColor = new THREE.Color(0x000000);
    this.darkSphereWarmLightColor = new THREE.Color(0xffefb0);
    this.tempColor = new THREE.Color();

    // 폭발 / 불안정 상태
    this.burstActive = false;
    this.burstTime = 0;
    this.burstDuration = 1.35;
    this.cameraShake = 0;
    this.preBurstShake = 0;
    this.burstFlashStrength = 0;
    this.unstableEnergy = 0;

    this.gatherMist = createGlowSprite(
      [
        [0, 'rgba(255,120,120,0.88)'],
        [0.16, 'rgba(255,30,30,0.48)'],
        [0.45, 'rgba(255,8,8,0.18)'],
        [1, 'rgba(0,0,0,0)'],
      ],
      0
    );
    this.gatherMist.scale.set(0.7, 0.7, 1);

    this.redAura = createGlowSprite(
      [
        [0, 'rgba(255,100,100,0.94)'],
        [0.14, 'rgba(255,35,35,0.62)'],
        [0.42, 'rgba(255,8,8,0.16)'],
        [1, 'rgba(0,0,0,0)'],
      ],
      0
    );
    this.redAura.scale.set(1.2, 1.2, 1);

    this.coreGlow = createGlowSprite(
      [
        [0, 'rgba(255,250,250,1)'],
        [0.1, 'rgba(255,205,205,1)'],
        [0.24, 'rgba(255,80,80,0.82)'],
        [1, 'rgba(0,0,0,0)'],
      ],
      0
    );
    this.coreGlow.scale.set(0.34, 0.34, 1);

    this.darkSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 42, 42),
      new THREE.MeshBasicMaterial({
        color: 0x020202,
        transparent: true,
        opacity: 0,
      })
    );

    this.innerShadow = new THREE.Mesh(
      new THREE.SphereGeometry(0.062, 28, 28),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0,
      })
    );

    this.redCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.011, 20, 20),
      new THREE.MeshBasicMaterial({
        color: 0xff3030,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    this.sphereAscensionGlow = createGlowSprite(
      [
        [0, 'rgba(255,255,240,1)'],
        [0.1, 'rgba(255,245,190,0.95)'],
        [0.3, 'rgba(255,225,120,0.45)'],
        [1, 'rgba(0,0,0,0)'],
      ],
      0
    );
    this.sphereAscensionGlow.scale.set(0.18, 0.18, 1);

    this.burstFlash = createGlowSprite(
      [
        [0, 'rgba(255,255,255,1)'],
        [0.08, 'rgba(255,250,240,1)'],
        [0.22, 'rgba(255,245,220,0.95)'],
        [0.5, 'rgba(255,240,210,0.38)'],
        [1, 'rgba(255,255,255,0)'],
      ],
      0
    );
    this.burstFlash.scale.set(0.1, 0.1, 1);

    this.group.add(this.gatherMist);
    this.group.add(this.redAura);
    this.group.add(this.coreGlow);
    this.group.add(this.darkSphere);
    this.group.add(this.innerShadow);
    this.group.add(this.redCore);
    this.group.add(this.sphereAscensionGlow);
    this.group.add(this.burstFlash);

    // 직선형 광선
    this.beams = [];
    this.beamConfigs = [];

    const presetAngles = [
      -Math.PI / 2,
      -0.25,
      Math.PI * 0.32,
      Math.PI * 0.86,
      Math.PI * 1.35,
      Math.PI * 1.72,
    ];

    for (let i = 0; i < presetAngles.length; i++) {
      const sprite = createBeamSprite(0xa31212, 0xff6b6b, 0);

      const cfg = {
        baseAngle: presetAngles[i] + rand(-0.08, 0.08),
        baseLength: rand(5.9, 8.2),
        baseWidth: rand(0.62, 0.92),
        pulseSpeed: rand(0.7, 1.15),
        rotationOffset: rand(0, Math.PI * 2),
        depth: rand(-0.05, 0.05),
        opacityScale: rand(0.82, 1.0),
        direction: i % 2 === 0 ? 1 : -1,
      };

      sprite.scale.set(cfg.baseLength, cfg.baseWidth, 1);

      this.beams.push(sprite);
      this.beamConfigs.push(cfg);
      this.group.add(sprite);
    }

    // 잔광 입자
    this.shockParticles = createParticleSystem(160, 0.009);
    fillParticleColors(this.shockParticles, 0xff2f2f, 0xfff1f1);

    this.shockMeta = [];
    for (let i = 0; i < this.shockParticles.count; i++) {
      this.shockMeta.push({
        baseRadius: 0.22 + Math.random() * 1.65,
        baseAngle: Math.random() * Math.PI * 2,
        speed: 0.35 + Math.random() * 0.9,
        depth: -0.1 + Math.random() * 0.2,
        seed: Math.random() * 100,
      });
    }

    this.group.add(this.shockParticles.points);

    this.group.visible = false;
  }

  setActive(active) {
    this.active = active;

    if (!active) {
      this.activeTime = 0;
      this.preBurstShake = 0;
    }
  }

  setAnchor(position) {
    this.targetPosition.copy(position);
  }

  isReadyToBurst() {
    return this.active && this.activeTime > 6.4 && !this.burstActive;
  }

  triggerBurst() {
    if (!this.isReadyToBurst()) return;

    this.burstActive = true;
    this.burstTime = 0;
    this.cameraShake = 1;
  }

  getCameraShake() {
    return Math.max(this.cameraShake || 0, this.preBurstShake || 0);
  }

  isSpellNameVisible() {
    return (
      this.active &&
      !this.burstActive &&
      this.activeTime >= 5.0
    );
  }

  getBurstFlashStrength() {
    return this.burstFlashStrength;
  }

  getCosmosPullIntensity() {
    if (!this.active || this.burstActive) {
      return 0;
    }

    // 흰 구체 변환 전까지는 일반 흡입
    if (this.activeTime < 5.0) {
      return 1;
    }

    // 흰 구체 변환 시작 후에는 짧게 강한 흡입 후 0
    const absorbPhase = THREE.MathUtils.clamp(
      (this.activeTime - 5.0) / 0.85,
      0,
      1
    );

    return 1.8 * (1 - easeOutCubic(absorbPhase));
  }

  getCosmosVisibility() {
    if (!this.active) {
      return 1;
    }

    if (this.burstActive) {
      return 0;
    }

    // opacity로 지우지 않고 흡수 로직으로 사라지게 함
    return 1;
  }

  getCosmosAbsorption() {
    if (!this.active || this.burstActive) {
      return 0;
    }

    // 흰색 변환 시작 시점부터 배경 별 흡수 모드 시작
    return THREE.MathUtils.clamp(
      (this.activeTime - 5.0) / 0.85,
      0,
      1
    );
  }

  updateShockParticles(gatherPhase, sphereBodyPhase) {
    const positions =
      this.shockParticles.points.geometry.attributes.position.array;

    for (let i = 0; i < this.shockParticles.count; i++) {
      const meta = this.shockMeta[i];
      const idx = i * 3;

      const contraction = 1 - gatherPhase * 0.45;
      const pulse = 1 + Math.sin(this.time * 1.2 + meta.seed) * 0.08;

      const radius =
        meta.baseRadius * contraction * pulse +
        Math.sin(this.time * meta.speed + meta.seed) * 0.045;

      const angle =
        meta.baseAngle +
        Math.sin(this.time * 0.6 + meta.seed) * 0.55 +
        this.time * (0.14 + meta.speed * 0.24);

      const noiseX = Math.sin(this.time * 1.8 + meta.seed) * 0.04;
      const noiseY = Math.cos(this.time * 1.5 + meta.seed) * 0.04;

      positions[idx] = Math.cos(angle) * radius + noiseX;
      positions[idx + 1] = Math.sin(angle) * radius * 0.82 + noiseY;
      positions[idx + 2] =
        meta.depth + Math.sin(this.time * 0.75 + meta.seed) * 0.03;
    }

    this.shockParticles.points.geometry.attributes.position.needsUpdate = true;
    this.shockParticles.points.material.opacity =
      0.016 + gatherPhase * 0.11 * (1 - sphereBodyPhase * 0.12);
    this.shockParticles.points.material.size =
      0.003 + gatherPhase * 0.008;
  }

  updateBeams(gatherPhase, sphereBodyPhase) {
    const baseSpeed = 0.82;
    const beamAppear = easeOutCubic(sphereBodyPhase);

    for (let i = 0; i < this.beams.length; i++) {
      const sprite = this.beams[i];
      const cfg = this.beamConfigs[i];

      const pulse =
        1 + Math.sin(this.time * cfg.pulseSpeed + cfg.rotationOffset) * 0.04;

      const angle =
        cfg.baseAngle +
        this.time * baseSpeed * cfg.direction +
        Math.sin(this.time * 0.55 + cfg.rotationOffset) * 0.03;

      sprite.position.set(0, 0, cfg.depth);

      const length =
        cfg.baseLength * (0.2 + beamAppear * 0.96) * pulse;

      const width =
        cfg.baseWidth * (0.12 + beamAppear * 0.6);

      sprite.scale.set(length, width, 1);
      sprite.material.rotation = angle;

      sprite.material.opacity =
        beamAppear *
        (0.06 + gatherPhase * 0.25) *
        cfg.opacityScale;
    }
  }

  update(deltaTime) {
    if (this.active) {
      this.activeTime += deltaTime;
    } else {
      this.activeTime = 0;
    }

    this.charge = clamp01(
      this.charge + (this.active ? deltaTime * 0.88 : -deltaTime * 1.0)
    );

    const e = easeOutCubic(this.charge);

    const gatherPhase = THREE.MathUtils.clamp(e / 0.82, 0, 1);

    const sphereDelay = 2.0;
    const sphereGrowDuration = 1.2;

    const sphereBodyPhase = THREE.MathUtils.clamp(
      (this.activeTime - sphereDelay) / sphereGrowDuration,
      0,
      1
    );
    const sphereBodyEase = easeOutCubic(sphereBodyPhase);

    // 5초 동안은 검정 상태 유지, 이후 서서히 노란빛 발광
    const sphereLightDelay = THREE.MathUtils.clamp(
      (this.activeTime - 5.0) / 1.8,
      0,
      1
    );
    const sphereLightEase = easeOutCubic(sphereLightDelay);

    // 흰 구체 불안정화
    const unstablePhase = THREE.MathUtils.clamp(
      (this.activeTime - 5.2) / 1.1,
      0,
      1
    );
    const unstableEase = easeOutCubic(unstablePhase);
    this.unstableEnergy = unstableEase;

    const whiteCoreStarted = sphereLightDelay > 0.01;

    // 자체 shock particle은 짧게 사라짐
    const absorptionPhase = THREE.MathUtils.clamp(
      sphereLightDelay / 0.1,
      0,
      1
    );
    const absorptionFade = 1 - easeOutCubic(absorptionPhase);

    this.group.visible = this.charge > 0.01;
    this.group.position.lerp(this.targetPosition, 0.14);

    if (!this.group.visible) return;

    this.time += deltaTime;

    this.group.rotation.x = Math.sin(this.time * 0.12) * 0.01;
    this.group.rotation.y = Math.sin(this.time * 0.15) * 0.014;
    this.group.rotation.z += deltaTime * 0.02;

    this.tempColor
      .copy(this.darkSphereBaseColor)
      .lerp(this.darkSphereWarmLightColor, sphereLightEase);

    this.darkSphere.material.color.copy(this.tempColor);

    this.gatherMist.material.opacity =
      0.03 + gatherPhase * 0.48 * (1 - sphereLightEase * 0.08);
    this.gatherMist.scale.setScalar(0.32 + gatherPhase * 1.15);

    this.redAura.material.opacity = 0.07 + gatherPhase * 0.62;
    this.redAura.scale.setScalar(0.34 + gatherPhase * 1.18);

    this.coreGlow.material.opacity =
      0.02 + sphereBodyEase * 0.08 + sphereLightEase * 0.82;
    this.coreGlow.scale.setScalar(
      0.05 + sphereBodyEase * 0.12 + sphereLightEase * 0.22
    );

    this.darkSphere.scale.setScalar(0.18 + sphereBodyEase * 1.95);
    this.darkSphere.material.opacity = sphereBodyEase * 0.98;

    this.innerShadow.scale.setScalar(0.12 + sphereBodyEase * 1.65);
    this.innerShadow.material.opacity =
      sphereBodyEase * (1.0 - sphereLightEase * 0.45);

    this.redCore.scale.setScalar(0.06 + sphereBodyEase * 0.34);
    this.redCore.material.opacity =
      sphereBodyEase * 0.22 + sphereLightEase * 0.58;

    this.sphereAscensionGlow.material.opacity = sphereLightEase * 0.75;
    this.sphereAscensionGlow.scale.setScalar(
      0.18 + sphereLightEase * 0.5
    );

    // 흰 구체가 곧 터질 듯 밝기 요동
    const flickerA =
      0.5 + 0.5 * Math.sin(this.time * 28.0 + 0.8);

    const flickerB =
      0.5 + 0.5 * Math.sin(this.time * 47.0 + 2.1);

    const unstableFlicker =
      (flickerA * 0.55 + flickerB * 0.45) * unstableEase;

    this.coreGlow.material.opacity += unstableFlicker * 0.28;
    this.sphereAscensionGlow.material.opacity += unstableFlicker * 0.36;

    const unstablePulse =
      1 +
      Math.sin(this.time * 10.0) * 0.035 * unstableEase +
      Math.sin(this.time * 23.0 + 0.5) * 0.02 * unstableEase;

    this.coreGlow.scale.multiplyScalar(unstablePulse);
    this.sphereAscensionGlow.scale.multiplyScalar(
      1 + unstableEase * 0.035
    );

    this.preBurstShake =
      unstableEase * (0.015 + unstableFlicker * 0.02);

    const jitterX =
      Math.sin(this.time * 31.0) * 0.018 * unstableEase +
      Math.sin(this.time * 57.0 + 1.4) * 0.009 * unstableEase;

    const jitterY =
      Math.cos(this.time * 27.0 + 0.7) * 0.016 * unstableEase +
      Math.sin(this.time * 49.0 + 2.2) * 0.008 * unstableEase;

    this.group.position.x += jitterX;
    this.group.position.y += jitterY;

    if (whiteCoreStarted) {
      // 흰색 변환 시작 순간 레이저 제거
      this.updateBeams(0, 0);

      // 자체 붉은 입자는 짧게 줄임
      this.updateShockParticles(
        gatherPhase * absorptionFade,
        sphereBodyPhase
      );
    } else {
      this.updateBeams(gatherPhase, sphereBodyPhase);
      this.updateShockParticles(gatherPhase, sphereBodyPhase);
    }

    this.updateBurst(deltaTime);
  }

  updateBurst(deltaTime) {
    if (!this.burstActive) {
      this.burstFlashStrength = 0;
      this.burstFlash.material.opacity = 0;
      return;
    }

    this.burstTime += deltaTime;

    const t = THREE.MathUtils.clamp(
      this.burstTime / this.burstDuration,
      0,
      1
    );

    const blast = 1 - Math.pow(1 - t, 3);
    const fade = 1 - t;

    const flashPhase = THREE.MathUtils.clamp(t / 0.18, 0, 1);
    const flashOut = 1 - flashPhase;

    this.burstFlashStrength = flashOut;

    // 화면을 뒤덮는 거대한 플래시
    this.burstFlash.material.opacity = flashOut * 2.2;
    this.burstFlash.scale.setScalar(2.0 + blast * 26.0);

    // 중심 구체 대폭발
    this.sphereAscensionGlow.material.opacity = fade * 1.9;
    this.sphereAscensionGlow.scale.setScalar(0.45 + blast * 9.5);

    this.coreGlow.material.opacity = fade * 1.5;
    this.coreGlow.scale.setScalar(0.28 + blast * 5.5);

    this.redAura.material.opacity = fade * 1.0;
    this.redAura.scale.setScalar(1.0 + blast * 5.2);

    this.darkSphere.material.opacity = Math.max(0, 0.5 - blast * 1.2);
    this.innerShadow.material.opacity = Math.max(0, 0.3 - blast * 1.1);

    this.cameraShake = (t < 0.35 ? 1.0 : fade) * 0.95;
    this.preBurstShake = 0;

    if (t >= 1) {
      this.burstActive = false;
      this.burstTime = 0;
      this.cameraShake = 0;
      this.burstFlashStrength = 0;
      this.preBurstShake = 0;
      this.unstableEnergy = 0;

      this.charge = 0;
      this.activeTime = 0;

      this.burstFlash.material.opacity = 0;
      this.group.visible = false;
    }
  }
}