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

const floorplanImageToCompactDataUrl = async (imageUrl) => {
  const source = String(imageUrl || '');
  if (!source) return '';
  if (source.startsWith('data:image/') && source.length <= 380000) return source;
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
    const maxWidth = 1600;
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
    const compressed = canvas.toDataURL('image/jpeg', 0.72);
    URL.revokeObjectURL(objectUrl);
    return compressed.length <= 420000 ? compressed : '';
  } catch {
    return source.startsWith('data:image/') && source.length <= 420000 ? source : '';
  }
};

const prepareFloorplansForCloudExport = async (floorplans = []) => {
  const prepared = [];
  for (const fp of floorplans) {
    const rawImage = fp?.url || fp?.image_url || '';
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
                const floorplansForCloud = await prepareFloorplansForCloudExport(exportFloorplans || floorplans);
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


