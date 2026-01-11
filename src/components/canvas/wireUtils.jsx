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
  
  // Account for floorplan position and scale
  // Device positions are in canvas coordinates; we need to normalize them to floorplan space
  const floorplanScale = (floorplan.scale || 1);
  const calibrationScale = (floorplan.calibrationScale || 1); // Scale at time of calibration
  const floorplanPos = floorplan.position || { x: 0, y: 0 };
  
  // Adjust for scale changes since calibration
  const scaleAdjustment = floorplanScale / calibrationScale;
  const scaleFactor = 1 / scaleAdjustment;
  const adjustedFrom = {
    x: (from.x - floorplanPos.x) * scaleFactor,
    y: (from.y - floorplanPos.y) * scaleFactor
  };
  const adjustedTo = {
    x: (to.x - floorplanPos.x) * scaleFactor,
    y: (to.y - floorplanPos.y) * scaleFactor
  };
  
  // Adjust waypoints if they exist
  const adjustedWaypoints = waypoints?.map(wp => ({
    x: (wp.x - floorplanPos.x) * scaleFactor,
    y: (wp.y - floorplanPos.y) * scaleFactor
  })) || [];
  
  const pathLengthPx = calculatePathLength(adjustedFrom, adjustedTo, adjustedWaypoints);
  const inches = pathLengthPx / floorplan.pixelsPerInch;
  const feet = inches / 12;
  
  console.log('=== WIRE LENGTH CALCULATION DEBUG ===');
  console.log('Raw device positions:', { from, to });
  console.log('Floorplan data:', {
    scale: floorplanScale,
    calibrationScale: calibrationScale,
    position: floorplanPos,
    pixelsPerInch: floorplan.pixelsPerInch
  });
  console.log('Scale factor applied:', scaleFactor);
  console.log('Adjusted positions:', { adjustedFrom, adjustedTo });
  console.log('Path length (pixels):', pathLengthPx);
  console.log('Result:', { inches, feet });
  console.log('====================================');
  
  return {
    feet: feet.toFixed(2),
    inches: inches.toFixed(2),
    pixels: pathLengthPx.toFixed(2)
  };
};