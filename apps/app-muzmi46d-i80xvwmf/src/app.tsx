import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getAppContext } from "@zijinhua/app-sdk";
import { useTheme, Button, Surface, EmptyState, ConfirmDialog } from "@zijinhua/app-sdk/ui";
import { ITEMS, Clue } from "./data";

export default function App() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const app = getAppContext();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [foundClues, setFoundClues] = useState<Record<string, boolean>>({});
  const [showResult, setShowResult] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const currentItem = ITEMS[currentIndex];

  const handleClueClick = (clue: Clue) => {
    app.haptics.trigger("selection");
    if (!foundClues[clue.id]) {
      setFoundClues(prev => ({ ...prev, [clue.id]: true }));
      app.toast.show(`发现线索: ${clue.hint}`, "success");
    } else {
      app.toast.show(`你已经发现了这个线索: ${clue.hint}`, "info");
    }
  };

  const handleAppraise = () => {
    app.haptics.trigger("impactMedium");
    setShowResult(true);
  };

  const nextItem = () => {
    app.haptics.trigger("selection");
    setShowResult(false);
    setFoundClues({});
    if (currentIndex < ITEMS.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setGameOver(true);
    }
  };

  if (gameOver) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas, paddingTop: insets.top }}>
        <EmptyState>
          <Text style={{ color: colors.text, fontSize: 18, textAlign: 'center', marginBottom: 16 }}>
            所有的离谱物品都鉴定完毕啦！
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
            感谢你揭开它们的真面目。
          </Text>
          <Button label="重新开始" onPress={() => { setGameOver(false); setCurrentIndex(0); }} intent="brand" />
        </EmptyState>
      </View>
    );
  }

  const allCluesFound = currentItem.clues.every(c => foundClues[c.id]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
            第 {currentIndex + 1} 件: {currentItem.name}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center' }}>
            {currentItem.description}
          </Text>
        </View>

        <Surface tone="base" style={{ padding: 24, borderRadius: colors.radius.lg, alignItems: 'center', marginBottom: 24, minHeight: 300, justifyContent: 'center' }}>
           <Text style={{ fontSize: 120, lineHeight: 140, textAlign: 'center' }}>
             {currentItem.emoji}
           </Text>

           {/* Clues Overlay */}
           {currentItem.clues.map((clue) => {
             const isFound = foundClues[clue.id];
             return (
               <Pressable
                 key={clue.id}
                 onPress={() => handleClueClick(clue)}
                 style={{
                   position: 'absolute',
                   left: `${clue.x}%`,
                   top: `${clue.y}%`,
                   width: 40,
                   height: 40,
                   marginLeft: -20,
                   marginTop: -20,
                   borderRadius: 20,
                   borderWidth: 2,
                   borderColor: isFound ? colors.greenText : 'rgba(255, 255, 255, 0.5)',
                   backgroundColor: isFound ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                   alignItems: 'center',
                   justifyContent: 'center'
                 }}
               >
                 <Text style={{ color: isFound ? colors.greenText : colors.text, fontSize: 18 }}>
                   {isFound ? '✓' : '?'}
                 </Text>
               </Pressable>
             );
           })}
        </Surface>

        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>已发现线索:</Text>
          {currentItem.clues.map(c => (
            <View key={c.id} style={{ padding: 8, backgroundColor: colors.surface, borderRadius: colors.radius.md, marginBottom: 8 }}>
              <Text style={{ color: foundClues[c.id] ? colors.text : colors.muted }}>
                {c.name}: {foundClues[c.id] ? c.hint : "???"}
              </Text>
            </View>
          ))}
        </View>

        <Button
          label={allCluesFound ? "开始估价揭晓" : "跳过线索，直接出结果"}
          onPress={handleAppraise}
          intent="brand"
        />
      </ScrollView>

      {/* Result Modal representation using Surface absolute positioning since Modal might need special handling, but ConfirmDialog is better. Actually let's use standard Conditional Rendering for a Full Screen overlay or just simple view change to avoid complexity with Modal. */}
      {showResult && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.canvas, paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: insets.bottom, justifyContent: 'center' }]}>
          <Surface tone="raised" style={{ padding: 24, borderRadius: colors.radius.lg }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: currentItem.isReal ? colors.greenText : colors.redText, textAlign: 'center', marginBottom: 16 }}>
              鉴定结果: {currentItem.isReal ? "真品！" : "一眼假！"}
            </Text>
            <View style={{ marginBottom: 16 }}>
               <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>估价:</Text>
               <Text style={{ color: colors.text, fontSize: 20, marginTop: 4 }}>{currentItem.estimatedValue}</Text>
            </View>
            <View style={{ marginBottom: 24 }}>
               <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>真实来历:</Text>
               <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>{currentItem.originStory}</Text>
            </View>

            <Button label="鉴定下一件" onPress={nextItem} intent="brand" />
          </Surface>
        </View>
      )}
    </View>
  );
}