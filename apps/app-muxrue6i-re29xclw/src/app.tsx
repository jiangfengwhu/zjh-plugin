import React, { useState, useMemo } from "react";
import { View, Text, Pressable, FlatList, ListRenderItem } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAppContext } from "@zijinhua/app-sdk";
import { useTheme, Surface, Button, Icon, EmptyState } from "@zijinhua/app-sdk/ui";
import { useRecords, Record } from "./store";
import { FormModal } from "./FormModal";
import { AIBotModal } from "./AIBotModal";

export default function App() {
  const ctx = getAppContext();
  const { colors } = useTheme();

  const { records, saveRecord, deleteRecord } = useRecords();

  const [modalVisible, setModalVisible] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);

  const { income, expense, balance } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let inc = 0;
    let exp = 0;

    records.forEach(r => {
      const d = new Date(r.dateMs);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        if (r.type === 'income') inc += r.amount;
        if (r.type === 'expense') exp += r.amount;
      }
    });

    return {
      income: inc,
      expense: exp,
      balance: inc - exp
    };
  }, [records]);

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => b.dateMs - a.dateMs);
  }, [records]);

  const handleEdit = (record: Record) => {
    setEditingRecord(record);
    setModalVisible(true);
  };

  const renderItem: ListRenderItem<Record> = ({ item }) => {
    const isIncome = item.type === 'income';
    const dateStr = new Date(item.dateMs).toLocaleDateString();

    return (
      <Pressable
        onLongPress={() => handleEdit(item)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          backgroundColor: colors.surface,
          marginBottom: 8,
          borderRadius: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>{item.category}</Text>
            {item.note ? <Text style={{ fontSize: 14, color: colors.muted }}>{item.note}</Text> : null}
          </View>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{dateStr}</Text>
        </View>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: isIncome ? colors.greenText : colors.redText }}>
          {isIncome ? '+' : '-'}{item.amount.toFixed(2)}
        </Text>
        <Pressable
          onPress={() => deleteRecord(item.id)}
          style={{ padding: 8, marginLeft: 8 }}
        >
          <Icon name="close" color={colors.muted} size={20} />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{flex:1,backgroundColor:colors.canvas}}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable accessibilityRole="button" onPress={ctx.navigation.back} style={{ padding: 8, marginLeft: -8 }}>
          <Icon name="back" color={colors.text} size={24} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginLeft: 8 }}>极简记账</Text>
      </View>

      <View style={{ padding: 16 }}>
        <Surface radius={16} style={{ padding: 20, backgroundColor: colors.accent, gap: 16 }}>
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>本月结余</Text>
            <Text style={{ color: '#FFF', fontSize: 36, fontWeight: 'bold' }}>{balance.toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>本月收入</Text>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>{income.toFixed(2)}</Text>
            </View>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>本月支出</Text>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>{expense.toFixed(2)}</Text>
            </View>
          </View>
        </Surface>
      </View>

      <FlatList
        data={sortedRecords}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <EmptyState style={{ marginTop: 40, alignItems: 'center' }}>
            <Text style={{ color: colors.muted }}>暂无记录，点击右下角添加</Text>
          </EmptyState>
        }
      />

      <View style={{ position: 'absolute', bottom: 32, right: 32, alignItems: 'flex-end', gap: 16 }}>
        <Pressable
          onPress={() => setAiModalVisible(true)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            elevation: 4,
            borderWidth: 1,
            borderColor: colors.line,
          }}
        >
          <Icon name="engine" color={colors.text} size={24} />
        </Pressable>

        <Pressable
          onPress={() => {
            setEditingRecord(null);
            setModalVisible(true);
          }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.accent,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Icon name="plus" color="#FFF" size={32} />
        </Pressable>
      </View>

      <FormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={saveRecord}
        editingRecord={editingRecord}
      />

      <AIBotModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        onSave={saveRecord}
      />
    </SafeAreaView>
  );
}
