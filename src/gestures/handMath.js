// src/gestures/handMath.js
export function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

export function distance2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isFingerExtended(hand, tipIndex, pipIndex, mcpIndex) {
  return (
    hand[tipIndex].y < hand[pipIndex].y &&
    hand[pipIndex].y < hand[mcpIndex].y
  );
}

export function isFingerFolded(hand, tipIndex, pipIndex) {
  return hand[tipIndex].y > hand[pipIndex].y - 0.01;
}

export function getPalmAngle(hand) {
  const indexMcp = hand[5];
  const pinkyMcp = hand[17];

  return Math.atan2(
    pinkyMcp.y - indexMcp.y,
    pinkyMcp.x - indexMcp.x
  );
}

export function getPalmCenter(hand) {
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

export function getPalmSize(hand) {
  const wrist = hand[0];
  const middleMcp = hand[9];

  return Math.max(distance2D(wrist, middleMcp), 0.06);
}