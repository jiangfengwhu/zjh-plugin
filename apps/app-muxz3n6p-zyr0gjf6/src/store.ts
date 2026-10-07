import { useState, useEffect, useCallback } from "react";
import { getAppContext } from "@zijinhua/app-sdk";

export type PetState = {
  name: string;
  breed: string;
  health: number; // 0-100
  mood: number; // 0-100
  energy: number; // 0-100
  lastInteractionTime: number;
};

const DEFAULT_PET_STATE: PetState = {
  name: "小白",
  breed: "猫咪",
  health: 100,
  mood: 100,
  energy: 100,
  lastInteractionTime: Date.now(),
};

const STORAGE_KEY = "virtual-pet-state";

export function usePetState() {
  const [state, setState] = useState<PetState>(DEFAULT_PET_STATE);
  const [initialized, setInitialized] = useState(false);
  const storage = getAppContext().storage;

  useEffect(() => {
    const raw = storage.get(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Calculate degradation based on time passed
        const now = Date.now();
        const hoursPassed = (now - parsed.lastInteractionTime) / (1000 * 60 * 60);

        let newHealth = parsed.health;
        let newMood = parsed.mood;
        let newEnergy = parsed.energy;

        if (hoursPassed > 0.5) {
          // Degrade stats over time, roughly 5 points per hour
          const degrade = Math.floor(hoursPassed * 5);
          newHealth = Math.max(0, newHealth - degrade * 0.5); // health drops slower
          newMood = Math.max(0, newMood - degrade);
          newEnergy = Math.max(0, newEnergy - degrade);
        }

        setState({
          ...parsed,
          health: newHealth,
          mood: newMood,
          energy: newEnergy,
          lastInteractionTime: now,
        });
      } catch (e) {
        setState(DEFAULT_PET_STATE);
      }
    }
    setInitialized(true);
  }, []);

  const updateState = useCallback((updater: (prev: PetState) => PetState) => {
    setState((prev) => {
      const next = updater(prev);
      const nextWithTime = { ...next, lastInteractionTime: Date.now() };
      storage.set(STORAGE_KEY, JSON.stringify(nextWithTime));
      return nextWithTime;
    });
  }, [storage]);

  return { state, updateState, initialized };
}

export function getPetEmotion(state: PetState): "happy" | "neutral" | "sad" | "sleepy" {
  if (state.energy < 30) return "sleepy";
  if (state.health < 40 || state.mood < 40) return "sad";
  if (state.mood > 70 && state.health > 70) return "happy";
  return "neutral";
}
