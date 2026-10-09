import { getAppContext } from "@zijinhua/app-sdk";

export type MoodType = 'happy' | 'calm' | 'anxious' | 'sad' | 'angry' | 'tired';

export interface MoodRecord {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  mood: MoodType;
  note?: string;
}

const STORAGE_KEY = "mood_records_v1";

export async function getMoodRecords(): Promise<MoodRecord[]> {
  try {
    const data = await getAppContext().storage.get(STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as MoodRecord[];
    }
  } catch (e) {
    console.error("Failed to load mood records", e);
  }
  return [];
}

export async function saveMoodRecord(record: MoodRecord): Promise<void> {
  const records = await getMoodRecords();
  const existingIndex = records.findIndex(r => r.date === record.date);
  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }
  // Sort by timestamp descending
  records.sort((a, b) => b.timestamp - a.timestamp);
  await getAppContext().storage.set(STORAGE_KEY, JSON.stringify(records));
}

export async function deleteMoodRecord(id: string): Promise<void> {
  let records = await getMoodRecords();
  records = records.filter(r => r.id !== id);
  await getAppContext().storage.set(STORAGE_KEY, JSON.stringify(records));
}

export const MOOD_COLORS: Record<MoodType, string> = {
  happy: '#F4D160',  // Yellow
  calm: '#90ADC6',   // Morandi Blue
  anxious: '#F6A889', // Orange
  sad: '#7F8FA6',    // Grayish Blue
  angry: '#E84118',  // Red
  tired: '#A4B0BE',  // Gray
};

export const MOOD_LABELS: Record<MoodType, string> = {
  happy: '开心',
  calm: '平静',
  anxious: '焦虑',
  sad: '悲伤',
  angry: '愤怒',
  tired: '疲惫',
};
