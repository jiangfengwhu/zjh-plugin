import { useCallback, useSyncExternalStore } from 'react';
import { getAppContext } from '@zijinhua/app-sdk';
import type { State, Target, Targets } from './types';
export const app = getAppContext();
export const data = app.scope('account');
export const owner = () => app.auth.getUser()?.id ?? 'guest';
export const uid = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
export const stateKey = 'career-workspace';
const empty: State = { resume: { file: null, text: '', diagnosis: '', improved: '', resultInput: { diagnosis: '', improved: '' } }, session: null, history: [], jobs: [], saved: [] };
let cachedOwner = '', cachedRaw: string | undefined, cached = empty;
export function readState(): State {
  const account = owner(), raw = data.storage.get(stateKey);
  if (account === cachedOwner && raw === cachedRaw) return cached;
  cachedOwner = account; cachedRaw = raw;
  try { const value = JSON.parse(raw ?? 'null'); cached = value && value.resume && Array.isArray(value.jobs) && Array.isArray(value.history) && Array.isArray(value.saved) ? value as State : empty; }
  catch { cached = empty; }
  return cached;
}
export function updateState(update: (state: State) => State, account = owner()) {
  if (account !== owner()) return;
  const before = readState(), next = update(before); if (next === before) return;
  const raw = JSON.stringify(next); cached = next; cachedRaw = raw; cachedOwner = account;
  data.storage.set(stateKey, raw);
}
export function useField<K extends keyof State>(field: K): State[K] {
  const get = useCallback(() => readState()[field], [field]);
  return useSyncExternalStore(useCallback(listener => data.storage.subscribe(stateKey, listener), []), get, get);
}
export function useAccount() { return useSyncExternalStore(app.auth.subscribe, owner, owner); }
export function copy(text: string) { app.clipboard.set(text); app.toast.show('已复制', 'success'); }
const targetsKey = 'career-targets';
const emptyTargets: Targets = { activeId: '', items: [] };
const emptyTarget: Target = { id: '', company: '', role: '', jd: '' };
let targetsOwner = '', targetsRaw: string | undefined, targetsCache = emptyTargets;
export function readTargets(): Targets {
  const account = owner(), raw = data.storage.get(targetsKey);
  if (account === targetsOwner && raw === targetsRaw) return targetsCache;
  targetsOwner = account; targetsRaw = raw;
  try { const value = JSON.parse(raw ?? 'null'); targetsCache = value && typeof value.activeId === 'string' && Array.isArray(value.items) ? value as Targets : emptyTargets; }
  catch { targetsCache = emptyTargets; }
  return targetsCache;
}
export function readTarget() { const value = readTargets(); return value.items.find(item => item.id === value.activeId) ?? emptyTarget; }
export function updateTargets(update: (state: Targets) => Targets, account = owner()) {
  if (account !== owner()) return;
  const next = update(readTargets()), raw = JSON.stringify(next);
  targetsCache = next; targetsRaw = raw; targetsOwner = account;
  data.storage.set(targetsKey, raw);
}
const subscribeTargets = (listener: () => void) => data.storage.subscribe(targetsKey, listener);
export function useTargets() { return useSyncExternalStore(subscribeTargets, readTargets, readTargets); }
export function useTarget() { return useSyncExternalStore(subscribeTargets, readTarget, readTarget); }
export function inputKey(text: string, target: Target) { return JSON.stringify([text, target.jd, target.company, target.role]); }
