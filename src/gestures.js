export function distance2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return Math.sqrt(dx * dx + dy * dy);
}

export function getPinchState(hand) {
  const thumbTip = hand[4];
  const indexTip = hand[8];

  const pinchDistance = distance2D(thumbTip, indexTip);

  return {
    pinchDistance,
    isPinching: pinchDistance < 0.055,
  };
}

export function landmarkToScenePoint(landmark) {
  const viewportWidth = 8;
  const viewportHeight = 4.5;

  return {
    x: (0.5 - landmark.x) * viewportWidth,
    y: -(landmark.y - 0.5) * viewportHeight,
    z: 0,
  };
}