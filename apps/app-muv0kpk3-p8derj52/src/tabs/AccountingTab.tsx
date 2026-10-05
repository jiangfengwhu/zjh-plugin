import React, { useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme, PromptBar, Surface, Icon } from "@zijinhua/app-sdk/ui";
import { getAppContext } from "@zijinhua/app-sdk";
import { store, useTransactions, Transaction } from "../store";

export default function AccountingTab() {
  const { colors, mode } = useTheme();
  const transactions = useTransactions();
  const ctx = getAppContext();

  const [inputText, setInputText] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    setIsBusy(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const prompt = `
        你是一个记账助手。请从用户的输入中提取记账信息。支持一次性识别多条记账记录。
        请严格输出 JSON 数组格式，不要包含任何 markdown 标记，只输出 JSON 文本。
        当前日期是 ${today}。
        如果用户没有指定日期，默认使用当前日期。
        如果没指定类型，默认为 expense (支出)。如果是发工资、收钱等，为 income (收入)。
        输出的 JSON 格式必须是一个数组，数组中每个对象为：
        [
          {
            "date": "YYYY-MM-DD",
            "amount": 数字,
            "type": "expense" | "income",
            "category": "类别名称，例如 餐饮、交通、购物、工资等",
            "description": "具体描述"
          }
        ]

        用户输入: ${text}
      `;

      const result = await ctx.ai.complete({
        messages: [{ role: "user", content: prompt }]
      });

      if (result.ok) {
        try {
          const parsedStr = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(parsedStr);

          const items = Array.isArray(parsed) ? parsed : [parsed];
          let addedCount = 0;

          items.forEach(item => {
            if (item.amount && item.type) {
              store.addTransaction({
                date: item.date || today,
                amount: Number(item.amount),
                type: item.type,
                category: item.category || "其他",
                description: item.description || text
              });
              addedCount++;
            }
          });

          if (addedCount > 0) {
            ctx.toast.show(`成功记账 ${addedCount} 笔`, "success");
            setInputText("");
          } else {
            ctx.toast.show("无法识别记账信息", "error");
          }
        } catch (e) {
          ctx.toast.show("解析AI返回结果失败", "error");
        }
      } else {
        ctx.toast.show(`AI 识别失败: ${result.error}`, "error");
      }
    } catch (e) {
       ctx.toast.show("发生错误", "error");
    } finally {
      setIsBusy(false);
    }
  };

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
        <View style={styles.cardBody}>
          <Text style={[styles.desc, { color: colors.muted }]}>{item.description}</Text>
          <Text style={[styles.date, { color: colors.muted }]}>{item.date}</Text>
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <PromptBar
          value={inputText}
          onChange={setInputText}
          onSend={handleSend}
          busy={isBusy}
          placeholder="告诉AI：今天午饭花了20..."
          variant="Rounded"
          providers={[]}
        />
      </View>

      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ color: colors.muted }}>还没有记账记录，快试试AI记账吧</Text>
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
  inputContainer: {
    padding: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
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
  cardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  desc: {
    flex: 1,
    fontSize: 14,
  },
  date: {
    fontSize: 12,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  }
});
