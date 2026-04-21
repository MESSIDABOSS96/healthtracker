// src/features/pt/PTSheet.tsx
//
// PT Sheet composer — switches between template-list mode and session-logging
// mode, and hosts the template editor as a nested Sheet (D-10). Radix Dialog
// manages stacking natively; the parent PT Sheet stays mounted while the
// nested editor is open.
//
// Phase 3 additive: optional `editSession` prop — when provided, skips list
// mode and mounts PTSessionForm in edit mode with the session's template
// pre-resolved. Honors UI-SPEC:246 (tap past-day PT row → open PTSheet in
// edit mode, reuses saveSession upsert-by-id).
//
// Loading contract per UI-SPEC §Loading States: while useTemplates returns
// undefined, render nothing (IndexedDB reads resolve in < 16ms — a spinner
// would flash and disappear faster than perception).

import { useState } from 'react';
import { useTemplates } from './hooks';
import { PTTemplateList } from './PTTemplateList';
import { PTSessionForm } from './PTSessionForm';
import { PTTemplateEditor } from './PTTemplateEditor';
import type { PTSession, PTTemplate } from '@/db/schema';

interface PTSheetProps {
  onClose: () => void;
  editSession?: PTSession;
}

export function PTSheet({ onClose, editSession }: PTSheetProps) {
  const templates = useTemplates();

  // When editing a past session, skip list mode — start directly in session mode
  // with the session's template. If editSession is undefined, preserve Phase 2
  // behavior: start in list mode, pick a template to begin a new session.
  const [mode, setMode] = useState<'list' | 'session'>(editSession ? 'session' : 'list');
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

  // Resolve the template for edit mode AFTER templates load (so edit mode
  // doesn't silently fall through to undefined — a missing template means the
  // template was deleted after the session was logged; we gracefully fall back
  // to list mode, preserving the session read in DayDetail).
  const editTemplate = editSession
    ? templates.find((t) => t.id === editSession.templateId)
    : undefined;
  const effectiveMode: 'list' | 'session' =
    editSession && !editTemplate ? 'list' : mode;
  const effectiveTemplate =
    editSession && editTemplate ? editTemplate : selectedTemplate;

  return (
    <>
      {effectiveMode === 'list' && (
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
      {effectiveMode === 'session' && effectiveTemplate && (
        <PTSessionForm
          template={effectiveTemplate}
          onClose={onClose}
          editSession={editSession}
        />
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
