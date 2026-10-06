import React, { useState } from "react";
import { View, FlatList, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { getAppContext } from "@zijinhua/app-sdk";
import { Text, Input, Button, Surface, useTheme, Icon, Pressy } from "@zijinhua/app-sdk/ui";
import { useTransactions, addTransactions, Transaction } from "./store";
import { parseMultipleTransactions } from "./ai";

export default function Home() {
  const { colors } = useTheme();
  const transactions = useTransactions();
  const [inputText, setInputText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const ctx = getAppContext();

  const handleAiAdd = async () => {
    if (!inputText.trim()) return;
    setIsParsing(true);
    const parsed = await parseMultipleTransactions(inputText);
    setIsParsing(false);

    if (parsed && parsed.length > 0) {
      addTransactions(parsed);
      ctx.toast.show(`成功记入 ${parsed.length} 笔账单`, "success");
      ctx.haptics.trigger("notificationSuccess");
      setInputText("");
    } else {
      ctx.toast.show("未能识别账单信息，请换个说法试试", "error");
      ctx.haptics.trigger("notificationError");
    }
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const isExpense = item.type === "expense";
    const sign = isExpense ? "-" : "+";
    const color = isExpense ? colors.danger : colors.green;

    return (
      <Surface tone="raised" radius={colors.radius.md} style={{ padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text variant="title">{item.category}</Text>
            {item.note ? <Text style={{ marginLeft: 8, color: colors.muted, fontSize: 14 }}>{item.note}</Text> : null}
          </View>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {new Date(item.date).toLocaleString()}
          </Text>
        </View>
        <Text variant="title" style={{ color }}>
          {sign}¥{item.amount.toFixed(2)}
        </Text>
      </Surface>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Text variant="title" style={{ marginBottom: 12 }}>AI 一句话记账</Text>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <Input
            value={inputText}
            onChangeText={setInputText}
            placeholder="例如：买咖啡花了25，打车花了40..."
            multiline
            containerStyle={{ flex: 1 }}
            style={{ minHeight: 80 }}
          />
          <Button
            label="记账"
            onPress={handleAiAdd}
            busy={isParsing}
            disabled={!inputText.trim()}
            style={{ marginTop: 4 }}
          />
        </View>
      </View>
      <FlatList
        data={transactions}
        keyExtractor={t => t.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: colors.muted }}>暂无账单记录，试着说一句话记账吧</Text>
          </View>
        }
      />
    </View>
  );
}
