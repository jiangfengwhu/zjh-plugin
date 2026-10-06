import { getAppContext } from '@zijinhua/app-sdk';
import { Transaction } from './types';

const STORAGE_KEY = 'transactions_v1';

export const getTransactions = (): Transaction[] => {
  const data = getAppContext().storage.get(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

export const saveTransactions = (transactions: Transaction[]) => {
  getAppContext().storage.set(STORAGE_KEY, JSON.stringify(transactions));
};

export const addTransactions = (newTransactions: Transaction[]) => {
  const existing = getTransactions();
  const updated = [...existing, ...newTransactions];
  saveTransactions(updated);
};

export const clearTransactions = () => {
    getAppContext().storage.remove(STORAGE_KEY);
};

export const useTransactions = () => {
  return getTransactions();
};

export const subscribeToTransactions = (callback: (transactions: Transaction[]) => void) => {
  return getAppContext().storage.subscribe(STORAGE_KEY, (data) => {
    if (!data) {
        callback([]);
        return;
    }
    try {
        callback(JSON.parse(data));
    } catch (e) {
        callback([]);
    }
  });
};
