function isFingerExtended(hand, tipIndex, pipIndex, mcpIndex) {
  return (
    hand[tipIndex].y < hand[pipIndex].y &&
    hand[pipIndex].y < hand[mcpIndex].y
  );
}

function isFingerFolded(hand, tipIndex, pipIndex) {
  return hand[tipIndex].y > hand[pipIndex].y - 0.01;
}

function isThumbOutward(hand, handednessLabel = 'Right') {
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

export function detectSpellGesture(hand, handedness) {
  const handednessLabel =
    handedness?.[0]?.categoryName ||
    handedness?.categoryName ||
    'Right';

  const indexExtended = isFingerExtended(hand, 8, 6, 5);
  const middleExtended = isFingerExtended(hand, 12, 10, 9);
  const ringFolded = isFingerFolded(hand, 16, 14);
  const pinkyFolded = isFingerFolded(hand, 20, 18);
  const thumbOutward = isThumbOutward(hand, handednessLabel);

  const isReversalRed =
    indexExtended &&
    middleExtended &&
    ringFolded &&
    pinkyFolded &&
    thumbOutward;

  return {
    isReversalRed,
    handednessLabel,
    debug: {
      indexExtended,
      middleExtended,
      ringFolded,
      pinkyFolded,
      thumbOutward,
    },
  };
}