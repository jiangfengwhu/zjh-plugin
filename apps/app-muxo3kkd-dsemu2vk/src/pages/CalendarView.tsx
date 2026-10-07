import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { getAppContext } from "@zijinhua/app-sdk";
import { useTheme, Button } from "@zijinhua/app-sdk/ui";
import { Calendar, DateData } from "react-native-calendars";
import { MoodRecord, getMoodRecords, deleteMoodRecord, MOOD_COLORS, MOOD_LABELS } from "../store";

export function CalendarView() {
  const { colors } = useTheme();
  const ctx = getAppContext();
  const [records, setRecords] = useState<MoodRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const data = await getMoodRecords();
    setRecords(data);
  };

  const handleDelete = (id: string) => {
    Alert.alert("删除记录", "确定要删除这条心情记录吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          await deleteMoodRecord(id);
          ctx.toast.show("已删除记录", "success");
          loadRecords();
        }
      }
    ]);
  };

  const markedDates = records.reduce((acc, record) => {
    acc[record.date] = {
      selected: record.date === selectedDate,
      selectedColor: MOOD_COLORS[record.mood],
      customStyles: {
        container: {
          backgroundColor: record.date === selectedDate ? MOOD_COLORS[record.mood] : `${MOOD_COLORS[record.mood]}40`,
          borderRadius: 8,
        },
        text: {
          color: record.date === selectedDate ? '#fff' : colors.text,
        }
      }
    };
    return acc;
  }, {} as any);

  // Ensure selected date is marked even if no record
  if (!markedDates[selectedDate]) {
    markedDates[selectedDate] = {
      selected: true,
      selectedColor: colors.surface,
      customStyles: {
        container: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 8,
        },
        text: {
          color: colors.text,
        }
      }
    };
  }

  const selectedRecords = records.filter(r => r.date === selectedDate);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      <Calendar
        current={selectedDate}
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        markingType={'custom'}
        markedDates={markedDates}
        theme={{
          calendarBackground: colors.canvas,
          textSectionTitleColor: colors.muted,
          dayTextColor: colors.text,
          todayTextColor: colors.accentText,
          selectedDayTextColor: '#ffffff',
          monthTextColor: colors.text,
          indicatorColor: colors.accentText,
          arrowColor: colors.text,
        }}
        style={{
          borderRadius: 12,
          padding: 8,
          backgroundColor: colors.canvas,
          marginBottom: 24,
        }}
      />

      <View style={{ gap: 16 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "bold" }}>
          {selectedDate} 的记录
        </Text>

        {selectedRecords.length === 0 ? (
          <Text style={{ color: colors.muted, textAlign: "center", marginTop: 24 }}>
            这一天没有记录
          </Text>
        ) : (
          selectedRecords.map(record => (
            <View
              key={record.id}
              style={{
                backgroundColor: colors.surface,
                padding: 16,
                borderRadius: 12,
                borderLeftWidth: 4,
                borderLeftColor: MOOD_COLORS[record.mood],
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "500" }}>
                  {MOOD_LABELS[record.mood]}
                </Text>
                <Pressable onPress={() => handleDelete(record.id)}>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>删除</Text>
                </Pressable>
              </View>
              {record.note ? (
                <Text style={{ color: colors.muted, fontSize: 14 }}>{record.note}</Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
