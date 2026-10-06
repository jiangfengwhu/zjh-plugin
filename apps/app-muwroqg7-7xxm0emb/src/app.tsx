import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAppContext } from "@zijinhua/app-sdk";
import { useTheme, Button, Pressy } from "@zijinhua/app-sdk/ui";

const MOODS = [
  { emoji: "😊", label: "开心" },
  { emoji: "😌", label: "平静" },
  { emoji: "😢", label: "伤心" },
  { emoji: "😠", label: "生气" },
  { emoji: "🤩", label: "惊喜" },
];

export default function App() {
  const ctx = getAppContext();
  const { colors } = useTheme();

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const handleShare = () => {
    if (!selectedMood) {
      ctx.toast.show("请选择一个心情", "error");
      return;
    }

    const moodObj = MOODS.find((m) => m.emoji === selectedMood);
    const label = moodObj ? moodObj.label : "";

    const html = `
      <div style="text-align: center; padding: 24px 16px; background-color: ${colors.surface}; border-radius: 16px;">
        <div style="font-size: 64px; line-height: 1.2; padding: 12px 0;">${selectedMood}</div>
        <div style="font-size: 18px; font-weight: bold; color: ${colors.text}; margin-bottom: 12px;">今天的心情是：${label}</div>
        ${note ? `<div style="font-size: 16px; color: ${colors.muted}; background-color: ${colors.canvas}; padding: 12px; border-radius: 8px; text-align: left;">${note}</div>` : ""}
      </div>
    `;

    ctx.feed.compose({ html });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ flex: 1, padding: 24, gap: 24 }}>
        <Pressable accessibilityRole="button" onPress={ctx.navigation.back} style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={{ color: colors.accentText, fontSize: 16 }}>返回</Text>
        </Pressable>

        <View style={{ gap: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.text }}>今天感觉怎么样？</Text>

          <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            {MOODS.map((mood) => {
              const isSelected = selectedMood === mood.emoji;
              return (
                <Pressy
                  key={mood.emoji}
                  onPress={() => {
                    setSelectedMood(mood.emoji);
                    ctx.haptics.trigger("selection");
                  }}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: isSelected ? colors.accent : colors.surface,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: isSelected ? 0 : 1,
                    borderColor: colors.line,
                  }}
                >
                  <Text style={{ fontSize: 32 }}>{mood.emoji}</Text>
                </Pressy>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 8, flex: 1 }}>
          <Text style={{ fontSize: 16, color: colors.muted }}>记录一下此刻的想法吧（可选）</Text>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 16,
              color: colors.text,
              fontSize: 16,
              borderWidth: 1,
              borderColor: colors.line,
              textAlignVertical: "top",
            }}
            multiline
            placeholder="写点什么..."
            placeholderTextColor={colors.muted}
            value={note}
            onChangeText={setNote}
          />
        </View>

        <Button
          label="分享到动态"
          intent="brand"
          onPress={handleShare}
          disabled={!selectedMood}
        />
      </View>
    </SafeAreaView>
  );
}