// src/services/pt.svc.ts
// PT template + session CRUD. All dayKey values are passed in by callers — services never call new Date() to derive a dayKey (Pitfall #4).
// Dexie single-statement puts/deletes auto-transaction; no explicit wrapper needed here (Pitfall #1).

import { db } from '@/db/db';
import type { PTTemplate, PTSession } from '@/db/schema';

// ------- Template CRUD -------

export function getTemplates(): Promise<PTTemplate[]> {
  return db.ptTemplates.orderBy('createdAt').toArray();
}

export async function createTemplate(
  input: Omit<PTTemplate, 'id' | 'createdAt'>,
): Promise<PTTemplate> {
  const template: PTTemplate = { id: crypto.randomUUID(), ...input, createdAt: Date.now() };
  await db.ptTemplates.put(template);
  return template;
}

export async function updateTemplate(template: PTTemplate): Promise<void> {
  await db.ptTemplates.put(template);
}

export async function deleteTemplate(id: string): Promise<void> {
  await db.ptTemplates.delete(id);
}

// ------- Session writes + reads -------

export async function saveSession(session: PTSession): Promise<void> {
  await db.ptSessions.put(session);
}

export function getTodaySessions(dayKey: string): Promise<PTSession[]> {
  return db.ptSessions.where('dayKey').equals(dayKey).sortBy('loggedAt');
}

/**
 * Return the most-recent session for a template, optionally excluding a session id
 * (used when editing the currently-open session — we want the *previous* one for comparison).
 * Uses the `templateId` index declared in db.ts:v1.
 */
export async function getLastSessionForTemplate(
  templateId: string,
  excludeSessionId?: string,
): Promise<PTSession | undefined> {
  const sessions = await db.ptSessions
    .where('templateId').equals(templateId)
    .reverse()
    .sortBy('loggedAt');
  return sessions.find(s => s.id !== excludeSessionId);
}

// ------- Session delete (Phase 3 — past-day delete from Day Detail) -------
// Single-statement Dexie delete auto-transactions (Pitfall #1 not applicable).

export async function deleteSession(id: string): Promise<void> {
  await db.ptSessions.delete(id);
}

// ------- Presentation helper (no DB access) -------

export function formatRelativeDays(loggedAt: number): string {
  const now = Date.now();
  const days = Math.floor((now - loggedAt) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}
