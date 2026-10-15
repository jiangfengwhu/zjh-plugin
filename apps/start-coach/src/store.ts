import { useMemo, useSyncExternalStore } from 'react';
import { getAppContext } from '@zijinhua/app-sdk';
import {
  type EnergyLevel,
  type Session,
  type Step,
  type Outcome,
  type Recording,
} from './domain';

export const app = getAppContext();
export const data = app.scope('account');
export const voiceFiles = app.scope('device').files;
const key = 'start-coach.v1';
export const owner = () => app.auth.getUser()?.id || 'guest';

export type Event = { type: string; at: number; source: string };
export type State = {
  draft: string;
  draftRecording: Recording | null;
  aiAllowed: boolean;
  reminders: boolean;
  source: string;
  session: Session | null;
  history: Session[];
  events: Event[];
};

const empty = (): State => ({
  draft: '',
  draftRecording: null,
  aiAllowed: false,
  reminders: false,
  source: 'direct',
  session: null,
  history: [],
  events: [],
});

const text = (v: unknown, max = 1000): string =>
  typeof v === 'string' ? v.slice(0, max) : '';
const number = (v: unknown, max: number) =>
  typeof v === 'number' && Number.isFinite(v)
    ? Math.max(0, Math.min(v, max))
    : 0;

function readRecording(v: any): Recording | null {
  return v &&
    typeof v.path === 'string' &&
    /^voice\/[a-zA-Z0-9_-]+\.wav$/.test(v.path) &&
    Number.isFinite(v.durationMs) &&
    v.durationMs > 0
    ? { path: v.path, durationMs: v.durationMs }
    : null;
}

function readStep(v: any): Step | null {
  if (!v || !['ai', 'user'].includes(v.source) || !text(v.action, 120))
    return null;
  return {
    action: text(v.action, 120),
    reason: text(v.reason, 100),
    message: text(v.message, 100),
    durationSec: Math.max(60, number(v.durationSec, 900) || 180),
    source: v.source,
  };
}

function readSession(v: any): Session | null {
  if (
    !v ||
    typeof v !== 'object' ||
    !text(v.id, 100) ||
    !text(v.task) ||
    ![
      'ready',
      'running',
      'paused',
      'checkin',
      'milestone',
      'confirm',
      'finished',
    ].includes(v.status)
  )
    return null;
  const step = readStep(v.step);
  if (v.step && !step) return null;
  const plannedSec = Math.max(60, number(v.plannedSec, 1000000000) || 180);
  const outcome = ['first', 'more', 'none'].includes(v.outcome)
    ? (v.outcome as Outcome)
    : null;
  const energy: EnergyLevel = ['low', 'mid', 'high'].includes(v.energy)
    ? (v.energy as EnergyLevel)
    : 'low';
  const resumedAt =
    typeof v.resumedAt === 'number' && Number.isFinite(v.resumedAt)
      ? number(v.resumedAt, 1e14)
      : null;
  const completedSteps = Array.isArray(v.completedSteps)
    ? v.completedSteps
        .filter((t: any) => t && text(t.action, 120) && Number.isFinite(t.at))
        .slice(-60)
        .map((t: any) => ({
          action: text(t.action, 120),
          at: number(t.at, 1e14),
        }))
    : [];
  return {
    id: text(v.id, 100),
    task: text(v.task),
    energy,
    recording: readRecording(v.recording) || undefined,
    taskDone: v.taskDone === true,
    stuckAt: text(v.stuckAt),
    step,
    completedSteps,
    note: text(v.note),
    startedAt: number(v.startedAt, 1e14),
    plannedSec,
    elapsedSec: number(v.elapsedSec, plannedSec),
    resumedAt,
    status: v.status === 'running' && resumedAt === null ? 'paused' : v.status,
    firstConfirmed: v.firstConfirmed === true,
    outcome,
    completedAt:
      typeof v.completedAt === 'number' ? number(v.completedAt, 1e14) : null,
  };
}

export function read(): State {
  try {
    const v = JSON.parse(data.storage.get(key) || 'null');
    if (!v || typeof v !== 'object') return empty();
    return {
      draft: text(v.draft),
      draftRecording: readRecording(v.draftRecording),
      aiAllowed: v.aiAllowed === true,
      reminders: v.reminders === true,
      source: /^[a-zA-Z0-9_-]{1,64}$/.test(v.source) ? v.source : 'direct',
      session: readSession(v.session),
      history: Array.isArray(v.history)
        ? v.history
            .map(readSession)
            .filter(
              (s: Session | null): s is Session =>
                !!s && s.status === 'finished' && !!s.outcome
            )
            .slice(0, 60)
        : [],
      events: Array.isArray(v.events)
        ? v.events
            .filter(
              (e: any) =>
                e && typeof e.type === 'string' && typeof e.at === 'number'
            )
            .slice(-200)
            .map((e: any) => ({
              type: text(e.type, 60),
              at: number(e.at, 1e14),
              source: text(e.source, 64),
            }))
        : [],
    };
  } catch {
    return empty();
  }
}

const snapshot = () => `${owner()}|${data.storage.get(key) || ''}`;
const subscribe = (listener: () => void) => {
  const a = data.storage.subscribe(key, listener),
    b = app.auth.subscribe(listener);
  return () => {
    a();
    b();
  };
};

export function useStore() {
  const raw = useSyncExternalStore(subscribe, snapshot, snapshot);
  return useMemo(read, [raw]);
}

const recordings = (s: State) =>
  new Set(
    [
      s.draftRecording?.path,
      s.session?.recording?.path,
      ...s.history.map((h) => h.recording?.path),
    ].filter((path): path is string => !!path)
  );

export function update(change: (s: State) => State, expectedOwner = owner()) {
  if (expectedOwner === owner()) {
    const previous = read(),
      next = change(previous);
    data.storage.set(key, JSON.stringify(next));
    const kept = recordings(next);
    for (const path of recordings(previous))
      if (!kept.has(path)) void voiceFiles.remove(path).catch(() => {});
  }
}

export function changeSession(
  id: string,
  change: (s: Session) => Session,
  expectedOwner = owner()
) {
  update(
    (s) => (s.session?.id === id ? { ...s, session: change(s.session) } : s),
    expectedOwner
  );
}

export function event(type: string, expectedOwner = owner()) {
  update(
    (s) => ({
      ...s,
      events: [...s.events, { type, at: Date.now(), source: s.source }].slice(
        -200
      ),
    }),
    expectedOwner
  );
}

export function clear(expectedOwner = owner()) {
  if (expectedOwner === owner()) {
    const paths = recordings(read());
    data.storage.remove(key);
    for (const path of paths) void voiceFiles.remove(path).catch(() => {});
  }
}

export function recordFinished(session: Session, expectedOwner = owner()) {
  update(
    (s) =>
      s.session?.id === session.id
        ? {
            ...s,
            session,
            history: [
              session,
              ...s.history.filter((h) => h.id !== session.id),
            ].slice(0, 60),
          }
        : s,
    expectedOwner
  );
  event(
    session.outcome === 'none'
      ? 'no_action_confirmed'
      : session.outcome === 'more'
      ? 'task_progress_confirmed'
      : 'first_action_confirmed',
    expectedOwner
  );
}
