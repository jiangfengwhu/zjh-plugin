import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAppContext } from "@zijinhua/app-sdk";
import { useTheme, Button, TextInput, Icon } from "@zijinhua/app-sdk/ui";

const MOODS = [
  { id: "happy", emoji: "😊", label: "开心", color: "#FFD700" },
  { id: "calm", emoji: "😌", label: "平静", color: "#98FB98" },
  { id: "sad", emoji: "😢", label: "伤心", color: "#87CEFA" },
  { id: "angry", emoji: "😠", label: "生气", color: "#FA8072" },
  { id: "tired", emoji: "😴", label: "疲惫", color: "#DDA0DD" }
];

export default function App() {
  const ctx = getAppContext();
  const { colors } = useTheme();
  const [selectedMood, setSelectedMood] = useState(MOODS[0]);
  const [text, setText] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const html = `
        <div style="background-color: ${selectedMood.color}20; border-radius: 16px; padding: 20px; text-align: center; border: 1px solid ${selectedMood.color}40;">
          <div style="font-size: 48px; margin-bottom: 12px;">${selectedMood.emoji}</div>
          <div style="font-size: 18px; font-weight: bold; color: ${selectedMood.color}; margin-bottom: 16px;">
            今天的心情是：${selectedMood.label}
          </div>
          ${text ? `<div style="font-size: 16px; color: #333; line-height: 1.5; background: rgba(255,255,255,0.8); padding: 12px; border-radius: 8px;">${text}</div>` : ''}
          <div style="font-size: 12px; color: #999; margin-top: 16px;">
            来自 心情日记
          </div>
        </div>
      `;

      await ctx.feed.compose({
        html
      });
    } catch (e) {
      console.error(e);
      ctx.toast.show("分享失败", "error");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Pressable accessibilityRole="button" onPress={ctx.navigation.back} style={{ padding: 8, marginLeft: -8 }}>
          <Text style={{ color: colors.text, fontSize: 16 }}>返回</Text>
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: colors.text, marginRight: 32 }}>
          心情日记
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 24 }}>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>
            你现在感觉怎么样？
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {MOODS.map(mood => (
              <Pressable
                key={mood.id}
                onPress={() => {
                  setSelectedMood(mood);
                  ctx.haptics.trigger('selection');
                }}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 24,
                  backgroundColor: selectedMood.id === mood.id ? mood.color : colors.surface,
                  borderWidth: 1,
                  borderColor: selectedMood.id === mood.id ? mood.color : colors.line,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 20 }}>{mood.emoji}</Text>
                <Text style={{
                  fontSize: 14,
                  color: selectedMood.id === mood.id ? '#000' : colors.text,
                  fontWeight: selectedMood.id === mood.id ? 'bold' : 'normal'
                }}>
                  {mood.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>
            写点什么吧...
          </Text>
          <TextInput
            multiline
            placeholder="今天发生了什么事让你有这样的心情？"
            value={text}
            onChangeText={setText}
            style={{
              minHeight: 120,
              textAlignVertical: 'top'
            }}
          />
        </View>

        <Button
          label="分享到动态"
          onPress={handleShare}
          disabled={isSharing}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
