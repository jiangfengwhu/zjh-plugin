import { useSyncExternalStore } from 'react';
import { app, data, owner } from './model';

export const stages = ['想投', '已投递', '笔试', '面试', 'Offer', '结束'] as const;
export type Stage = typeof stages[number];
export type Job = { id: string; company: string; title: string; url: string; jd: string; stage: Stage; nextStep: string; nextAt: number | null; note: string; updatedAt: number; createdAt: number; reminderId?: string; reminderAt?: number };
export type ResumeReview = { summary: string; requirements: { requirement: string; quotedJd: string; evidence: string; status: string; action: string }[]; rewrites: { before: string; after: string; why: string; missingFacts: string[] }[]; interviewQuestions: { question: string; basis: string }[]; formatChecks: string[] };
export type ResumeVersion = { id: string; title: string; body: string; jd: string; createdAt: number };
type Workspace = { resume: string; resumeAt: number; review: { resumeAt: number; jd: string; result: ResumeReview } | null; versions: ResumeVersion[]; jobs: Job[] };
const key = 'career-rescue.workspace';
let cached: { account: string; raw: string; value: Workspace } | null = null;
const text = (v: unknown, max = 16000) => typeof v === 'string' ? v.slice(0, max) : '';
export const uniqueId = () => 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export function getWorkspace(): Workspace {
  const account = owner(), raw = data.storage.get(key) || '{}';
  if (cached?.account === account && cached.raw === raw) return cached.value;
  let v: any = {}; try { v = JSON.parse(raw); } catch {}
  if (!v || typeof v !== 'object') v = {};
  const jobs: Job[] = Array.isArray(v.jobs) ? v.jobs.filter((j: any) => j && typeof j.id === 'string' && /^[a-z0-9]{1,30}$/.test(j.id) && stages.includes(j.stage)).slice(0, 100).map((j: any) => ({ id: j.id, company: text(j.company, 100), title: text(j.title, 100), url: text(j.url, 1000), jd: text(j.jd, 6000), stage: j.stage, nextStep: text(j.nextStep, 200), nextAt: Number.isFinite(j.nextAt) ? j.nextAt : null, note: text(j.note, 4000), createdAt: Number(j.createdAt) || 0, updatedAt: Number(j.updatedAt) || 0, ...(typeof j.reminderId === 'string' ? { reminderId: j.reminderId, reminderAt: Number(j.reminderAt) } : {}) })) : [];
  const value: Workspace = { resume: text(v.resume), resumeAt: Number(v.resumeAt) || 0, review: v.review?.result && Array.isArray(v.review.result.requirements) && Array.isArray(v.review.result.rewrites) && Array.isArray(v.review.result.interviewQuestions) && Array.isArray(v.review.result.formatChecks) ? v.review : null, versions: Array.isArray(v.versions) ? v.versions.filter((x: any) => x && typeof x.body === 'string' && typeof x.title === 'string').slice(0, 8).map((x: any) => ({ id: text(x.id, 40), title: text(x.title, 120), body: text(x.body), jd: text(x.jd, 6000), createdAt: Number(x.createdAt) || 0 })) : [], jobs };
  cached = { account, raw, value }; return value;
}
export function updateWorkspace(change: (value: Workspace) => Workspace, expectedOwner = owner()) {
  if (owner() !== expectedOwner) return;
  const value = change(getWorkspace()), raw = JSON.stringify(value);
  cached = { account: expectedOwner, raw, value }; data.storage.set(key, raw);
}
const subscribe = (listener: () => void) => { const a = data.storage.subscribe(key, listener), b = app.auth.subscribe(listener); return () => { a(); b(); }; };
export function useWorkspace() { return useSyncExternalStore(subscribe, getWorkspace, getWorkspace); }
export function saveResume(resume: string, account = owner()) { updateWorkspace(s => s.resume === resume ? s : { ...s, resume: resume.slice(0, 16000), resumeAt: Date.now() }, account); }
export function saveJob(input: Job, account = owner()) {
  let cancel = '';
  updateWorkspace(s => {
    const old = s.jobs.find(j => j.id === input.id), invalidate = old?.nextAt !== input.nextAt || input.stage === '结束';
    if (invalidate && old?.reminderId) cancel = old.reminderId;
    const job = { ...input, updatedAt: Date.now(), ...(invalidate ? { reminderId: undefined, reminderAt: undefined } : {}) };
    return { ...s, jobs: [job, ...s.jobs.filter(j => j.id !== job.id)].slice(0, 100) };
  }, account);
  if (cancel) void app.phone.cancelSchedule(cancel).then(result => { if (!result.ok && owner() === account) app.toast.show('记录已保存，但旧提醒取消失败，请检查通知', 'error'); }).catch(() => { if (owner() === account) app.toast.show('旧提醒取消失败，请检查通知', 'error'); });
}
export function removeJob(id: string, account = owner()) {
  const job = getWorkspace().jobs.find(j => j.id === id);
  updateWorkspace(s => ({ ...s, jobs: s.jobs.filter(j => j.id !== id) }), account);
  if (job?.reminderId && owner() === account) void app.phone.cancelSchedule(job.reminderId).then(result => { if (!result.ok && owner() === account) app.toast.show('记录已删除，但提醒取消失败，请检查通知', 'error'); }).catch(() => { if (owner() === account) app.toast.show('记录已删除，但提醒取消失败，请检查通知', 'error'); });
}
export function clearWorkspace(account = owner()) {
  if (account !== owner()) return;
  const ids = getWorkspace().jobs.flatMap(j => j.reminderId ? [j.reminderId] : []);
  updateWorkspace(() => ({ resume: '', resumeAt: 0, review: null, versions: [], jobs: [] }), account);
  if (ids.length) void Promise.allSettled(ids.map(id => app.phone.cancelSchedule(id))).then(results => { if (owner() === account && results.some(r => r.status === 'rejected' || !r.value.ok)) app.toast.show('本机记录已清空，部分提醒取消失败，请检查系统通知', 'error'); });
}
export function blankJob(company = '', title = '', jd = ''): Job { return { id: uniqueId(), company, title, jd, url: '', stage: '想投', nextStep: '', nextAt: null, note: '', createdAt: Date.now(), updatedAt: Date.now() }; }

export function parseResumeReview(raw: string, resume: string, jd: string): ResumeReview {
  const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
  let v: any; try { v = JSON.parse(raw.slice(start, end + 1)); } catch { throw new Error('诊断格式不完整，请重试。正文已保留。'); }
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('诊断格式不完整，请重试。正文已保留。');
  const required = (s: unknown, max = 800): string => { if (typeof s !== 'string' || !s.trim() || s.length > max) throw new Error('诊断缺少可用内容，请重试'); return s.trim(); };
  const list = (a: unknown, max: number): any[] => { if (!Array.isArray(a) || a.length > max) throw new Error('诊断条目格式无效，请重试'); return a; };
  const summary = required(v.summary, 600);
  if (/(?:通过率|录用率|匹配分|满分)|保证.*(?:录用|通过)/.test(summary)) throw new Error('诊断给出了无依据的评分或承诺，请重新诊断');
  const requirements = list(v.requirements, 8).map(x => {
    const quotedJd = required(x.quotedJd, 400), evidence = typeof x.evidence === 'string' ? x.evidence.trim().slice(0, 600) : '';
    if (!jd.includes(quotedJd) || evidence && !resume.includes(evidence) || !['有证据', '待补证据', '未体现'].includes(x.status) || x.status === '有证据' && !evidence) throw new Error('诊断没有引用真实原文，请重试');
    return { requirement: required(x.requirement, 160), quotedJd, evidence, status: x.status, action: required(x.action, 600) };
  });
  if (jd.trim() && !requirements.length) throw new Error('诊断未对照岗位要求，请重试');
  const rewrites = list(v.rewrites, 4).map(x => {
    const before = required(x.before, 1600), after = required(x.after, 2400);
    if (!resume.includes(before)) throw new Error('改写没有引用你的简历原文，请重试');
    const plain = after.replace(/[［\[][\s\S]*?[］\]]/g, '');
    for (const n of plain.match(/\d+(?:\.\d+)?/g) || []) if (!resume.includes(n)) throw new Error('改写新增了未经提供的数字，请重试');
    return { before, after, why: required(x.why, 600), missingFacts: list(x.missingFacts, 6).map(s => required(s, 200)) };
  });
  return { summary, requirements, rewrites, interviewQuestions: list(v.interviewQuestions, 4).map(x => ({ question: required(x.question, 160), basis: required(x.basis, 400) })), formatChecks: list(v.formatChecks, 6).map(s => required(s, 400)) };
}
