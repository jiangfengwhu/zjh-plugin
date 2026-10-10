import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Surface, Text, useTheme } from '@zijinhua/app-sdk/ui';
import { PieChart, LineChart } from 'react-native-gifted-charts';
import { storage } from '../storage';
import { MoodRecord, MOODS, MoodType } from '../constants';
import { format, subDays, isSameDay, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

export function StatsScreen() {
  const theme = useTheme();
  const [records, setRecords] = useState<MoodRecord[]>([]);
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

  // Calculate mood distribution
  const moodCounts = records.reduce((acc, record) => {
    acc[record.type] = (acc[record.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(moodCounts).map(type => ({
    value: moodCounts[type],
    color: MOODS[type as MoodType].color,
    text: MOODS[type as MoodType].label,
  }));

  // Calculate consecutive days
  let consecutiveDays = 0;
  let currentDate = new Date();

  // Sort unique dates descending
  const uniqueDates = [...new Set(records.map(r => format(new Date(r.timestamp), 'yyyy-MM-dd')))]
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (uniqueDates.length > 0) {
    let checkDate = new Date();
    // if today is not recorded, start checking from yesterday
    if (uniqueDates[0] !== format(checkDate, 'yyyy-MM-dd')) {
        if(uniqueDates[0] === format(subDays(checkDate, 1), 'yyyy-MM-dd')) {
            checkDate = subDays(checkDate, 1);
        } else {
            consecutiveDays = 0; // neither today nor yesterday recorded
        }
    }

    if (consecutiveDays !== 0 || uniqueDates[0] === format(checkDate, 'yyyy-MM-dd')) {
        for (const dateStr of uniqueDates) {
            if (dateStr === format(checkDate, 'yyyy-MM-dd')) {
                consecutiveDays++;
                checkDate = subDays(checkDate, 1);
            } else {
                break;
            }
        }
    }
  }

  // Calculate trend data (last 7 days)
  const lineData = [];
  for (let i = 6; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const dayRecords = records.filter(r => isSameDay(new Date(r.timestamp), d));

    // Simple mood scoring for trend (happy=3, calm=2, other=1, anxious/tired=0, sad/angry=-1)
    const getMoodScore = (type: string) => {
        if (type === 'happy') return 3;
        if (type === 'calm') return 2;
        if (type === 'anxious' || type === 'tired') return 0;
        if (type === 'sad' || type === 'angry') return -1;
        return 1;
    };

    let averageScore = 0;
    if (dayRecords.length > 0) {
        const sum = dayRecords.reduce((acc, r) => acc + getMoodScore(r.type), 0);
        averageScore = sum / dayRecords.length;
    }

    lineData.push({
      value: averageScore,
      label: format(d, 'MM/dd')
    });
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>数据统计</Text>

      <Surface tone="base" radius={theme.colors.radius.lg} style={styles.statsCard}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>连续打卡</Text>
        <Text style={[styles.bigNumber, { color: theme.colors.text }]}>{consecutiveDays} <Text style={{fontSize:16}}>天</Text></Text>
        <Text style={{ color: theme.colors.muted, marginTop: 5 }}>保持记录，让情绪可见！</Text>
      </Surface>

      <Surface tone="base" radius={theme.colors.radius.lg} style={styles.statsCard}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>心情分布</Text>
        {pieData.length > 0 ? (
          <View style={{alignItems: 'center', marginVertical: 20}}>
              <PieChart
                data={pieData}
                donut
                radius={80}
                innerRadius={50}
                textColor={theme.colors.text}
                textSize={12}
                showText
              />
              <View style={styles.legendContainer}>
                  {pieData.map((item, index) => (
                      <View key={index} style={styles.legendItem}>
                          <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                          <Text style={{ color: theme.colors.text, fontSize: 12 }}>{item.text} ({item.value})</Text>
                      </View>
                  ))}
              </View>
          </View>
        ) : (
            <Text style={{ color: theme.colors.muted, textAlign: 'center', marginVertical: 20 }}>暂无数据</Text>
        )}
      </Surface>

      <Surface tone="base" radius={theme.colors.radius.lg} style={styles.statsCard}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>近7天心情趋势</Text>
        <View style={{marginTop: 20}}>
            <LineChart
                data={lineData}
                width={250}
                height={150}
                spacing={40}
                initialSpacing={10}
                color={theme.colors.text}
                thickness={2}
                dataPointsColor={MOODS.happy.color}
                yAxisTextStyle={{ color: theme.colors.muted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: theme.colors.muted, fontSize: 10 }}
                yAxisLabelTexts={['-1', '0', '1', '2', '3']}
                maxValue={3}
                noOfSections={4}
                hideRules
                yAxisColor={theme.colors.line}
                xAxisColor={theme.colors.line}
            />
            <Text style={{ color: theme.colors.muted, fontSize: 12, textAlign: 'center', marginTop: 10 }}>分数越高代表心情越积极</Text>
        </View>
      </Surface>
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
  statsCard: {
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  bigNumber: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  legendContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginTop: 20
  },
  legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 15,
      marginBottom: 10
  },
  legendColor: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 5
  }
});
