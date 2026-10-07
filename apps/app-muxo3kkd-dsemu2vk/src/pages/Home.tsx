import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { getAppContext } from "@zijinhua/app-sdk";
import { useTheme, Button } from "@zijinhua/app-sdk/ui";
import { MoodType, MoodRecord, getMoodRecords, saveMoodRecord, MOOD_COLORS, MOOD_LABELS } from "../store";
import { Smile, Meh, Frown, Angry, CloudRain, Wind } from "lucide-react-native";

export function Home() {
  const { colors } = useTheme();
  const ctx = getAppContext();
  const [todayRecord, setTodayRecord] = useState<MoodRecord | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [note, setNote] = useState("");

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
          <Text style={{ color: colors.muted, marginBottom: 8 }}>写点什么（选填）</Text>
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
