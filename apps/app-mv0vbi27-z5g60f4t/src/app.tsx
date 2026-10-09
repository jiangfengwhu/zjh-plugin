import React, { useState, useEffect } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, Text, Surface, Input, Button, EmptyState } from "@zijinhua/app-sdk/ui";
import { getAppContext } from "@zijinhua/app-sdk";
import { FlashList } from "@shopify/flash-list";

type WordItem = {
  id: string;
  word: string;
  definition: string;
  example: string;
};

const STORAGE_KEY = "vocabulary_list";

export default function App() {
  const { colors } = useTheme();
  const app = getAppContext();

  const [words, setWords] = useState<WordItem[]>([]);
  const [newWord, setNewWord] = useState("");
  const [newDefinition, setNewDefinition] = useState("");
  const [newExample, setNewExample] = useState("");

  useEffect(() => {
    const loadWords = async () => {
      try {
        const stored = app.storage.get(STORAGE_KEY);
        if (stored) {
          setWords(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Failed to load words", e);
      }
    };
    loadWords();
  }, []);

  const saveWords = (newWords: WordItem[]) => {
    setWords(newWords);
    app.storage.set(STORAGE_KEY, JSON.stringify(newWords));
  };

  const handleAddWord = () => {
    if (!newWord.trim() || !newDefinition.trim()) {
      app.toast.show("请输入单词和释义", "error");
      return;
    }

    const item: WordItem = {
      id: Date.now().toString(),
      word: newWord.trim(),
      definition: newDefinition.trim(),
      example: newExample.trim(),
    };

    saveWords([item, ...words]);
    setNewWord("");
    setNewDefinition("");
    setNewExample("");
    app.haptics.trigger("notificationSuccess");
    app.toast.show("添加成功", "success");
  };

  const handleDeleteWord = (id: string) => {
    const updatedWords = words.filter(w => w.id !== id);
    saveWords(updatedWords);
    app.haptics.trigger("impactLight");
  };

  const renderItem = ({ item }: { item: WordItem }) => (
    <Surface tone="base" radius={colors.radius.md} style={{ marginBottom: colors.spacing.item, padding: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text variant="title" style={{ color: colors.text, marginBottom: 4 }}>{item.word}</Text>
          <Text style={{ color: colors.muted, marginBottom: item.example ? 8 : 0 }}>{item.definition}</Text>
          {item.example ? (
            <Text variant="caption" style={{ color: colors.ink1, fontStyle: "italic" }}>例句: {item.example}</Text>
          ) : null}
        </View>
        <Button
          label="删除"
          intent="danger"
          variant="ghost"
          onPress={() => handleDeleteWord(item.id)}
        />
      </View>
    </Surface>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ padding: colors.spacing.page, paddingBottom: 0 }}>
          <Text variant="title" style={{ color: colors.text, marginBottom: colors.spacing.section }}>我的单词本</Text>

          <Surface tone="raised" radius={colors.radius.lg} style={{ padding: 16, marginBottom: colors.spacing.section }}>
            <Input
              placeholder="输入单词"
              value={newWord}
              onChangeText={setNewWord}
              style={{ marginBottom: colors.spacing.item }}
            />
            <Input
              placeholder="输入释义"
              value={newDefinition}
              onChangeText={setNewDefinition}
              style={{ marginBottom: colors.spacing.item }}
            />
            <Input
              placeholder="输入例句（可选）"
              value={newExample}
              onChangeText={setNewExample}
              style={{ marginBottom: colors.spacing.item }}
            />
            <Button label="添加单词" intent="brand" onPress={handleAddWord} />
          </Surface>
        </View>

        <View style={{ flex: 1, paddingHorizontal: colors.spacing.page }}>
          <FlashList
            data={words}
            renderItem={renderItem}
            keyExtractor={item => item.id}

            ListEmptyComponent={
              <EmptyState style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 }}>
                <Text style={{ color: colors.muted }}>还没有添加任何单词哦</Text>
              </EmptyState>
            }
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
