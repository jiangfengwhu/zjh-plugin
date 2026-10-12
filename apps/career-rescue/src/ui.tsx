import React, { useMemo, type ReactNode } from 'react';
import { Pressable, Text, View, StyleSheet, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@zijinhua/app-sdk/ui';
export function usePalette() {
  const { mode } = useTheme();
  return useMemo(() => mode === 'dark'
    ? { bg: '#101C1B', surface: '#192927', field: '#213632', text: '#EDF5F2', muted: '#A1B8B0', line: '#354B44', primary: '#76DEBC', onPrimary: '#102D24', hero: '#BDE4D3', heroText: '#173B2F', orange: '#FBB68B', wash: '#203F34' }
    : { bg: '#F5F6EF', surface: '#FFFFFF', field: '#F1F4EF', text: '#173B2F', muted: '#536A5D', line: '#DAE3D9', primary: '#146747', onPrimary: '#FFFFFF', hero: '#D6EBD9', heroText: '#173B2F', orange: '#B74C18', wash: '#E8F0E3' }, [mode]);
}
export type Palette = ReturnType<typeof usePalette>;
export function Action({ label, icon, onPress, subtle = false, busy = false, disabled = false, style }: { label: string; icon?: ReactNode; onPress: () => void; subtle?: boolean; busy?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = usePalette();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} onPress={onPress} disabled={disabled || busy} style={({ pressed }) => [styles.action, { backgroundColor: subtle ? c.field : c.primary, opacity: disabled ? .45 : pressed ? .72 : 1 }, style]}>{busy ? <ActivityIndicator size="small" color={subtle ? c.text : c.onPrimary} /> : icon}<Text style={{ color: subtle ? c.text : c.onPrimary, fontSize: 15, fontWeight: '700', flexShrink: 1, textAlign: 'center' }}>{label}</Text></Pressable>;
}
export function IconAction({ label, children, onPress, selected = false }: { label: string; children: ReactNode; onPress: () => void; selected?: boolean }) { const c = usePalette(); return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.iconAction, { backgroundColor: selected ? c.wash : 'transparent', opacity: pressed ? .55 : 1 }]}>{children}</Pressable>; }
export function Card({ children }: { children: ReactNode }) { const c = usePalette(); return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>{children}</View>; }
export const styles = StyleSheet.create({
  root: { flex: 1 }, content: { padding: 14, paddingBottom: 24, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  action: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  iconAction: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, card: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '800' }, body: { fontSize: 14, lineHeight: 23 }, small: { fontSize: 12, lineHeight: 18 }, heading: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  field: { borderWidth: 1, borderRadius: 9, padding: 10, fontSize: 14, lineHeight: 23, minHeight: 48, textAlignVertical: 'top' }, label: { fontSize: 13, fontWeight: '700', lineHeight: 20, marginBottom: 5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, chip: { minHeight: 44, paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
