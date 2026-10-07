import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, Text, Icon, Input, TextInput } from "@zijinhua/app-sdk/ui";
import { getAppContext } from "@zijinhua/app-sdk";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

import { RootStackParamList } from "../app";
import { store } from "../store";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Edit">;
  route: RouteProp<RootStackParamList, "Edit">;
};

export default function Edit({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const editDiary = route.params?.diary;

  const [title, setTitle] = useState(editDiary?.title || "");
  const [content, setContent] = useState(editDiary?.content || "");
  const [date, setDate] = useState(new Date(editDiary?.date || Date.now()));

  useEffect(() => {
    if (!editDiary) {
      loadDraft();
    }
  }, []);

  const loadDraft = async () => {
    const draft = await store.getDraft();
    if (draft) {
      if (draft.title) setTitle(draft.title);
      if (draft.content) setContent(draft.content);
      if (draft.date) setDate(new Date(draft.date));
    }
  };

  const saveDraftIfNeeded = async () => {
    if (!editDiary && (title.trim() || content.trim())) {
      await store.saveDraft({ title, content, date: date.getTime() });
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      getAppContext().toast.show("内容不能为空", "error");
      return;
    }

    const id = editDiary?.id || Math.random().toString(36).substring(2, 15);
    await store.saveDiary({
      id,
      title: title.trim(),
      content: content.trim(),
      date: date.getTime(),
    });

    if (!editDiary) {
      await store.clearDraft();
    }

    getAppContext().toast.show("保存成功", "success");
    navigation.goBack();
  };

  const handleCancel = () => {
    saveDraftIfNeeded();
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.line }]}>
        <TouchableOpacity onPress={handleCancel}>
          <Icon name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text variant="title" style={{ color: colors.text }}>
          {editDiary ? "编辑日记" : "写日记"}
        </Text>
        <TouchableOpacity onPress={handleSave}>
          <Icon name="check" size={24} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Input
          placeholder="标题 (可选)"
          value={title}
          onChangeText={setTitle}
          containerStyle={styles.titleInput}
        />

        <View style={[styles.dateSelector, { borderBottomColor: colors.line }]}>
          <Icon name="clock" size={20} color={colors.muted} />
          <Text style={{ color: colors.text, marginLeft: 8 }}>
            {`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`}
          </Text>
        </View>

        <TextInput
          placeholder="开始记录..."
          value={content}
          onChangeText={setContent}
          multiline
          style={[styles.textArea, { color: colors.text }]}
          textAlignVertical="top"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    padding: 24,
    flexGrow: 1,
  },
  titleInput: {
    marginBottom: 20,
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    marginBottom: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textArea: {
    flex: 1,
    minHeight: 300,
    fontSize: 17,
    lineHeight: 30,
    letterSpacing: 0.3,
  },
});
