import React, { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@zijinhua/app-sdk/ui';
import Svg, { Circle, Path } from 'react-native-svg';
export function Button({ label, onPress, secondary = false, busy = false, disabled = false, icon, style }: { label: string; onPress: () => void; secondary?: boolean; busy?: boolean; disabled?: boolean; icon?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors: c } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || disabled, busy }} disabled={busy || disabled} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: secondary ? c.surface : c.ink1, borderColor: secondary ? c.lineStrong : c.ink1, opacity: disabled ? .4 : pressed ? .72 : 1 }, style]}>{busy ? <ActivityIndicator color={secondary ? c.text : c.surface} /> : icon}<Text style={{ color: secondary ? c.text : c.surface, fontSize: 16, fontWeight: '600', flexShrink: 1, textAlign: 'center' }}>{label}</Text></Pressable>;
}
export function TextButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) { const { colors: c } = useTheme(); return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', paddingVertical: 12, opacity: disabled ? .4 : pressed ? .6 : 1 })}><Text style={{ color: c.ink2, fontSize: 15, textAlign: 'center', fontWeight: '500' }}>{label}</Text></Pressable>; }
export function IconButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) { return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, opacity: pressed ? .6 : 1 })}>{children}</Pressable>; }
export function Card({ children, tint = false }: { children: ReactNode; tint?: boolean }) { const { colors: c } = useTheme(); return <View style={[styles.card, { backgroundColor: tint ? c.greenTint : c.canvas, borderColor: c.line }]}>{children}</View>; }
export function Seed({ size = 40 }: { size?: number }) { const { colors: c } = useTheme(); return <Svg width={size} height={size} viewBox="0 0 64 64" accessible={false}><Path d="M17 43c0-16 9-24 30-25 0 21-10 29-25 29" fill="none" stroke={c.ink1} strokeWidth="3" strokeLinecap="round" /><Path d="m18 48 20-20" stroke={c.ink1} strokeWidth="3" strokeLinecap="round" /><Circle cx="49" cy="48" r="4" fill={c.greenText} /></Svg>; }
export function ClockRing({ progress }: { progress: number }) {
  const { colors: c } = useTheme(); const circumference = 2 * Math.PI * 108;
  return <Svg width="100%" height="100%" viewBox="0 0 240 240" accessible={false}><Circle cx="120" cy="120" r="108" stroke={c.line} strokeWidth="2" fill="none" /><Circle cx="120" cy="120" r="108" stroke={c.greenText} strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - Math.max(0, Math.min(1, progress)))} rotation="-90" origin="120,120" /></Svg>;
}
export function Separator() { const { colors: c } = useTheme(); return <View style={{ height: 1, backgroundColor: c.line, marginVertical: 4 }} />; }
export const styles = StyleSheet.create({
  root: { flex: 1 }, page: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 40, gap: 24, width: '100%', maxWidth: 620, alignSelf: 'center', flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 36, lineHeight: 48, fontWeight: '600', letterSpacing: -1.3 }, heading: { fontSize: 22, lineHeight: 32, fontWeight: '600' }, body: { fontSize: 16, lineHeight: 27 }, small: { fontSize: 13, lineHeight: 21 }, eyebrow: { fontSize: 12, lineHeight: 20, letterSpacing: 2, fontWeight: '600' },
  button: { minHeight: 54, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, borderWidth: 1 },
  card: { borderRadius: 20, padding: 22, gap: 14, borderWidth: 1 }, field: { fontSize: 18, lineHeight: 30, minHeight: 140, padding: 18, borderRadius: 20, textAlignVertical: 'top' },
});
