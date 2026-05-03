// src/spells/handUtils.js

export function getHandArea(hand) {
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

export function midpoint(a, b) {
  return {
    x: (a.x + b.x) * 0.5,
    y: (a.y + b.y) * 0.5,
    z: ((a.z || 0) + (b.z || 0)) * 0.5,
  };
}

export function averageLandmarks(points) {
  const out = { x: 0, y: 0, z: 0 };

  for (const p of points) {
    out.x += p.x;
    out.y += p.y;
    out.z += p.z || 0;
  }

  out.x /= points.length;
  out.y /= points.length;
  out.z /= points.length;

  return out;
}

export function worldToScreenUV(position, camera) {
  const projected = position.clone().project(camera);

  return {
    x: (projected.x + 1) * 0.5,
    y: (projected.y + 1) * 0.5,
  };
}