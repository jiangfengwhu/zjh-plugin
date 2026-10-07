import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, Button, Surface, useTheme, Loading, Icon } from "@zijinhua/app-sdk/ui";
import { getAppContext } from "@zijinhua/app-sdk";
import { usePetState, getPetEmotion } from "./store";
import { ChatScreen } from "./chat";

export default function App() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const app = getAppContext();
  const { state, updateState, initialized } = usePetState();
  const [showChat, setShowChat] = useState(false);

  if (!initialized) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.canvas, justifyContent: "center", alignItems: "center" }]}>
        <Loading label="唤醒中..." />
      </View>
    );
  }

  if (showChat) {
    return <ChatScreen state={state} onClose={() => setShowChat(false)} />;
  }

  const emotion = getPetEmotion(state);
  const getPetFace = () => {
    switch (emotion) {
      case "happy": return "(＾▽＾)";
      case "sad": return "(；ω；)";
      case "sleepy": return "(￣o￣) . z Z";
      default: return "(・ω・)";
    }
  };

  const handleAction = (action: "feed" | "play" | "clean" | "sleep") => {
    app.haptics.trigger("impactMedium");
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

      {/* Main Pet Display */}
      <ScrollView contentContainerStyle={styles.mainArea}>
        <Surface tone="inset" radius={24} style={[styles.petDisplay, { backgroundColor: theme.colors.inset }]}>
          <View style={styles.petAvatar}>
            <Text style={{ fontSize: 60, color: theme.colors.ink }}>
              {getPetFace()}
            </Text>
          </View>
          <Text style={{ marginTop: 16, color: theme.colors.muted, fontSize: 16 }}>
            {emotion === "happy" && "状态很好哦~"}
            {emotion === "sad" && "好像需要一点关心..."}
            {emotion === "sleepy" && "好困，想睡觉了..."}
            {emotion === "neutral" && "正在发呆中..."}
          </Text>
        </Surface>
      </ScrollView>

      {/* Action Footer */}
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
        <View style={{ marginTop: 12 }}>
          <Button label="和它聊天" intent="brand" variant="solid" onPress={() => setShowChat(true)} />
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
  mainArea: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  petDisplay: {
    width: "100%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  petAvatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.5)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
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
  }
});
