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

  // Calculate wire path in canvas coordinates
  const pathLengthCanvasPx = calculatePathLength(from, to, waypoints);

  // The correct transform:
  // During calibration: imagePixels / realInches = pixelsPerInch
  // During rendering: canvasPixels = imagePixels * (1/pixelsPerInch) * scale
  // Therefore: imagePixels = canvasPixels / ((1/pixelsPerInch) * scale)
  // And: realInches = imagePixels / pixelsPerInch
  // So: realInches = (canvasPixels / ((1/pixelsPerInch) * scale)) / pixelsPerInch
  // Simplify: realInches = canvasPixels / scale / pixelsPerInch^2

  const renderScale = (1 / pixelsPerInch) * floorplanScale;
  const inches = pathLengthCanvasPx / renderScale;
  const feet = inches / 12;

  console.log('=== WIRE LENGTH CALCULATION ===');
  console.log('Canvas path:', pathLengthCanvasPx.toFixed(2), 'px');
  console.log('Render scale:', renderScale.toFixed(4));
  console.log('Result:', inches.toFixed(2), 'inches (', feet.toFixed(2), 'feet)');
  console.log('Expected: 131 inches');
  console.log('================================');

  return {
    feet: feet.toFixed(2),
    inches: inches.toFixed(2),
    pixels: pathLengthCanvasPx.toFixed(2)
  };
};