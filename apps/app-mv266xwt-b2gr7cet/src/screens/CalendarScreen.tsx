import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Surface, Text, useTheme } from '@zijinhua/app-sdk/ui';
import { Calendar } from 'react-native-calendars';
import { storage } from '../storage';
import { MoodRecord, MOODS } from '../constants';
import { format } from 'date-fns';

export function CalendarScreen() {
  const theme = useTheme();
  const [records, setRecords] = useState<MoodRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await storage.getRecords();
      setRecords(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const markedDates: any = {};
  records.forEach(record => {
    const dateStr = format(new Date(record.timestamp), 'yyyy-MM-dd');
    const moodColor = MOODS[record.type].color;

    if (!markedDates[dateStr] || record.timestamp > (markedDates[dateStr].timestamp || 0)) {
      markedDates[dateStr] = {
        customStyles: {
          container: {
            backgroundColor: moodColor + '40',
            borderWidth: dateStr === selectedDate ? 2 : 0,
            borderColor: moodColor
          },
          text: {
            color: theme.colors.text,
            fontWeight: 'bold'
          }
        },
        timestamp: record.timestamp
      };
    }
  });

  // Always mark selected date
  if (!markedDates[selectedDate]) {
    markedDates[selectedDate] = {
      selected: true,
      selectedColor: theme.colors.line
    };
  }

  const selectedRecords = records
    .filter(r => format(new Date(r.timestamp), 'yyyy-MM-dd') === selectedDate)
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>心情日历</Text>

      <Surface tone="base" radius={theme.colors.radius.lg} style={styles.calendarContainer}>
        <Calendar
          current={selectedDate}
          onDayPress={(day: any) => setSelectedDate(day.dateString)}
          markingType={'custom'}
          markedDates={markedDates}
          theme={{
            calendarBackground: 'transparent',
            textSectionTitleColor: theme.colors.muted,
            dayTextColor: theme.colors.text,
            monthTextColor: theme.colors.text,
            arrowColor: theme.colors.text,
            todayTextColor: theme.colors.text,
          }}
        />
      </Surface>

      <Text style={[styles.subtitle, { color: theme.colors.text }]}>
        {selectedDate} 的记录
      </Text>

      {selectedRecords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ color: theme.colors.muted }}>这一天没有记录哦</Text>
        </View>
      ) : (
        selectedRecords.map(record => {
          const mood = MOODS[record.type];
          const IconComponent = mood.icon;
          const timeStr = format(new Date(record.timestamp), 'HH:mm');

          return (
            <Surface
              key={record.id}
              tone="raised"
              radius={theme.colors.radius.md}
              style={styles.recordCard}
            >
              <View style={styles.recordHeader}>
                <View style={styles.recordMood}>
                  <IconComponent color={mood.color} size={24} />
                  <Text style={[styles.recordMoodLabel, { color: mood.color }]}>
                    {mood.label}
                  </Text>
                </View>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{timeStr}</Text>
              </View>
              {record.note ? (
                <Text style={[styles.recordNote, { color: theme.colors.text }]}>
                  {record.note}
                </Text>
              ) : null}
            </Surface>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  calendarContainer: {
    padding: 10,
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 30,
  },
  recordCard: {
    padding: 16,
    marginBottom: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordMood: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordMoodLabel: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  recordNote: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  }
});
