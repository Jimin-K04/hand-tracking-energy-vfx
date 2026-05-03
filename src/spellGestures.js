// src/spellGestures.js
import { detectRedGesture } from './gestures/redGesture.js';
import { detectBlueGesture } from './gestures/blueGesture.js';

export function detectSpellGesture(hand, handedness) {
  const handednessLabel =
    handedness?.[0]?.categoryName ||
    handedness?.categoryName ||
    'Right';

  const red = detectRedGesture(hand, handednessLabel);
  const blue = detectBlueGesture(hand);

  return {
    // Red
    isReversalRed: red.isReversalRed,

    // Blue
    isBluePalmOpen: blue.isBluePalmOpen,
    isBlueNearFist: blue.isBlueNearFist,
    isBlueFist: blue.isBlueFist,
    blueCompression: blue.blueCompression,
    bluePalmAngle: blue.bluePalmAngle,
    bluePalmCenter: blue.bluePalmCenter,
    blueOpenCount: blue.blueOpenCount,

    handednessLabel,

    debug: {
      red: red.debug,
      blue: blue.debug,
    },
  };
}