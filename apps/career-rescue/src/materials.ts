import { useMemo, useSyncExternalStore } from 'react';
import seed from '../materials.json';
import { resources, type Question } from './content';
import { app, owner, type Profile } from './model';

export type Material = {
  id: string; kind: string; topic?: string; title: string; summary: string; roles: string[]; tags: string[];
  level: string; minutes: number; updatedAt: string; contentVersion?: string; company?: string; interviewDate?: string;
  sources: { label: string; url: string }[]; sections: { title: string; body: string }[];
  question?: string; answerPoints: string[]; followUps: string[]; pitfalls: string[];
  deadlineAt?: string; applicationUrl?: string;
};
type Catalog = { revision: number; updatedAt: string; items: Material[] };
const device = app.scope('device').storage, account = app.scope('account').storage;
const catalogKey = 'career-rescue.materials', learningKey = 'career-rescue.learning';
const listeners = new Set<() => void>();
function validCatalog(value: unknown): value is Catalog {
  const v = value as Catalog;
  return !!v && Number.isSafeInteger(v.revision) && v.revision >= 0 && typeof v.updatedAt === 'string' && Array.isArray(v.items) && v.items.length <= 300 && new Set(v.items.map(i => i.id)).size === v.items.length && v.items.every(i => typeof i.id === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(i.id) && typeof i.title === 'string' && typeof i.summary === 'string' && typeof i.updatedAt === 'string' && Array.isArray(i.roles) && Array.isArray(i.tags) && Array.isArray(i.sources) && i.sources.every(s => typeof s.label === 'string' && typeof s.url === 'string' && /^https:\/\//.test(s.url)) && Array.isArray(i.sections) && i.sections.every(s => typeof s.title === 'string' && typeof s.body === 'string') && Array.isArray(i.answerPoints) && Array.isArray(i.followUps) && Array.isArray(i.pitfalls));
}
let initial: Catalog = seed;
try { const cached: unknown = JSON.parse(device.get(catalogKey) || 'null'); if (validCatalog(cached)) initial = cached; } catch {}
let current = { catalog: initial, refreshing: false, error: '', checkedAt: 0 };
let pending: Promise<void> | null = null;
const emit = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => current;
const local: Material[] = resources.map(r => ({ id: r.id, kind: r.category === '求职入口' ? '求职入口' : '模板', title: r.title, summary: r.subtitle, roles: ['通用'], tags: [r.category], level: '入门', minutes: 3, updatedAt: '2026-10-11', sources: r.url ? [{ label: r.source || r.title, url: r.url }] : [], sections: [{ title: r.category, body: r.text }], answerPoints: [], followUps: [], pitfalls: [] }));
export function useMaterials() {
  const value = useSyncExternalStore(subscribe, snapshot, snapshot);
  const items = useMemo(() => [...value.catalog.items, ...local.filter(r => !value.catalog.items.some(i => i.id === r.id))], [value.catalog]);
  return { ...value, items };
}
export function refreshMaterials(force = false): Promise<void> {
  if (pending) return pending;
  if (!force && Date.now() - current.checkedAt < 5 * 60_000) return Promise.resolve();
  current = { ...current, refreshing: true, error: '' }; emit();
  pending = (async () => {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('https://zijinhua.297782.xyz/v1/career-rescue/materials', { signal: controller.signal, headers: current.catalog.revision ? { 'If-None-Match': `"${current.catalog.revision}"` } : {} });
      if (response.status === 304) { current = { ...current, checkedAt: Date.now() }; return; }
      if (!response.ok) throw new Error('资料同步失败，已保存的内容仍可阅读');
      const value: unknown = await response.json();
      if (!validCatalog(value)) throw new Error('资料格式不完整，请稍后刷新');
      // Revision 0 is an unpublished empty service, not a request to clear the bundled catalog.
      if (value.revision > 0) { current = { ...current, catalog: value }; device.set(catalogKey, JSON.stringify(value)); }
      current = { ...current, checkedAt: Date.now() };
    } catch (error) { current = { ...current, error: error instanceof Error && error.name !== 'AbortError' ? error.message : '同步超时，先阅读本机资料' }; }
    finally { clearTimeout(timeout); current = { ...current, refreshing: false }; pending = null; emit(); }
  })();
  return pending;
}
export type Learning = { status: 'review' | 'mastered'; note: string; version: string; at: number };
export type LearningMap = Record<string, Learning>;
function readLearning(): LearningMap {
  try {
    const v = JSON.parse(account.get(learningKey) || '{}');
    return Object.fromEntries(Object.entries(v).filter(([id, raw]) => /^[a-z][a-z0-9-]{0,63}$/.test(id) && !!raw && typeof raw === 'object' && ['review', 'mastered'].includes((raw as Learning).status) && typeof (raw as Learning).note === 'string' && typeof (raw as Learning).version === 'string').slice(-300)) as LearningMap;
  } catch { return {}; }
}
const learningSnapshot = () => `${owner()}|${account.get(learningKey) || '{}'}`;
const learningSubscribe = (listener: () => void) => { const a = account.subscribe(learningKey, listener), b = app.auth.subscribe(listener); return () => { a(); b(); }; };
export function useLearning() { const raw = useSyncExternalStore(learningSubscribe, learningSnapshot, learningSnapshot); return useMemo(readLearning, [raw]); }
export function clearLearning(expectedOwner = owner()) { if (owner() === expectedOwner) account.set(learningKey, '{}'); }
export const materialVersion = (item: Material) => item.contentVersion || item.updatedAt;
export function saveLearning(item: Material, change: Partial<Learning>, expectedOwner = owner()) {
  if (expectedOwner !== owner()) return;
  const map = readLearning(), old = map[item.id];
  const next = { ...map, [item.id]: { status: old?.status || 'review', note: old?.note || '', at: Date.now(), version: materialVersion(item), ...change } };
  account.set(learningKey, JSON.stringify(Object.fromEntries(Object.entries(next).slice(-300))));
}
export function learningStatus(item: Material, value?: Learning) { return !value ? '未学' : value.version !== materialVersion(item) ? '资料已更新' : value.status === 'mastered' ? '已掌握' : '待复习'; }
export function recommendMaterials(items: Material[], profile: Profile) {
  const context = [profile.target, profile.jd, profile.concern].join(' ').toLowerCase(), company = profile.company.toLowerCase().replace(/\s/g, '').replace(/微软/g, 'microsoft').replace(/亚马逊/g, 'amazon');
  const companyMatches = (name?: string) => !!company && !!name && (name.toLowerCase().includes(company) || company.includes(name.toLowerCase()));
  return items.filter(i => i.question && (!i.company || !company || companyMatches(i.company))).map(item => {
    const tags = item.tags.filter(t => context.includes(t.toLowerCase())), matchedRole = item.roles.find(r => r !== '通用' && (r === profile.role || profile.target.includes(r))), matchCompany = companyMatches(item.company);
    return { item, score: (matchCompany ? 20 : 0) + tags.length * 6 + (matchedRole ? 8 : item.roles.includes('通用') ? 3 : 0), reason: matchCompany ? '对应公司官方指引' : tags.length ? `匹配 JD / 关注点：${tags.slice(0, 2).join('、')}` : matchedRole ? `${matchedRole}岗位考点` : '通用面试准备' };
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id)).slice(0, 5);
}
export function materialQuestion(item: Material): Question | undefined {
  return item.question ? { id: `material-${item.id}`, role: item.roles[0], tag: `${item.kind} · ${item.title}`, title: item.question, intent: item.summary, outline: item.answerPoints.length ? item.answerPoints : item.sections.map(s => s.title + '：' + s.body), avoid: item.pitfalls.join('；') } : undefined;
}
export function materialText(item: Material) {
  return `${item.title}\n${item.kind} · ${item.roles.join(' / ')} · 更新 ${item.updatedAt}\n\n${item.summary}\n\n${item.sections.map(s => `${s.title}\n${s.body}`).join('\n\n')}${item.question ? '\n\n练习题\n' + item.question : ''}${item.followUps.length ? '\n\n追问\n' + item.followUps.join('\n') : ''}${item.pitfalls.length ? '\n\n易错点\n' + item.pitfalls.join('\n') : ''}\n\n来源\n${item.sources.map(s => s.label + '\n' + s.url).join('\n') || '生花官方原创模板'}`;
}
export function materialTopic(item: Material) {
  if (item.topic) return item.topic;
  if (item.kind === '机会' || item.kind === '求职入口') return '机会';
  const tags = item.tags.join(' ') + ' ' + item.title;
  if (/简历|ATS|Resume/i.test(tags)) return '简历';
  if (/谈薪|薪资|Offer/i.test(tags)) return '谈薪';
  if (/校招|应届|留学|截止/.test(tags)) return '校招';
  if (/权益|劳动|避坑|背调/.test(tags)) return '权益';
  if (/远程|招聘|机会/.test(tags)) return '机会';
  return '面试';
}
