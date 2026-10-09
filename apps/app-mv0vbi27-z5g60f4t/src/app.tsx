import React, { useState, useEffect, useRef } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, Text, Surface, Input, Button, EmptyState, Icon, Loading } from "@zijinhua/app-sdk/ui";
import { getAppContext } from "@zijinhua/app-sdk";
import { FlashList } from "@shopify/flash-list";

type WordItem = {
  id: string;
  word: string;
  phonetic: string;
  definition: string;
  example: string;
  exampleTranslation: string;
};

const STORAGE_KEY = "vocabulary_list";

export default function App() {
  const { colors } = useTheme();
  const app = getAppContext();
  const insets = useSafeAreaInsets();

  const [words, setWords] = useState<WordItem[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadWords = () => {
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

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const saveWords = (newWords: WordItem[]) => {
    setWords(newWords);
    app.storage.set(STORAGE_KEY, JSON.stringify(newWords));
  };

  const handleGenerateWord = async () => {
    const input = searchInput.trim();
    if (!input) {
      app.toast.show("请输入想要学习的中文", "error");
      return;
    }

    setIsLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const prompt = `你是一个专业的英语教师。用户输入了一个中文词汇或短语："${input}"。
请将其翻译成最常用、最地道的英语单词或短语，并提供音标、释义和一个包含该词的实用英文例句及其相应的中文翻译。
你的回复必须是一个严格的 JSON 对象，不能包含任何其他文本、markdown 格式或代码块标记，其结构如下：
{
  "word": "英文单词",
  "phonetic": "音标(如 /wɜːd/)",
  "definition": "中文释义",
  "example": "英文例句",
  "exampleTranslation": "例句的中文翻译"
}`;

      const response = await app.ai.complete(
        {
          messages: [{ role: "user", content: prompt }],
        },
        { signal: abortControllerRef.current.signal }
      );

      if (response.ok) {
        let text = response.text.trim();
        if (text.startsWith("\`\`\`json")) {
          text = text.replace(/^\`\`\`json/i, "").replace(/\`\`\`$/i, "").trim();
        } else if (text.startsWith("\`\`\`")) {
          text = text.replace(/^\`\`\`/i, "").replace(/\`\`\`$/i, "").trim();
        }

        try {
          const parsedData = JSON.parse(text);
          if (parsedData.word && parsedData.definition) {
            const newItem: WordItem = {
              id: Date.now().toString(),
              word: parsedData.word,
              phonetic: parsedData.phonetic || "",
              definition: parsedData.definition,
              example: parsedData.example || "",
              exampleTranslation: parsedData.exampleTranslation || "",
            };
            saveWords([newItem, ...words]);
            setSearchInput("");
            app.haptics.trigger("notificationSuccess");
          } else {
             app.toast.show("生成失败：返回格式不正确", "error");
          }
        } catch (parseError) {
          console.error("JSON parse error:", parseError, text);
          app.toast.show("解析生成结果失败，请重试", "error");
        }
      } else {
        if (response.code !== "CANCELLED") {
           app.toast.show(`生成失败：${response.error}`, "error");
        }
      }
    } catch (e) {
      console.error("Generation error", e);
      app.toast.show("发生未知错误", "error");
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleDeleteWord = (id: string) => {
    const updatedWords = words.filter(w => w.id !== id);
    saveWords(updatedWords);
    app.haptics.trigger("impactLight");
  };

  const handleSpeak = (word: string) => {
    app.phone.speak(word);
    app.haptics.trigger("selection");
  };

  const renderItem = ({ item }: { item: WordItem }) => (
    <Surface tone="raised" radius={colors.radius.lg} style={{ marginBottom: colors.spacing.item, padding: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
            <Text variant="title" style={{ color: colors.text, fontSize: 22, fontWeight: "bold" }}>{item.word}</Text>
            {!!item.phonetic && (
              <Text style={{ color: colors.muted, fontSize: 16 }}>{item.phonetic}</Text>
            )}
            <Pressable
              onPress={() => handleSpeak(item.word)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                padding: 4,
                backgroundColor: colors.surface,
                borderRadius: colors.radius.pill,
              })}
            >
              <Text style={{fontSize: 16}}>🔊</Text>
            </Pressable>
          </View>

          <Text style={{ color: colors.ink2, fontSize: 16, marginBottom: item.example ? 12 : 0, fontWeight: "500" }}>
            {item.definition}
          </Text>

          {item.example ? (
            <Surface tone="inset" radius={colors.radius.md} style={{ padding: 12, backgroundColor: colors.canvas }}>
              <Text style={{ color: colors.text, marginBottom: 4, fontStyle: "italic", lineHeight: 20 }}>
                {item.example}
              </Text>
              {!!item.exampleTranslation && (
                 <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
                   {item.exampleTranslation}
                 </Text>
              )}
            </Surface>
          ) : null}
        </View>

        <Pressable
          onPress={() => handleDeleteWord(item.id)}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            padding: 8,
          })}
        >
           <Text style={{color: colors.redText, fontSize: 20}}>×</Text>
        </Pressable>
      </View>
    </Surface>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ padding: colors.spacing.page, paddingBottom: 0 }}>
          <Text variant="title" style={{ color: colors.text, marginBottom: 8, fontSize: 28, fontWeight: "800" }}>AI 单词本</Text>
          <Text style={{ color: colors.muted, marginBottom: colors.spacing.section }}>输入中文，自动为你生成地道表达及例句</Text>

          <Surface tone="base" radius={colors.radius.lg} style={{ padding: 16, marginBottom: colors.spacing.section }}>
            <Input
              placeholder="例如：打发时间、内卷..."
              value={searchInput}
              onChangeText={setSearchInput}
              style={{ marginBottom: colors.spacing.item }}
              onSubmitEditing={handleGenerateWord}
              returnKeyType="send"
              editable={!isLoading}
            />
            <Button
              label={isLoading ? "生成中..." : "自动记单词"}
              intent="brand"
              busy={isLoading}
              onPress={handleGenerateWord}
              disabled={isLoading || !searchInput.trim()}
            />
          </Surface>
        </View>

        <View style={{ flex: 1, paddingHorizontal: colors.spacing.page, paddingBottom: insets.bottom }}>
          <FlashList
            data={words}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              <EmptyState style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 }}>
                <Text style={{ color: colors.muted, fontSize: 60, marginBottom: 16 }}>📖</Text>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>单词本空空如也</Text>
                <Text style={{ color: colors.muted, textAlign: "center" }}>在上方输入你想学习的中文词汇，{"\n"}让 AI 帮你生成英文卡片吧！</Text>
              </EmptyState>
            }
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
