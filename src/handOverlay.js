const HAND_CONNECTIONS = [
  // Thumb
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],

  // Index finger
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],

  // Middle finger
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],

  // Ring finger
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],

  // Pinky
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],

  // Palm
  [5, 9],
  [9, 13],
  [13, 17],
];

export function createHandOverlay(canvas) {
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;

    ctx.setTransform(
      window.devicePixelRatio,
      0,
      0,
      window.devicePixelRatio,
      0,
      0
    );
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function clear() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
  }

  function drawLandmarks(landmarks) {
    clear();

    if (!landmarks || landmarks.length === 0) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    for (const hand of landmarks) {
      drawConnections(ctx, hand, width, height);
      drawPoints(ctx, hand, width, height);
    }
  }

  return {
    drawLandmarks,
    clear,
  };
}

function drawConnections(ctx, hand, width, height) {
  ctx.save();

  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(160, 100, 255, 0.95)';
  ctx.shadowColor = 'rgba(160, 100, 255, 1)';
  ctx.shadowBlur = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const [startIndex, endIndex] of HAND_CONNECTIONS) {
    const start = hand[startIndex];
    const end = hand[endIndex];

    ctx.beginPath();
    ctx.moveTo(start.x * width, start.y * height);
    ctx.lineTo(end.x * width, end.y * height);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPoints(ctx, hand, width, height) {
  ctx.save();

  for (let i = 0; i < hand.length; i++) {
    const point = hand[i];

    const isFingerTip = [4, 8, 12, 16, 20].includes(i);
    const radius = isFingerTip ? 4.5 : 3;

    ctx.beginPath();
    ctx.arc(point.x * width, point.y * height, radius, 0, Math.PI * 2);

    ctx.fillStyle = isFingerTip
      ? 'rgba(255, 255, 255, 1)'
      : 'rgba(120, 220, 255, 1)';

    ctx.shadowColor = isFingerTip
      ? 'rgba(255, 255, 255, 1)'
      : 'rgba(120, 220, 255, 1)';

    ctx.shadowBlur = 8;
    ctx.fill();
  }

  ctx.restore();
}