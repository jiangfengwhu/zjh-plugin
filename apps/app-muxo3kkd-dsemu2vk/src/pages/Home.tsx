import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { getAppContext } from "@zijinhua/app-sdk";
import { useTheme, Button } from "@zijinhua/app-sdk/ui";
import { MoodType, MoodRecord, getMoodRecords, saveMoodRecord, MOOD_COLORS, MOOD_LABELS } from "../store";
import { Smile, Meh, Frown, Angry, CloudRain, Wind, Sparkles } from "lucide-react-native";

export function Home() {
  const { colors } = useTheme();
  const ctx = getAppContext();
  const [todayRecord, setTodayRecord] = useState<MoodRecord | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [note, setNote] = useState("");
  const [isPolishing, setIsPolishing] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  const loadTodayRecord = async () => {
    const records = await getMoodRecords();
    const found = records.find(r => r.date === todayStr);
    if (found) {
      setTodayRecord(found);
      setSelectedMood(found.mood);
      setNote(found.note || "");
    }
  };

  useEffect(() => {
    loadTodayRecord();
  }, []);

  const handlePolish = async () => {
    if (!note.trim()) {
      ctx.toast.show("请先输入日记内容", "info");
      return;
    }
    if (!selectedMood) {
      ctx.toast.show("请先选择一个心情", "info");
      return;
    }

    setIsPolishing(true);
    const abortController = new AbortController();

    try {
      const result = await ctx.ai.complete({
        messages: [
          {
            role: 'user',
            content: `请帮我润色以下日记，以更好地表达我当前"${MOOD_LABELS[selectedMood]}"的心情。使其自然、有共鸣、更富有情感表达。直接输出润色后的文本即可，不要包含多余的解释。原文：${note}`
          }
        ]
      }, { signal: abortController.signal });

      if (result.ok) {
        setNote(result.text);
        ctx.toast.show("润色成功", "success");
      } else {
        if (result.error !== 'CANCELLED' && result.code !== 'CANCELLED') {
           ctx.toast.show("润色失败，请稍后重试", "error");
        }
      }
    } catch (e) {
      ctx.toast.show("润色发生错误", "error");
    } finally {
      setIsPolishing(false);
    }
  };

  const handleSave = async () => {
    if (!selectedMood) {
      ctx.toast.show("请先选择一个心情", "info");
      return;
    }

    const record: MoodRecord = {
      id: todayRecord?.id || Date.now().toString(),
      date: todayStr,
      timestamp: Date.now(),
      mood: selectedMood,
      note: note.trim()
    };

    await saveMoodRecord(record);
    setTodayRecord(record);
    ctx.toast.show("心情记录已保存", "success");
  };

  const getIcon = (mood: MoodType, size = 32, color = colors.text) => {
    switch (mood) {
      case 'happy': return <Smile size={size} color={color} />;
      case 'calm': return <Meh size={size} color={color} />;
      case 'anxious': return <Wind size={size} color={color} />;
      case 'sad': return <CloudRain size={size} color={color} />;
      case 'angry': return <Angry size={size} color={color} />;
      case 'tired': return <Frown size={size} color={color} />;
    }
  };

  const moods: MoodType[] = ['happy', 'calm', 'anxious', 'sad', 'angry', 'tired'];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 24 }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: "bold", marginBottom: 8 }}>
          今天感觉怎么样？
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 16 }}>
          {moods.map((m) => {
            const isSelected = selectedMood === m;
            return (
              <Pressable
                key={m}
                onPress={() => setSelectedMood(m)}
                style={{
                  width: '30%',
                  aspectRatio: 1,
                  backgroundColor: isSelected ? MOOD_COLORS[m] : colors.surface,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: isSelected ? 0 : 1,
                  borderColor: colors.line,
                }}
              >
                {getIcon(m, 32, isSelected ? "#fff" : colors.text)}
                <Text style={{ color: isSelected ? "#fff" : colors.text, marginTop: 8, fontSize: 14 }}>
                  {MOOD_LABELS[m]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ color: colors.muted }}>写点什么（选填）</Text>
            <Pressable
              onPress={handlePolish}
              disabled={isPolishing || !note.trim()}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                opacity: (isPolishing || !note.trim()) ? 0.5 : 1
              }}
            >
              <Sparkles size={16} color={colors.accentText} />
              <Text style={{ color: colors.accentText, fontSize: 14 }}>
                {isPolishing ? "润色中..." : "AI 润色"}
              </Text>
            </Pressable>
          </View>
          <TextInput
            style={{
              backgroundColor: colors.surface,
              color: colors.text,
              borderRadius: 12,
              padding: 16,
              minHeight: 100,
              textAlignVertical: "top",
              borderWidth: 1,
              borderColor: colors.line,
            }}
            placeholder="今天发生了什么事？"
            placeholderTextColor={colors.muted}
            multiline
            value={note}
            onChangeText={setNote}
          />
        </View>

        <Button
          intent="brand"
          onPress={handleSave}
          style={{ marginTop: 16 }}
          label={todayRecord ? "更新记录" : "保存心情"}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
