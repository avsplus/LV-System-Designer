import React from 'react';
import ConnectionLine from './ConnectionLine';

/**
 * Renders all connection lines between canvas products.
 * Extracted from AVCanvas to reduce file size.
 */
export default function CanvasConnectionLayer({
  connections, canvasProducts, connectionPositions,
  hoveredConnectionIndex, highlightedConnections, selectedConnection,
  zoom, pan,
  handleRemoveConnection, handleConnectionClick,
  handleConnectionHover, handleConnectionLeave,
  setConnections,
  CARD_WIDTH, CARD_HEIGHT,
}) {
  const getProductEdgePoint = (fromId, toId, connectionIndex) => {
    const connection = connections[connectionIndex];
    if (!connection) return { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } };
    const { fromPoint, toPoint } = connectionPositions[connectionIndex] || {};
    if (fromPoint && toPoint) return { from: fromPoint, to: toPoint };
    const fromProduct = canvasProducts.find(cp => cp.instanceId === fromId);
    const toProduct = canvasProducts.find(cp => cp.instanceId === toId);
    if (!fromProduct || !toProduct) return { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } };
    const fromCenter = { x: fromProduct.position.x + CARD_WIDTH/2, y: fromProduct.position.y + CARD_HEIGHT/2 };
    const toCenter = { x: toProduct.position.x + CARD_WIDTH/2, y: toProduct.position.y + CARD_HEIGHT/2 };
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    const getEdgeIndices = (deviceId, edge) => {
      const indices = [];
      connections.forEach((c, idx) => {
        const isFD = c.from === deviceId, isTD = c.to === deviceId;
        if (!isFD && !isTD) return;
        const otherId = isFD ? c.to : c.from;
        const op = canvasProducts.find(cp => cp.instanceId === otherId);
        const dp = canvasProducts.find(cp => cp.instanceId === deviceId);
        if (!op || !dp) return;
        const oc = { x: op.position.x+CARD_WIDTH/2, y: op.position.y+CARD_HEIGHT/2 };
        const dc = { x: dp.position.x+CARD_WIDTH/2, y: dp.position.y+CARD_HEIGHT/2 };
        const cdx = oc.x-dc.x, cdy = oc.y-dc.y;
        let match = false;
        if (Math.abs(cdx)>Math.abs(cdy)) { if(edge==='right') match=cdx>0; if(edge==='left') match=cdx<0; }
        else { if(edge==='bottom') match=cdy>0; if(edge==='top') match=cdy<0; }
        if (match) indices.push(idx);
      });
      return indices.sort((a,b)=>a-b);
    };

    let fromEdge, toEdge;
    const off = (total, pos) => total > 1 ? ((pos - (total-1)/2) * 30) : 0;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        const fi = getEdgeIndices(fromId,'right'), ti = getEdgeIndices(toId,'left');
        fromEdge = { x: fromProduct.position.x+CARD_WIDTH, y: fromCenter.y+off(fi.length,fi.indexOf(connectionIndex)) };
        toEdge = { x: toProduct.position.x, y: toCenter.y+off(ti.length,ti.indexOf(connectionIndex)) };
      } else {
        const fi = getEdgeIndices(fromId,'left'), ti = getEdgeIndices(toId,'right');
        fromEdge = { x: fromProduct.position.x, y: fromCenter.y+off(fi.length,fi.indexOf(connectionIndex)) };
        toEdge = { x: toProduct.position.x+CARD_WIDTH, y: toCenter.y+off(ti.length,ti.indexOf(connectionIndex)) };
      }
    } else {
      if (dy > 0) {
        const fi = getEdgeIndices(fromId,'bottom'), ti = getEdgeIndices(toId,'top');
        fromEdge = { x: fromCenter.x+off(fi.length,fi.indexOf(connectionIndex)), y: fromProduct.position.y+CARD_HEIGHT };
        toEdge = { x: toCenter.x+off(ti.length,ti.indexOf(connectionIndex)), y: toProduct.position.y };
      } else {
        const fi = getEdgeIndices(fromId,'top'), ti = getEdgeIndices(toId,'bottom');
        fromEdge = { x: fromCenter.x+off(fi.length,fi.indexOf(connectionIndex)), y: fromProduct.position.y };
        toEdge = { x: toCenter.x+off(ti.length,ti.indexOf(connectionIndex)), y: toProduct.position.y+CARD_HEIGHT };
      }
    }
    return { from: fromEdge, to: toEdge };
  };

  const resolveEndpoints = (connection, index) => {
    const fromProduct = canvasProducts.find(cp => cp.instanceId === connection.from);
    const toProduct = canvasProducts.find(cp => cp.instanceId === connection.to);
    if (!fromProduct || !toProduct) return null;
    let { fromPoint, toPoint, fromEdge, toEdge } = connectionPositions[index] || {};
    if (!fromPoint || !toPoint || !fromEdge || !toEdge) {
      const fb = getProductEdgePoint(connection.from, connection.to, index);
      fromPoint = fromPoint || fb.from; toPoint = toPoint || fb.to;
      if (!fromEdge || !toEdge) {
        const dx = toProduct.position.x - fromProduct.position.x;
        const dy = toProduct.position.y - fromProduct.position.y;
        if (Math.abs(dx) > Math.abs(dy)) { fromEdge = dx>0?'right':'left'; toEdge = dx>0?'left':'right'; }
        else { fromEdge = dy>0?'bottom':'top'; toEdge = dy>0?'top':'bottom'; }
      }
    }
    if (!fromPoint || !toPoint) return null;
    return { fromPoint, toPoint, fromEdge, toEdge };
  };

  const renderLine = (connection, index, keyPrefix) => {
    const ep = resolveEndpoints(connection, index);
    if (!ep) return null;
    const isHighlighted = highlightedConnections.includes(index);
    return (
      <ConnectionLine
        key={`${keyPrefix}-${index}`}
        from={ep.fromPoint} to={ep.toPoint}
        fromEdge={ep.fromEdge} toEdge={ep.toEdge}
        connectionType={connection.type} wireId={connection.wireId}
        waypoints={connection.waypoints}
        isHighlighted={isHighlighted}
        isSelected={selectedConnection?.index === index}
        offset={0} zoom={zoom} pan={pan}
        onRemove={() => handleRemoveConnection(index)}
        onClick={() => handleConnectionClick(connection, index)}
        onHover={() => handleConnectionHover(index)}
        onLeave={handleConnectionLeave}
        onWaypointsChange={(newWaypoints) => {
          const nc = [...connections]; nc[index].waypoints = newWaypoints; setConnections(nc);
        }}
      />
    );
  };

  return (
    <>
      {connections.map((connection, index) => {
        if (index === hoveredConnectionIndex) return null;
        return renderLine(connection, index, 'conn');
      })}
      {hoveredConnectionIndex !== null && connections[hoveredConnectionIndex] &&
        renderLine(connections[hoveredConnectionIndex], hoveredConnectionIndex, 'hovered')
      }
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><polygon points="0 0, 10 3, 0 6" fill="#3b82f6" /></marker>
        <marker id="arrowhead-hover" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><polygon points="0 0, 10 3, 0 6" fill="#ef4444" /></marker>
      </defs>
    </>
  );
}