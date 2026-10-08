import React, { useState, useRef } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, Button, Surface, useTheme, Loading, Input, Icon } from "@zijinhua/app-sdk/ui";
import { getAppContext, AiMessage } from "@zijinhua/app-sdk";
import { usePetState, getPetEmotion } from "./store";
import { PetAvatar, InteractionType } from "./PetAvatar";

type Message = {
  id: string;
  role: "user" | "pet";
  text: string;
};

export default function App() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const app = getAppContext();
  const { state, updateState, initialized } = usePetState();

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [interaction, setInteraction] = useState<InteractionType>("none");
  const scrollViewRef = useRef<any>(null);

  if (!initialized) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.canvas, justifyContent: "center", alignItems: "center" }]}>
        <Loading label="唤醒中..." />
      </View>
    );
  }

  const emotion = getPetEmotion(state);
  const emotionText = {
    happy: "开心",
    neutral: "平静",
    sad: "难过",
    sleepy: "困倦"
  }[emotion];

  const handleAction = (action: "feed" | "play" | "clean" | "sleep") => {
    app.haptics.trigger("impactMedium");
    setInteraction(action);
    setTimeout(() => {
      setInteraction("none");
    }, 1500); // Reset interaction state after animation

    updateState(prev => {
      let next = { ...prev };
      switch (action) {
        case "feed":
          next.health = Math.min(100, next.health + 20);
          next.energy = Math.min(100, next.energy + 10);
          app.toast.show("喂食成功！健康度上升", "success");
          break;
        case "play":
          if (next.energy < 20) {
            app.toast.show("太累了，不想玩...", "error");
            return next;
          }
          next.mood = Math.min(100, next.mood + 20);
          next.energy = Math.max(0, next.energy - 15);
          app.toast.show("玩得很开心！心情上升", "success");
          break;
        case "clean":
          next.health = Math.min(100, next.health + 10);
          next.mood = Math.min(100, next.mood + 10);
          app.toast.show("清理干净啦", "success");
          break;
        case "sleep":
          next.energy = 100;
          next.mood = Math.min(100, next.mood + 10);
          app.toast.show("休息了一会儿，活力满满！", "success");
          break;
      }
      return next;
    });
  };

  const handleSend = async () => {
    if (!input.trim() || loadingMsg) return;

    const userText = input.trim();
    setInput("");

    const newMsg: Message = { id: Date.now().toString(), role: "user", text: userText };
    setMessages(prev => [...prev, newMsg]);
    setLoadingMsg(true);

    const systemPrompt = `你现在是一只名叫${state.name}的${state.breed}。
你的当前状态是：
- 心情: ${state.mood}/100 (${emotionText})
- 健康: ${state.health}/100
- 活力: ${state.energy}/100

请根据你当前的状态和性格，以第一人称简短自然地回复主人。可以带小动作描写。`;

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
      setLoadingMsg(false);
    }
  };

  const StatBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={[styles.statTrack, { backgroundColor: theme.colors.inset }]}>
        <View style={[styles.statFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.canvas }]}>
      {/* Top Status Area */}
      <Surface style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 16, backgroundColor: theme.colors.surface }]}>
        <View style={styles.nameRow}>
          <Text variant="title">{state.name}</Text>
          <Text style={{ color: theme.colors.muted }}>等级 1</Text>
        </View>
        <View style={styles.statsContainer}>
          <StatBar label="健康" value={state.health} color={theme.colors.green} />
          <StatBar label="心情" value={state.mood} color={theme.colors.accent} />
          <StatBar label="活力" value={state.energy} color={theme.colors.orange} />
        </View>
      </Surface>

      {/* Main Layout (Fixed Split) */}
      <View style={styles.mainContainer}>
        {/* Skia Pet Display - Fixed at top */}
        <View style={styles.petDisplayArea}>
          <Surface tone="inset" radius={24} style={[styles.petDisplay, { backgroundColor: theme.colors.inset }]}>
            <PetAvatar emotion={emotion} interaction={interaction} size={200} />
          </Surface>
        </View>

        {/* Integrated Chat Area - Scrollable */}
        <ScrollView
          style={styles.chatScroll}
          contentContainerStyle={styles.chatScrollContent}
          ref={scrollViewRef}
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
          {loadingMsg && (
            <View style={styles.messageRowPet}>
              <Surface tone="raised" radius={16} style={[styles.messageBubble, { backgroundColor: theme.colors.surfaceRaised }]}>
                <Text style={{ color: theme.colors.muted }}>思考中...</Text>
              </Surface>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Action Footer + Chat Input */}
      <Surface style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: theme.colors.surface }]}>
        <View style={styles.actionGrid}>
          <View style={styles.actionColumn}>
            <Button label="喂食" intent="brand" variant="outline" onPress={() => handleAction("feed")} />
          </View>
          <View style={styles.actionColumn}>
            <Button label="玩耍" intent="brand" variant="outline" onPress={() => handleAction("play")} />
          </View>
          <View style={styles.actionColumn}>
            <Button label="清理" intent="neutral" variant="outline" onPress={() => handleAction("clean")} />
          </View>
          <View style={styles.actionColumn}>
            <Button label="睡觉" intent="neutral" variant="outline" onPress={() => handleAction("sleep")} />
          </View>
        </View>
        <View style={styles.inputArea}>
          <Input
            value={input}
            onChangeText={setInput}
            placeholder="对它说点什么..."
            onSubmitEditing={handleSend}
            returnKeyType="send"
            containerStyle={{ flex: 1, marginRight: 12 }}
          />
          <Button label="发送" intent="brand" variant="solid" onPress={handleSend} busy={loadingMsg} disabled={!input.trim()} />
        </View>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statsContainer: {
    gap: 8,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statLabel: {
    width: 40,
    fontSize: 12,
  },
  statTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  statFill: {
    height: "100%",
    borderRadius: 4,
  },
  mainContainer: {
    flex: 1,
  },
  petDisplayArea: {
    alignItems: "center",
    padding: 16,
    paddingBottom: 8,
  },
  petDisplay: {
    width: "100%",
    maxWidth: 300,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1,
    justifyContent: "flex-end",
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
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  actionColumn: {
    width: "50%",
    paddingHorizontal: 6,
    paddingBottom: 12,
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  }
});
