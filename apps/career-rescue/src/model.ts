import { useMemo, useSyncExternalStore } from 'react';
import { getAppContext } from '@zijinhua/app-sdk';
import { roles, questions, checklist, resources } from './content';
import { readSession, type InterviewSession } from './interview-model';
export const app = getAppContext();
export const data = app.scope('account');
export type Profile = { role: string; target: string; company: string; round: string; concern: string; name: string; background: string; experience: string; jd: string };
export type State = { profile: Profile; checked: string[]; answers: Record<string, string>; intro: string; saved: string[]; aiAllowed: boolean; plan: { context: string; text: string } | null; session: InterviewSession | null; history: InterviewSession[] };
const empty: State = { profile: { role: roles[0], target: '', company: '', round: '业务面', concern: '', name: '', background: '', experience: '', jd: '' }, checked: [], answers: {}, intro: '', saved: [], aiAllowed: false, plan: null, session: null, history: [] };
const key = 'career-rescue.v1';
export const owner = () => app.auth.getUser()?.id || 'guest';
export function readCareer(): State {
  try {
    const value = JSON.parse(data.storage.get(key) || 'null');
    if (!value || typeof value !== 'object') return empty;
    const text = (v: unknown, max = 8000) => typeof v === 'string' ? v.slice(0, max) : '';
    const p = value.profile || {};
    const answers: Record<string, string> = {};
    for (const question of questions) if (typeof value.answers?.[question.id] === 'string') answers[question.id] = text(value.answers[question.id]);
    return { profile: { role: (roles as readonly string[]).includes(p.role) ? p.role : roles[0], target: text(p.target, 80), company: text(p.company, 80), round: text(p.round, 40) || '业务面', concern: text(p.concern, 600), name: text(p.name, 40), background: text(p.background, 300), experience: text(p.experience, 4000), jd: text(p.jd, 6000) }, checked: Array.isArray(value.checked) ? [...new Set<string>(value.checked.filter((id: unknown) => checklist.some(item => item.id === id)))] : [], answers, intro: text(value.intro), saved: Array.isArray(value.saved) ? [...new Set<string>(value.saved.filter((id: unknown) => resources.some(item => item.id === id)))] : [], aiAllowed: value.aiAllowed === true, plan: typeof value.plan?.text === 'string' && typeof value.plan?.context === 'string' ? { context: text(value.plan.context, 14000), text: text(value.plan.text, 6000) } : null, session: readSession(value.session), history: Array.isArray(value.history) ? value.history.map(readSession).filter((s: InterviewSession | null): s is InterviewSession => !!s?.report).slice(0, 10) : [] };
  } catch { return empty; }
}
const snapshot = () => `${owner()}|${data.storage.get(key) || ''}`;
const subscribe = (listener: () => void) => { const a = data.storage.subscribe(key, listener), b = app.auth.subscribe(listener); return () => { a(); b(); }; };
export function useCareer() { const raw = useSyncExternalStore(subscribe, snapshot, snapshot); return useMemo(readCareer, [raw]); }
export function updateState(change: (state: State) => State, expectedOwner = owner()) { if (expectedOwner !== owner()) return; data.storage.set(key, JSON.stringify(change(readCareer()))); }
export const roleName = (p: Profile) => p.target.trim() || p.role;
export function aiProfile(p: Profile) { const { name, ...relevant } = p; return relevant; }
export const profileContext = (p: Profile) => JSON.stringify(aiProfile(p));
export function toggleCheck(id: string) { updateState(s => ({ ...s, checked: s.checked.includes(id) ? s.checked.filter(i => i !== id) : [...s.checked, id] })); app.haptics.trigger('selection'); }
export function draftIntro(p: Profile) {
  return `您好，我是${p.name || '［姓名］'}，${p.background || '来自［学校 / 专业 / 当前身份］'}，这次应聘${roleName(p) === roles[0] ? '［目标岗位］' : roleName(p) + '岗位'}。\n\n${p.experience.trim() ? `我想重点介绍一段经历：${p.experience.trim()}\n\n` : '在［真实项目 / 经历］中，我主要负责［任务］，通过［关键行动］，交付了［真实结果］。\n\n'}这段经历让我积累了［与岗位匹配的能力］，也让我发现自己很喜欢［具体工作］。我希望把这项能力用在贵公司的［具体业务］中。`;
}
export function copy(text: string) { app.clipboard.set(text); app.toast.show('已复制', 'success'); }
