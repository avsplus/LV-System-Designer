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
// Pass zoom as optional parameter to account for canvas transforms
export const getWireLength = (from, to, waypoints = [], floorplan, zoom = 1) => {
  if (!floorplan || !floorplan.pixelsPerInch) {
    return null;
  }
  
  // Device positions are in CANVAS coordinates (after all zoom/pan/scale transforms)
  // But calibration was done in RAW IMAGE pixel coordinates
  // We need to convert device positions back to image space
  
  const floorplanPos = floorplan.position || { x: 0, y: 0 };
  const floorplanScale = floorplan.scale || 1;
  const pixelsPerInch = floorplan.pixelsPerInch;
  
  // Calculate the scale factor applied to the floorplan display
  // Floorplan width in canvas = imageWidth * (1/pixelsPerInch) * floorplanScale
  // So to convert canvas px back to image px:
  const canvasToImageScale = pixelsPerInch / floorplanScale;
  
  // Convert device positions from canvas coordinates to image pixel coordinates
  const imageFrom = {
    x: (from.x - floorplanPos.x) * canvasToImageScale,
    y: (from.y - floorplanPos.y) * canvasToImageScale
  };
  
  const imageTo = {
    x: (to.x - floorplanPos.x) * canvasToImageScale,
    y: (to.y - floorplanPos.y) * canvasToImageScale
  };
  
  const imageWaypoints = waypoints?.map(wp => ({
    x: (wp.x - floorplanPos.x) * canvasToImageScale,
    y: (wp.y - floorplanPos.y) * canvasToImageScale
  })) || [];
  
  const pathLengthCanvasPx = calculatePathLength(from, to, waypoints);
  const pathLengthPx = calculatePathLength(imageFrom, imageTo, imageWaypoints);
  
  // The issue: if scale is being applied WITHIN the device positions, we're double-converting
  // Check if just dividing canvas path by scale gives us the right answer
  const pathIfWeJustDivideByScale = pathLengthCanvasPx / floorplanScale;
  const inchesIfWeJustDivideByScale = pathIfWeJustDivideByScale / pixelsPerInch;
  
  console.log('Canvas path length (before conversion):', pathLengthCanvasPx);
  console.log('If we just divide by scale:', { pathPixels: pathIfWeJustDivideByScale, inches: inchesIfWeJustDivideByScale });
  const inches = pathLengthPx / pixelsPerInch;
  const feet = inches / 12;
  
  console.log('=== WIRE LENGTH CALCULATION ===');
  console.log('Canvas positions:', { from, to });
  console.log('Floorplan data:', { position: floorplanPos, scale: floorplanScale, pixelsPerInch });
  console.log('Canvas to image scale:', canvasToImageScale);
  console.log('Image positions:', { imageFrom, imageTo });
  console.log('Path length (px):', pathLengthPx);
  console.log('Result:', { inches, feet });
  console.log('================================');
  
  return {
    feet: feet.toFixed(2),
    inches: inches.toFixed(2),
    pixels: pathLengthPx.toFixed(2)
  };
};