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
export const getWireLength = (from, to, waypoints = [], floorplan, zoom = 1) => {
  if (!floorplan || !floorplan.pixelsPerInch) {
    return null;
  }

  // Device positions are in CANVAS coordinates (world space after floorplan scaling)
  // Calibration was done in RAW IMAGE pixel coordinates
  // The floorplan is rendered with: width = imageWidth * (1/pixelsPerInch) * scale

  const floorplanPos = floorplan.position || { x: 0, y: 0 };
  const floorplanScale = floorplan.scale || 1;
  const pixelsPerInch = floorplan.pixelsPerInch;

  // Calculate wire path in canvas coordinates
  const pathLengthCanvasPx = calculatePathLength(from, to, waypoints);

  // Canvas coordinates are: imagePixels * (1/pixelsPerInch) * scale
  // To convert back to real-world inches:
  // canvas px / scale = image px equivalent
  // But we want inches directly, so: canvas px / scale / pixelsPerInch won't work
  // 
  // Actually: canvas px = real inches * scale (because 1 inch = pixelsPerInch image px, but rendered at 1/pixelsPerInch * scale canvas px)
  // So: real inches = canvas px / scale
  // Wait no, let me think...
  //
  // Image px / pixelsPerInch = real inches
  // Canvas px = image px * (1/pixelsPerInch) * scale
  // Therefore: canvas px = real inches * scale
  // So: real inches = canvas px / scale

  const inches = pathLengthCanvasPx / floorplanScale;
  const feet = inches / 12;

  console.log('=== WIRE LENGTH CALCULATION ===');
  console.log('Canvas path length:', pathLengthCanvasPx);
  console.log('Floorplan scale:', floorplanScale);
  console.log('Pixels per inch (calibration):', pixelsPerInch);
  console.log('Result inches:', inches, 'feet:', feet);
  console.log('Expected: ~121 inches for test case');
  console.log('================================');

  return {
    feet: feet.toFixed(2),
    inches: inches.toFixed(2),
    pixels: pathLengthCanvasPx.toFixed(2)
  };
};