import { Smile, Meh, Frown, Angry, Coffee, CloudRain, HelpCircle } from "lucide-react-native";

export type MoodType = 'happy' | 'calm' | 'anxious' | 'sad' | 'angry' | 'tired' | 'other';

export interface MoodRecord {
  id: string;
  type: MoodType;
  timestamp: number;
  note: string;
}

export const MOODS: Record<MoodType, { label: string; icon: any; color: string }> = {
  happy: { label: "开心", icon: Smile, color: "#F5A623" }, // Orange
  calm: { label: "平静", icon: Meh, color: "#7ED321" }, // Green
  anxious: { label: "焦虑", icon: Frown, color: "#9013FE" }, // Purple
  sad: { label: "悲伤", icon: CloudRain, color: "#4A90E2" }, // Blue
  angry: { label: "愤怒", icon: Angry, color: "#D0021B" }, // Red
  tired: { label: "疲惫", icon: Coffee, color: "#8B572A" }, // Brown
  other: { label: "其他", icon: HelpCircle, color: "#9B9B9B" }, // Gray
};
