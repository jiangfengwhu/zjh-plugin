import React, { useState } from 'react';
import { View, Text, Modal, TextInput, Pressable, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { getAppContext } from '@zijinhua/app-sdk';
import { useTheme, Button, Icon, Field } from '@zijinhua/app-sdk/ui';
import { Record } from './store';

const EXPENSE_CATEGORIES = ['餐饮', '交通', '购物', '娱乐', '住房', '医疗', '其他'];
const INCOME_CATEGORIES = ['薪资', '奖金', '投资', '兼职', '其他'];

interface AIBotModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (record: Record) => void;
}

export function AIBotModal({ visible, onClose, onSave }: AIBotModalProps) {
  const { colors } = useTheme();
  const ctx = getAppContext();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);

    const systemPrompt = `你是一个记账助手。请从用户的输入中提取记账信息。
返回格式必须是一个纯JSON对象（不要有markdown代码块或额外文字），包含以下字段：
- amount: 金额（数字，必须大于0）
- type: 'income' 或 'expense'
- category: 分类字符串。支出可选：${EXPENSE_CATEGORIES.join(', ')}；收入可选：${INCOME_CATEGORIES.join(', ')}。
- note: 备注字符串（简短描述）
如果无法提取，请返回 {"error": "无法识别"}。`;

    try {
      const response = await ctx.ai.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input }
        ],
        temperature: 0.1
      });

      if (response.ok) {
        let text = response.text.trim();
        // 尝试清理可能的 markdown 标记
        if (text.startsWith('```json')) {
          text = text.substring(7);
          if (text.endsWith('```')) {
            text = text.substring(0, text.length - 3);
          }
        }

        const data = JSON.parse(text);

        if (data.error) {
          ctx.toast.show(data.error, 'error');
        } else if (data.amount && data.type && data.category) {
          const newRecord: Record = {
            id: Math.random().toString(36).substring(2, 11),
            amount: Number(data.amount),
            type: data.type,
            category: data.category,
            note: data.note || '',
            dateMs: Date.now()
          };
          onSave(newRecord);
          ctx.haptics.trigger('notificationSuccess');
          setInput('');
          onClose();
        } else {
          ctx.toast.show('识别失败，请换个说法', 'error');
        }
      } else {
        ctx.toast.show(`识别失败: ${response.code}`, 'error');
      }
    } catch (e) {
      console.error(e);
      ctx.toast.show('处理请求出错，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Pressable onPress={onClose} style={{ padding: 8 }}>
              <Icon name="close" color={colors.text} size={24} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>AI 智能记账</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={{ flex: 1, padding: 16, gap: 24 }}>
            <Field label="描述一笔收支">
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="例如：今天中午吃黄焖鸡花了 25 元"
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={4}
                style={{
                  fontSize: 16,
                  color: colors.text,
                  padding: 12,
                  minHeight: 120,
                  backgroundColor: colors.surface,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.line,
                  textAlignVertical: 'top'
                }}
              />
            </Field>

            <View style={{ flex: 1 }} />

            <View style={{ paddingBottom: 16 }}>
              <Button
                label="智能识别"
                onPress={handleSubmit}
                intent="brand"
                disabled={loading || !input.trim()}
                busy={loading}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
