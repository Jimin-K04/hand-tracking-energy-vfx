// src/gestures/blueGesture.js
import {
  clamp01,
  distance2D,
  getPalmAngle,
  getPalmCenter,
  getPalmSize,
} from './handMath.js';

function isBlueFingerOpen(hand, tipIndex, pipIndex) {
  const wrist = hand[0];

  const tipDistance = distance2D(hand[tipIndex], wrist);
  const pipDistance = distance2D(hand[pipIndex], wrist);

  return tipDistance > pipDistance * 1.08;
}

function getBlueCompression(hand) {
  const palmCenter = getPalmCenter(hand);
  const palmSize = getPalmSize(hand);

  const tipIndices = [8, 12, 16, 20];
  let sum = 0;

  for (const tipIndex of tipIndices) {
    sum += distance2D(hand[tipIndex], palmCenter);
  }

  const avgDistance = sum / tipIndices.length;
  const normalized = avgDistance / palmSize;

  const compression = 1 - clamp01((normalized - 0.42) / 1.15);

  return clamp01(compression);
}

export function detectBlueGesture(hand) {
  const blueIndexOpen = isBlueFingerOpen(hand, 8, 6);
  const blueMiddleOpen = isBlueFingerOpen(hand, 12, 10);
  const blueRingOpen = isBlueFingerOpen(hand, 16, 14);
  const bluePinkyOpen = isBlueFingerOpen(hand, 20, 18);

  const blueOpenCount = [
    blueIndexOpen,
    blueMiddleOpen,
    blueRingOpen,
    bluePinkyOpen,
  ].filter(Boolean).length;

  const blueCompression = getBlueCompression(hand);
  const bluePalmAngle = getPalmAngle(hand);
  const bluePalmCenter = getPalmCenter(hand);

  const isBluePalmOpen =
    blueOpenCount >= 3 &&
    blueCompression < 0.5;

  const isBlueNearFist = blueCompression > 0.58;
  const isBlueFist = blueCompression > 0.72;

  return {
    isBluePalmOpen,
    isBlueNearFist,
    isBlueFist,
    blueCompression,
    bluePalmAngle,
    bluePalmCenter,
    blueOpenCount,

    debug: {
      blueIndexOpen,
      blueMiddleOpen,
      blueRingOpen,
      bluePinkyOpen,
      blueOpenCount,
      blueCompression,
      isBluePalmOpen,
      isBlueNearFist,
      isBlueFist,
    },
  };
}