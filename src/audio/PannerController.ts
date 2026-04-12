// src/audio/PannerController.ts
// Coordinate math for Web Audio API spatial positioning

export interface CartesianPos {
  x: number;
  y: number;
  z: number;
}

/**
 * Convert spherical audio coordinates to Web Audio API Cartesian space.
 *
 * Convention:
 *   azimuth 0° = front (listener facing -Z), 90° = right, 180° = back, 270° = left
 *   elevation 0° = horizontal, +90° = above, -90° = below
 *
 * Web Audio coordinate system:
 *   +X = right, +Y = up, -Z = front (default listener faces -Z)
 */
export function azimuthElevationToCartesian(
  azimuthDeg: number,
  elevationDeg: number,
  distance: number,
): CartesianPos {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;

  const cosEl = Math.cos(el);
  return {
    x: distance * cosEl * Math.sin(az),
    y: distance * Math.sin(el),
    z: -distance * cosEl * Math.cos(az),
  };
}

/**
 * Convert canvas drag position (relative to center) to azimuth + normalized distance.
 * dx > 0 = right of center, dy > 0 = below center (canvas Y axis inverted)
 */
export function canvasDragToAzimuthDistance(
  dx: number,
  dy: number,
  maxRadius: number,
  maxDistance: number,
): { azimuth: number; distance: number } {
  let azimuthDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (azimuthDeg < 0) azimuthDeg += 360;

  const rawDist = Math.sqrt(dx * dx + dy * dy);
  const normalized = Math.min(rawDist / maxRadius, 1);
  const distance = 0.3 + normalized * (maxDistance - 0.3);

  return { azimuth: azimuthDeg, distance };
}

/**
 * Convert azimuth + distance back to canvas offset from center.
 */
export function azimuthDistanceToCanvasOffset(
  azimuthDeg: number,
  distance: number,
  maxRadius: number,
  maxDistance: number,
): { dx: number; dy: number } {
  const az = (azimuthDeg * Math.PI) / 180;
  const normalized = Math.max(0, Math.min(1, (distance - 0.3) / (maxDistance - 0.3)));
  const r = normalized * maxRadius;

  return {
    dx: r * Math.sin(az),
    dy: -r * Math.cos(az),
  };
}

/**
 * Convert DeviceOrientation alpha/beta/gamma to listener forward vector.
 * Returns { forwardX, forwardZ } normalized.
 */
export function deviceOrientationToForward(
  alpha: number,  // compass-like rotation around Z (0-360)
  _beta: number,  // front-back tilt (-180 to 180)
  _gamma: number, // left-right tilt (-90 to 90)
  baselineAlpha: number,
): { forwardX: number; forwardZ: number } {
  const relAlpha = ((alpha - baselineAlpha + 360) % 360 * Math.PI) / 180;
  return {
    forwardX: Math.sin(relAlpha),
    forwardZ: -Math.cos(relAlpha),
  };
}

/** Get sub-bass energy (20-60 Hz) from FFT data */
export function getSubBassEnergy(
  fftData: Float32Array,
  sampleRate: number,
): number {
  const binHz = sampleRate / (fftData.length * 2);
  const lowBin = Math.floor(20 / binHz);
  const highBin = Math.ceil(60 / binHz);

  let total = 0;
  let count = 0;
  for (let i = lowBin; i <= Math.min(highBin, fftData.length - 1); i++) {
    // fftData is in dB (-Infinity to 0), normalize to 0-1
    const db = fftData[i];
    if (isFinite(db)) {
      total += Math.max(0, (db + 96) / 96);
      count++;
    }
  }
  return count > 0 ? total / count : 0;
}
