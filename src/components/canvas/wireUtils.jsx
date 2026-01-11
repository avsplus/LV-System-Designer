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

// Convert pixels to feet using floorplan scale
export const getWireLength = (from, to, waypoints = [], floorplan) => {
  if (!floorplan || !floorplan.pixelsPerInch) {
    return null;
  }
  
  // Device positions and calibration are both in raw image pixels
  // No need to adjust for position or scale since everything is relative to the image
  const pathLengthPx = calculatePathLength(from, to, waypoints);
  const inches = pathLengthPx / floorplan.pixelsPerInch;
  const feet = inches / 12;
  
  console.log('=== WIRE LENGTH CALCULATION ===');
  console.log('Device positions (px):', { from, to });
  console.log('Path length (px):', pathLengthPx);
  console.log('pixelsPerInch:', floorplan.pixelsPerInch);
  console.log('Result:', { inches, feet });
  console.log('================================');
  
  return {
    feet: feet.toFixed(2),
    inches: inches.toFixed(2),
    pixels: pathLengthPx.toFixed(2)
  };
};