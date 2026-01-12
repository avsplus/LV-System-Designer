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
  const imageWidth = floorplan.imageWidth || 1815;

  // Calculate wire path in canvas coordinates
  const pathLengthCanvasPx = calculatePathLength(from, to, waypoints);

  // DEBUGGING: Trace the coordinate transform
  // Floorplan rendering: displayWidth = imageWidth * (1/pixelsPerInch) * scale
  const renderScale = (1 / pixelsPerInch) * floorplanScale;
  const displayWidth = imageWidth * renderScale;

  console.log('=== WIRE LENGTH CALCULATION ===');
  console.log('Image width:', imageWidth, 'px');
  console.log('Calibration (pixelsPerInch):', pixelsPerInch.toFixed(2));
  console.log('Display scale:', floorplanScale.toFixed(2));
  console.log('Render scale:', renderScale.toFixed(2), '(1/ppi * scale)');
  console.log('Display width:', displayWidth.toFixed(2), 'canvas px');
  console.log('---');
  console.log('Canvas path length:', pathLengthCanvasPx.toFixed(2), 'canvas px');

  // Try multiple formulas to find the correct one:
  const formula1 = pathLengthCanvasPx / floorplanScale; // Current formula
  const formula2 = pathLengthCanvasPx / renderScale / pixelsPerInch; // Full transform
  const formula3 = (pathLengthCanvasPx / renderScale) / pixelsPerInch; // Step by step
  const formula4 = pathLengthCanvasPx / floorplanScale / pixelsPerInch; // Alternative

  console.log('Formula 1 (path/scale):', formula1.toFixed(2), 'inches');
  console.log('Formula 2 (path/renderScale/ppi):', formula2.toFixed(2), 'inches');
  console.log('Formula 3 ((path/renderScale)/ppi):', formula3.toFixed(2), 'inches');
  console.log('Formula 4 (path/scale/ppi):', formula4.toFixed(2), 'inches');
  console.log('Expected: ~121 inches');
  console.log('================================');

  // Use current formula for now
  const inches = formula1;
  const feet = inches / 12;

  return {
    feet: feet.toFixed(2),
    inches: inches.toFixed(2),
    pixels: pathLengthCanvasPx.toFixed(2)
  };
};