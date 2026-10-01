import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { getAppContext } from "@zijinhua/app-sdk";
import {
  BackChip,
  useTheme,
  Surface,
  SectionTitle,
  Pressy,
  Icon,
  FeedCardProps,
  PostFrame,
  PostAttachment
} from "@zijinhua/app-sdk/ui";

const STREAK_KEY = "habit_streak";
const WATER_KEY = "habit_water";
const SLEEP_KEY = "habit_sleep";
const LAST_CHECKIN_DATE_KEY = "habit_last_checkin_date";
const LAST_OPENED_DATE_KEY = "habit_last_opened_date";

export default function App() {
  const ctx = getAppContext();
  const { colors, mode } = useTheme();

  const [streak, setStreak] = useState(0);
  const [water, setWater] = useState(0);
  const [sleep, setSleep] = useState(0);

  // Check in logic
  useEffect(() => {
    const today = new Date().toDateString();
    const lastOpenedDate = ctx.storage.get(LAST_OPENED_DATE_KEY);
    const lastCheckinDate = ctx.storage.get(LAST_CHECKIN_DATE_KEY);

    let currentStreak = parseInt(ctx.storage.get(STREAK_KEY) || "0", 10);
    let currentWater = parseInt(ctx.storage.get(WATER_KEY) || "0", 10);
    let currentSleep = parseInt(ctx.storage.get(SLEEP_KEY) || "0", 10);

    // Reset daily goals if opened on a new day
    if (lastOpenedDate !== today) {
        currentWater = 0;
        ctx.storage.set(WATER_KEY, "0");
        currentSleep = 0;
        ctx.storage.set(SLEEP_KEY, "0");
        ctx.storage.set(LAST_OPENED_DATE_KEY, today);
    }

    // Check if streak is broken (if last checkin date was more than 1 day ago)
    if (lastCheckinDate && lastCheckinDate !== today) {
        const last = new Date(lastCheckinDate);
        const now = new Date(today);
        const diffTime = Math.abs(now.getTime() - last.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 1) {
            currentStreak = 0;
            ctx.storage.set(STREAK_KEY, "0");
        }
    }

    setWater(currentWater);
    setSleep(currentSleep);
    setStreak(currentStreak);
  }, []);

  const handleCheckIn = () => {
      const today = new Date().toDateString();
      const lastCheckinDate = ctx.storage.get(LAST_CHECKIN_DATE_KEY);
      if (lastCheckinDate !== today) {
          const newStreak = Math.min(streak + 1, 7); // Max 7 days visually
          setStreak(newStreak);
          ctx.storage.set(STREAK_KEY, newStreak.toString());
          ctx.storage.set(LAST_CHECKIN_DATE_KEY, today);
          ctx.phone.vibrate();
          ctx.phone.speak("打卡成功！");
      } else {
          ctx.phone.speak("今天已经打过卡啦");
      }
  };

  const handleWater = () => {
      const newWater = water + 1;
      setWater(newWater);
      ctx.storage.set(WATER_KEY, newWater.toString());
      ctx.phone.vibrate();
  };

  const handleSleep = () => {
      const newSleep = sleep + 1;
      setSleep(newSleep);
      ctx.storage.set(SLEEP_KEY, newSleep.toString());
      ctx.phone.vibrate();
  };

  const publishActivity = () => {
      ctx.feed.publish({
          kind: "activity",
          body: `今天喝了 ${water} 杯水，早睡 ${sleep} 次！保持了 ${streak} 天连胜！`,
          payload: { water, sleep, streak }
      });
      ctx.phone.speak("已分享到动态");
  };

  const styles = StyleSheet.create({
      container: { flex: 1, backgroundColor: colors.canvas },
      header: { flexDirection: "row", alignItems: "center", padding: 24, paddingBottom: 16 },
      title: { fontSize: 24, fontWeight: "bold", color: colors.text, marginLeft: 12 },
      section: { paddingHorizontal: 24, marginBottom: 24 },
      streakContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
      streakDay: { alignItems: "center" },
      streakCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginBottom: 4, backgroundColor: colors.surface },
      streakCircleActive: { backgroundColor: colors.jollyOrb },
      streakText: { fontSize: 12, color: colors.muted },
      goalsContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
      goalCard: { flex: 1, padding: 16, borderRadius: colors.radius.lg, alignItems: "center", marginHorizontal: 4 },
      goalTitle: { fontSize: 16, color: colors.text, marginTop: 8, fontWeight: "600" },
      goalCount: { fontSize: 24, fontWeight: "bold", color: colors.accent, marginTop: 4 },
      stickerPanel: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 12, padding: 16, borderRadius: colors.radius.lg, backgroundColor: colors.surface },
      sticker: { fontSize: 32, margin: 8 },
      actionButton: { backgroundColor: colors.accent, padding: 16, borderRadius: colors.radius.lg, alignItems: "center", marginTop: 24, marginHorizontal: 24 },
      actionText: { color: colors.onAccent, fontSize: 16, fontWeight: "bold" }
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <BackChip onPress={ctx.navigation.back} />
        <Text style={styles.title}>温馨习惯打卡</Text>
      </View>

      <View style={styles.section}>
        <SectionTitle>7 日连胜点亮</SectionTitle>
        <Surface tone="raised" radius={colors.radius.xl} style={{ padding: 20, marginTop: 12 }}>
            <View style={styles.streakContainer}>
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <View key={day} style={styles.streakDay}>
                <View style={[styles.streakCircle, day <= streak && styles.streakCircleActive]}>
                    <Icon name="check" color={day <= streak ? colors.onAccent : colors.muted} size={20} />
                </View>
                <Text style={styles.streakText}>第{day}天</Text>
                </View>
            ))}
            </View>
            <Pressy onPress={handleCheckIn} style={{ marginTop: 20, alignItems: "center", padding: 12, backgroundColor: colors.accentSoft, borderRadius: colors.radius.lg }}>
                <Text style={{ color: colors.accentText, fontWeight: "bold" }}>今日打卡</Text>
            </Pressy>
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionTitle>小目标计数</SectionTitle>
        <View style={styles.goalsContainer}>
            <Surface tone="raised" style={styles.goalCard}>
                <Pressy onPress={handleWater} scale={0.96} style={{alignItems:"center"}}>
                    <Text style={{fontSize: 40}}>💧</Text>
                    <Text style={styles.goalTitle}>喝水</Text>
                    <Text style={styles.goalCount}>{water}</Text>
                </Pressy>
            </Surface>
            <Surface tone="raised" style={styles.goalCard}>
                <Pressy onPress={handleSleep} scale={0.96} style={{alignItems:"center"}}>
                    <Text style={{fontSize: 40}}>🌙</Text>
                    <Text style={styles.goalTitle}>早睡</Text>
                    <Text style={styles.goalCount}>{sleep}</Text>
                </Pressy>
            </Surface>
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle>鼓励贴纸</SectionTitle>
        <View style={styles.stickerPanel}>
            {streak >= 1 && <Text style={styles.sticker}>🌟</Text>}
            {streak >= 3 && <Text style={styles.sticker}>🔥</Text>}
            {streak >= 7 && <Text style={styles.sticker}>👑</Text>}
            {water >= 3 && <Text style={styles.sticker}>🐳</Text>}
            {sleep >= 1 && <Text style={styles.sticker}>🦉</Text>}
            {(streak === 0 && water === 0 && sleep === 0) && <Text style={{color: colors.muted}}>开始打卡收集贴纸吧！</Text>}
        </View>
      </View>

      <Pressy onPress={publishActivity} style={styles.actionButton}>
          <Text style={styles.actionText}>分享今日成就到动态</Text>
      </Pressy>

      <View style={{height: 40}} />
    </ScrollView>
  );
}

export function ActivityCard({ post, friend, ...rest }: FeedCardProps) {
    const { colors } = useTheme();
    const payload = post.payload as { water?: number, sleep?: number, streak?: number } | undefined;

    return (
        <PostFrame post={post} friend={friend} {...rest}>
            <PostAttachment style={{ padding: 16, backgroundColor: colors.surface, borderRadius: colors.radius.lg, marginTop: 8 }}>
                <Text style={{ color: colors.text, fontSize: 16, marginBottom: 8 }}>🌟 习惯打卡小结</Text>
                {payload?.streak !== undefined && <Text style={{ color: colors.muted }}>连胜天数: {payload.streak} 天</Text>}
                {payload?.water !== undefined && <Text style={{ color: colors.muted }}>喝水: {payload.water} 杯 💧</Text>}
                {payload?.sleep !== undefined && <Text style={{ color: colors.muted }}>早睡: {payload.sleep} 次 🌙</Text>}
            </PostAttachment>
        </PostFrame>
    );
}
