export const SURVEILLANCE_DEFAULTS = {
  'SURV-BULLET': { coverageEnabled: true, coverageAngle: 60, coverageDistanceFt: 28, coverageOpacity: 0.18, coverageRotationDeg: 0 },
  'SURV-TURRET': { coverageEnabled: true, coverageAngle: 90, coverageDistanceFt: 22, coverageOpacity: 0.18, coverageRotationDeg: 0 },
  'SURV-DOME': { coverageEnabled: true, coverageAngle: 110, coverageDistanceFt: 18, coverageOpacity: 0.18, coverageRotationDeg: 0 }
};

export const getSurveillanceCoverageSettings = (annotation = {}) => {
  const defaults = SURVEILLANCE_DEFAULTS[annotation?.symbolId] || {
    coverageEnabled: true,
    coverageAngle: 90,
    coverageDistanceFt: 20,
    coverageOpacity: 0.18,
    coverageRotationDeg: 0
  };
  const specs = annotation?.specs || {};
  const maxAngle = annotation?.symbolId === 'SURV-DOME' ? 360 : 180;
  return {
    coverageEnabled: specs.coverageEnabled ?? defaults.coverageEnabled,
    coverageAngle: Math.max(15, Math.min(maxAngle, Number(specs.coverageAngle ?? defaults.coverageAngle))),
    coverageDistanceFt: Math.max(1, Math.min(100, Number(specs.coverageDistanceFt ?? defaults.coverageDistanceFt))),
    coverageOpacity: Math.max(0.05, Math.min(0.5, Number(specs.coverageOpacity ?? defaults.coverageOpacity))),
    coverageRotationDeg: Math.max(-180, Math.min(180, Number(specs.coverageRotationDeg ?? defaults.coverageRotationDeg)))
  };
};

export const getCoverageDistanceCanvasUnits = (distanceFt, floorplan) => {
  const feet = Math.max(0, Number(distanceFt || 0));
  if (floorplan?.pixelsPerInch) {
    return feet * 12 * Math.max(0.01, Number(floorplan.scale || 1));
  }
  return feet * 8 * Math.max(0.25, Number(floorplan?.scale || 1));
};

export const getCoverageConePoints = (center, rotationDeg = 0, angleDeg = 90, distance = 120) => {
  const heading = (Number(rotationDeg || 0) * Math.PI) / 180;
  const halfAngle = (Math.max(1, Number(angleDeg || 0)) * Math.PI) / 360;
  const left = heading - halfAngle;
  const right = heading + halfAngle;
  return {
    start: center,
    left: {
      x: center.x + Math.cos(left) * distance,
      y: center.y + Math.sin(left) * distance
    },
    right: {
      x: center.x + Math.cos(right) * distance,
      y: center.y + Math.sin(right) * distance
    }
  };
};
