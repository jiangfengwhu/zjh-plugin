import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Surface, Button, TextInput, Text, useTheme, Pressy } from '@zijinhua/app-sdk/ui';
import { getAppContext } from '@zijinhua/app-sdk';
import { MoodType, MOODS } from '../constants';
import { storage } from '../storage';

export function HomeScreen() {
  const theme = useTheme();
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!selectedMood) {
      getAppContext().toast.show("请先选择一种心情", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const record = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        type: selectedMood,
        timestamp: Date.now(),
        note: note.trim()
      };
      await storage.saveRecord(record);

      getAppContext().toast.show("记录成功", "success");
      setSelectedMood(null);
      setNote('');
    } catch (error) {
      getAppContext().toast.show("保存失败，请重试", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.canvas }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.colors.text }]}>今天感觉怎么样？</Text>

      <Surface tone="base" radius={theme.colors.radius.lg} style={styles.surface}>
        <View style={styles.moodGrid}>
          {(Object.keys(MOODS) as MoodType[]).map((type) => {
            const mood = MOODS[type];
            const isSelected = selectedMood === type;
            const IconComponent = mood.icon;

            return (
              <Pressy
                key={type}
                style={[
                  styles.moodItem,
                  isSelected && { backgroundColor: mood.color + '20', borderColor: mood.color }
                ]}
                onPress={() => setSelectedMood(type)}
              >
                <IconComponent
                  color={isSelected ? mood.color : theme.colors.muted}
                  size={32}
                />
                <Text style={[
                  styles.moodLabel,
                  { color: isSelected ? mood.color : theme.colors.muted }
                ]}>
                  {mood.label}
                </Text>
              </Pressy>
            );
          })}
        </View>
      </Surface>

      <Surface tone="base" radius={theme.colors.radius.lg} style={[styles.surface, styles.noteContainer]}>
        <Text style={[styles.noteTitle, { color: theme.colors.text }]}>添加备注（可选）</Text>
        <TextInput
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.line }]}
          placeholder="写下今天的想法..."
          placeholderTextColor={theme.colors.muted}
          multiline
          numberOfLines={4}
          value={note}
          onChangeText={setNote}
          textAlignVertical="top"
        />
      </Surface>

      <Button
        label="保存记录"
        intent="brand"
        onPress={handleSave}
        busy={isSubmitting}
        style={styles.saveButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  surface: {
    padding: 20,
    marginBottom: 20,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodItem: {
    width: '30%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  noteContainer: {
    padding: 15,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    marginTop: 10,
  }
});
