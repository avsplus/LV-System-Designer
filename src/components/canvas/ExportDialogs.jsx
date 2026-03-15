import React from 'react';
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { toast } from "sonner";
import { exportProjectPdf, exportWireSchedulePdf, exportBomPdf } from "./pdfExport";
import ExportPDFDialog from "./ExportPDFDialog";
import EnrichConnectionsDialog from "./EnrichConnectionsDialog";
import ImportProductsDialog from "./ImportProductsDialog";
import RoomSelectDialog from "./RoomSelectDialog";
import { getSurveillanceSymbolDataUrl, isSurveillanceSymbol } from "./surveillanceSymbolArtwork";
import { getCoverageConePoints, getCoverageDistanceCanvasUnits, getSurveillanceCoverageSettings } from "./surveillanceCoverage";

const floorplanImageToCompactDataUrl = async (imageUrl) => {
  const source = String(imageUrl || '');
  if (!source) return '';
  if (source.startsWith('data:image/') && source.length <= 900000) return source;
  if (source.startsWith('blob:')) return '';
  try {
    const response = await fetch(source);
    if (!response.ok) return source;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objectUrl;
    });
    const maxWidth = 2400;
    const ratio = Math.min(1, maxWidth / Math.max(1, img.naturalWidth || img.width || 1));
    const width = Math.max(1, Math.round((img.naturalWidth || img.width) * ratio));
    const height = Math.max(1, Math.round((img.naturalHeight || img.height) * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      return source;
    }
    ctx.drawImage(img, 0, 0, width, height);
    const compressed = canvas.toDataURL('image/jpeg', 0.88);
    URL.revokeObjectURL(objectUrl);
    return compressed.length <= 1100000 ? compressed : '';
  } catch {
    return source.startsWith('data:image/') && source.length <= 1100000 ? source : '';
  }
};

const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = src;
  });

const toRgb = (color, fallback = [59, 130, 246]) => {
  if (Array.isArray(color) && color.length === 3) return color;
  const value = String(color || '').trim().toLowerCase();
  if (!value) return fallback;
  if (value.startsWith('#')) {
    const hex = value.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16)
      ];
    }
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
      ];
    }
  }
  return fallback;
};

const getFloorplanCanvasSize = (fp) => {
  const fpScale = Number(fp?.scale || 1);
  const hasCal = fp?.imageWidth && fp?.imageHeight && fp?.pixelsPerInch;
  if (hasCal) {
    const sf = (1 / Number(fp.pixelsPerInch || 1)) * fpScale;
    return {
      width: Number(fp.imageWidth) * sf,
      height: Number(fp.imageHeight) * sf
    };
  }
  if (fp?.imageWidth && fp?.imageHeight) {
    const width = 500 * fpScale;
    return {
      width,
      height: width * (Number(fp.imageHeight) / Math.max(1, Number(fp.imageWidth)))
    };
  }
  return { width: 500 * fpScale, height: 500 * fpScale };
};

const pointInFloorplan = (x, y, fp) => {
  const pos = fp?.position || { x: 0, y: 0 };
  const size = getFloorplanCanvasSize(fp);
  return (
    Number(x || 0) >= Number(pos.x || 0) &&
    Number(x || 0) <= Number(pos.x || 0) + size.width &&
    Number(y || 0) >= Number(pos.y || 0) &&
    Number(y || 0) <= Number(pos.y || 0) + size.height
  );
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const cropFloorplanFromCanvasCapture = async (floorplan, canvasCapture) => {
  if (!canvasCapture?.dataUrl || !canvasCapture?.viewportWidth || !canvasCapture?.viewportHeight) return '';

  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = canvasCapture.dataUrl;
  }).catch(() => null);

  if (!img) return '';

  const scaleX = img.width / Math.max(1, Number(canvasCapture.viewportWidth));
  const scaleY = img.height / Math.max(1, Number(canvasCapture.viewportHeight));
  const domRect = canvasCapture?.floorplanRects?.[floorplan?.id];
  const fpPos = floorplan?.position || { x: 0, y: 0 };
  const fpSize = getFloorplanCanvasSize(floorplan);
  const zoom = Number(canvasCapture.zoom || 1);
  const panX = Number(canvasCapture.pan?.x || 0);
  const panY = Number(canvasCapture.pan?.y || 0);

  const paddingPxX = domRect ? Math.max(18, domRect.width * 0.015) : Math.max(40, fpSize.width * zoom * 0.04);
  const paddingPxY = domRect ? Math.max(18, domRect.height * 0.015) : Math.max(40, fpSize.height * zoom * 0.04);

  const rawX = domRect
    ? (domRect.x - paddingPxX) * scaleX
    : (panX + Number(fpPos.x || 0) * zoom - paddingPxX) * scaleX;
  const rawY = domRect
    ? (domRect.y - paddingPxY) * scaleY
    : (panY + Number(fpPos.y || 0) * zoom - paddingPxY) * scaleY;
  const rawW = domRect
    ? (domRect.width + paddingPxX * 2) * scaleX
    : (fpSize.width * zoom + paddingPxX * 2) * scaleX;
  const rawH = domRect
    ? (domRect.height + paddingPxY * 2) * scaleY
    : (fpSize.height * zoom + paddingPxY * 2) * scaleY;

  const sx = clamp(rawX, 0, img.width);
  const sy = clamp(rawY, 0, img.height);
  const sw = clamp(rawW - Math.max(0, sx - rawX), 1, img.width - sx);
  const sh = clamp(rawH - Math.max(0, sy - rawY), 1, img.height - sy);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw));
  canvas.height = Math.max(1, Math.round(sh));
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
};

const renderFloorplanWithOverlays = async (
  floorplan,
  {
    canvasProducts = [],
    connections = [],
    annotations = [],
    arrows = [],
    rooms = []
  } = {}
) => {
  const source = String(floorplan?.url || floorplan?.image_url || '');
  if (!source) return '';

  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = source;
  }).catch(() => null);

  if (!img) return '';

  const width = Math.max(1, img.naturalWidth || img.width || 1600);
  const height = Math.max(1, img.naturalHeight || img.height || 900);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const drawRoundedRect = (x, y, w, h, r) => {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.beginPath();
    ctx.rect(x, y, w, h);
  };

  ctx.drawImage(img, 0, 0, width, height);

  const fpPos = floorplan?.position || { x: 0, y: 0 };
  const fpSize = getFloorplanCanvasSize(floorplan);
  const toPx = (canvasX, canvasY) => ({
    x: ((Number(canvasX || 0) - Number(fpPos.x || 0)) / Math.max(1, fpSize.width)) * width,
    y: ((Number(canvasY || 0) - Number(fpPos.y || 0)) / Math.max(1, fpSize.height)) * height
  });

  const roomFloorplanById = new Map((rooms || []).map((r) => [r.id, r?.floorplanId || null]));
  const productsOnFloorplan = (canvasProducts || []).filter((cp) => {
    const roomFloorplanId = roomFloorplanById.get(cp?.room);
    if (roomFloorplanId && roomFloorplanId === floorplan?.id) return true;
    return pointInFloorplan(cp?.position?.x, cp?.position?.y, floorplan);
  });
  const productIds = new Set(productsOnFloorplan.map((cp) => cp.instanceId));
  const positions = new Map((canvasProducts || []).map((cp) => [cp.instanceId, cp?.position || { x: 0, y: 0 }]));

  // Connections
  ctx.lineWidth = Math.max(1.2, width * 0.0015);
  (connections || []).forEach((conn) => {
    if (!productIds.has(conn?.from) || !productIds.has(conn?.to)) return;
    const from = positions.get(conn?.from);
    const to = positions.get(conn?.to);
    if (!from || !to) return;
    const p1 = toPx(from.x, from.y);
    const p2 = toPx(to.x, to.y);
    const type = String(conn?.type || '').toLowerCase();
    if (type.includes('ethernet')) ctx.strokeStyle = '#22c55e';
    else if (type.includes('speaker')) ctx.strokeStyle = '#b45309';
    else if (type.includes('hdmi')) ctx.strokeStyle = '#ef4444';
    else ctx.strokeStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  });

  // Arrows
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = Math.max(1.1, width * 0.0012);
  (arrows || []).forEach((arrow) => {
    const start = arrow?.start;
    const end = arrow?.end;
    if (!start || !end) return;
    if (!pointInFloorplan(start.x, start.y, floorplan) && !pointInFloorplan(end.x, end.y, floorplan)) return;
    const p1 = toPx(start.x, start.y);
    const p2 = toPx(end.x, end.y);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  });

  // Devices
  productsOnFloorplan.forEach((cp) => {
    const pos = cp?.position || { x: 0, y: 0 };
    const p = toPx(pos.x, pos.y);
    const label = String(cp?.label || `${cp?.product?.brand || 'Device'} ${cp?.product?.model || ''}`).trim();
    const boxW = Math.max(34, width * 0.03);
    const boxH = Math.max(24, height * 0.024);
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1.4;
    drawRoundedRect(p.x - boxW / 2, p.y - boxH / 2, boxW, boxH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `${Math.max(8, Math.round(width * 0.008))}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(label.slice(0, 14), p.x, p.y + boxH / 2 + 11);
  });

  // Annotations (including symbols)
  const fpAnnotations = (annotations || []).filter((ann) => ann?.floorplanId === floorplan?.id && !ann?.hidden);
  for (const ann of fpAnnotations) {
    const rgb = toRgb(ann?.color);
    const startCanvasX = Number(fpPos.x || 0) + Number(ann?.position?.x || 0) * fpSize.width;
    const startCanvasY = Number(fpPos.y || 0) + Number(ann?.position?.y || 0) * fpSize.height;
    const p = toPx(startCanvasX, startCanvasY);
    ctx.strokeStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    ctx.lineWidth = Math.max(1, Number(ann?.strokeWidth || 1));

    if (ann?.type === 'line' && ann?.endPosition) {
      const endCanvasX = Number(fpPos.x || 0) + Number(ann.endPosition.x || 0) * fpSize.width;
      const endCanvasY = Number(fpPos.y || 0) + Number(ann.endPosition.y || 0) * fpSize.height;
      const p2 = toPx(endCanvasX, endCanvasY);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      continue;
    }
    if (ann?.type === 'rectangle') {
      const rw = Number(ann?.width || 0) * width;
      const rh = Number(ann?.height || 0) * height;
      ann?.fill ? ctx.fillRect(p.x, p.y, rw, rh) : ctx.strokeRect(p.x, p.y, rw, rh);
      continue;
    }
    if (ann?.type === 'circle') {
      const rr = Number(ann?.radius || 0) * width;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
      ann?.fill ? ctx.fill() : ctx.stroke();
      continue;
    }
    if (ann?.type === 'text') {
      ctx.font = `${Math.max(10, Number(ann?.fontSize || 12))}px Arial`;
      ctx.textAlign = 'left';
      ctx.fillText(String(ann?.text || ''), p.x, p.y);
      continue;
    }

    if (ann?.type === 'symbol') {
      const symbolId = String(ann?.symbolId || '');
      if (isSurveillanceSymbol(symbolId)) {
        const coverage = getSurveillanceCoverageSettings(ann);
        if (coverage.coverageEnabled) {
          const coverageHeading = Number(ann?.rotation || 0) + Number(coverage.coverageRotationDeg || 0);
          const distancePx = getCoverageDistanceCanvasUnits(coverage.coverageDistanceFt, floorplan) * (width / Math.max(1, fpSize.width));
          ctx.save();
          ctx.beginPath();
          if (coverage.coverageAngle >= 359.5) {
            ctx.arc(p.x, p.y, distancePx, 0, Math.PI * 2);
          } else {
            const cone = getCoverageConePoints(p, coverageHeading, coverage.coverageAngle, distancePx);
            ctx.moveTo(cone.start.x, cone.start.y);
            ctx.lineTo(cone.left.x, cone.left.y);
            ctx.arc(p.x, p.y, distancePx, (coverageHeading - coverage.coverageAngle / 2) * Math.PI / 180, (coverageHeading + coverage.coverageAngle / 2) * Math.PI / 180);
            ctx.closePath();
          }
          ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${coverage.coverageOpacity})`;
          ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.min(0.65, coverage.coverageOpacity + 0.18)})`;
          ctx.lineWidth = Math.max(1, width * 0.0012);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
      if (isSurveillanceSymbol(symbolId)) {
        try {
          const icon = await loadImageElement(getSurveillanceSymbolDataUrl(symbolId, `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`));
          const scale = Math.max(0.5, Number(ann?.scale || 1));
          const size = Math.max(18, 60 * scale);
          ctx.save();
          ctx.translate(p.x, p.y);
          if (ann?.rotation) ctx.rotate((Number(ann.rotation) * Math.PI) / 180);
          ctx.scale(ann?.flipped ? -1 : 1, 1);
          ctx.drawImage(icon, -size / 2, -size / 2, size, size);
          ctx.restore();
          continue;
        } catch {
          // fall through to fallback badge
        }
      }
    }

    // Symbols/snapshots fallback marker
    const badge = String(ann?.label || ann?.symbolId || ann?.type || 'ANN');
    const bw = Math.max(36, width * 0.022);
    const bh = Math.max(24, height * 0.02);
    ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    drawRoundedRect(p.x - bw / 2, p.y - bh / 2, bw, bh, 6);
    ctx.fill();
    ctx.fillStyle = '#0b1220';
    ctx.font = `${Math.max(8, Math.round(width * 0.0075))}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(badge.slice(0, 8), p.x, p.y + 3);
  }

  return canvas.toDataURL('image/jpeg', 0.82);
};

const prepareFloorplansForCloudExport = async (floorplans = [], context = {}, canvasCapture = null) => {
  const prepared = [];
  for (const fp of floorplans) {
    const captured = canvasCapture ? await cropFloorplanFromCanvasCapture(fp, canvasCapture).catch(() => '') : '';
    const rendered = captured || await renderFloorplanWithOverlays(fp, context).catch(() => '');
    const rawImage = rendered || fp?.url || fp?.image_url || '';
    const compact = await floorplanImageToCompactDataUrl(rawImage);
    prepared.push({
      ...fp,
      url: compact || fp?.url || '',
      image_url: compact || fp?.image_url || ''
    });
  }
  return prepared;
};

export default function ExportDialogs({
  showExportDialog, setShowExportDialog,
  showEnrichDialog, setShowEnrichDialog,
  showImportDialog, setShowImportDialog,
  previewManual, setPreviewManual,
  pendingProductDrop, setPendingProductDrop,
  isExporting, setIsExporting,
  exportEngine, setExportEngine,
  enrichmentProgress, setEnrichmentProgress,
  importProgress, setImportProgress,
  currentProject,
  currentUserName,
  canvasProducts, connections, rooms, floorplans, arrows, annotations,
  orgSettings,
  captureCanvasForExport,
  selectedFloorplanId, floorplans: fp,
  handleAddRoom, addProductToCanvas,
  projectData, queryClient,
  products = []
}) {
  return (
    <>
      {showExportDialog && (
        <ExportPDFDialog
          open={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          projectName={currentProject?.name}
          projectId={currentProject?.id}
          isExporting={isExporting}
          exportEngine={exportEngine}
          onExportEngineChange={setExportEngine}
          canvasProducts={canvasProducts}
          connections={connections}
          rooms={rooms}
          floorplans={floorplans}
          arrows={arrows}
          onExport={async ({ clientName, location, engine, exportType, floorplans: exportFloorplans }) => {
            setIsExporting(true);
            try {
              const wirePricing = await appClient.listWirePricing().catch(() => []);
              if (engine === 'apitemplate') {
                const canvasCapture = captureCanvasForExport ? await captureCanvasForExport().catch(() => null) : null;
                const floorplansForCloud = await prepareFloorplansForCloudExport(exportFloorplans || floorplans, {
                  canvasProducts,
                  connections,
                  annotations,
                  arrows,
                  rooms
                }, canvasCapture);
                const result = await appClient.exportPdfCloud({
                  projectName: currentProject?.name || 'AV-System-Design',
                  clientName,
                  location,
                  preparedBy: currentUserName || '',
                  exportType: exportType || 'installer',
                  canvasProducts,
                  connections,
                  rooms,
                  floorplans: floorplansForCloud,
                  arrows,
                  annotations,
                  orgSettings,
                  wirePricing
                });
                window.open(result.download_url, '_blank', 'noopener,noreferrer');
              } else {
                await exportProjectPdf({
                  projectName: currentProject?.name || 'AV-System-Design',
                  clientName,
                  location,
                  exportType: exportType || 'installer',
                  canvasProducts,
                  connections,
                  rooms,
                  floorplans: exportFloorplans || floorplans,
                  arrows,
                  annotations,
                  orgSettings,
                  wirePricing
                });
              }
              toast.success('PDF exported successfully');
              setShowExportDialog(false);
            } catch (error) {
              console.error('PDF export failed:', error);
              toast.error(`Failed to export PDF: ${error?.message || 'Unknown error'}`);
            }
            setIsExporting(false);
          }}
          onGenerateWireSchedule={async ({ canvasProducts: devices, connections: conns, projectName: pName }) => {
            setIsExporting(true);
            try {
              exportWireSchedulePdf({
                projectName: pName || currentProject?.name,
                canvasProducts: devices,
                connections: conns
              });
              toast.success('Wire schedule exported');
            } catch (error) {
              console.error('Wire schedule export failed:', error);
              toast.error(`Failed to export wire schedule: ${error?.message || 'Unknown error'}`);
            }
            setIsExporting(false);
          }}
          onGenerateBOM={async ({ canvasProducts: devices, connections: conns, projectName: pName }) => {
            setIsExporting(true);
            try {
              exportBomPdf({
                projectName: pName || currentProject?.name,
                canvasProducts: devices
              });
              toast.success('Bill of Materials exported');
            } catch (error) {
              console.error('BOM export failed:', error);
              toast.error(`Failed to export BOM: ${error?.message || 'Unknown error'}`);
            }
            setIsExporting(false);
          }}
        />
      )}

      {showEnrichDialog && (
        <EnrichConnectionsDialog
          open={showEnrichDialog}
          onClose={() => setShowEnrichDialog(false)}
          isEnriching={enrichmentProgress?.status === 'running'}
          products={products}
          onCleanup={async () => appClient.cleanupProductConnections()}
          onEnrich={async (params) => {
            setShowEnrichDialog(false);
            try {
              const desc = params.mode === 'search' ? `${params.brand}${params.model ? ' ' + params.model : ''}` : params.category || 'all products';
              setEnrichmentProgress({ status: 'running', message: `Enriching ${desc}...` });
              const data = await appClient.enrichProductConnections(params);
              setEnrichmentProgress({ status: 'complete', enriched: data.enriched, total: data.total, failed: data.failed });
              toast.success(`Successfully enriched ${data.enriched} products with real connection data!`);
              await queryClient.invalidateQueries({ queryKey: ['avProducts'] });
            } catch (error) {
              const errorMsg = error.response?.data?.error || error.message;
              setEnrichmentProgress({ status: 'error', message: errorMsg });
              toast.error(`Enrichment failed: ${errorMsg}`);
              setTimeout(() => setEnrichmentProgress(null), 5000);
            }
          }}
        />
      )}

      {showImportDialog && (
        <ImportProductsDialog
          open={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          isImporting={importProgress?.status === 'running'}
          onImport={async (params) => {
            setShowImportDialog(false);
            try {
              const searchDesc = params.mode === 'search' ? `${params.brand}${params.model ? ' ' + params.model : ''}` : params.category;
              setImportProgress({ status: 'running', message: `Searching for ${searchDesc}...` });
              const data = await appClient.importProducts(params);
              const imported = Number(data.productsFound ?? data.imported ?? data.created ?? 0);
              const skipped = Number(data.skippedDuplicates ?? data.skipped ?? 0);
              setImportProgress({ status: 'complete', imported, skipped });
              toast.success(`Imported ${imported} new products${skipped ? `, skipped ${skipped} duplicates` : ''}`);
              await queryClient.invalidateQueries({ queryKey: ['avProducts'] });
              setTimeout(() => setImportProgress(null), 1200);
            } catch (error) {
              const errorMsg = error.response?.data?.error || error.message;
              setImportProgress({ status: 'error', message: errorMsg });
              toast.error(`Failed to import products: ${errorMsg}`);
              setTimeout(() => setImportProgress(null), 5000);
            }
          }}
        />
      )}

      {previewManual && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-5xl h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {previewManual.type === 'installation' ? 'Installation Manual' : 'User Manual'}
              </h3>
              <Button size="icon" variant="ghost" onClick={() => setPreviewManual(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 p-4">
              <iframe src={previewManual.url} className="w-full h-full rounded border border-gray-600" title="Manual" />
            </div>
            <div className="p-4 border-t border-gray-700 flex justify-end">
              <a href={previewManual.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Download className="w-4 h-4" />Open in New Tab
              </a>
            </div>
          </div>
        </div>
      )}

      {pendingProductDrop && (
        <RoomSelectDialog
          rooms={rooms}
          productName={`${pendingProductDrop.product.brand} ${pendingProductDrop.product.model}`}
          onSelect={(roomId) => {
            addProductToCanvas(pendingProductDrop.product, pendingProductDrop.position, roomId);
            setPendingProductDrop(null);
          }}
          onCancel={() => setPendingProductDrop(null)}
          onCreateRoom={(roomName) => {
            let targetFloorplanId = selectedFloorplanId;
            if (!targetFloorplanId && floorplans.length > 0) targetFloorplanId = floorplans[0].id;
            const newRoom = handleAddRoom(roomName, targetFloorplanId);
            return newRoom?.id;
          }}
        />
      )}
    </>
  );
}


