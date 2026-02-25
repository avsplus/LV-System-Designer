import React from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { toast } from "sonner";
import ExportPDFDialog from "./ExportPDFDialog";
import EnrichConnectionsDialog from "./EnrichConnectionsDialog";
import ImportProductsDialog from "./ImportProductsDialog";
import RoomSelectDialog from "./RoomSelectDialog";

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
  canvasProducts, connections, rooms, floorplans, arrows, annotations,
  orgSettings,
  selectedFloorplanId, floorplans: fp,
  handleAddRoom, addProductToCanvas,
  projectData, queryClient
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
              if (engine === 'apitemplate') {
                const response = await base44.functions.invoke('apiTemplateService', {
                  action: 'generateInstallationPackage',
                  canvasProducts, connections, rooms, floorplans: exportFloorplans || [], arrows, annotations,
                  projectName: currentProject?.name || 'AV-System-Design',
                  clientName, location, orgSettings, exportType: exportType || 'installer'
                });
                if (response.data.download_url) {
                  window.open(response.data.download_url, '_blank');
                  toast.success('PDF generated successfully');
                } else {
                  throw new Error(response.data.error || 'No download URL returned');
                }
              } else {
                const response = await base44.functions.invoke('exportCanvasToPDF', {
                  canvasProducts, connections, rooms, floorplans: exportFloorplans || [], arrows, annotations,
                  projectName: currentProject?.name || 'AV-System-Design',
                  clientName, location, orgSettings, exportType: exportType || 'installer'
                });
                const base64 = response.data.pdf;
                const binaryString = atob(base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                const exportTypeNames = { installer: 'Installer-Package', client: 'Client-Proposal', documentation: 'Full-Documentation' };
                const blob = new Blob([bytes], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const fileName = `${currentProject?.name || 'AV-System-Design'}-${exportTypeNames[exportType] || 'Package'}.pdf`;
                const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                if (isSafari) {
                  const newWindow = window.open(url, '_blank');
                  if (!newWindow) window.location.href = url;
                } else {
                  const a = document.createElement('a');
                  a.href = url; a.download = fileName;
                  document.body.appendChild(a); a.click(); a.remove();
                }
                setTimeout(() => window.URL.revokeObjectURL(url), 5000);
                toast.success('PDF exported successfully');
              }
              setShowExportDialog(false);
            } catch (error) {
              toast.error('Failed to export PDF');
            }
            setIsExporting(false);
          }}
          onGenerateWireSchedule={async ({ canvasProducts: devices, connections: conns, projectName: pName, clientName: cName }) => {
            setIsExporting(true);
            try {
              const response = await base44.functions.invoke('exportCanvasToPDF', {
                action: 'generateWireSchedule', canvasProducts: devices, connections: conns,
                annotations, projectName: pName || currentProject?.name, clientName: cName, orgSettings
              });
              const base64 = response.data.pdf;
              const binaryString = atob(base64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
              const blob = new Blob([bytes], { type: 'application/pdf' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `${currentProject?.name || 'Project'}-Wire-Schedule.pdf`;
              document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove();
              toast.success('Wire schedule exported');
            } catch (error) {
              toast.error('Failed to export wire schedule');
            }
            setIsExporting(false);
          }}
          onGenerateBOM={async ({ canvasProducts: devices, connections: conns, projectName: pName, clientName: cName }) => {
            setIsExporting(true);
            try {
              const response = await base44.functions.invoke('exportCanvasToPDF', {
                action: 'generateBOM', canvasProducts: devices, connections: conns,
                annotations, projectName: pName || currentProject?.name, clientName: cName, orgSettings
              });
              const base64 = response.data.pdf;
              const binaryString = atob(base64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
              const blob = new Blob([bytes], { type: 'application/pdf' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `${currentProject?.name || 'Project'}-BOM.pdf`;
              document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove();
              toast.success('Bill of Materials exported');
            } catch (error) {
              toast.error('Failed to export BOM');
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
          products={[]}
          onEnrich={async (params) => {
            setShowEnrichDialog(false);
            try {
              const desc = params.mode === 'search' ? `${params.brand}${params.model ? ' ' + params.model : ''}` : params.category || 'all products';
              setEnrichmentProgress({ status: 'running', message: `Enriching ${desc}...` });
              const { data } = await base44.functions.invoke('enrichProductConnectionsV2', params);
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
              const { data } = await base44.functions.invoke('scrapeSnapAV', params);
              setImportProgress({ status: 'complete', imported: data.productsFound, skipped: data.skippedDuplicates || 0 });
              toast.success(`Imported ${data.productsFound} new products${data.skippedDuplicates ? `, skipped ${data.skippedDuplicates} duplicates` : ''}`);
              setTimeout(async () => {
                try {
                  setImportProgress(null);
                  setEnrichmentProgress({ status: 'running', message: `Enriching ${data.productsFound} products...` });
                  const enrichParams = params.mode === 'search' ? { mode: 'search', brand: params.brand, model: params.model } : { mode: 'category', category: params.category };
                  const { data: enrichData } = await base44.functions.invoke('enrichProductConnectionsV2', enrichParams);
                  setEnrichmentProgress({ status: 'complete', enriched: enrichData.enriched, total: enrichData.total });
                  toast.success(`Enriched ${enrichData.enriched} products with connection data!`);
                  await queryClient.invalidateQueries({ queryKey: ['avProducts'] });
                  setEnrichmentProgress(null);
                } catch (enrichError) {
                  setEnrichmentProgress(null);
                }
              }, 500);
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