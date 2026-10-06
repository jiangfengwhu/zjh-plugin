import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme, Button, Input, Surface, RichMarkdown } from '@zijinhua/app-sdk/ui';
import { getAppContext } from '@zijinhua/app-sdk';
import { Transaction } from '../types';
import { subscribeToTransactions, getTransactions } from '../store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatView() {
  const { colors } = useTheme();
  const ctx = getAppContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
      { id: '1', role: 'assistant', content: '你好！我是你的专属财务AI助手。你可以问我关于你账单的任何问题，比如“我这个月花了多少钱？”或者“帮我分析一下最近的开销。”' }
  ]);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setTransactions(getTransactions());
    const unsubscribe = subscribeToTransactions(setTransactions);
    return () => unsubscribe();
  }, []);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setInputText('');

    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: userText };
    setMessages(prev => [...prev, newUserMsg]);
    setLoading(true);

    try {
      // 准备账单数据的摘要提供给AI
      const dataContext = transactions.length > 0
        ? JSON.stringify(transactions.map(t => ({...t, id: undefined, timestamp: undefined})))
        : '当前没有任何账单记录。';

      const systemPrompt = `你是一个专业的财务分析AI助手。
用户的记账数据如下（JSON格式）：
${dataContext}
请根据上述数据回答用户的问题。如果用户询问的问题无法从数据中得知，请如实告知。
你的回答应该友好、专业，可以给出一些省钱或理财的建议。你可以使用 Markdown 格式来美化你的回答。`;

      const apiMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content: userText }
      ];

      const response = await ctx.ai.complete({ messages: apiMessages });

      if (response.ok) {
          const newAiMsg: Message = { id: Date.now().toString(), role: 'assistant', content: response.text };
          setMessages(prev => [...prev, newAiMsg]);
      } else {
          const newAiMsg: Message = { id: Date.now().toString(), role: 'assistant', content: '抱歉，我暂时无法回答，请稍后再试。' };
          setMessages(prev => [...prev, newAiMsg]);
          ctx.toast.show(response.error || '请求失败', 'error');
      }
    } catch (error) {
        const newAiMsg: Message = { id: Date.now().toString(), role: 'assistant', content: '抱歉，发生了网络错误。' };
        setMessages(prev => [...prev, newAiMsg]);
    } finally {
        setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
        <View style={{
            flexDirection: 'row',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            marginBottom: 12
        }}>
            <Surface
                radius={12}
                tone={isUser ? 'raised' : 'base'}
                style={{
                    padding: 12,
                    maxWidth: '80%',
                    backgroundColor: isUser ? colors.field : colors.surface
                }}
            >
                {isUser ? (
                    <Text style={{ color: colors.text }}>{item.content}</Text>
                ) : (
                    <RichMarkdown markdown={item.content} />
                )}
            </Surface>
        </View>
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
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <Surface radius={12} style={{ padding: 12, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="问问AI你的消费情况..."
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              style={{ minHeight: 40 }}
            />
          </View>
          <Button
            label="发送"
            intent="brand"
            onPress={handleSend}
            busy={loading}
            disabled={loading || !inputText.trim()}
          />
        </Surface>
      </View>
    </KeyboardAvoidingView>
  );
}
