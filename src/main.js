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
import { createPostFX } from './postfx.js';

const spellText = document.querySelector('#spell-text');
const video = document.querySelector('#webcam');
const canvas = document.querySelector('#three-canvas');
const status = document.querySelector('#status');
const handDebugCanvas = document.querySelector('#hand-debug-canvas');

const {
  scene,
  camera,
  renderer,
  energyCore,
  ambientParticles,
  cosmos,
} = createScene(canvas);

const { composer, bloom } = createPostFX(renderer, scene, camera);

const handOverlay = createHandOverlay(handDebugCanvas);
const reversalRedEffect = new CosmicRedEffect(scene);

let handLandmarker = null;
let lastVideoTime = -1;
let lastFrameTime = performance.now();

let redGestureFrames = 0;
let isRedActive = false;

let lastHandArea = null;
let lastHandAreaTime = performance.now();

const targetPosition = new THREE.Vector3(0, 0, 0);
const smoothPosition = new THREE.Vector3(0, 0, 0);
const targetScale = new THREE.Vector3(1, 1, 1);
const spellAnchor = new THREE.Vector3(0, 0, -1.2);

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

async function init() {
  try {
    status.textContent = 'Starting webcam...';
    await setupWebcam(video);

    status.textContent = 'Loading MediaPipe Hand Landmarker...';
    handLandmarker = await createHandLandmarker();

    status.textContent = 'Show your hand ✋';
    animate();
  } catch (error) {
    console.error(error);
    status.textContent = 'Failed to start. Check browser console.';
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
    status.textContent = 'No hand detected';

    handOverlay.clear();

    reversalRedEffect.setActive(false);
    isRedActive = false;

    redGestureFrames = Math.max(redGestureFrames - 1, 0);

    targetScale.set(0.05, 0.05, 0.05);
    energyCore.visible = false;

    return;
  }

  handOverlay.drawLandmarks(results.landmarks);

  const hand = results.landmarks[0];
  const now = performance.now();
  const handArea = getHandArea(hand);
  const deltaSeconds = Math.max((now - lastHandAreaTime) / 1000, 0.016);

  if (lastHandArea !== null) {
    const areaSpeed = (handArea - lastHandArea) / deltaSeconds;

    const pushedForward =
      areaSpeed > 0.22 &&
      reversalRedEffect.isReadyToBurst();

    if (pushedForward) {
      reversalRedEffect.triggerBurst();
    }
  }

  lastHandArea = handArea;
  lastHandAreaTime = now;
  const handedness = results.handedness?.[0];

  const indexTip = hand[8];
  const middleTip = hand[12];

  // 기본 손 위치 추적용 좌표
  const guidePoint = landmarkToScenePoint(indexTip);
  targetPosition.set(guidePoint.x, guidePoint.y, 0);

  // 술식 반전 혁 손동작 판정
  const spellResult = detectSpellGesture(hand, handedness);

  if (spellResult.isReversalRed) {
    redGestureFrames = Math.min(redGestureFrames + 1, 12);
  } else {
    redGestureFrames = Math.max(redGestureFrames - 1, 0);
  }

  const redActive = redGestureFrames >= 5;
  isRedActive = redActive;

  // 검지와 중지 사이를 술식 중심점으로 사용
  const spellCenterLandmark = midpoint(indexTip, middleTip);
  const effectPoint = landmarkToScenePoint(spellCenterLandmark);

  // z값을 음수로 둬서 화면 안쪽 공간에 생성
  spellAnchor.set(effectPoint.x, effectPoint.y, -1.2);

  reversalRedEffect.setAnchor(spellAnchor);
  reversalRedEffect.setActive(redActive);

  // 보라색 기본 추적 구체는 미관상 끔
  energyCore.visible = false;

  const scale = redActive ? 0.05 : 0.05;
  targetScale.set(scale, scale, scale);

  if (redActive) {
    status.textContent = '술식 반전: 혁';
  } else if (spellResult.isReversalRed) {
    status.textContent = 'Reversal Red charging...';
  } else {
    status.textContent = 'Tracking hand';
  }

  if (redActive) {
    spellText?.classList.add('show');
    spellText?.classList.remove('hidden');
  } else {
    spellText?.classList.remove('show');
    spellText?.classList.add('hidden');
  }
}

function updateCosmos(deltaTime) {

  if (!cosmos) return;

  // 새 scene.js에서 cosmos가 반응형 입자 시스템일 때
  if (
    typeof cosmos.setSingularity === 'function' &&
    typeof cosmos.update === 'function'
  ) {
    const pullIntensity =
      reversalRedEffect.getCosmosPullIntensity?.() ??
      (isRedActive ? 1 : 0);

    const visibility =
      reversalRedEffect.getCosmosVisibility?.() ?? 1;
    const absorption =
      reversalRedEffect.getCosmosAbsorption?.() ?? 0;

    cosmos.setSingularity(spellAnchor, pullIntensity);

    if (typeof cosmos.setVisibility === 'function') {
      cosmos.setVisibility(visibility);
    }
    if (typeof cosmos.setAbsorption === 'function') {
      cosmos.setAbsorption(absorption);
    }

    cosmos.update(deltaTime);
    return;
  }

  // 예전 scene.js 구조를 아직 쓰는 경우를 위한 fallback
  if (cosmos.starsBack) {
    cosmos.starsBack.rotation.y += deltaTime * 0.006;
    cosmos.starsBack.rotation.x += deltaTime * 0.0015;
  }

  if (cosmos.starsMid) {
    cosmos.starsMid.rotation.y -= deltaTime * 0.01;
    cosmos.starsMid.rotation.x += deltaTime * 0.0025;
  }

  if (cosmos.starsFront) {
    cosmos.starsFront.rotation.y += deltaTime * 0.018;
    cosmos.starsFront.rotation.x -= deltaTime * 0.003;
  }

  if (cosmos.starFieldFar) {
    cosmos.starFieldFar.rotation.y += deltaTime * 0.01;
    cosmos.starFieldFar.rotation.x += deltaTime * 0.003;
  }

  if (cosmos.starFieldNear) {
    cosmos.starFieldNear.rotation.y -= deltaTime * 0.018;
    cosmos.starFieldNear.rotation.x += deltaTime * 0.006;
  }

  if (cosmos.nebulaGroup) {
    cosmos.nebulaGroup.rotation.y += deltaTime * 0.012;
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

  const showSpellName =
  reversalRedEffect.isSpellNameVisible?.() ?? false;

  if (showSpellName) {
    spellText?.classList.add('show');
    spellText?.classList.remove('hidden');
  } else {
    spellText?.classList.remove('show');
    spellText?.classList.add('hidden');
  }

  const burstFlash =
    reversalRedEffect.getBurstFlashStrength?.() ?? 0;

  // 평소 bloom + 폭발시 bloom 급상승
  if (bloom) {
    bloom.intensity = 2.4 + burstFlash * 6.5;
  }

  // 노출도 살짝 올리면 화면이 확 하얘짐
  renderer.toneMappingExposure = 1.03 + burstFlash * 0.9;

  const shake = reversalRedEffect.getCameraShake?.() ?? 0;

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