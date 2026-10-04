import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, ScrollView, Alert } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getAppContext } from "@zijinhua/app-sdk";
import {
  Screen,
  PageHeader,
  Surface,
  Pressy,
  useTheme,
} from "@zijinhua/app-sdk/ui";
import { store, DraftEntry } from "../store";

const MOODS = [
  { label: "开心", icon: "😃", value: "happy" },
  { label: "平静", icon: "😐", value: "calm" },
  { label: "难过", icon: "😢", value: "sad" },
  { label: "愤怒", icon: "😡", value: "angry" },
  { label: "焦虑", icon: "😰", value: "anxious" },
];

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type RootStackParamList = {
  Home: undefined;
  Editor: { id?: string };
};

export default function EditorScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const ctx = getAppContext();
  const { colors } = useTheme();

  const id = route.params?.id as string | undefined;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(getTodayString());
  const [mood, setMood] = useState("");
  const [body, setBody] = useState("");

  const draftKey = useRef(id || "new").current;
  const isInitialMount = useRef(true);

  // Load entry or draft
  useEffect(() => {
    let loaded = false;

    // First, check if there's a draft
    const draft = store.getDraft(draftKey);
    if (draft) {
      setTitle(draft.title);
      setBody(draft.body);
      setMood(draft.mood);
      setDate(draft.date);
      loaded = true;
    }

    // If editing existing and no draft was loaded, load from store
    if (!loaded && id) {
      const diaries = store.getDiaries();
      const entry = diaries.find(d => d.id === id);
      if (entry) {
        setTitle(entry.title);
        setBody(entry.body);
        setMood(entry.mood);
        setDate(entry.date);
      }
    }
  }, [id, draftKey]);

  // Auto-save draft
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setInterval(() => {
      // Only save draft if there is some content
      if (title.trim() || body.trim()) {
        store.saveDraft(draftKey, {
          title,
          body,
          mood,
          date,
        });
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [title, body, mood, date, draftKey]);

  const handleSave = () => {
    if (!body.trim() && !title.trim()) {
      ctx.toast.show("标题和正文不能同时为空", "warning" as any);
      return;
    }

    store.saveDiary({
      id,
      title: title.trim(),
      body: body.trim(),
      mood,
      date: date.trim() || getTodayString(),
    });

    store.clearDraft(draftKey);
    ctx.toast.show("日记已保存", "success");
    navigation.goBack();
  };

  const handleGoBack = () => {
    if (title.trim() || body.trim()) {
      // It will auto save draft on unmount technically or by interval,
      // but let's save immediately just in case
      store.saveDraft(draftKey, { title, body, mood, date });
    }
    navigation.goBack();
  };

  return (
    // @ts-ignore
    <Screen edges={["bottom", "left", "right"]} style={{ backgroundColor: colors.canvas }}>
      <PageHeader
        title={id ? "编辑日记" : "新建日记"}
        onBack={handleGoBack}
        right={
          <Pressy onPress={handleSave} style={{ padding: 8 }}>
            <Text style={{ color: colors.accent, fontSize: 16, fontWeight: "600" }}>保存</Text>
          </Pressy>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ marginBottom: 16 }}>
          <TextInput
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: colors.text,
              padding: 0, // remove default padding on android
            }}
            placeholder="标题（可选）"
            placeholderTextColor={colors.muted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <Text style={{ color: colors.muted, fontSize: 14, marginRight: 8 }}>日期：</Text>
          <TextInput
            style={{
              fontSize: 14,
              color: colors.text,
              backgroundColor: colors.field,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
              minWidth: 100,
            }}
            value={date}
            onChangeText={setDate}
          />
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 8 }}>心情标签：</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {MOODS.map((m) => (
              <Pressy
                key={m.value}
                onPress={() => setMood(mood === m.label ? "" : m.label)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: mood === m.label ? colors.accentSoft : colors.field,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 16,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: mood === m.label ? colors.accent : "transparent",
                }}
              >
                <Text style={{ fontSize: 16, marginRight: 4 }}>{m.icon}</Text>
                <Text style={{ color: mood === m.label ? colors.accentText : colors.text, fontSize: 14 }}>
                  {m.label}
                </Text>
              </Pressy>
            ))}
          </ScrollView>
        </View>

        <TextInput
          style={{
            fontSize: 16,
            color: colors.text,
            minHeight: 300,
            textAlignVertical: "top",
          }}
          placeholder="开始记录今天的故事..."
          placeholderTextColor={colors.muted}
          multiline
          value={body}
          onChangeText={setBody}
        />
      </ScrollView>
    </Screen>
  );
}
