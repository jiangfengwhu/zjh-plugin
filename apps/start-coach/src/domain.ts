export type Outcome = 'first' | 'more' | 'none';
export type Step = { action: string; reason: string; message: string; durationSec: number; source: 'ai' | 'user' };
export type CompletedStep = { action: string; at: number };
export type Session = {
  id: string; task: string; step: Step | null; completedSteps: CompletedStep[]; note: string; taskDone: boolean; stuckAt: string;
  startedAt: number; plannedSec: number; elapsedSec: number; resumedAt: number | null;
  status: 'ready' | 'running' | 'paused' | 'checkin' | 'milestone' | 'confirm' | 'finished';
  firstConfirmed: boolean; outcome: Outcome | null; completedAt: number | null;
};
export function makeSession(task: string, now = Date.now()): Session {
  return { id: `start-${now}-${Math.random().toString(36).slice(2, 8)}`, task: task.trim().slice(0, 1000), step: null, completedSteps: [], note: '', taskDone: false, stuckAt: '', startedAt: now, plannedSec: 300, elapsedSec: 0, resumedAt: null, status: 'ready', firstConfirmed: false, outcome: null, completedAt: null };
}
export function elapsed(s: Session, now = Date.now()): number {
  const extra = s.status === 'running' && s.resumedAt !== null ? Math.max(0, (now - s.resumedAt) / 1000) : 0;
  return Math.min(s.plannedSec, Math.max(0, s.elapsedSec + extra));
}
export function start(s: Session, now = Date.now()): Session {
  if (!s.step) return s;
  return { ...s, plannedSec: Math.min(1000000000, s.elapsedSec + s.step.durationSec), resumedAt: now, status: 'running' };
}
export function pause(s: Session, now = Date.now()): Session { return { ...s, elapsedSec: elapsed(s, now), resumedAt: null, status: 'paused' }; }
export function resume(s: Session, now = Date.now()): Session { return { ...s, plannedSec: s.elapsedSec >= s.plannedSec ? Math.min(1000000000, s.elapsedSec + (s.step?.durationSec || 300)) : s.plannedSec, resumedAt: now, status: 'running' }; }
export function stop(s: Session, now = Date.now()): Session { return { ...pause(s, now), status: 'confirm' }; }
export function completeStep(s: Session, now = Date.now()): Session {
  if (!s.step || s.firstConfirmed || s.status === 'finished') return s;
  return { ...pause(s, now), status: 'milestone', firstConfirmed: true, completedSteps: [...s.completedSteps, { action: s.step.action, at: now }].slice(-60) };
}
export function nextStep(s: Session): Session { return { ...pause(s), status: 'ready', step: null, firstConfirmed: false }; }
export function finish(s: Session, note: string, confirmCurrent: boolean, now = Date.now()): Session {
  const current = confirmCurrent ? completeStep(s, now) : s;
  return { ...stop(current, now), status: 'finished', note: note.trim().slice(0, 1000), outcome: current.completedSteps.length > 1 ? 'more' : current.completedSteps.length ? 'first' : 'none', completedAt: now };
}
export function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
export function parseStep(raw: string): Step {
  const first = raw.indexOf('{'), last = raw.lastIndexOf('}');
  if (first < 0 || last <= first) throw new Error('回复格式不完整，请再试一次');
  const value = JSON.parse(raw.slice(first, last + 1));
  const action = typeof value.first_step === 'string' ? value.first_step.trim() : '';
  const reason = typeof value.why_easy === 'string' ? value.why_easy.trim() : '';
  const message = typeof value.coach_message === 'string' ? value.coach_message.trim() : '';
  if (!action || action.length > 120 || !reason || reason.length > 100 || message.length > 100 || /ADHD|疾病|疗效|执行功能障碍|必须坚持/i.test(action + reason + message)) throw new Error('没有找到合适的小动作，请再试一次');
  return { action, reason, message, durationSec: typeof value.duration_sec === 'number' && Number.isFinite(value.duration_sec) ? Math.round(Math.max(60, Math.min(900, value.duration_sec)) / 60) * 60 : 300, source: 'ai' | 'user' };
}
