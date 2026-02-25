import React from 'react';
import AnnotationDetailsPanel from "./AnnotationDetailsPanel";
import SnapshotDetailsPanel from "./SnapshotDetailsPanel";

export default function AnnotationPanelRouter({ annotations, selectedAnnotation, onClose, onUpdate, onDelete, onDuplicate }) {
  if (selectedAnnotation === null || !annotations[selectedAnnotation]) return null;

  const annotation = annotations[selectedAnnotation];

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
    />
  );
}