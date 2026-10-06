import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme, Surface } from '@zijinhua/app-sdk/ui';
import { PieChart } from 'react-native-gifted-charts';
import { Transaction } from '../types';
import { subscribeToTransactions, getTransactions } from '../store';

const COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#8AC926', '#1982C4', '#6A4C93'];

export default function ChartsView() {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    setTransactions(getTransactions());
    const unsubscribe = subscribeToTransactions(setTransactions);
    return () => unsubscribe();
  }, []);

  const pieData = useMemo(() => {
    const expenseData: Record<string, number> = {};
    let totalExpense = 0;

    transactions.forEach(t => {
      if (t.type === 'expense') {
        expenseData[t.category] = (expenseData[t.category] || 0) + t.amount;
        totalExpense += t.amount;
      }
    });

    if (totalExpense === 0) return [];

    let colorIndex = 0;
    return Object.keys(expenseData).map(category => {
      const val = expenseData[category];
      const percent = Math.round((val / totalExpense) * 100);
      const color = COLORS[colorIndex % COLORS.length];
      colorIndex++;

      return {
        value: val,
        text: `${percent}%`,
        color,
        category,
        percent
      };
    }).sort((a, b) => b.value - a.value);

  }, [transactions]);

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
        <Surface radius={12} style={{ padding: 16, alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 16 }}>支出分类占比</Text>

            {pieData.length > 0 ? (
                <>
                    <PieChart
                        data={pieData}
                        donut
                        showText
                        textColor="black"
                        radius={100}
                        innerRadius={60}
                        textBackgroundRadius={26}
                        centerLabelComponent={() => {
                            const total = pieData.reduce((sum, item) => sum + item.value, 0);
                            return (
                                <View style={{justifyContent: 'center', alignItems: 'center'}}>
                                    <Text style={{fontSize: 22, color: colors.text, fontWeight: 'bold'}}>{total.toFixed(0)}</Text>
                                    <Text style={{fontSize: 12, color: colors.muted}}>总支出</Text>
                                </View>
                            );
                        }}
                    />
                    <View style={{ width: '100%', marginTop: 24, gap: 12 }}>
                        {pieData.map((item, index) => (
                            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color }} />
                                    <Text style={{ color: colors.text }}>{item.category}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                    <Text style={{ color: colors.text, fontWeight: 'bold' }}>{item.value.toFixed(2)}</Text>
                                    <Text style={{ color: colors.muted, width: 40, textAlign: 'right' }}>{item.percent}%</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </>
            ) : (
                <View style={{ padding: 40, alignItems: 'center' }}>
                    <Text style={{ color: colors.muted }}>暂无支出记录</Text>
                </View>
            )}
        </Surface>
    </ScrollView>
  );
}
