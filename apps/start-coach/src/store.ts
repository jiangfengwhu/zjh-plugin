import { useMemo, useSyncExternalStore } from 'react';
import { getAppContext } from '@zijinhua/app-sdk';
import { type Session, type Step, type Outcome } from './domain';
export const app = getAppContext();
export const data = app.scope('account');
const key = 'start-coach.v1';
export const owner = () => app.auth.getUser()?.id || 'guest';
export type Event = { type: string; at: number; source: string };
export type State = { draft: string; aiAllowed: boolean; reminders: boolean; source: string; session: Session | null; history: Session[]; events: Event[] };
const empty = (): State => ({ draft: '', aiAllowed: false, reminders: false, source: 'direct', session: null, history: [], events: [] });
const text = (v: unknown, max = 1000): string => typeof v === 'string' ? v.slice(0, max) : '';
const number = (v: unknown, max: number) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(v, max)) : 0;
function readStep(v: any): Step | null {
  if (!v || v.source !== 'ai' || !text(v.action, 120)) return null;
  return { action: text(v.action, 120), reason: text(v.reason, 100), message: text(v.message, 100), durationSec: Math.max(60, number(v.durationSec, 900) || 300), source: 'ai' };
}
function readSession(v: any): Session | null {
  if (!v || typeof v !== 'object' || !text(v.id, 100) || !text(v.task) || !['ready', 'running', 'paused', 'milestone', 'confirm', 'finished'].includes(v.status)) return null;
  const step = readStep(v.step);
  if (v.step && !step) return null;
  const plannedSec = Math.max(60, number(v.plannedSec, 21600) || 300);
  const outcome = ['first', 'more', 'none'].includes(v.outcome) ? v.outcome as Outcome : null;
  const resumedAt = typeof v.resumedAt === 'number' && Number.isFinite(v.resumedAt) ? number(v.resumedAt, 1e14) : null;
  const completedSteps = Array.isArray(v.completedSteps) ? v.completedSteps.filter((t: any) => t && text(t.action, 120) && Number.isFinite(t.at)).slice(-60).map((t: any) => ({ action: text(t.action, 120), at: number(t.at, 1e14) })) : [];
  return { id: text(v.id, 100), task: text(v.task), step, completedSteps, note: text(v.note), startedAt: number(v.startedAt, 1e14), plannedSec, elapsedSec: number(v.elapsedSec, plannedSec), resumedAt, status: v.status === 'running' && resumedAt === null ? 'paused' : v.status, firstConfirmed: v.firstConfirmed === true, outcome, completedAt: typeof v.completedAt === 'number' ? number(v.completedAt, 1e14) : null };
}
export function read(): State {
  try {
    const v = JSON.parse(data.storage.get(key) || 'null'); if (!v || typeof v !== 'object') return empty();
    return { draft: text(v.draft), aiAllowed: v.aiAllowed === true, reminders: v.reminders === true, source: /^[a-zA-Z0-9_-]{1,64}$/.test(v.source) ? v.source : 'direct', session: readSession(v.session), history: Array.isArray(v.history) ? v.history.map(readSession).filter((s: Session | null): s is Session => !!s && s.status === 'finished' && !!s.outcome).slice(0, 60) : [], events: Array.isArray(v.events) ? v.events.filter((e: any) => e && typeof e.type === 'string' && typeof e.at === 'number').slice(-200).map((e: any) => ({ type: text(e.type, 60), at: number(e.at, 1e14), source: text(e.source, 64) })) : [] };
  } catch { return empty(); }
}
const snapshot = () => `${owner()}|${data.storage.get(key) || ''}`;
const subscribe = (listener: () => void) => { const a = data.storage.subscribe(key, listener), b = app.auth.subscribe(listener); return () => { a(); b(); }; };
export function useStore() { const raw = useSyncExternalStore(subscribe, snapshot, snapshot); return useMemo(read, [raw]); }
export function update(change: (s: State) => State, expectedOwner = owner()) { if (expectedOwner === owner()) data.storage.set(key, JSON.stringify(change(read()))); }
export function changeSession(id: string, change: (s: Session) => Session, expectedOwner = owner()) { update(s => s.session?.id === id ? { ...s, session: change(s.session) } : s, expectedOwner); }
export function event(type: string, expectedOwner = owner()) { update(s => ({ ...s, events: [...s.events, { type, at: Date.now(), source: s.source }].slice(-200) }), expectedOwner); }
export function clear(expectedOwner = owner()) { if (expectedOwner === owner()) data.storage.remove(key); }
export function recordFinished(session: Session, expectedOwner = owner()) {
  update(s => s.session?.id === session.id ? { ...s, session, history: [session, ...s.history.filter(h => h.id !== session.id)].slice(0, 60) } : s, expectedOwner);
  event(session.outcome === 'none' ? 'no_action_confirmed' : session.outcome === 'more' ? 'task_progress_confirmed' : 'first_action_confirmed', expectedOwner);
}
