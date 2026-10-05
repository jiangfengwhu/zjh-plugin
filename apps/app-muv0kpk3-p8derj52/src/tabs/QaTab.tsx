import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTheme, PromptBar, Surface } from "@zijinhua/app-sdk/ui";
import { getAppContext } from "@zijinhua/app-sdk";
import { useTransactions } from "../store";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function QaTab() {
  const { colors } = useTheme();
  const transactions = useTransactions();
  const ctx = getAppContext();

  const [inputText, setInputText] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "你好！我是你的记账助手。你可以问我关于你的账单的问题，比如“我这个月花了多少钱？”或者“我在餐饮上花费了多少？”。" }
  ]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsBusy(true);

    try {
      // Summarize transactions to save tokens
      const txSummary = transactions.slice(0, 100).map(tx =>
        `[${tx.date}] ${tx.type === 'expense' ? '支出' : '收入'} ${tx.amount}元, 类别:${tx.category}, 描述:${tx.description}`
      ).join('\n');

      const systemPrompt = `你是一个智能记账助手，能根据用户的账单数据回答问题。
你的回答应该简明扼要，有礼貌。如果用户问的问题与账单无关，你可以礼貌地引导他们问账单相关的问题。
这是用户最近的账单记录：
${txSummary || "暂无记录"}
`;

      const aiMessages = [
        { role: "system" as const, content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: text }
      ];

      const result = await ctx.ai.complete({
        messages: aiMessages
      });

      if (result.ok) {
        const assistantMsg: Message = { id: Date.now().toString(), role: "assistant", content: result.text };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        ctx.toast.show(`AI 请求失败: ${result.error}`, "error");
      }
    } catch (e) {
      ctx.toast.show("发生错误", "error");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                isUser ? styles.userBubble : styles.assistantBubble,
                { backgroundColor: isUser ? colors.accent : colors.surface }
              ]}
            >
              <Text style={{ color: isUser ? colors.onAccent : colors.text }}>
                {msg.content}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.inputContainer}>
        <PromptBar
          value={inputText}
          onChange={setInputText}
          onSend={handleSend}
          busy={isBusy}
          placeholder="问问你的账单..."
          variant="Rounded"
          providers={[]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    maxWidth: "80%",
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  inputContainer: {
    padding: 16,
  }
});
