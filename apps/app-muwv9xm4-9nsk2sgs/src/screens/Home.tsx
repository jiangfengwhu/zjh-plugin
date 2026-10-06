import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTheme, Button, Input, Surface } from '@zijinhua/app-sdk/ui';
import { getAppContext } from '@zijinhua/app-sdk';
import { Transaction } from '../types';
import { subscribeToTransactions, getTransactions, addTransactions } from '../store';

export default function Home() {
  const { colors } = useTheme();
  const ctx = getAppContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTransactions(getTransactions());
    const unsubscribe = subscribeToTransactions(setTransactions);
    return () => unsubscribe();
  }, []);

  const handleAiRecognize = async () => {
    if (!inputText.trim()) {
        ctx.toast.show('请输入记账内容', 'info');
        return;
    }

    setLoading(true);
    try {
      const response = await ctx.ai.complete({
        messages: [
          {
            role: 'system',
            content: `你是一个专业的记账助手。用户会输入一段话，包含一笔或多笔收支记录。
请提取这些记录，并以 JSON 数组格式返回，不要包含任何其他文字或 markdown 标记。
每个对象必须包含以下字段：
- type: 'income' 或 'expense'
- amount: 金额（数字）
- category: 类别名称（字符串）
- note: 备注或说明（字符串，如无则为空字符串）
- date: 发生日期，格式 'YYYY-MM-DD'（根据用户描述推断，如果不明确，默认为今天：${new Date().toISOString().split('T')[0]}）
`
          },
          {
            role: 'user',
            content: inputText
          }
        ],
      });

      if (response.ok) {
        let jsonStr = response.text;
        // 尝试清理可能被包裹的 markdown 标记
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const newTransactions: Transaction[] = parsed.map((item: any) => ({
              id: Date.now().toString() + Math.random().toString().substring(2, 6),
              type: item.type === 'income' ? 'income' : 'expense',
              amount: Number(item.amount) || 0,
              category: item.category || '其他',
              date: item.date || new Date().toISOString().split('T')[0],
              note: item.note || '',
              timestamp: Date.now()
            }));

            addTransactions(newTransactions);
            setInputText('');
            ctx.toast.show('识别并记录成功', 'success');
            ctx.haptics.trigger('notificationSuccess');
          } else {
            ctx.toast.show('未识别到有效的记账信息', 'error');
            ctx.haptics.trigger('notificationError');
          }
        } catch (e) {
            ctx.toast.show('解析 AI 结果失败', 'error');
        }
      } else {
        ctx.toast.show(response.error || 'AI 识别失败', 'error');
      }
    } catch (e) {
        ctx.toast.show('请求失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const isIncome = item.type === 'income';
    return (
      <Surface radius={12} style={{ padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>{item.category}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{item.date} {item.note ? `· ${item.note}` : ''}</Text>
        </View>
        <Text style={{ color: isIncome ? '#4caf50' : '#f44336', fontSize: 18, fontWeight: 'bold' }}>
          {isIncome ? '+' : '-'}{item.amount.toFixed(2)}
        </Text>
      </Surface>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <View style={{ flex: 1, padding: 16 }}>
        <FlatList
          data={transactions.sort((a, b) => b.timestamp - a.timestamp)}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: colors.muted }}>暂无账单记录</Text>
            </View>
          }
        />
        <Surface radius={12} style={{ padding: 16, marginTop: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Input
              multiline
              placeholder="告诉AI：今天打车花了20，午饭30..."
              value={inputText}
              onChangeText={setInputText}
              style={{ minHeight: 40, maxHeight: 100 }}
            />
          </View>
          <Button
            label="识别"
            intent="brand"
            onPress={handleAiRecognize}
            busy={loading}
            disabled={loading || !inputText.trim()}
          />
        </Surface>
      </View>
    </KeyboardAvoidingView>
  );
}
