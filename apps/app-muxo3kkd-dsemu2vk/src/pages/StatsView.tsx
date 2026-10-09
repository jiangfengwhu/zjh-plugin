import React, { useState, useEffect } from "react";
import { View, Text, ScrollView } from "react-native";
import { useTheme } from "@zijinhua/app-sdk/ui";
import { PieChart } from "react-native-gifted-charts";
import { MoodRecord, getMoodRecords, MOOD_COLORS, MOOD_LABELS, MoodType } from "../store";

export function StatsView() {
  const { colors } = useTheme();
  const [records, setRecords] = useState<MoodRecord[]>([]);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const data = await getMoodRecords();
    setRecords(data);
  };

  const getRecentRecords = (days: number) => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return records.filter(r => r.timestamp >= cutoff);
  };

  const recentRecords = getRecentRecords(30);

  const calculateStreak = () => {
    if (records.length === 0) return 0;
    const sortedDates = [...new Set(records.map(r => r.date))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0,0,0,0);

    // Check if recorded today or yesterday to continue streak
    const latestRecordDate = new Date(sortedDates[0]);
    latestRecordDate.setHours(0,0,0,0);
    const diffDays = Math.floor((currentDate.getTime() - latestRecordDate.getTime()) / (1000 * 3600 * 24));

    if (diffDays > 1) return 0; // Streak broken

    let checkDate = new Date(sortedDates[0]);

    for (const dateStr of sortedDates) {
      const d = new Date(dateStr);
      d.setHours(0,0,0,0);
      if (d.getTime() === checkDate.getTime()) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  const moodCounts = recentRecords.reduce((acc, record) => {
    acc[record.mood] = (acc[record.mood] || 0) + 1;
    return acc;
  }, {} as Record<MoodType, number>);

  const pieData = Object.entries(moodCounts).map(([mood, count]) => ({
    value: count,
    color: MOOD_COLORS[mood as MoodType],
    text: `${count}`,
    mood: mood as MoodType
  }));

  const total = pieData.reduce((sum, item) => sum + item.value, 0);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, gap: 24 }}>
      <View style={{ backgroundColor: colors.surface, padding: 20, borderRadius: 16, alignItems: "center" }}>
        <Text style={{ color: colors.text, fontSize: 16, marginBottom: 8 }}>连续记录天数</Text>
        <Text style={{ color: colors.accentText, fontSize: 36, fontWeight: "bold" }}>{streak}</Text>
        <Text style={{ color: colors.muted, fontSize: 14, marginTop: 8 }}>
          {streak > 3 ? "保持觉察很棒！继续坚持哦！" : "开始记录你的每一次情绪波动吧。"}
        </Text>
      </View>

      <View style={{ backgroundColor: colors.surface, padding: 20, borderRadius: 16 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "bold", marginBottom: 24 }}>近 30 天心情分布</Text>

        {total > 0 ? (
          <View style={{ alignItems: "center" }}>
            <PieChart
              data={pieData}
              donut
              radius={90}
              innerRadius={60}
              centerLabelComponent={() => (
                <View style={{ alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.text }}>{total}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>条记录</Text>
                </View>
              )}
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 16, marginTop: 24 }}>
              {pieData.map((item, index) => (
                <View key={index} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color }} />
                  <Text style={{ color: colors.text, fontSize: 14 }}>
                    {MOOD_LABELS[item.mood]} ({Math.round((item.value / total) * 100)}%)
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text style={{ color: colors.muted, textAlign: "center", paddingVertical: 32 }}>
            暂无足够数据，快去记录一下吧~
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
