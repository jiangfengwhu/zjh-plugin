import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme, Surface } from '@zijinhua/app-sdk/ui';
import { Calendar as RNCalendar, LocaleConfig } from 'react-native-calendars';
import { Transaction } from '../types';
import { subscribeToTransactions, getTransactions } from '../store';

LocaleConfig.locales['zh'] = {
  monthNames: ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'],
  monthNamesShort: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
  dayNames: ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'],
  dayNamesShort: ['日','一','二','三','四','五','六'],
  today: '今天'
};
LocaleConfig.defaultLocale = 'zh';

export default function CalendarView() {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setTransactions(getTransactions());
    const unsubscribe = subscribeToTransactions(setTransactions);
    return () => unsubscribe();
  }, []);

  const markedDates = useMemo(() => {
    const dates: Record<string, any> = {};
    const dailyData: Record<string, { income: number, expense: number }> = {};

    transactions.forEach(t => {
      if (!dailyData[t.date]) {
        dailyData[t.date] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        dailyData[t.date].income += t.amount;
      } else {
        dailyData[t.date].expense += t.amount;
      }
    });

    Object.keys(dailyData).forEach(date => {
        dates[date] = { marked: true, dotColor: colors.accentText };
    });

    dates[selectedDate] = { ...dates[selectedDate], selected: true, selectedColor: colors.field };

    return dates;
  }, [transactions, selectedDate, colors]);

  const selectedTransactions = useMemo(() => {
      return transactions.filter(t => t.date === selectedDate);
  }, [transactions, selectedDate]);

  const dailySummary = useMemo(() => {
    return selectedTransactions.reduce(
        (acc, curr) => {
            if (curr.type === 'income') acc.income += curr.amount;
            else acc.expense += curr.amount;
            return acc;
        },
        { income: 0, expense: 0 }
    );
  }, [selectedTransactions]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Surface radius={12} style={{ padding: 8, overflow: 'hidden' }}>
        <RNCalendar
          current={selectedDate}
          onDayPress={(day: any) => setSelectedDate(day.dateString)}
          markedDates={markedDates}
          theme={{
            calendarBackground: 'transparent',
            textSectionTitleColor: colors.text,
            selectedDayBackgroundColor: colors.field,
            selectedDayTextColor: colors.text,
            todayTextColor: colors.accentText,
            dayTextColor: colors.text,
            textDisabledColor: colors.muted,
            dotColor: colors.accentText,
            selectedDotColor: colors.text,
            arrowColor: colors.text,
            monthTextColor: colors.text,
            textDayFontFamily: 'System',
            textMonthFontFamily: 'System',
            textDayHeaderFontFamily: 'System',
            textDayFontWeight: '300',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '300',
            textDayFontSize: 14,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 14
          }}
        />
      </Surface>

      <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Surface radius={8} style={{ flex: 1, padding: 16, marginRight: 8 }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>日收入</Text>
            <Text style={{ color: '#4caf50', fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>
                +{dailySummary.income.toFixed(2)}
            </Text>
        </Surface>
        <Surface radius={8} style={{ flex: 1, padding: 16, marginLeft: 8 }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>日支出</Text>
            <Text style={{ color: '#f44336', fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>
                -{dailySummary.expense.toFixed(2)}
            </Text>
        </Surface>
      </View>

      <ScrollView style={{ marginTop: 16, flex: 1 }}>
        {selectedTransactions.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: colors.muted }}>当日无记录</Text>
            </View>
        ) : (
            selectedTransactions.map(item => (
                <Surface key={item.id} radius={8} style={{ padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={{ color: colors.text, fontWeight: 'bold' }}>{item.category}</Text>
                        {!!item.note && <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{item.note}</Text>}
                    </View>
                    <Text style={{ color: item.type === 'income' ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>
                        {item.type === 'income' ? '+' : '-'}{item.amount.toFixed(2)}
                    </Text>
                </Surface>
            ))
        )}
      </ScrollView>
    </View>
  );
}
