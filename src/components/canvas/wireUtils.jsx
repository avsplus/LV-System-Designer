// Calculate total path length in pixels
export const calculatePathLength = (from, to, waypoints = []) => {
  const points = [from, ...waypoints, to];
  let totalLength = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }

  return totalLength;
};

// Convert canvas pixels to real-world distance using calibration
export const getWireLength = (from, to, waypoints = [], floorplan, zoom = 1) => {
  if (!floorplan || !floorplan.pixelsPerInch) {
    return null;
  }

  const pixelsPerInch = floorplan.pixelsPerInch;

  // Calculate path length directly in canvas coordinates
  const pathLengthCanvasPx = calculatePathLength(from, to, waypoints);

  // Direct conversion: canvas pixels to inches using only pixelsPerInch
  // Scale should not be involved if coordinates are already in world space
  const inches = pathLengthCanvasPx / pixelsPerInch;
  const feet = inches / 12;

  console.log('=== WIRE LENGTH CALCULATION ===');
  console.log('Canvas path length:', pathLengthCanvasPx.toFixed(2), 'canvas px');
  console.log('Pixels per inch:', pixelsPerInch.toFixed(4));
  console.log('Result:', inches.toFixed(2), 'inches (', feet.toFixed(2), 'feet)');
  console.log('Expected: 131 inches');
  console.log('================================');

  return {
    feet: feet.toFixed(2),
    inches: inches.toFixed(2),
    pixels: pathLengthCanvasPx.toFixed(2)
  };
};