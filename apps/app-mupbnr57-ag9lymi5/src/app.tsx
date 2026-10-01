import React, { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView, Alert, StyleSheet } from "react-native";
import { getAppContext } from "@zijinhua/app-sdk";
import { PageHeader, Surface, Pressy, useTheme, SectionTitle, Screen } from "@zijinhua/app-sdk/ui";

type EntryType = 'heartbeat' | 'wish' | 'thought';

interface Entry {
  id: string;
  type: EntryType;
  content: string;
  timestamp: number;
}

const typeLabels: Record<EntryType, string> = {
  heartbeat: '心动瞬间',
  wish: '待办愿望',
  thought: '随笔想法'
};

const pad = (n: number) => n.toString().padStart(2, '0');
const formatDate = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const formatTime = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function App() {
  const ctx = getAppContext();
  const { colors, mode } = useTheme();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedType, setSelectedType] = useState<EntryType>('heartbeat');

  useEffect(() => {
    const data = ctx.storage.get('diary_entries');
    if (data) {
      try {
        setEntries(JSON.parse(data));
      } catch (e) {
        console.error("Failed to parse entries", e);
      }
    }
  }, []);

  const saveEntries = (newEntries: Entry[]) => {
    setEntries(newEntries);
    ctx.storage.set('diary_entries', JSON.stringify(newEntries));
  };

  const handleAdd = () => {
    if (!inputText.trim()) return;

    const newEntry: Entry = {
      id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
      type: selectedType,
      content: inputText.trim(),
      timestamp: Date.now()
    };

    saveEntries([newEntry, ...entries]);
    setInputText("");
  };

  const handleClear = () => {
    Alert.alert("清空手账", "确定要清空所有记录吗？此操作不可恢复。", [
      { text: "取消", style: "cancel" },
      { text: "清空", style: "destructive", onPress: () => saveEntries([]) }
    ]);
  };

  const groupedEntries = entries.reduce((acc, entry) => {
    const dateStr = formatDate(entry.timestamp);
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(entry);
    return acc;
  }, {} as Record<string, Entry[]>);

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => {
    // String comparison works for YYYY-MM-DD
    if (a < b) return 1;
    if (a > b) return -1;
    return 0;
  });

  return (
    <Screen style={{ flex: 1, backgroundColor: colors.canvas }}>
      <PageHeader
        title="随身心晴手账"
        onBack={ctx.navigation.back}
        right={
          <Pressy onPress={handleClear} style={{ padding: 4 }}>
            <Text style={{ color: colors.danger, fontSize: 16 }}>一键清空</Text>
          </Pressy>
        }
      />

      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          {(Object.keys(typeLabels) as EntryType[]).map((t) => (
            <Pressy key={t} onPress={() => setSelectedType(t)} style={{ marginRight: 8 }}>
              <Surface
                tone={t === selectedType ? 'raised' : 'base'}
                radius={16}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: t === selectedType ? colors.accent : 'transparent'
                }}
              >
                <Text style={{
                  color: t === selectedType ? colors.accent : colors.muted,
                  fontWeight: t === selectedType ? 'bold' : 'normal',
                  fontSize: 14
                }}>
                  {typeLabels[t]}
                </Text>
              </Surface>
            </Pressy>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Surface tone="inset" radius={12} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder={`记录你的${typeLabels[selectedType]}...`}
                placeholderTextColor={colors.muted}
                style={{
                  color: colors.text,
                  fontSize: 16,
                  padding: 0,
                  minHeight: 36
                }}
                multiline
                maxLength={500}
              />
            </Surface>
          </View>
          <Pressy onPress={handleAdd}>
            <View style={{
              backgroundColor: colors.accent,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: inputText.trim() ? 1 : 0.5
            }}>
              <Text style={{ color: colors.onAccent, fontWeight: 'bold', fontSize: 16 }}>记录</Text>
            </View>
          </Pressy>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {sortedDates.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: colors.muted, fontSize: 16 }}>还没有记录，快来写下第一条吧！</Text>
          </View>
        ) : (
          sortedDates.map(date => (
            <View key={date} style={{ marginBottom: 24 }}>
              <SectionTitle>{date}</SectionTitle>
              <View style={{ marginTop: 12 }}>
                {groupedEntries[date].map((entry, index) => (
                  <Surface
                    key={entry.id}
                    tone="base"
                    radius={16}
                    style={{
                      padding: 16,
                      marginBottom: index === groupedEntries[date].length - 1 ? 0 : 12
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                      <Text style={{
                        color: entry.type === 'heartbeat' ? colors.red
                             : entry.type === 'wish' ? colors.amber
                             : colors.cyan,
                        fontSize: 12,
                        fontWeight: 'bold',
                        overflow: 'hidden'
                      }}>
                        {typeLabels[entry.type]}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        {formatTime(entry.timestamp)}
                      </Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>
                      {entry.content}
                    </Text>
                  </Surface>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
