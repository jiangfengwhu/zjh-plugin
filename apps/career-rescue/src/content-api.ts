import { useSyncExternalStore } from 'react';
import { app } from './model';
import bundled from '../content.json';
import type { Catalog, ContentItem, ContentKind, Target } from './types';
const storage = app.scope('device').storage;
let catalog: Catalog = { revision: 0, updatedAt: '', items: bundled.items as ContentItem[] }, error = '', busy = false, checkedAt = 0;
let task: Promise<void> | null = null;
let currentRequest: AbortController | null = null;
export function disposeContent() { currentRequest?.abort(); listeners.clear(); }
const listeners = new Set<() => void>();
let snapshot = { catalog, busy, error };
function publish() { snapshot = { catalog, busy, error }; listeners.forEach(fn => fn()); }
function valid(value: unknown): value is Catalog { const v = value as Catalog; return !!v && Number.isSafeInteger(v.revision) && v.revision >= 0 && typeof v.updatedAt === 'string' && Array.isArray(v.items) && v.items.every(i => i && typeof i.id === 'string' && ['resume', 'question', 'followup', 'risk', 'timeline'].includes(i.kind) && typeof i.title === 'string' && typeof i.body === 'string' && Array.isArray(i.roles) && Array.isArray(i.tags)); }
try { const value = JSON.parse(storage.get('career-content') ?? 'null'); if (valid(value)) catalog = value; } catch {}
snapshot = { catalog, busy, error };
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const get = () => snapshot;
export function useContent() { return useSyncExternalStore(subscribe, get, get); }
const getCatalog = () => catalog;
export function useCatalog() { return useSyncExternalStore(subscribe, getCatalog, getCatalog); }
export function refreshContent(force = false) {
  if (task) return task;
  if (!force && Date.now() - checkedAt < 300000) return Promise.resolve();
  busy = true; error = ''; publish();
  const token = new AbortController(), timer = setTimeout(() => token.abort(), 15000);
  currentRequest = token;
  task = (async () => {
    try {
      const response = await fetch('https://zijinhua.297782.xyz/v1/career-rescue/content', { headers: { ...(catalog.revision ? { 'If-None-Match': `"${catalog.revision}"` } : {}) }, signal: token.signal });
      if (response.status !== 304) {
        if (!response.ok) throw new Error('资料同步失败，仍可查看缓存');
        const value: unknown = await response.json(); if (!valid(value)) throw new Error('资料格式无效');
        if (!token.signal.aborted && value.revision > 0) { catalog = value; storage.set('career-content', JSON.stringify(value)); }
      }
      checkedAt = Date.now();
    } catch (e) { error = e instanceof Error ? e.message : '暂时离线，使用缓存'; }
    finally { clearTimeout(timer); if (currentRequest === token) currentRequest = null; busy = false; task = null; publish(); }
  })(); return task;
}
export function matching(items: ContentItem[], kind: ContentKind, target: Target, limit = 5) {
  const normalize = (v: string) => v.trim().toLowerCase();
  const role = normalize(target.role), company = normalize(target.company);
  const relevantRole = (item: ContentItem) => !role || !item.roles.length || item.roles.includes('通用') || item.roles.some(r => normalize(r).includes(role) || role.includes(normalize(r)));
  return items.filter(i => i.kind === kind && relevantRole(i)).map(item => ({ item, rank: (company && item.company && normalize(item.company).includes(company) ? 6 : 0) + (role && item.roles.some(r => normalize(r).includes(role) || role.includes(normalize(r))) ? 4 : 0) + (!item.roles.length || item.roles.includes('通用') ? 1 : 0) })).sort((a, b) => b.rank - a.rank).slice(0, limit).map(v => v.item);
}
