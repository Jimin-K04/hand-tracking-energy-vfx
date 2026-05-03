// src/spellGestures.js
function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function distance2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function isFingerExtended(hand, tipIndex, pipIndex, mcpIndex) {
  return (
    hand[tipIndex].y < hand[pipIndex].y &&
    hand[pipIndex].y < hand[mcpIndex].y
  );
}

function isFingerFolded(hand, tipIndex, pipIndex) {
  return hand[tipIndex].y > hand[pipIndex].y - 0.01;
}

// Red 전용: 기존 술식반전 혁 손모양
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

function getPalmAngle(hand) {
  const indexMcp = hand[5];
  const pinkyMcp = hand[17];

  return Math.atan2(
    pinkyMcp.y - indexMcp.y,
    pinkyMcp.x - indexMcp.x
  );
}

function getPalmCenter(hand) {
  const ids = [0, 5, 9, 13, 17];
  let x = 0;
  let y = 0;
  let z = 0;

  for (const id of ids) {
    x += hand[id].x;
    y += hand[id].y;
    z += hand[id].z || 0;
  }

  return {
    x: x / ids.length,
    y: y / ids.length,
    z: z / ids.length,
  };
}

function getPalmSize(hand) {
  const wrist = hand[0];
  const middleMcp = hand[9];

  return Math.max(distance2D(wrist, middleMcp), 0.06);
}

// 손가락이 손목/손바닥에서 얼마나 멀리 뻗어있는지로 보는 Blue 전용 판정
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

  // 손 펼침: normalized 큼 -> compression 낮음
  // 주먹: normalized 작음 -> compression 높음
  //
  // 기존보다 훨씬 널널하게 조정.
  const compression = 1 - clamp01((normalized - 0.42) / 1.15);

  return clamp01(compression);
}

export function detectSpellGesture(hand, handedness) {
  const handednessLabel =
    handedness?.[0]?.categoryName ||
    handedness?.categoryName ||
    'Right';

  // -------------------------
  // Red: 술식반전 혁
  // -------------------------
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

  // -------------------------
  // Blue: 술식순전 창
  // 손바닥 쫙 펴기부터 시작
  // -------------------------
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

  // 핵심 수정:
  // 엄지 조건 제거.
  // 네 손이 조금 기울어져도 손가락 3개 이상 펴져 있으면 READY 진입.
  const isBluePalmOpen =
    blueOpenCount >= 3 &&
    blueCompression < 0.5;

  // 일단 주먹 판정도 너무 빡세지 않게 낮춤.
  const isBlueNearFist = blueCompression > 0.58;
  const isBlueFist = blueCompression > 0.72;

  return {
    // Red
    isReversalRed,

    // Blue
    isBluePalmOpen,
    isBlueNearFist,
    isBlueFist,
    blueCompression,
    bluePalmAngle,
    bluePalmCenter,
    blueOpenCount,

    handednessLabel,

    debug: {
      red: {
        redIndexExtended,
        redMiddleExtended,
        redRingFolded,
        redPinkyFolded,
        redThumbOutward,
        isReversalRed,
      },
      blue: {
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
    },
  };
}