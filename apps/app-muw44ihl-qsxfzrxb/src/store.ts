import { useEffect, useState } from "react";
import { getAppContext } from "@zijinhua/app-sdk";

export type TransactionType = "expense" | "income";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: number; // timestamp
  note: string;
}

const STORAGE_KEY = "transactions";

export function getTransactions(): Transaction[] {
  const ctx = getAppContext();
  const data = ctx.storage.get(STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error("Failed to parse transactions", e);
    }
  }
  return [];
}

export function saveTransactions(transactions: Transaction[]) {
  const ctx = getAppContext();
  ctx.storage.set(STORAGE_KEY, JSON.stringify(transactions));
}

export function addTransactions(newTransactions: Omit<Transaction, "id" | "date">[]) {
  const current = getTransactions();
  const now = Date.now();
  const added = newTransactions.map((t, index) => ({
    ...t,
    id: Math.random().toString(36).substring(2, 9) + index,
    date: now,
  }));
  saveTransactions([...added, ...current]);
}

export function clearTransactions() {
  saveTransactions([]);
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>(getTransactions());

  useEffect(() => {
    const ctx = getAppContext();
    const unsubscribe = ctx.storage.subscribe(STORAGE_KEY, (val) => {
      if (val) {
        try {
          setTransactions(JSON.parse(val));
        } catch (e) {
          console.error("Failed to parse transactions in subscription", e);
        }
      } else {
        setTransactions([]);
      }
    });
    return unsubscribe;
  }, []);

  return transactions;
}
