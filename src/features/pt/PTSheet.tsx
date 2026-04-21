// src/features/pt/PTSheet.tsx
//
// PT Sheet composer — switches between template-list mode and session-logging
// mode, and hosts the template editor as a nested Sheet (D-10). Radix Dialog
// manages stacking natively; the parent PT Sheet stays mounted while the
// nested editor is open.
//
// Loading contract per UI-SPEC §Loading States: while useTemplates returns
// undefined, render nothing (IndexedDB reads resolve in < 16ms — a spinner
// would flash and disappear faster than perception).

import { useState } from 'react';
import { useTemplates } from './hooks';
import { PTTemplateList } from './PTTemplateList';
import { PTSessionForm } from './PTSessionForm';
import { PTTemplateEditor } from './PTTemplateEditor';
import type { PTTemplate } from '@/db/schema';

interface PTSheetProps {
  onClose: () => void;
}

export function PTSheet({ onClose }: PTSheetProps) {
  const templates = useTemplates();
  const [mode, setMode] = useState<'list' | 'session'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<PTTemplate | undefined>(
    undefined,
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'new' | 'edit'>('new');
  const [editingTemplate, setEditingTemplate] = useState<PTTemplate | undefined>(
    undefined,
  );

  if (templates === undefined) {
    // Silent loading — render an empty div so the Sheet slot still exists.
    return <div />;
  }

  return (
    <>
      {mode === 'list' && (
        <PTTemplateList
          templates={templates}
          onStartSession={(t) => {
            setSelectedTemplate(t);
            setMode('session');
          }}
          onEditTemplate={(t) => {
            setEditingTemplate(t);
            setEditorMode('edit');
            setEditorOpen(true);
          }}
          onNewTemplate={() => {
            setEditingTemplate(undefined);
            setEditorMode('new');
            setEditorOpen(true);
          }}
        />
      )}
      {mode === 'session' && selectedTemplate && (
        <PTSessionForm template={selectedTemplate} onClose={onClose} />
      )}
      <PTTemplateEditor
        open={editorOpen}
        mode={editorMode}
        template={editingTemplate}
        onClose={() => setEditorOpen(false)}
      />
    </>
  );
}
