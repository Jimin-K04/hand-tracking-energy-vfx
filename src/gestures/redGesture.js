// src/gestures/redGesture.js
import {
  isFingerExtended,
  isFingerFolded,
} from './handMath.js';

function isThumbOutwardForRed(hand, handednessLabel = 'Right') {
  const thumbTip = hand[4];
  const thumbIp = hand[3];
  const indexMcp = hand[5];

  if (handednessLabel === 'Right') {
    return (
      thumbTip.x < thumbIp.x - 0.015 &&
      thumbTip.x < indexMcp.x - 0.02
    );
  }

  return (
    thumbTip.x > thumbIp.x + 0.015 &&
    thumbTip.x > indexMcp.x + 0.02
  );
}

export function detectRedGesture(hand, handednessLabel) {
  const redIndexExtended = isFingerExtended(hand, 8, 6, 5);
  const redMiddleExtended = isFingerExtended(hand, 12, 10, 9);
  const redRingFolded = isFingerFolded(hand, 16, 14);
  const redPinkyFolded = isFingerFolded(hand, 20, 18);
  const redThumbOutward = isThumbOutwardForRed(hand, handednessLabel);

  const isReversalRed =
    redIndexExtended &&
    redMiddleExtended &&
    redRingFolded &&
    redPinkyFolded &&
    redThumbOutward;

  return {
    isReversalRed,
    debug: {
      redIndexExtended,
      redMiddleExtended,
      redRingFolded,
      redPinkyFolded,
      redThumbOutward,
      isReversalRed,
    },
  };
}