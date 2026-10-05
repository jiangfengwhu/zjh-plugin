import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { useTheme, Surface } from "@zijinhua/app-sdk/ui";
import { useTransactions, Transaction } from "../store";
import { Calendar, LocaleConfig } from "react-native-calendars";

LocaleConfig.locales['zh'] = {
  monthNames: ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'],
  monthNamesShort: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
  dayNames: ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'],
  dayNamesShort: ['日','一','二','三','四','五','六'],
  today: '今天'
};
LocaleConfig.defaultLocale = 'zh';

export default function CalendarTab() {
  const { colors, mode } = useTheme();
  const transactions = useTransactions();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const markedDates = useMemo(() => {
    const dates: Record<string, any> = {};
    transactions.forEach(tx => {
      if (!dates[tx.date]) {
        dates[tx.date] = { marked: true, dotColor: colors.accent };
      }
    });

    if (dates[selectedDate]) {
      dates[selectedDate] = { ...dates[selectedDate], selected: true, selectedColor: colors.accent };
    } else {
      dates[selectedDate] = { selected: true, selectedColor: colors.accent };
    }
    return dates;
  }, [transactions, selectedDate, colors.accent]);

  const dailyTransactions = useMemo(() => {
    return transactions.filter(tx => tx.date === selectedDate);
  }, [transactions, selectedDate]);

  const renderItem = ({ item }: { item: Transaction }) => {
    const isExpense = item.type === "expense";
    return (
      <Surface tone="base" radius={12} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.category, { color: colors.text }]}>{item.category}</Text>
          <Text style={[styles.amount, { color: isExpense ? colors.danger : colors.green }]}>
            {isExpense ? "-" : "+"}{item.amount}
          </Text>
        </View>
        <Text style={[styles.desc, { color: colors.muted }]}>{item.description}</Text>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={(day: any) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        theme={{
          calendarBackground: colors.canvas,
          textSectionTitleColor: colors.text,
          selectedDayBackgroundColor: colors.accent,
          selectedDayTextColor: colors.onAccent,
          todayTextColor: colors.accent,
          dayTextColor: colors.text,
          textDisabledColor: colors.muted,
          dotColor: colors.accent,
          selectedDotColor: colors.onAccent,
          arrowColor: colors.text,
          monthTextColor: colors.text,
        }}
      />
      <View style={[styles.summary, { borderBottomColor: colors.line }]}>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>{selectedDate} 记录</Text>
      </View>
      <FlatList
        data={dailyTransactions}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ color: colors.muted }}>这一天没有记账记录</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summary: {
    padding: 16,
    borderBottomWidth: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  listContent: {
    padding: 16,
  },
  card: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  category: {
    fontSize: 16,
    fontWeight: "bold",
  },
  amount: {
    fontSize: 18,
    fontWeight: "bold",
  },
  desc: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  }
});
