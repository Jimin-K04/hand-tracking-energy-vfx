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

import { BlueSpellState } from './spells/blueSpellState.js';
import { getPrioritySpell } from './spells/spellPriority.js';
import {
  showSpellText,
  hideSpellText,
} from './spells/spellText.js';
import {
  getHandArea,
  midpoint,
  averageLandmarks,
} from './spells/handUtils.js';

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

const { composer, bloom, chromatic, pinch } = createPostFX(
  renderer,
  scene,
  camera
);

const handOverlay = createHandOverlay(handDebugCanvas);

const reversalRedEffect = new CosmicRedEffect(scene);
const forwardBlueEffect = new CosmicBlueEffect(scene);

const blueSpellState = new BlueSpellState(forwardBlueEffect);

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

const targetPosition = new THREE.Vector3(0, 0, 0);
const smoothPosition = new THREE.Vector3(0, 0, 0);
const targetScale = new THREE.Vector3(1, 1, 1);

const redSpellAnchor = new THREE.Vector3(0, 0, -1.2);
const blueSpellAnchor = new THREE.Vector3(0, 0, -1.2);

function getCurrentPrioritySpell() {
  return getPrioritySpell({
    isRedActive,
    redGestureFrames,
    reversalRedEffect,
    redSpellAnchor,

    blueSpellState,
    forwardBlueEffect,
    blueSpellAnchor,
  });
}

function resetAllSpellStates() {
  reversalRedEffect.setActive(false);
  isRedActive = false;
  redGestureFrames = Math.max(redGestureFrames - 1, 0);

  blueSpellState.reset();
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

    resetAllSpellStates();

    targetScale.set(0.05, 0.05, 0.05);
    energyCore.visible = false;
    lastHandArea = null;

    hideSpellText(spellText);

    return;
  }

  handOverlay.drawLandmarks(results.landmarks);

  const hand = results.landmarks[0];
  const handedness = results.handedness?.[0];
  const now = performance.now();

  const handArea = getHandArea(hand);
  const deltaSeconds = Math.max((now - lastHandAreaTime) / 1000, 0.016);

  const spellResult = detectSpellGesture(hand, handedness);

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

  targetPosition.set(blueGuidePoint.x, blueGuidePoint.y, 0);

  // -------------------------
  // Red: 술식반전 혁
  // -------------------------
  if (lastHandArea !== null) {
    const areaSpeed = (handArea - lastHandArea) / deltaSeconds;

    const readyToBurst =
      reversalRedEffect.isReadyToBurst?.() ?? false;

    if (readyToBurst) {
      redBurstGraceUntil = now + 650;
      redWasReadyToBurst = true;
    }

    const inBurstGrace = now < redBurstGraceUntil;

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
  // Blue: 술식순전 창
  // -------------------------
  if (spellResult.isReversalRed && blueSpellState.state !== 'COLLAPSE') {
    blueSpellState.reset();
  } else {
    blueSpellState.update(spellResult, now);
  }

  const prioritySpell = getCurrentPrioritySpell();

  if (prioritySpell?.key === 'red') {
    status.textContent = '술식반전 혁';
  } else if (prioritySpell?.key === 'blue') {
    status.textContent =
      `술식순전 창 / ${blueSpellState.state} / ` +
      `charge ${blueSpellState.charge.toFixed(2)}`;
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

  const prioritySpell = getCurrentPrioritySpell();

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

  const prioritySpell = getCurrentPrioritySpell();
  const activeEffect = prioritySpell?.effect ?? null;

  const showSpellName =
    activeEffect?.isSpellNameVisible?.() ?? false;

  if (showSpellName && spellText && prioritySpell) {
    showSpellText(spellText, prioritySpell.key);
  } else {
    hideSpellText(spellText);
  }

  const burstFlash = Math.max(
    reversalRedEffect.getBurstFlashStrength?.() ?? 0,
    forwardBlueEffect.getBurstFlashStrength?.() ?? 0
  );

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