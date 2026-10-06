import React, { useMemo } from "react";
import { View, ScrollView, Dimensions } from "react-native";
import { Text, Surface, useTheme } from "@zijinhua/app-sdk/ui";
import { PieChart } from "react-native-gifted-charts";
import { useTransactions } from "./store";

export default function Charts() {
  const { colors } = useTheme();
  const transactions = useTransactions();

  const chartData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === "expense");

    // Group by category
    const grouped = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalExpense = Object.values(grouped).reduce((a, b) => a + b, 0);

    const presetColors = [colors.danger, colors.accent, colors.orange, colors.amber, colors.cyan, colors.orchid, colors.green];

    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1]) // Sort descending
      .map(([category, amount], index) => {
        return {
          value: amount,
          text: `${((amount / totalExpense) * 100).toFixed(0)}%`,
          color: presetColors[index % presetColors.length],
          category,
          amount
        };
      });
  }, [transactions, colors]);

  const totalExpense = useMemo(() => {
    return transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  const totalIncome = useMemo(() => {
    return transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.muted }}>暂无账单数据可供分析</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={{ padding: 16 }}>

      <Surface tone="raised" radius={colors.radius.md} style={{ padding: 16, marginBottom: 16 }}>
        <Text variant="title" style={{ marginBottom: 16 }}>总览</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: colors.muted, marginBottom: 4 }}>总支出</Text>
            <Text variant="title" style={{ color: colors.danger, fontSize: 24 }}>¥{totalExpense.toFixed(2)}</Text>
          </View>
          <View>
            <Text style={{ color: colors.muted, marginBottom: 4 }}>总收入</Text>
            <Text variant="title" style={{ color: colors.green, fontSize: 24 }}>¥{totalIncome.toFixed(2)}</Text>
          </View>
        </View>
      </Surface>

      <Surface tone="raised" radius={colors.radius.md} style={{ padding: 16, marginBottom: 16 }}>
        <Text variant="title" style={{ marginBottom: 24 }}>支出分类占比</Text>

        {chartData.length > 0 ? (
          <>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <PieChart
                data={chartData}
                donut
                showText
                textColor="white"
                radius={Dimensions.get('window').width / 3}
                innerRadius={Dimensions.get('window').width / 6}
                textSize={12}
                centerLabelComponent={() => {
                  return (
                    <View style={{justifyContent: 'center', alignItems: 'center'}}>
                      <Text style={{fontSize: 22, color: colors.text, fontWeight: 'bold'}}>
                        {chartData.length}
                      </Text>
                      <Text style={{fontSize: 14, color: colors.muted}}>分类</Text>
                    </View>
                  );
                }}
              />
            </View>

            <View style={{ gap: 12 }}>
              {chartData.map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color, marginRight: 8 }} />
                    <Text>{item.category}</Text>
                  </View>
                  <Text style={{ fontWeight: '500' }}>¥{item.amount.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={{ color: colors.muted }}>暂无支出记录</Text>
        )}
      </Surface>

    </ScrollView>
  );
}
