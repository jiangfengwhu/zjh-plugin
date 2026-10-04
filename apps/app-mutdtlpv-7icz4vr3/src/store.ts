import { getAppContext } from "@zijinhua/app-sdk";

export interface DiaryEntry {
  id: string;
  date: string;
  title: string;
  body: string;
  mood: string;
  createdAt: number;
  updatedAt: number;
}

export interface DraftEntry {
  title: string;
  body: string;
  mood: string;
  date: string;
}

const STORAGE_KEY_DIARIES = "diaries";
const STORAGE_KEY_DRAFT_PREFIX = "draft_";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export const store = {
  getDiaries(): DiaryEntry[] {
    try {
      const data = getAppContext().storage.get(STORAGE_KEY_DIARIES);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("Failed to parse diaries", e);
    }
    return [];
  },

  saveDiary(entry: Omit<DiaryEntry, "id" | "createdAt" | "updatedAt"> & { id?: string }): DiaryEntry {
    const diaries = this.getDiaries();
    const now = Date.now();
    let savedEntry: DiaryEntry;

    if (entry.id) {
      const index = diaries.findIndex((d) => d.id === entry.id);
      if (index >= 0) {
        savedEntry = {
          ...diaries[index],
          ...entry,
          id: entry.id,
          updatedAt: now,
        };
        diaries[index] = savedEntry;
      } else {
        savedEntry = {
          ...entry,
          id: entry.id,
          createdAt: now,
          updatedAt: now,
        } as DiaryEntry;
        diaries.push(savedEntry);
      }
    } else {
      savedEntry = {
        ...entry,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      } as DiaryEntry;
      diaries.push(savedEntry);
    }

    getAppContext().storage.set(STORAGE_KEY_DIARIES, JSON.stringify(diaries));
    return savedEntry;
  },

  deleteDiary(id: string) {
    const diaries = this.getDiaries();
    const filtered = diaries.filter((d) => d.id !== id);
    getAppContext().storage.set(STORAGE_KEY_DIARIES, JSON.stringify(filtered));
  },

  getDraft(id: string): DraftEntry | null {
    try {
      const data = getAppContext().storage.get(STORAGE_KEY_DRAFT_PREFIX + id);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      // ignore
    }
    return null;
  },

  saveDraft(id: string, draft: DraftEntry) {
    getAppContext().storage.set(STORAGE_KEY_DRAFT_PREFIX + id, JSON.stringify(draft));
  },

  clearDraft(id: string) {
    getAppContext().storage.remove(STORAGE_KEY_DRAFT_PREFIX + id);
  },

  subscribe(listener: () => void) {
    return getAppContext().storage.subscribe(STORAGE_KEY_DIARIES, listener);
  },
};
