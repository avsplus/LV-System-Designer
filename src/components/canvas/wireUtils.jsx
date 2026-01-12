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

  const floorplanPos = floorplan.position || { x: 0, y: 0 };
  const floorplanScale = floorplan.scale || 1;
  const pixelsPerInch = floorplan.pixelsPerInch;

  // CRITICAL: Work in world/image coordinate space, not canvas space
  // renderScale transforms image pixels to canvas pixels for display
  const renderScale = (1 / pixelsPerInch) * floorplanScale;

  // Convert all points from canvas coordinates to world/image coordinates
  const fromWorld = { x: from.x / renderScale, y: from.y / renderScale };
  const toWorld = { x: to.x / renderScale, y: to.y / renderScale };
  const waypointsWorld = waypoints.map(wp => ({
    x: wp.x / renderScale,
    y: wp.y / renderScale
  }));

  // Calculate path length in world/image coordinate space (same as calibration)
  const pathLengthWorldPx = calculatePathLength(fromWorld, toWorld, waypointsWorld);

  // Divide by pixelsPerInch to get real-world inches
  const inches = pathLengthWorldPx / pixelsPerInch;
  const feet = inches / 12;

  console.log('=== WIRE LENGTH CALCULATION ===');
  console.log('Canvas from:', from.x.toFixed(2), from.y.toFixed(2));
  console.log('World from:', fromWorld.x.toFixed(2), fromWorld.y.toFixed(2));
  console.log('Render scale:', renderScale.toFixed(4));
  console.log('World path length:', pathLengthWorldPx.toFixed(2), 'world px');
  console.log('Pixels per inch:', pixelsPerInch.toFixed(4));
  console.log('Result:', inches.toFixed(2), 'inches (', feet.toFixed(2), 'feet)');
  console.log('Expected: 131 inches');
  console.log('================================');

  return {
    feet: feet.toFixed(2),
    inches: inches.toFixed(2),
    pixels: pathLengthWorldPx.toFixed(2)
  };
};