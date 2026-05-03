// src/main.js
import './style.css';
import * as THREE from 'three';

import { createScene } from './scene.js';
import {
  setupWebcam,
  createHandLandmarker,
} from './handTracking.js';
import { landmarkToScenePoint } from './gestures.js';
import { createHandOverlay } from './handOverlay.js';
import { detectSpellGesture } from './spellGestures.js';
import { CosmicRedEffect } from './effects/CosmicRedEffect.js';
import { CosmicBlueEffect } from './effects/CosmicBlueEffect.js';
import { createPostFX } from './postfx.js';

const spellText = document.querySelector('#spell-text');   // 중앙 상단 한자
const video = document.querySelector('#webcam');
const canvas = document.querySelector('#three-canvas');
const status = document.querySelector('#status');          // 왼쪽 위 한국어
const handDebugCanvas = document.querySelector('#hand-debug-canvas');

const {
  scene,
  camera,
  renderer,
  energyCore,
  ambientParticles,
  cosmos,
} = createScene(canvas);

const { composer, bloom, chromatic, pinch } = createPostFX(
  renderer,
  scene,
  camera
);

const handOverlay = createHandOverlay(handDebugCanvas);

const reversalRedEffect = new CosmicRedEffect(scene);
const forwardBlueEffect = new CosmicBlueEffect(scene);

let handLandmarker = null;
let lastVideoTime = -1;
let lastFrameTime = performance.now();

let lastHandArea = null;
let lastHandAreaTime = performance.now();

let redGestureFrames = 0;
let isRedActive = false;

let lastCosmosTheme = 'blue';

let redBurstGraceUntil = 0;
let redWasReadyToBurst = false;

// Blue 상태
let blueState = 'IDLE';
let blueCharge = 0;
let isBlueActive = false;
let lastBluePalmAngle = null;
let blueCollapseStart = 0;
let blueCooldownUntil = 0;

const targetPosition = new THREE.Vector3(0, 0, 0);
const smoothPosition = new THREE.Vector3(0, 0, 0);
const targetScale = new THREE.Vector3(1, 1, 1);

const redSpellAnchor = new THREE.Vector3(0, 0, -1.2);
const blueSpellAnchor = new THREE.Vector3(0, 0, -1.2);

function getHandArea(hand) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const point of hand) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return (maxX - minX) * (maxY - minY);
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) * 0.5,
    y: (a.y + b.y) * 0.5,
    z: ((a.z || 0) + (b.z || 0)) * 0.5,
  };
}

function averageLandmarks(points) {
  const out = { x: 0, y: 0, z: 0 };

  for (const p of points) {
    out.x += p.x;
    out.y += p.y;
    out.z += p.z || 0;
  }

  out.x /= points.length;
  out.y /= points.length;
  out.z /= points.length;

  return out;
}

function worldToScreenUV(position, camera) {
  const projected = position.clone().project(camera);
  return {
    x: (projected.x + 1) * 0.5,
    y: (projected.y + 1) * 0.5,
  };
}

function setSpellText(kind) {
  if (!spellText) return;

  spellText.replaceChildren();

  const sub = document.createElement('div');
  sub.className = 'spell-sub';

  const main = document.createElement('div');
  main.className = 'spell-main';

  if (kind === 'blue') {
    sub.textContent = '術式順転';
    main.textContent = '「蒼」';

    // 술식순전 창일 때 파란 글로우 적용
    spellText.classList.add('blue');
  } else {
    sub.textContent = '術式反転';
    main.textContent = '「赫」';

    // 술식반전 혁일 때는 기존 붉은 글로우 유지
    spellText.classList.remove('blue');
  }

  spellText.appendChild(sub);
  spellText.appendChild(main);
}

function resetBlueState() {
  blueState = 'IDLE';
  blueCharge = 0;
  isBlueActive = false;
  lastBluePalmAngle = null;
  blueCollapseStart = 0;
  blueCooldownUntil = 0;

  forwardBlueEffect.setActive(false);
  forwardBlueEffect.setCharge(0);
  forwardBlueEffect.setCollapseActive(false);
}

function updateBlueState(spellResult, now) {
  let palmTwisted = false;
  const palmAngle = spellResult.bluePalmAngle;

  if (lastBluePalmAngle !== null) {
    let delta = palmAngle - lastBluePalmAngle;

    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;

    palmTwisted = Math.abs(delta) > 0.14;
  }

  lastBluePalmAngle = palmAngle;

  if (blueState === 'COOLDOWN' && now >= blueCooldownUntil) {
    blueState = 'IDLE';
  }

  switch (blueState) {
    case 'IDLE': {
      blueCharge = 0;

      if (spellResult.isBluePalmOpen) {
        blueState = 'READY';
        blueCharge = 0.05;
      }
      break;
    }

    case 'READY': {
      blueCharge = Math.max(0.05, spellResult.blueCompression * 0.35);

      if (!spellResult.isBluePalmOpen && spellResult.blueCompression < 0.04) {
        blueState = 'IDLE';
        blueCharge = 0;
      } else if (spellResult.blueCompression > 0.08) {
        blueState = 'CHARGING';
      }
      break;
    }

    case 'CHARGING': {
      blueCharge = Math.max(0.06, spellResult.blueCompression);

      if (spellResult.blueCompression < 0.04 && !spellResult.isBluePalmOpen) {
        blueState = 'IDLE';
        blueCharge = 0;
      } else if (spellResult.isBlueFist) {
        blueState = 'COMPLETE';
        blueCharge = 1;
      }
      break;
    }

    case 'COMPLETE': {
      blueCharge = 1;

      if (!spellResult.isBlueFist && spellResult.blueCompression < 0.68) {
        blueState = 'CHARGING';
        blueCharge = spellResult.blueCompression;
      } else if (palmTwisted) {
        blueState = 'COLLAPSE';
        blueCollapseStart = now;
      }
      break;
    }

    case 'COLLAPSE': {
      blueCharge = 1;

      if (now - blueCollapseStart > 1200) {
        blueState = 'COOLDOWN';
        blueCooldownUntil = now + 300;
      }
      break;
    }

    case 'COOLDOWN': {
      blueCharge = Math.max(0, blueCharge - 0.08);
      break;
    }
  }

  const blueEffectActive = [
    'READY',
    'CHARGING',
    'COMPLETE',
    'COLLAPSE',
  ].includes(blueState);

  isBlueActive = blueEffectActive;

  forwardBlueEffect.setActive(blueEffectActive);
  forwardBlueEffect.setCharge(blueEffectActive ? blueCharge : 0);
  forwardBlueEffect.setCollapseActive(blueState === 'COLLAPSE');
}

function getPrioritySpell() {
  const redFlash = reversalRedEffect.getBurstFlashStrength?.() ?? 0;
  const blueFlash = forwardBlueEffect.getBurstFlashStrength?.() ?? 0;

  const redVisible =
    isRedActive ||
    redGestureFrames > 0 ||
    redFlash > 0.01 ||
    reversalRedEffect.isSpellNameVisible?.();

  const blueVisible =
    isBlueActive ||
    ['READY', 'CHARGING', 'COMPLETE', 'COLLAPSE', 'COOLDOWN'].includes(blueState) ||
    blueFlash > 0.01 ||
    (forwardBlueEffect.getCosmosAbsorption?.() ?? 0) > 0.02 ||
    forwardBlueEffect.isSpellNameVisible?.();

  if (redVisible) {
    return {
      key: 'red',
      effect: reversalRedEffect,
      anchor: redSpellAnchor,
      statusKo: '술식반전 혁',
      statusKanji: '術式反転「赫」',
    };
  }

  if (blueVisible) {
    return {
      key: 'blue',
      effect: forwardBlueEffect,
      anchor: blueSpellAnchor,
      statusKo: '술식순전 창',
      statusKanji: '術式順転「蒼」',
    };
  }

  return null;
}

async function init() {
  try {
    status.textContent = '손을 인식하는 중';
    await setupWebcam(video);

    status.textContent = '핸드 트래커 로딩 중...';
    handLandmarker = await createHandLandmarker();

    status.textContent = '손을 보여주세요';
    animate();
  } catch (error) {
    console.error(error);
    status.textContent = '실행 실패. 콘솔을 확인하세요.';
  }
}

function updateHandTracking() {
  if (!handLandmarker) return;
  if (video.currentTime === lastVideoTime) return;

  lastVideoTime = video.currentTime;

  const results = handLandmarker.detectForVideo(
    video,
    performance.now()
  );

  if (!results.landmarks || results.landmarks.length === 0) {
    status.textContent = '손을 보여주세요';
    handOverlay.clear();

    reversalRedEffect.setActive(false);
    isRedActive = false;
    redGestureFrames = Math.max(redGestureFrames - 1, 0);

    resetBlueState();

    targetScale.set(0.05, 0.05, 0.05);
    energyCore.visible = false;
    lastHandArea = null;

    if (spellText) {
      spellText.classList.remove('show');
      spellText.classList.add('hidden');
    }

    return;
  }

  handOverlay.drawLandmarks(results.landmarks);

  const hand = results.landmarks[0];
  const handedness = results.handedness?.[0];
  const now = performance.now();

  const handArea = getHandArea(hand);
  const deltaSeconds = Math.max((now - lastHandAreaTime) / 1000, 0.016);

  const spellResult = detectSpellGesture(hand, handedness);

  // 앵커 계산
  const redAnchorLandmark = midpoint(hand[8], hand[12]);
  const blueAnchorLandmark = averageLandmarks([
    hand[0],
    hand[5],
    hand[9],
    hand[13],
    hand[17],
  ]);

  const redGuidePoint = landmarkToScenePoint(redAnchorLandmark);
  const blueGuidePoint = landmarkToScenePoint(blueAnchorLandmark);

  redSpellAnchor.set(redGuidePoint.x, redGuidePoint.y, -1.2);
  blueSpellAnchor.set(blueGuidePoint.x, blueGuidePoint.y, -1.2);

  reversalRedEffect.setAnchor(redSpellAnchor);
  forwardBlueEffect.setAnchor(blueSpellAnchor);

  // 기본 추적용
  targetPosition.set(blueGuidePoint.x, blueGuidePoint.y, 0);

  // -------------------------
  // Red: 이전 로직 그대로 유지
  // -------------------------
  if (lastHandArea !== null) {
  const areaSpeed = (handArea - lastHandArea) / deltaSeconds;

  const readyToBurst =
    reversalRedEffect.isReadyToBurst?.() ?? false;

  // 혁이 완성된 순간부터 잠깐 동안은
  // 손동작이 흔들려도 폭발 입력을 받게 함
  if (readyToBurst) {
      redBurstGraceUntil = now + 650;
      redWasReadyToBurst = true;
    }

    const inBurstGrace = now < redBurstGraceUntil;

    // 기존 0.22는 꽤 빡셈.
    // 0.10~0.14 정도가 실제 손동작에 더 잘 맞음.
    const pushedForward =
      areaSpeed > 0.11 &&
      (readyToBurst || inBurstGrace || redWasReadyToBurst);

    if (pushedForward) {
      reversalRedEffect.triggerBurst?.();

      redBurstGraceUntil = 0;
      redWasReadyToBurst = false;
    }
  }

  if (spellResult.isReversalRed) {
    redGestureFrames = Math.min(redGestureFrames + 1, 12);
  } else {
    redGestureFrames = Math.max(redGestureFrames - 1, 0);
  }

  const redShouldStart = redGestureFrames >= 5;
  const redShouldKeep =
    redGestureFrames > 0 &&
    (
      isRedActive ||
      reversalRedEffect.isReadyToBurst?.() ||
      now < redBurstGraceUntil
    );

  isRedActive = redShouldStart || redShouldKeep;
  reversalRedEffect.setActive(isRedActive);

  // -------------------------
  // Blue: 별도 독립 상태머신
  // -------------------------
  // Red 포즈일 때는 Blue 오인식 줄이기 위해 Blue를 초기화
  if (spellResult.isReversalRed && blueState !== 'COLLAPSE') {
    resetBlueState();
  } else {
    updateBlueState(spellResult, now);
  }

  const prioritySpell = getPrioritySpell();

  if (prioritySpell?.key === 'red') {
    status.textContent = '술식반전 혁';
  } else if (prioritySpell?.key === 'blue') {
    status.textContent = `술식순전 창 / ${blueState} / charge ${blueCharge.toFixed(2)}`;
  } else {
    status.textContent =
      `손 인식 중 / open ${spellResult.blueOpenCount} / ` +
      `comp ${spellResult.blueCompression.toFixed(2)} / ` +
      `palm ${spellResult.isBluePalmOpen ? 'YES' : 'NO'}`;
  }

  lastHandArea = handArea;
  lastHandAreaTime = now;

  energyCore.visible = false;
  targetScale.set(0.05, 0.05, 0.05);
}

function updateCosmos(deltaTime) {
  if (!cosmos) return;

  const prioritySpell = getPrioritySpell();

  if (
    typeof cosmos.setSingularity === 'function' &&
    typeof cosmos.update === 'function'
  ) {
    const activeEffect = prioritySpell?.effect ?? null;
    const activeAnchor = prioritySpell?.anchor ?? blueSpellAnchor;

    const pullIntensity =
      activeEffect?.getCosmosPullIntensity?.() ?? 0;

    const visibility =
      activeEffect?.getCosmosVisibility?.() ?? 1;

    const absorption =
      activeEffect?.getCosmosAbsorption?.() ?? 0;

    if (prioritySpell?.key === 'blue') {
      lastCosmosTheme = 'blue';
    } else if (prioritySpell?.key === 'red') {
      lastCosmosTheme = 'red';
    }

    if (typeof cosmos.setTheme === 'function') {
      cosmos.setTheme(lastCosmosTheme);
    }

    cosmos.setSingularity(activeAnchor, pullIntensity);

    if (typeof cosmos.setVisibility === 'function') {
      cosmos.setVisibility(visibility);
    }

    if (typeof cosmos.setAbsorption === 'function') {
      cosmos.setAbsorption(absorption);
    }

    cosmos.update(deltaTime);
    return;
  }
}

function updateVFX(deltaTime) {
  smoothPosition.lerp(targetPosition, 0.18);

  energyCore.position.copy(smoothPosition);
  energyCore.scale.lerp(targetScale, 0.15);

  energyCore.rotation.x += 0.02;
  energyCore.rotation.y += 0.03;

  ambientParticles.rotation.y += 0.0015;
  ambientParticles.rotation.x += 0.0008;

  updateCosmos(deltaTime);

  reversalRedEffect.update(deltaTime);
  forwardBlueEffect.update(deltaTime);

  const prioritySpell = getPrioritySpell();
  const activeEffect = prioritySpell?.effect ?? null;
  const activeAnchor = prioritySpell?.anchor ?? blueSpellAnchor;

  // 중앙 상단 한자
  const showSpellName =
    activeEffect?.isSpellNameVisible?.() ?? false;

  if (showSpellName && spellText) {
    setSpellText(prioritySpell?.key === 'blue' ? 'blue' : 'red');

    spellText.classList.add('show');
    spellText.classList.remove('hidden');
  } else if (spellText) {
    spellText.classList.remove('show');
    spellText.classList.add('hidden');
  }

  const burstFlash = Math.max(
    reversalRedEffect.getBurstFlashStrength?.() ?? 0,
    forwardBlueEffect.getBurstFlashStrength?.() ?? 0
  );

  const blueDistortion = 0;

  const blueVisualBoost =
    prioritySpell?.key === 'blue'
      ? (forwardBlueEffect.getCosmosAbsorption?.() ?? 0)
      : 0;

  if (bloom) {
    bloom.intensity =
      2.3 +
      burstFlash * 6.2 +
      blueVisualBoost * 2.6;
  }

  if (chromatic) {
    const offset =
      0.00012 +
      blueVisualBoost * 0.0012;

    chromatic.offset.set(offset, offset);
  }

  if (pinch) {
    pinch.setStrength(0);
  }

  const shake = Math.max(
    reversalRedEffect.getCameraShake?.() ?? 0,
    forwardBlueEffect.getCameraShake?.() ?? 0
  );

  if (shake > 0) {
    camera.position.x = (Math.random() - 0.5) * 0.28 * shake;
    camera.position.y = (Math.random() - 0.5) * 0.22 * shake;
    camera.position.z = 6.5 + (Math.random() - 0.5) * 0.2 * shake;
  } else {
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = 6.5;
  }
}

function animate(now = performance.now()) {
  requestAnimationFrame(animate);

  const deltaTime = Math.min((now - lastFrameTime) / 1000, 0.033);
  lastFrameTime = now;

  updateHandTracking();
  updateVFX(deltaTime);

  composer.render();
}

init();