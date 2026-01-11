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
  
  const pathLengthPx = calculatePathLength(from, to, waypoints);
  const inches = pathLengthPx / floorplan.pixelsPerInch;
  const feet = inches / 12;
  
  return {
    feet: feet.toFixed(2),
    inches: inches.toFixed(2),
    pixels: pathLengthPx.toFixed(2)
  };
};