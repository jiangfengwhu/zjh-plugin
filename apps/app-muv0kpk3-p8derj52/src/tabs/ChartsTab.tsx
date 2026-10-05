import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTheme, Surface } from "@zijinhua/app-sdk/ui";
import { useTransactions } from "../store";
import { PieChart } from "react-native-gifted-charts";

export default function ChartsTab() {
  const { colors } = useTheme();
  const transactions = useTransactions();

  const chartData = useMemo(() => {
    const expenses = transactions.filter(tx => tx.type === "expense");

    // Group by category
    const categoryTotals: Record<string, number> = {};
    let totalExpense = 0;
    expenses.forEach(tx => {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
      totalExpense += tx.amount;
    });

    // Create chart data
    const predefinedColors = [colors.accent, colors.danger, colors.amber, colors.green, colors.cyan, colors.orchid];
    let colorIndex = 0;

    const data = Object.keys(categoryTotals).map(category => {
      const val = categoryTotals[category];
      const percentage = totalExpense > 0 ? ((val / totalExpense) * 100).toFixed(1) : "0";
      const itemColor = predefinedColors[colorIndex % predefinedColors.length];
      colorIndex++;
      return {
        value: val,
        color: itemColor,
        text: `${percentage}%`,
        label: category
      };
    });

    return { data, totalExpense };
  }, [transactions, colors]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>支出统计</Text>

      {chartData.data.length > 0 ? (
        <Surface tone="base" radius={16} style={styles.chartCard}>
          <View style={styles.chartWrapper}>
            <PieChart
              data={chartData.data}
              donut
              showText
              textColor={colors.canvas}
              radius={100}
              innerRadius={60}
              innerCircleColor={colors.surface}
              centerLabelComponent={() => {
                return (
                  <View style={{justifyContent: 'center', alignItems: 'center'}}>
                    <Text style={{fontSize: 22, color: colors.text, fontWeight: 'bold'}}>{chartData.totalExpense}</Text>
                    <Text style={{fontSize: 14, color: colors.muted}}>总支出</Text>
                  </View>
                );
              }}
            />
          </View>

          <View style={styles.legendContainer}>
            {chartData.data.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                <Text style={[styles.legendLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.legendValue, { color: colors.text }]}>{item.value}</Text>
              </View>
            ))}
          </View>
        </Surface>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={{ color: colors.muted }}>还没有支出记录</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  chartCard: {
    padding: 20,
    alignItems: "center",
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  legendContainer: {
    width: "100%",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  }
});
