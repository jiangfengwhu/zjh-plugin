import { getAppContext } from "@zijinhua/app-sdk";

export interface Diary {
  id: string;
  title: string;
  content: string;
  date: number; // timestamp
}

const STORAGE_KEY_DIARIES = "diaries";
const STORAGE_KEY_DRAFT = "draft";

const getStorage = () => getAppContext().storage;

export const store = {
  async getDiaries(): Promise<Diary[]> {
    const data = await getStorage().get(STORAGE_KEY_DIARIES);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  async saveDiary(diary: Diary): Promise<void> {
    const diaries = await this.getDiaries();
    const existingIndex = diaries.findIndex((d) => d.id === diary.id);
    if (existingIndex >= 0) {
      diaries[existingIndex] = diary;
    } else {
      diaries.unshift(diary);
    }
    // Sort descending by date
    diaries.sort((a, b) => b.date - a.date);
    await getStorage().set(STORAGE_KEY_DIARIES, JSON.stringify(diaries));
  },

  async deleteDiary(id: string): Promise<void> {
    const diaries = await this.getDiaries();
    const filtered = diaries.filter((d) => d.id !== id);
    await getStorage().set(STORAGE_KEY_DIARIES, JSON.stringify(filtered));
  },

  async getDraft(): Promise<Partial<Diary> | null> {
    const data = await getStorage().get(STORAGE_KEY_DRAFT);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  async saveDraft(draft: Partial<Diary>): Promise<void> {
    await getStorage().set(STORAGE_KEY_DRAFT, JSON.stringify(draft));
  },

  async clearDraft(): Promise<void> {
    await getStorage().remove(STORAGE_KEY_DRAFT);
  },
};
