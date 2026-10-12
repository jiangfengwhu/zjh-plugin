import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@zijinhua/app-sdk/ui';

// conversion rates to micrometers (um)
const RATES = {
  um: 1,
  mm: 1000,
  mil: 25.4,
  inch: 25400,
};

type Unit = keyof typeof RATES;

const formatValue = (value: number) => {
  if (value === 0) return '';
  const str = value.toString();
  if (str.length > 12) {
      return value.toPrecision(8);
  }
  return str;
};

export default function App() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const [valueUm, setValueUm] = useState<number>(0);

  const handleTextChange = (text: string, unit: Unit) => {
    if (text.trim() === '') {
      setValueUm(0);
      return;
    }
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) {
      setValueUm(parsed * RATES[unit]);
    }
  };

  const getValue = (unit: Unit) => {
    return valueUm === 0 ? '' : formatValue(valueUm / RATES[unit]);
  };

  const renderInputRow = (label: string, unit: Unit) => {
    return (
      <View style={[styles.row, { borderBottomColor: theme.colors.line }]}>
        <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
        <TextInput
          style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.field }]}
          keyboardType="numeric"
          value={getValue(unit)}
          onChangeText={(text) => handleTextChange(text, unit)}
          placeholder={`输入 ${label}`}
          placeholderTextColor={theme.colors.muted}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.canvas }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 20,
        }}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>长度单位转换器</Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          {renderInputRow('微米 (um)', 'um')}
          {renderInputRow('毫米 (mm)', 'mm')}
          {renderInputRow('密耳 (mil)', 'mil')}
          {renderInputRow('英寸 (inch)', 'inch')}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    width: 100,
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
});
