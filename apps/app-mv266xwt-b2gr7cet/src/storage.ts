import { getAppContext } from "@zijinhua/app-sdk";
import { MoodRecord } from "./constants";

const STORAGE_KEY_RECORDS = "mood_records";
const STORAGE_KEY_REMINDER = "mood_reminder";

export const storage = {
  async getRecords(): Promise<MoodRecord[]> {
    const data = await getAppContext().storage.get(STORAGE_KEY_RECORDS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  },

  async saveRecord(record: MoodRecord): Promise<void> {
    const records = await this.getRecords();
    records.push(record);
    await getAppContext().storage.set(STORAGE_KEY_RECORDS, JSON.stringify(records));
  },

  async deleteRecord(id: string): Promise<void> {
      const records = await this.getRecords();
      const newRecords = records.filter(r => r.id !== id);
      await getAppContext().storage.set(STORAGE_KEY_RECORDS, JSON.stringify(newRecords));
  },

  async getReminderSettings(): Promise<{ enabled: boolean; timeStr: string }> {
    const data = await getAppContext().storage.get(STORAGE_KEY_REMINDER);
    if (!data) return { enabled: false, timeStr: '20:00' };
    try {
      return JSON.parse(data);
    } catch (e) {
      return { enabled: false, timeStr: '20:00' };
    }
  },

  async saveReminderSettings(settings: { enabled: boolean; timeStr: string }): Promise<void> {
    await getAppContext().storage.set(STORAGE_KEY_REMINDER, JSON.stringify(settings));
  }
};
