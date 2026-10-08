import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@zijinhua/app-sdk/ui";
import { getAppContext } from "@zijinhua/app-sdk";
import {
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";

type PlanetState = {
  trees: number;
  waterLevel: number; // 0 to 100
  windLevel: number; // 0 to 100
  temperature: number; // 0 to 100
  civilizationLevel: number;
};

const DEFAULT_STATE: PlanetState = {
  trees: 0,
  waterLevel: 50,
  windLevel: 0,
  temperature: 50,
  civilizationLevel: 0,
};

export default function App() {
  const { colors } = useTheme();
  const [state, setState] = useState<PlanetState | null>(null);
  const app = getAppContext();

  // Animation values
  const planetScale = useSharedValue(1);
  const cloudOpacity = useSharedValue(0);
  const windOffset = useSharedValue(0);

  // Load state
  useEffect(() => {
    async function load() {
      const data = await app.storage.get("planet_state");
      if (data) {
        try {
          setState(JSON.parse(data));
        } catch (e) {
          setState(DEFAULT_STATE);
        }
      } else {
        setState(DEFAULT_STATE);
      }
    }
    load();
  }, []);

  // Save state
  useEffect(() => {
    if (state) {
      app.storage.set("planet_state", JSON.stringify(state));
    }
  }, [state]);

  // Game Loop
  useEffect(() => {
    if (!state) return;

    const intervalId = setInterval(() => {
      setState((prev) => {
        if (!prev) return prev;

        let newTrees = prev.trees;
        let newWater = prev.waterLevel;
        let newWind = prev.windLevel;
        let newTemp = prev.temperature;
        let newCiv = prev.civilizationLevel;

        // Evolve trees
        if (newWater > 20 && newWater < 80 && newTemp > 20 && newTemp < 80) {
          // Good conditions, trees might grow
          if (Math.random() > 0.5) {
            newTrees += 1;
          }
        } else if (newWater < 10 || newTemp > 90) {
          // Bad conditions, trees might die
          if (newTrees > 0 && Math.random() > 0.7) {
            newTrees -= 1;
          }
        }

        // Civilization evolution
        if (newTrees > 50 && newCiv === 0) {
          newCiv = 1;
        } else if (newTrees > 100 && newCiv === 1) {
          newCiv = 2;
        } else if (newTrees < 20 && newCiv > 0) {
          // Decline
          if (Math.random() > 0.9) {
            newCiv -= 1;
          }
        }

        // Environmental decay/normalization
        if (newWind > 0) {
          newWind = Math.max(0, newWind - 5);
        }

        if (newWater > 0 && newTemp > 40) {
          newWater = Math.max(0, newWater - 1); // Evaporation
        }

        return {
          trees: newTrees,
          waterLevel: newWater,
          windLevel: newWind,
          temperature: newTemp,
          civilizationLevel: newCiv,
        };
      });
    }, 5000);

    return () => clearInterval(intervalId);
  }, [state !== null]);

  if (!state) {
    return null;
  }

  // --- Gestures ---

  // Tap: Plant a tree
  const tap = Gesture.Tap()
    .onStart(() => {
      app.haptics.trigger("selection");
      planetScale.value = withSequence(
        withTiming(0.95, { duration: 50 }),
        withTiming(1, { duration: 50 })
      );
    })
    .onEnd(() => {
      setState((prev) => (prev ? { ...prev, trees: prev.trees + 1 } : prev));
    });

  // Pan: Blow wind / change temperature
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      windOffset.value = e.translationX;
    })
    .onEnd((e) => {
      app.haptics.trigger("impactMedium");
      windOffset.value = withSpring(0);
      setState((prev) => {
        if (!prev) return prev;
        const windIncrease = Math.min(100, prev.windLevel + Math.abs(e.velocityX) / 100);
        // Dragging left makes it colder, right makes it hotter
        const tempChange = e.translationX > 0 ? 5 : -5;
        const newTemp = Math.max(0, Math.min(100, prev.temperature + tempChange));
        return {
          ...prev,
          windLevel: windIncrease,
          temperature: newTemp,
        };
      });
    });

  // LongPress: Rain
  const longPress = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      app.haptics.trigger("impactHeavy");
      cloudOpacity.value = withTiming(1, { duration: 200 });
    })
    .onEnd(() => {
      cloudOpacity.value = withTiming(0, { duration: 500 });
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          waterLevel: Math.min(100, prev.waterLevel + 10),
          temperature: Math.max(0, prev.temperature - 2), // Rain cools the planet
        };
      });
    });

  const composedGesture = Gesture.Simultaneous(tap, pan, longPress);

  // --- Animated Styles ---
  const planetStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: planetScale.value },
        { translateX: windOffset.value * 0.1 },
      ],
    };
  });

  const cloudStyle = useAnimatedStyle(() => {
    return {
      opacity: cloudOpacity.value,
    };
  });

  // Render helpers
  const getPlanetColor = () => {
    if (state.waterLevel < 20) return "#d7ccc8"; // Dry
    if (state.waterLevel > 80) return "#81d4fa"; // Flooded
    return "#aed581"; // Normal/Green
  };

  const getPlanetEmoji = () => {
    if (state.waterLevel < 20) return "🏜️";
    if (state.waterLevel > 80) return "🌊";
    if (state.trees > 50) return "🌳";
    return "🌍";
  };

  const renderTrees = () => {
    let treeStr = "";
    const displayCount = Math.min(state.trees, 20); // Cap displayed trees
    for (let i = 0; i < displayCount; i++) {
      treeStr += "🌲";
    }
    return treeStr;
  };

  const getCivEmoji = () => {
      if (state.civilizationLevel === 0) return "";
      if (state.civilizationLevel === 1) return "🛖";
      if (state.civilizationLevel >= 2) return "🏙️";
      return "";
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]}>
      <View style={styles.statsContainer}>
        <Text style={[styles.statText, { color: colors.text }]}>
          🌲 树木: {state.trees}
        </Text>
        <Text style={[styles.statText, { color: colors.text }]}>
          💧 水分: {Math.round(state.waterLevel)}%
        </Text>
        <Text style={[styles.statText, { color: colors.text }]}>
          🌡️ 温度: {Math.round(state.temperature)}°
        </Text>
        <Text style={[styles.statText, { color: colors.text }]}>
          💨 风力: {Math.round(state.windLevel)}
        </Text>
        {state.civilizationLevel > 0 && (
           <Text style={[styles.statText, { color: colors.text }]}>
            {getCivEmoji()} 文明: 等级 {state.civilizationLevel}
          </Text>
        )}
      </View>

      <GestureDetector gesture={composedGesture}>
        <View style={styles.interactiveArea}>
           <Animated.View style={[styles.clouds, cloudStyle]}>
              <Text style={styles.cloudEmoji}>🌧️🌧️🌧️</Text>
           </Animated.View>

          <Animated.View
            style={[
              styles.planet,
              { backgroundColor: getPlanetColor() },
              planetStyle,
            ]}
          >
            <Text style={styles.planetBaseEmoji}>{getPlanetEmoji()}</Text>
            <View style={styles.entitiesContainer}>
                 <Text style={styles.entitiesText}>
                    {renderTrees()}
                 </Text>
                 <Text style={styles.entitiesText}>
                    {getCivEmoji()}
                 </Text>
            </View>
          </Animated.View>
          <Text style={[styles.hintText, { color: colors.muted }]}>
            点击种植 · 拖动吹风 · 长按降雨
          </Text>
        </View>
      </GestureDetector>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsContainer: {
    padding: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    zIndex: 10,
  },
  statText: {
    fontSize: 16,
    fontWeight: "600",
  },
  interactiveArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  clouds: {
    position: 'absolute',
    top: '20%',
    zIndex: 20,
  },
  cloudEmoji: {
      fontSize: 60,
  },
  planet: {
    width: 250,
    height: 250,
    borderRadius: 125,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  planetBaseEmoji: {
    fontSize: 100,
    position: 'absolute',
    opacity: 0.2,
  },
  entitiesContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
  },
  entitiesText: {
      fontSize: 24,
      textAlign: 'center',
  },
  hintText: {
    marginTop: 40,
    fontSize: 14,
  },
});