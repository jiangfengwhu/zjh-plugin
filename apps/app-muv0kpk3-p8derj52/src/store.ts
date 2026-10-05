import { getAppContext } from "@zijinhua/app-sdk";
import { useSyncExternalStore } from "react";

export type TransactionType = "expense" | "income";

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  timestamp: number;
}

const STORAGE_KEY = "accounting_transactions";

let currentTransactions: Transaction[] = [];
let listeners: Array<() => void> = [];

const loadTransactions = () => {
  const data = getAppContext().storage.get(STORAGE_KEY);
  if (data) {
    try {
      currentTransactions = JSON.parse(data);
    } catch (e) {
      currentTransactions = [];
    }
  } else {
    currentTransactions = [];
  }
};

const saveTransactions = (transactions: Transaction[]) => {
  currentTransactions = transactions;
  getAppContext().storage.set(STORAGE_KEY, JSON.stringify(transactions));
  emitChange();
};

const emitChange = () => {
  for (const listener of listeners) {
    listener();
  }
};

export const store = {
  addTransaction: (transaction: Omit<Transaction, "id" | "timestamp">) => {
    const newTx: Transaction = {
      ...transaction,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };
    saveTransactions([newTx, ...currentTransactions].sort((a, b) => b.timestamp - a.timestamp));
  },
  removeTransaction: (id: string) => {
    saveTransactions(currentTransactions.filter(tx => tx.id !== id));
  },
  getTransactions: () => currentTransactions,
  subscribe: (listener: () => void) => {
    if (listeners.length === 0) {
      loadTransactions();
    }
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }
};

export const useTransactions = () => {
  return useSyncExternalStore(store.subscribe, store.getTransactions);
};
