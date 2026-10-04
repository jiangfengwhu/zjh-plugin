import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { getAppContext } from "@zijinhua/app-sdk";
import { BackChip, useTheme, Screen, PageHeader, PromptBar, Surface } from "@zijinhua/app-sdk/ui";

type Transaction = {
  id: string;
  amount: number;
  description: string;
  type: "income" | "expense";
  category: string;
  date: number;
};

const STORAGE_KEY = "transactions_v1";

export default function App() {
  const ctx = getAppContext();
  const { colors, mode } = useTheme();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const data = ctx.storage.get(STORAGE_KEY);
    if (data) {
      try {
        setTransactions(JSON.parse(data));
      } catch (e) {
        console.error("Failed to parse transactions", e);
      }
    }
  }, [ctx.storage]);

  const saveTransactions = (newTransactions: Transaction[]) => {
    setTransactions(newTransactions);
    ctx.storage.set(STORAGE_KEY, JSON.stringify(newTransactions));
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    setInputText("");

    try {
      const result = await ctx.ai.complete({
        messages: [
          {
            role: "system",
            content: `You are an AI assistant for an accounting app. Parse the user's input into a JSON object representing a transaction.
The JSON must have the following keys:
- "amount": a number representing the money amount.
- "description": a short string describing the item or service.
- "type": either "expense" or "income".
- "category": a short category name (e.g., "Food", "Transport", "Salary").
Respond ONLY with the JSON object. Do not include markdown code blocks, backticks, or any other text.`
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.1,
      });

      if (result.ok) {
        let jsonText = result.text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.substring(7);
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.substring(3);
        }
        if (jsonText.endsWith('```')) {
            jsonText = jsonText.substring(0, jsonText.length - 3);
        }
        jsonText = jsonText.trim();

        const parsed = JSON.parse(jsonText);

        if (typeof parsed.amount === "number" && typeof parsed.description === "string" && (parsed.type === "expense" || parsed.type === "income")) {
            const newTransaction: Transaction = {
                id: Math.random().toString(36).substring(2, 9),
                amount: parsed.amount,
                description: parsed.description,
                type: parsed.type,
                category: parsed.category || "Uncategorized",
                date: Date.now(),
            };

            saveTransactions([newTransaction, ...transactions]);
            ctx.toast.show(`记账成功：${parsed.description} ${parsed.amount}`, "success");
        } else {
            throw new Error("Invalid format");
        }
      } else {
        ctx.toast.show("AI 处理失败: " + result.error, "error");
      }
    } catch (e) {
      console.error(e);
      ctx.toast.show("无法解析输入，请重试", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalExpense = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);

  return (
    <Screen style={{ backgroundColor: colors.canvas }}>
      <PageHeader
        title="AI 记账"
        onBack={ctx.navigation.back}
        caption={`支出 ¥${totalExpense} · 收入 ¥${totalIncome}`}
      />

      <ScrollView style={{ flex: 1, padding: 16 }}>
        {transactions.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ color: colors.muted }}>在下方输入一句话，比如“今天吃面花了15元”</Text>
          </View>
        ) : (
          transactions.map(t => (
            <Surface key={t.id} style={{ padding: 16, marginBottom: 12, borderRadius: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, color: colors.text, fontWeight: "500", marginBottom: 4 }}>
                    {t.description}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    {t.category} · {new Date(t.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: t.type === "expense" ? colors.danger : colors.green }}>
                  {t.type === "expense" ? "-" : "+"}¥{t.amount}
                </Text>
              </View>
            </Surface>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <PromptBar
        value={inputText}
        onChange={setInputText}
        onSend={handleSend}
        busy={isProcessing}
        disabled={isProcessing}
        placeholder="告诉 AI 记一笔账..."
        style={{ marginHorizontal: 16, marginBottom: 16 }}
      />
    </Screen>
  );
}