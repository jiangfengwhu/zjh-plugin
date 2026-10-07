import React, { useState, useRef, useEffect } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, Input, Button, Surface, useTheme, Icon, Pressy } from "@zijinhua/app-sdk/ui";
import { getAppContext, AiMessage } from "@zijinhua/app-sdk";
import { PetState, getPetEmotion } from "./store";

type Message = {
  id: string;
  role: "user" | "pet";
  text: string;
};

export function ChatScreen({ state, onClose }: { state: PetState; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<any>(null);

  const emotion = getPetEmotion(state);
  const emotionText = {
    happy: "开心",
    neutral: "平静",
    sad: "难过",
    sleepy: "困倦"
  }[emotion];

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");

    const newMsg: Message = { id: Date.now().toString(), role: "user", text: userText };
    setMessages(prev => [...prev, newMsg]);
    setLoading(true);

    const app = getAppContext();

    const systemPrompt = `你现在是一只名叫${state.name}的${state.breed}。
你的当前状态是：
- 心情: ${state.mood}/100 (${emotionText})
- 健康: ${state.health}/100
- 活力: ${state.energy}/100

请根据你当前的状态和性格（可爱、治愈、带点小傲娇或者粘人），以第一人称回复主人的话。
回复要简短自然，像宠物一样，可以带有动作描写（用括号表示，例如：(摇摇尾巴)）。`;

    const aiMessages: AiMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-5).map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text } as AiMessage)),
      { role: "user", content: userText }
    ];

    try {
      const result = await app.ai.complete({ messages: aiMessages });

      if (result.ok) {
        setMessages(prev => [...prev, { id: Date.now().toString() + "_pet", role: "pet", text: result.text }]);
      } else {
        app.toast.show("似乎没有听懂呢...", "error");
      }
    } catch (e) {
      app.toast.show("网络好像有点问题", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.canvas }]}>
      <Surface style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 10, backgroundColor: theme.colors.surface }]}>
        <Pressy onPress={onClose} style={styles.backButton}>
          <Icon name="back" color={theme.colors.text} />
        </Pressy>
        <Text variant="title">和 {state.name} 聊天</Text>
        <View style={styles.placeholder} />
      </Surface>

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(msg => (
          <View key={msg.id} style={[styles.messageRow, msg.role === "user" ? styles.messageRowUser : styles.messageRowPet]}>
            <Surface
              tone="raised"
              radius={16}
              style={[
                styles.messageBubble,
                { backgroundColor: msg.role === "user" ? theme.colors.accent : theme.colors.surfaceRaised }
              ]}
            >
              <Text style={{ color: msg.role === "user" ? theme.colors.onAccent : theme.colors.text }}>
                {msg.text}
              </Text>
            </Surface>
          </View>
        ))}
        {loading && (
          <View style={styles.messageRowPet}>
            <Surface tone="raised" radius={16} style={[styles.messageBubble, { backgroundColor: theme.colors.surfaceRaised }]}>
              <Text style={{ color: theme.colors.muted }}>思考中...</Text>
            </Surface>
          </View>
        )}
      </ScrollView>

      <Surface tone="raised" style={[styles.inputArea, { paddingBottom: insets.bottom + 16, backgroundColor: theme.colors.surface }]}>
        <Input
          value={input}
          onChangeText={setInput}
          placeholder="对它说点什么..."
          onSubmitEditing={handleSend}
          returnKeyType="send"
          containerStyle={{ flex: 1, marginRight: 12 }}
        />
        <Button label="发送" intent="brand" variant="solid" onPress={handleSend} busy={loading} disabled={!input.trim()} />
      </Surface>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  placeholder: {
    width: 40,
  },
  chatArea: {
    flex: 1,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowPet: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputArea: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
    alignItems: "center",
  }
});
