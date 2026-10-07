import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, ScrollView, Pressable, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getAppContext } from '@zijinhua/app-sdk';
import { useTheme, Button, Icon, Field } from '@zijinhua/app-sdk/ui';
import { Record } from './store';

const EXPENSE_CATEGORIES = ['餐饮', '交通', '购物', '娱乐', '住房', '医疗', '其他'];
const INCOME_CATEGORIES = ['薪资', '奖金', '投资', '兼职', '其他'];

interface FormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (record: Record) => void;
  editingRecord?: Record | null;
}

export function FormModal({ visible, onClose, onSave, editingRecord }: FormModalProps) {
  const { colors } = useTheme();
  const ctx = getAppContext();

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [dateMs, setDateMs] = useState(Date.now());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editingRecord) {
        setType(editingRecord.type);
        setAmount(editingRecord.amount.toString());
        setCategory(editingRecord.category);
        setNote(editingRecord.note || '');
        setDateMs(editingRecord.dateMs);
      } else {
        setType('expense');
        setAmount('');
        setCategory('');
        setNote('');
        setDateMs(Date.now());
      }
    }
  }, [visible, editingRecord]);

  const handleSave = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      ctx.toast.show('请输入有效的金额', 'error');
      return;
    }
    if (!category) {
      ctx.toast.show('请选择分类', 'error');
      return;
    }

    const newRecord: Record = {
      id: editingRecord?.id || Math.random().toString(36).substring(2, 11),
      amount: numAmount,
      category,
      type,
      note,
      dateMs,
    };

    onSave(newRecord);
    ctx.haptics.trigger('notificationSuccess');
    onClose();
  };

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Pressable onPress={onClose} style={{ padding: 8 }}>
              <Icon name="close" color={colors.text} size={24} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
              {editingRecord ? '编辑记录' : '新增记录'}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 24 }}>

            <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 8, padding: 4 }}>
              <Pressable
                onPress={() => {
                  setType('expense');
                  setCategory('');
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  backgroundColor: type === 'expense' ? colors.canvas : 'transparent',
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: type === 'expense' ? colors.text : colors.muted, fontWeight: type === 'expense' ? 'bold' : 'normal' }}>支出</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setType('income');
                  setCategory('');
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  backgroundColor: type === 'income' ? colors.canvas : 'transparent',
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: type === 'income' ? colors.text : colors.muted, fontWeight: type === 'income' ? 'bold' : 'normal' }}>收入</Text>
              </Pressable>
            </View>

            <Field label="日期">
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={new Date(dateMs)}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) setDateMs(selectedDate.getTime());
                  }}
                  style={{ width: 120, marginLeft: -10 }}
                />
              ) : (
                <>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    style={{
                      padding: 12,
                      backgroundColor: colors.surface,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.line,
                    }}
                  >
                    <Text style={{ color: colors.text }}>
                      {new Date(dateMs).toLocaleDateString()}
                    </Text>
                  </Pressable>
                  {showDatePicker && (
                    <DateTimePicker
                      value={new Date(dateMs)}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setDateMs(selectedDate.getTime());
                      }}
                    />
                  )}
                </>
              )}
            </Field>

            <Field label="金额">
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.muted}
                style={{
                  fontSize: 32,
                  fontWeight: 'bold',
                  color: type === 'expense' ? colors.redText : colors.greenText,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.line,
                }}
              />
            </Field>

            <Field label="分类">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                {categories.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 16,
                      backgroundColor: category === cat ? colors.accent : colors.surface,
                      borderWidth: 1,
                      borderColor: category === cat ? colors.accent : colors.line,
                    }}
                  >
                    <Text style={{ color: category === cat ? '#FFF' : colors.text }}>{cat}</Text>
                  </Pressable>
                ))}
              </View>
            </Field>

            <Field label="备注（可选）">
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="写点什么..."
                placeholderTextColor={colors.muted}
                style={{
                  fontSize: 16,
                  color: colors.text,
                  padding: 12,
                  backgroundColor: colors.surface,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.line,
                }}
              />
            </Field>
          </ScrollView>

          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.line }}>
            <Button label="保存" onPress={handleSave} intent="brand" />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
