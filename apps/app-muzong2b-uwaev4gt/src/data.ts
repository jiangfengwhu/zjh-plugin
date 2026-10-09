export interface Clue {
  id: string;
  name: string; // The part of the item to click
  hint: string; // The text shown when clicked
  x: number; // Percentage X position (0-100)
  y: number; // Percentage Y position (0-100)
}

export interface AppraisalItem {
  id: string;
  name: string;
  description: string;
  emoji: string; // Used to represent the item visually
  clues: Clue[];
  isReal: boolean;
  originStory: string;
  estimatedValue: string;
}

// We just reuse AppraisalItem for saved items, adding savedAt
export interface SavedItem extends AppraisalItem {
  savedAt: number;
}
