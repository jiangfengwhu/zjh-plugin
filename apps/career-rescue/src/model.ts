import { useCallback, useSyncExternalStore } from 'react';
import { getAppContext } from '@zijinhua/app-sdk';
import type { State } from './types';
export const app = getAppContext();
export const data = app.scope('account');
export const owner = () => app.auth.getUser()?.id ?? 'guest';
export const uid = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
export const stateKey = 'career-workspace';
const empty: State = { target: { company: '', role: '' }, resume: { file: null, text: '', jd: '', mode: 'text', diagnosis: '', improved: '', resultInput: { diagnosis: '', improved: '' } }, session: null, history: [], jobs: [], saved: [] };
let cachedOwner = '', cachedRaw: string | undefined, cached = empty;
export function readState(): State {
  const account = owner(), raw = data.storage.get(stateKey);
  if (account === cachedOwner && raw === cachedRaw) return cached;
  cachedOwner = account; cachedRaw = raw;
  try { const value = JSON.parse(raw ?? 'null'); cached = value && value.target && value.resume && Array.isArray(value.jobs) && Array.isArray(value.history) && Array.isArray(value.saved) ? value as State : empty; }
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
export function inputKey(text: string, jd: string, target: State['target']) { return JSON.stringify([text, jd, target.company, target.role]); }
