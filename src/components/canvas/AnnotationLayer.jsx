import React from 'react';
import SymbolRenderer from './SymbolRenderer';
import SymbolLegend from './SymbolLegend';
import SnapshotMarker from './SnapshotMarker';

/**
 * Renders all annotation DOM elements and SVG elements on the canvas.
 * Extracted to reduce AVCanvas file size.
 */
export default function AnnotationLayer({
  annotations, floorplans,
  selectedAnnotation, hoveredAnnotation,
  activeTool, isMobile,
  setSelectedAnnotation, setSelectedProduct, setSelectedCanvasProduct,
  setSelectedConnection, setShowFloorplanManager, setShowRoomManager,
  setSelectedFloorplanId, setPanelHistory, setHoveredAnnotation,
  handleSymbolAnnotationDragStart, handleAnnotationTouchStart, handleAnnotationTouchEnd,
  floorplanToCanvasCoords, drawingAnnotation,
  // Floorplan props
  resizingRef, resizeOffset, draggingFloorplan, floorplanDragStart, floorplanDragOffset,
  selectedFloorplanId, resizingFloorplan,
  handleFloorplanMouseDown, handleFloorplanClick, handleResizeStart,
  setFloorplans, setCurrentProject, currentProject, base44,
}) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none', overflow: 'visible' }}>
      {/* DOM annotations: symbols & snapshots */}
      {annotations.map((ann, idx) => {
        const isSelected = selectedAnnotation === idx;
        const isLocked = ann.locked && !isMobile;
        const fp = ann.floorplanId ? floorplans.find(f => f.id === ann.floorplanId) : null;
        if (ann.floorplanId && (!fp || !fp.visible)) return null;
        if (ann.hidden) return null;
        const canvasPos = fp ? floorplanToCanvasCoords(ann.position.x, ann.position.y, fp) : ann.position;

        const selectAnnotation = (e) => {
          if (activeTool !== 'select' || isLocked) return;
          e.stopPropagation();
          setSelectedAnnotation(idx);
          setSelectedProduct(null); setSelectedCanvasProduct(null); setSelectedConnection(null);
          setShowFloorplanManager(false); setShowRoomManager(false); setSelectedFloorplanId(null);
          setPanelHistory([{ panel: 'annotationDetails', index: idx }]);
          if (!isMobile) handleSymbolAnnotationDragStart(e, idx);
        };

        const touchAnnotation = (e) => {
          if (activeTool !== 'select' || isLocked) return;
          e.stopPropagation();
          setSelectedAnnotation(idx);
          setSelectedProduct(null); setSelectedCanvasProduct(null); setSelectedConnection(null);
          setShowFloorplanManager(false); setShowRoomManager(false); setSelectedFloorplanId(null);
          setPanelHistory([{ panel: 'annotationDetails', index: idx }]);
          handleAnnotationTouchStart(e, idx);
        };

        if (ann.type === 'symbol') {
          const symbolSize = 120;
          return (
            <div key={ann.id}
              className={isLocked ? 'cursor-not-allowed' : 'cursor-move'}
              onMouseEnter={() => !isLocked && setHoveredAnnotation(idx)}
              onMouseLeave={() => setHoveredAnnotation(null)}
              onMouseDown={(e) => { if (activeTool !== 'select' || isLocked) return; e.preventDefault(); selectAnnotation(e); }}
              onClick={(e) => { if (activeTool !== 'select' || isLocked) return; e.preventDefault(); e.stopPropagation(); }}
              onTouchStart={touchAnnotation}
              onTouchEnd={handleAnnotationTouchEnd}
              style={{ position: 'absolute', left: `${canvasPos.x}px`, top: `${canvasPos.y}px`, width: `${symbolSize}px`, height: `${symbolSize}px`, transform: 'translate(-50%, -50%)', zIndex: 1200, pointerEvents: 'auto' }}
            >
              <svg width="100%" height="100%" viewBox="-60 -60 120 120" style={{ overflow: 'visible', display: 'block' }}>
                <SymbolRenderer symbolId={ann.symbolId} position={{ x: 0, y: 0 }} color={isSelected ? '#ef4444' : (ann.color || '#3b82f6')} scale={ann.scale || 1} rotation={ann.rotation || 0} flipped={ann.flipped || false} />
              </svg>
            </div>
          );
        }

        if (ann.type === 'snapshot') {
          return (
            <SnapshotMarker
              key={ann.id}
              annotation={ann}
              canvasPos={canvasPos}
              isSelected={isSelected}
              isHovered={hoveredAnnotation === idx}
              scale={ann.scale || 1}
              onMouseDown={(e) => {
                if (activeTool !== 'select' || isLocked) return;
                e.stopPropagation();
                setSelectedAnnotation(idx);
                setSelectedProduct(null); setSelectedCanvasProduct(null); setSelectedConnection(null);
                setShowFloorplanManager(false); setShowRoomManager(false); setSelectedFloorplanId(null);
                setPanelHistory([{ panel: 'annotationDetails', index: idx }]);
                handleSymbolAnnotationDragStart(e, idx);
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onTouchStart={touchAnnotation}
              onTouchEnd={handleAnnotationTouchEnd}
            />
          );
        }

        return null;
      })}

      {/* SVG annotations */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 1200 }}>
        {annotations.map((ann, idx) => {
          const isHovered = hoveredAnnotation === idx;
          const isSelected = selectedAnnotation === idx;
          const strokeColor = isHovered || isSelected ? '#ef4444' : ann.color;
          const fp = ann.floorplanId ? floorplans.find(f => f.id === ann.floorplanId) : null;
          if (ann.floorplanId && (!fp || !fp.visible)) return null;
          if (ann.hidden) return null;
          const canvasPos = fp ? floorplanToCanvasCoords(ann.position.x, ann.position.y, fp) : ann.position;
          const isLocked = ann.locked && !isMobile;

          const onClick = (e) => {
            if (activeTool !== 'select' || isLocked) return;
            e.stopPropagation();
            setSelectedAnnotation(idx);
            setSelectedProduct(null); setSelectedCanvasProduct(null); setSelectedConnection(null);
            setShowFloorplanManager(false); setShowRoomManager(false); setSelectedFloorplanId(null);
            setPanelHistory([{ panel: 'annotationDetails', index: idx }]);
            if (!isMobile) handleSymbolAnnotationDragStart(e, idx);
          };
          const onTouch = (e) => {
            if (activeTool !== 'select' || isLocked) return;
            e.stopPropagation();
            setSelectedAnnotation(idx);
            setSelectedProduct(null); setSelectedCanvasProduct(null); setSelectedConnection(null);
            setShowFloorplanManager(false); setShowRoomManager(false); setSelectedFloorplanId(null);
            setPanelHistory([{ panel: 'annotationDetails', index: idx }]);
            handleAnnotationTouchStart(e, idx);
          };

          if (ann.type === 'symbol' || ann.type === 'snapshot') return null;

          if (ann.type === 'text') {
            return (
              <text key={ann.id} x={canvasPos.x} y={canvasPos.y} fill={ann.color} fontSize={ann.fontSize} fontWeight="500"
                className={`pointer-events-auto select-none ${isLocked ? 'cursor-not-allowed' : 'cursor-move'}`}
                onMouseEnter={() => !isLocked && setHoveredAnnotation(idx)} onMouseLeave={() => setHoveredAnnotation(null)}
                onMouseDown={onClick} onTouchStart={onTouch} onTouchEnd={handleAnnotationTouchEnd}
              >{ann.text}</text>
            );
          }

          if (ann.type === 'rectangle') {
            const fpScale = fp?.scale || 1;
            const hasCalibration = fp?.imageWidth && fp?.imageHeight && fp?.pixelsPerInch;
            let fpWidth = hasCalibration ? fp.imageWidth * (1/fp.pixelsPerInch) * fpScale : 500 * fpScale;
            let fpHeight = hasCalibration ? fp.imageHeight * (1/fp.pixelsPerInch) * fpScale : (fp?.imageHeight ? fpWidth * (fp.imageHeight/fp.imageWidth) : 500*fpScale);
            const cw = fp ? ann.width * fpWidth : (ann.width || 0);
            const ch = fp ? ann.height * fpHeight : (ann.height || 0);
            return (
              <g key={ann.id}>
                <rect x={canvasPos.x-10} y={canvasPos.y-10} width={cw+20} height={ch+20} fill="transparent" className={`pointer-events-auto ${isLocked?'cursor-not-allowed':'cursor-move'}`} onMouseEnter={()=>!isLocked&&setHoveredAnnotation(idx)} onMouseLeave={()=>setHoveredAnnotation(null)} onMouseDown={onClick} onTouchStart={onTouch} onTouchEnd={handleAnnotationTouchEnd} />
                <rect x={canvasPos.x} y={canvasPos.y} width={cw} height={ch} stroke={strokeColor} strokeWidth={ann.strokeWidth} fill={ann.fill?ann.color:'none'} fillOpacity={ann.fill?0.3:0} className="pointer-events-none" />
              </g>
            );
          }

          if (ann.type === 'circle') {
            const fpScale = fp?.scale || 1;
            const hasCalibration = fp?.imageWidth && fp?.imageHeight && fp?.pixelsPerInch;
            let fpWidth = hasCalibration ? fp.imageWidth * (1/fp.pixelsPerInch) * fpScale : 500 * fpScale;
            const cr = fp ? ann.radius * fpWidth : (ann.radius || 0);
            return (
              <g key={ann.id}>
                <circle cx={canvasPos.x} cy={canvasPos.y} r={cr+10} fill="transparent" className={`pointer-events-auto ${isLocked?'cursor-not-allowed':'cursor-move'}`} onMouseEnter={()=>!isLocked&&setHoveredAnnotation(idx)} onMouseLeave={()=>setHoveredAnnotation(null)} onMouseDown={onClick} onTouchStart={onTouch} onTouchEnd={handleAnnotationTouchEnd} />
                <circle cx={canvasPos.x} cy={canvasPos.y} r={cr} stroke={strokeColor} strokeWidth={ann.strokeWidth} fill={ann.fill?ann.color:'none'} fillOpacity={ann.fill?0.3:0} className="pointer-events-none" />
              </g>
            );
          }

          if (ann.type === 'line' && ann.endPosition) {
            const endPos = fp ? floorplanToCanvasCoords(ann.endPosition.x, ann.endPosition.y, fp) : ann.endPosition;
            return (
              <g key={ann.id}>
                <line x1={canvasPos.x} y1={canvasPos.y} x2={endPos.x} y2={endPos.y} stroke={strokeColor} strokeWidth={isHovered||isSelected?ann.strokeWidth+1:ann.strokeWidth} className="pointer-events-none" />
                <line x1={canvasPos.x} y1={canvasPos.y} x2={endPos.x} y2={endPos.y} stroke="transparent" strokeWidth="40" className={`pointer-events-auto ${isLocked?'cursor-not-allowed':'cursor-move'}`} onMouseEnter={()=>!isLocked&&setHoveredAnnotation(idx)} onMouseLeave={()=>setHoveredAnnotation(null)} onMouseDown={onClick} onTouchStart={onTouch} onTouchEnd={handleAnnotationTouchEnd} />
              </g>
            );
          }

          return null;
        })}

        {/* Drawing preview */}
        {drawingAnnotation && drawingAnnotation.type !== 'symbol' && (() => {
          const fp = floorplans.find(f => f.id === drawingAnnotation.floorplanId);
          if (!fp) return null;
          const sp = floorplanToCanvasCoords(drawingAnnotation.position.x, drawingAnnotation.position.y, fp);
          const fpScale = fp.scale || 1;
          const hasCalib = fp.imageWidth && fp.imageHeight && fp.pixelsPerInch;
          const fpW = hasCalib ? fp.imageWidth * (1/fp.pixelsPerInch) * fpScale : 500 * fpScale;
          const fpH = hasCalib ? fp.imageHeight * (1/fp.pixelsPerInch) * fpScale : (fp.imageHeight ? fpW*(fp.imageHeight/fp.imageWidth) : 500*fpScale);
          return (
            <g>
              {drawingAnnotation.type === 'rectangle' && drawingAnnotation.width && <rect x={sp.x} y={sp.y} width={drawingAnnotation.width*fpW} height={drawingAnnotation.height*fpH} stroke={drawingAnnotation.color} strokeWidth={drawingAnnotation.strokeWidth} fill={drawingAnnotation.fill?drawingAnnotation.color:'none'} fillOpacity={drawingAnnotation.fill?0.3:0} strokeDasharray="8,4" className="pointer-events-none" opacity="0.8" />}
              {drawingAnnotation.type === 'circle' && drawingAnnotation.radius && <circle cx={sp.x} cy={sp.y} r={drawingAnnotation.radius*fpW} stroke={drawingAnnotation.color} strokeWidth={drawingAnnotation.strokeWidth} fill={drawingAnnotation.fill?drawingAnnotation.color:'none'} fillOpacity={drawingAnnotation.fill?0.3:0} strokeDasharray="8,4" className="pointer-events-none" opacity="0.8" />}
              {drawingAnnotation.type === 'line' && drawingAnnotation.endPosition && (() => { const ep = floorplanToCanvasCoords(drawingAnnotation.endPosition.x, drawingAnnotation.endPosition.y, fp); return <line x1={sp.x} y1={sp.y} x2={ep.x} y2={ep.y} stroke={drawingAnnotation.color} strokeWidth={drawingAnnotation.strokeWidth} strokeDasharray="8,4" className="pointer-events-none" opacity="0.8" />; })()}
            </g>
          );
        })()}
      </svg>

      {/* Floorplan images */}
      {floorplans.filter(fp => fp.visible).map((fp, index) => {
        const isThisResizing = resizingRef.current?.id === fp.id;
        const currentScale = isThisResizing ? resizeOffset.scale : ((typeof fp.scale==='number'&&!isNaN(fp.scale)&&fp.scale>0)?fp.scale:1);
        const safePos = { x: (typeof fp.position?.x==='number'&&!isNaN(fp.position.x))?fp.position.x:100, y: (typeof fp.position?.y==='number'&&!isNaN(fp.position.y))?fp.position.y:100 };
        const pos = isThisResizing ? resizeOffset.position : safePos;
        const hasCalib = fp.imageWidth && fp.imageHeight && fp.pixelsPerInch;
        const hasDim = fp.imageWidth && fp.imageHeight;
        let dW, dH;
        if (hasDim) { dW = hasCalib ? fp.imageWidth*(1/fp.pixelsPerInch)*currentScale : 500*currentScale; dH = dW*(fp.imageHeight/fp.imageWidth); }
        else { dW = 500*currentScale; dH = 500*currentScale; }
        const isDragging = draggingFloorplan === fp.id;
        const curX = isDragging && floorplanDragStart ? floorplanDragOffset.x : pos.x;
        const curY = isDragging && floorplanDragStart ? floorplanDragOffset.y : pos.y;
        const isSel = selectedFloorplanId === fp.id;

        return (
          <div key={fp.id} data-floorplan="true" data-floorplan-id={fp.id} onMouseDown={(e) => handleFloorplanMouseDown(e, fp.id)} onClick={(e) => handleFloorplanClick(e, fp.id)}
            style={{ position:'absolute', top:`${curY}px`, left:`${curX}px`, width:`${dW}px`, height:`${dH}px`, pointerEvents:'auto', cursor:isDragging?'grabbing':'grab', outline:isSel?'3px solid #3b82f6':'none', outlineOffset:isSel?'4px':'0', boxShadow:isSel?'0 0 20px rgba(59,130,246,0.5)':'none', zIndex:isSel?1000:index, transition:isDragging||resizingFloorplan?.id===fp.id?'none':'all 0.2s ease', flexShrink:0, overflow:'visible', backgroundColor:'#000' }}
          >
            <img src={fp.url} alt={fp.name} onLoad={(e) => { if (!fp.imageWidth||!fp.imageHeight) { const u = floorplans.map(f=>f.id===fp.id?{...f,imageWidth:e.target.naturalWidth,imageHeight:e.target.naturalHeight}:f); setFloorplans(u); if (currentProject?.id) { setCurrentProject(c=>({...c,floorplans:u})); base44.entities.AVProject.update(currentProject.id,{floorplans:u}).catch(()=>{}); } } }} style={{ width:'100%', height:'100%', opacity:fp.opacity, filter:fp.locked?'brightness(0.8)':'none', display:'block', pointerEvents:'none' }} />
            {isSel && !fp.locked && (
              <>
                {['nw','ne','sw','se'].map(corner => {
                  const isTop = corner.startsWith('n'), isLeft = corner.endsWith('w');
                  return <div key={corner} data-resize-handle={corner} onMouseDown={(e)=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();handleResizeStart(e,fp.id,corner);}} style={{ position:'absolute', ...(isTop?{top:'-6px'}:{bottom:'-6px'}), ...(isLeft?{left:'-6px'}:{right:'-6px'}), width:'12px', height:'12px', cursor:`${corner}-resize`, zIndex:1003, background:'#3b82f6', border:'2px solid white', borderRadius:'50%', boxShadow:'0 2px 8px rgba(0,0,0,0.3)' }} />;
                })}
              </>
            )}
          </div>
        );
      })}

      {/* Symbol legends */}
      {floorplans.filter(fp => fp.visible).map(floorplan => {
        const fpPos = floorplan.position || { x: 0, y: 0 };
        const fpScale = floorplan.scale || 1;
        const hasCalib = floorplan.imageWidth && floorplan.imageHeight && floorplan.pixelsPerInch;
        const fpW = hasCalib ? floorplan.imageWidth*(1/floorplan.pixelsPerInch)*fpScale : 500*fpScale;
        const fpH = hasCalib ? floorplan.imageHeight*(1/floorplan.pixelsPerInch)*fpScale : (floorplan.imageHeight ? fpW*(floorplan.imageHeight/floorplan.imageWidth) : 500*fpScale);
        return (
          <div key={floorplan.id} style={{ position:'absolute', left:`${fpPos.x+20}px`, top:`${fpPos.y+fpH-20}px`, transform:'translateY(-100%)', transformOrigin:'bottom left', pointerEvents:'auto', zIndex:1000 }}>
            <SymbolLegend annotations={annotations} floorplans={floorplans} floorplanId={floorplan.id} />
          </div>
        );
      })}
    </div>
  );
}