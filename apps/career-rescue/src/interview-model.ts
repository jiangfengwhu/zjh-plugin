import type { Profile } from './model';
import { questions, type Question } from './content';

export type Feedback = { evidence: string; good: string; gap: string; example: string };
export type Turn = { title: string; hint: string; kind: string; answer: string; feedback: Feedback | null };
export type Report = { strength: string; priorities: { turnIndex: number; issue: string; action: string }[]; reminder: string };
export type Revision = { turnIndex: number; answer: string; comparison: string };
export type InterviewSession = { id: string; createdAt: number; profile: Profile; turns: Turn[]; index: number; followedUp: boolean; finished: boolean; report: Report | null; revision: Revision | null };

const text = (v: unknown, max = 4000): string => typeof v === 'string' ? v.slice(0, max) : '';
function object(v: unknown): Record<string, any> { return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : {}; }
export function readSession(value: unknown): InterviewSession | null {
  const s = object(value), p = object(s.profile);
  if (!text(s.id) || !Number.isFinite(s.createdAt) || !Array.isArray(s.turns) || !s.turns.length || !Number.isInteger(s.index) || s.index < 0 || s.index >= s.turns.length || s.turns.length > 6) return null;
  const turns: Turn[] = s.turns.map((value: unknown) => {
    const t = object(value), f = object(t.feedback);
    return { title: text(t.title, 160), hint: text(t.hint, 600), kind: text(t.kind, 40), answer: text(t.answer), feedback: text(f.evidence, 300) && text(t.answer).includes(f.evidence) ? { evidence: text(f.evidence, 300), good: text(f.good, 600), gap: text(f.gap, 600), example: text(f.example, 1200) } : null };
  });
  if (turns.some(t => !t.title)) return null;
  const profile: Profile = { role: text(p.role, 80), target: text(p.target, 80), company: text(p.company, 80), round: text(p.round, 40), concern: text(p.concern, 600), name: text(p.name, 40), background: text(p.background, 300), experience: text(p.experience), jd: text(p.jd, 6000) };
  let report: Report | null = null;
  try { if (s.report) report = validateReport(s.report, turns); } catch {}
  const r = object(s.revision);
  const revision = Number.isInteger(r.turnIndex) && turns[r.turnIndex]?.answer ? { turnIndex: r.turnIndex, answer: text(r.answer), comparison: text(r.comparison, 4000) } : null;
  return { id: text(s.id, 100), createdAt: s.createdAt, profile, turns, index: s.index, followedUp: s.followedUp === true, finished: s.finished === true, report, revision };
}
export function createSession(profile: Profile, targeted?: Question): InterviewSession {
  const specialist = targeted || questions.find(q => q.role === profile.role) || questions.find(q => q.id === 'team')!;
  const seed = [questions.find(q => q.id === 'intro')!, questions.find(q => q.id === 'project')!, specialist, questions.find(q => q.id === 'why')!, questions.find(q => q.id === 'ask')!];
  return { id: `practice-${Date.now()}`, createdAt: Date.now(), profile: { ...profile }, turns: seed.map(q => ({ title: q.title, hint: q.outline.join('\n'), kind: q.id, answer: '', feedback: null })), index: 0, followedUp: false, finished: false, report: null, revision: null };
}
export function decodeJson(raw: string): unknown {
  const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('教练返回的格式不完整，请重试。回答已保存。');
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { throw new Error('教练返回的格式不完整，请重试。回答已保存。'); }
}
function required(v: unknown, max = 1200): string { const result = text(v, max).trim(); if (!result) throw new Error('教练没有给出完整建议，请重试。回答已保存。'); return result; }
export function parseFeedback(raw: string, answer: string) {
  const v = object(decodeJson(raw));
  const evidence = required(v.evidence, 300);
  if (!answer.includes(evidence)) throw new Error('点评没有引用你的真实回答，请重新点评。');
  return { feedback: { evidence, good: required(v.good, 600), gap: required(v.gap, 600), example: required(v.example) }, followUp: text(v.followUp, 160).trim(), nextQuestion: text(v.nextQuestion, 160).trim() };
}
export function validateReport(value: unknown, turns: Turn[]): Report {
  const v = object(value);
  if (!Array.isArray(v.priorities) || !v.priorities.length) throw new Error('复盘缺少可执行的改进建议，请重试。');
  const priorities = v.priorities.slice(0, 3).map((value: unknown) => {
    const p = object(value);
    if (!Number.isInteger(p.turnIndex) || !turns[p.turnIndex]?.answer.trim()) throw new Error('复盘引用了未回答的题目，请重试。');
    return { turnIndex: p.turnIndex as number, issue: required(p.issue, 600), action: required(p.action, 600) };
  });
  return { strength: required(v.strength), priorities, reminder: required(v.reminder) };
}
export function applyFeedback(s: InterviewSession, reply: ReturnType<typeof parseFeedback>): InterviewSession {
  const turns = s.turns.map(t => ({ ...t }));
  const current = turns[s.index]; current.feedback = reply.feedback;
  if (reply.nextQuestion && turns[s.index + 1]) turns[s.index + 1].title = reply.nextQuestion;
  const follow = current.kind === 'project' && !s.followedUp && !!reply.followUp;
  if (follow) turns.splice(s.index + 1, 0, { title: reply.followUp, hint: '回应刚才的细节：说清自己的动作、选择依据和真实结果。', kind: 'followup', answer: '', feedback: null });
  return { ...s, turns, followedUp: s.followedUp || follow };
}
export function sessionContext(s: InterviewSession) {
  const { name, ...profile } = s.profile;
  return { profile, answers: s.turns.slice(0, s.index + 1).map((t, i) => ({ turnIndex: i, question: t.title, referencePoints: t.hint, answer: t.answer, feedback: t.feedback })) };
}
export function reportText(s: InterviewSession): string {
  return `${s.profile.target || s.profile.role}${s.profile.company ? ' · ' + s.profile.company : ''}\n${s.profile.round} · ${new Date(s.createdAt).toLocaleDateString()}\n\n${s.turns.filter(t => t.answer.trim()).map((t, i) => `${i + 1}. ${t.title}\n我的回答：${t.answer}\n${t.feedback ? `优点：${t.feedback.good}\n待补充：${t.feedback.gap}\n表达参考：${t.feedback.example}` : '尚未点评'}`).join('\n\n')}\n\n${s.report ? `本轮优势：${s.report.strength}\n\n${s.report.priorities.map((p, i) => `${i + 1}. ${p.issue}\n下一步：${p.action}`).join('\n\n')}\n\n面前回顾：${s.report.reminder}` : ''}${s.revision?.comparison ? `\n\n重答对比：${s.revision.comparison}` : ''}\n\nAI 练习建议，不预测录用结果。`;
}
