import { useState, useEffect } from 'react';
import { getAppContext } from '@zijinhua/app-sdk';

export interface Record {
  id: string;
  amount: number;
  category: string;
  dateMs: number;
  note?: string;
  type: 'income' | 'expense';
}

const STORAGE_KEY = 'records';

export function useRecords() {
  const ctx = getAppContext();

  const loadRecords = (): Record[] => {
    try {
      const data = ctx.storage.get(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse records', e);
      return [];
    }
  };

  const [records, setRecords] = useState<Record[]>(loadRecords());

  useEffect(() => {
    return ctx.storage.subscribe(STORAGE_KEY, (value) => {
      try {
        setRecords(value ? JSON.parse(value) : []);
      } catch (e) {
        setRecords([]);
      }
    });
  }, []);

  const saveRecord = (record: Record) => {
    const currentRecords = loadRecords();
    const existingIndex = currentRecords.findIndex(r => r.id === record.id);
    let newRecords;
    if (existingIndex >= 0) {
      newRecords = [...currentRecords];
      newRecords[existingIndex] = record;
    } else {
      newRecords = [record, ...currentRecords];
    }
    ctx.storage.set(STORAGE_KEY, JSON.stringify(newRecords));
  };

  const deleteRecord = (id: string) => {
    const currentRecords = loadRecords();
    const newRecords = currentRecords.filter(r => r.id !== id);
    ctx.storage.set(STORAGE_KEY, JSON.stringify(newRecords));
  };

  return {
    records,
    saveRecord,
    deleteRecord
  };
}
