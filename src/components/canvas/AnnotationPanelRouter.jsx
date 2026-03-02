import React from 'react';
import AnnotationDetailsPanel from "./AnnotationDetailsPanel";
import SnapshotDetailsPanel from "./SnapshotDetailsPanel";

export default function AnnotationPanelRouter({ annotations, connections = [], selectedAnnotation, onClose, onUpdate, onDelete, onDuplicate, connectionTypeOptions = [] }) {
  if (selectedAnnotation === null || !annotations[selectedAnnotation]) return null;

  const annotation = annotations[selectedAnnotation];
  const usedWireIdsByOtherSymbols = Array.from(
    new Set(
      (annotations || [])
        .flatMap((item, idx) => (idx === selectedAnnotation ? [] : (item?.specs?.portTypes || [])))
        .filter((v) => typeof v === "string")
        .map((v) => v.trim())
        .filter((v) => /^[A-Za-z]\d{3,}$/.test(v))
    )
  );
  const symbolEndpointId = annotation?.id ? `ann:${annotation.id}` : null;
  const lockedPortAssignments = {};
  const parsePortIndex = (value) => {
    const m = String(value || '').match(/^Port\s+(\d+)$/i);
    return m ? Number(m[1]) : null;
  };
  if (symbolEndpointId) {
    (connections || []).forEach((c) => {
      // Uplink: device -> symbol
      if (c?.to === symbolEndpointId) {
        const idx = parsePortIndex(c?.toPort);
        if (idx) {
          lockedPortAssignments[`Port ${idx}`] = c?.wireId || lockedPortAssignments[`Port ${idx}`];
        }
      }
      // Downstream: symbol -> device (fallback to parent wire lineage)
      if (c?.from === symbolEndpointId) {
        const idx = parsePortIndex(c?.fromPort);
        if (idx && !lockedPortAssignments[`Port ${idx}`]) {
          lockedPortAssignments[`Port ${idx}`] = c?.parentWireId || c?.wireId || lockedPortAssignments[`Port ${idx}`];
        }
      }
    });
  }

  if (annotation.type === 'snapshot') {
    return (
      <SnapshotDetailsPanel
        annotation={annotation}
        index={selectedAnnotation}
        onClose={onClose}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
      />
    );
  }

  return (
    <AnnotationDetailsPanel
      annotation={annotation}
      index={selectedAnnotation}
      onClose={onClose}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      connectionTypeOptions={connectionTypeOptions}
      unavailableWireIds={usedWireIdsByOtherSymbols}
      lockedPortAssignments={lockedPortAssignments}
    />
  );
}
