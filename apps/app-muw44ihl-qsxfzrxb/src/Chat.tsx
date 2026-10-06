import React, { useState } from "react";
import { View, FlatList, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Text, Input, Button, Surface, useTheme, RichMarkdown } from "@zijinhua/app-sdk/ui";
import { useTransactions } from "./store";
import { askDataQuestion } from "./ai";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function Chat() {
  const { colors } = useTheme();
  const transactions = useTransactions();
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);

  const handleAsk = async () => {
    if (!inputText.trim()) return;

    const question = inputText.trim();
    const newUserMsg: ChatMessage = { id: Math.random().toString(), role: "user", content: question };
    setMessages(prev => [...prev, newUserMsg]);
    setInputText("");
    setIsAsking(true);

    const answer = await askDataQuestion(question, transactions);

    const newAssistantMsg: ChatMessage = { id: Math.random().toString(), role: "assistant", content: answer };
    setMessages(prev => [...prev, newAssistantMsg]);
    setIsAsking(false);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View style={{ flexDirection: isUser ? "row-reverse" : "row", marginBottom: 16 }}>
        <Surface
          tone={isUser ? "raised" : "inset"}
          radius={colors.radius.lg}
          style={{
            maxWidth: "80%",
            padding: 12,
            backgroundColor: isUser ? colors.accent : colors.surface,
          }}
        >
          {isUser ? (
            <Text style={{ color: colors.onAccent }}>{item.content}</Text>
          ) : (
            <RichMarkdown markdown={item.content} selectable />
          )}
        </Surface>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <FlatList
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>
              有什么想问的？{"\n"}例如：“我上个月餐饮花了多少钱？”
            </Text>
          </View>
        }
      />

      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Input
          value={inputText}
          onChangeText={setInputText}
          placeholder="问问你的账单..."
          containerStyle={{ flex: 1 }}
        />
        <Button
          label="发送"
          onPress={handleAsk}
          busy={isAsking}
          disabled={!inputText.trim()}
        />
      </View>
    </View>
  );
}
