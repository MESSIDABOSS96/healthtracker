// src/features/pt/hooks.ts
//
// useLiveQuery wrappers around pt.svc — reactive reads for PT feature components.
// Consumers: PTSection (today's sessions + templates for status-slot rendering),
// PTSheet (template list), PTSessionForm (previous-session hint per row).
//
// Dependency-array rule (Pitfall #7): empty [] is correct because each query fn
// reads todayKey() internally or depends on an externally-tracked arg; the
// useLiveQuery observable refires on any write to the queried tables regardless.

import { useLiveQuery } from 'dexie-react-hooks';
import {
  getTemplates,
  getLastSessionForTemplate,
  getTodaySessions,
} from '@/services/pt.svc';
import { todayKey } from '@/lib/dayKey';

export function useTemplates() {
  return useLiveQuery(() => getTemplates(), []);
}

export function useLastSessionForTemplate(templateId: string, excludeSessionId?: string) {
  return useLiveQuery(
    () => getLastSessionForTemplate(templateId, excludeSessionId),
    [templateId, excludeSessionId],
  );
}

export function useTodayPTSessions() {
  return useLiveQuery(() => getTodaySessions(todayKey()), []);
}
