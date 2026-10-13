import React, { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@zijinhua/app-sdk/ui';
import Svg, { Circle, Path } from 'react-native-svg';
export function Button({ label, onPress, secondary = false, busy = false, disabled = false, icon, style }: { label: string; onPress: () => void; secondary?: boolean; busy?: boolean; disabled?: boolean; icon?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors: c } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || disabled, busy }} disabled={busy || disabled} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: secondary ? c.surfaceRaised : c.accent, opacity: disabled ? .45 : pressed ? .7 : 1 }, style]}>{busy ? <ActivityIndicator color={secondary ? c.text : c.onAccent} /> : icon}<Text style={{ color: secondary ? c.text : c.onAccent, fontSize: 16, fontWeight: '700', flexShrink: 1, textAlign: 'center' }}>{label}</Text></Pressable>;
}
export function IconButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) { return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, opacity: pressed ? .6 : 1 })}>{children}</Pressable>; }
export function Card({ children, tint = false }: { children: ReactNode; tint?: boolean }) { const { colors: c } = useTheme(); return <View style={[styles.card, { backgroundColor: tint ? c.accentTint : c.surface }]}>{children}</View>; }
export function Seed({ size = 72 }: { size?: number }) {
  const { colors: c } = useTheme();
  return <Svg width={size} height={size} viewBox="0 0 80 80" accessible={false}><Circle cx="40" cy="40" r="38" fill={c.accentTint} /><Path d="M27 55c0-16 7-27 25-32 1 18-6 30-25 32Z" fill={c.accent} /><Path d="m29 54 19-25" stroke={c.onAccent} strokeWidth="3" strokeLinecap="round" /><Circle cx="57" cy="58" r="5" fill={c.cyan} /></Svg>;
}
export function ClockRing({ progress }: { progress: number }) {
  const { colors: c } = useTheme(); const circumference = 2 * Math.PI * 104;
  return <Svg width="100%" height="100%" viewBox="0 0 240 240" accessible={false}><Circle cx="120" cy="120" r="104" stroke={c.accentTint} strokeWidth="9" fill="none" /><Circle cx="120" cy="120" r="104" stroke={c.accent} strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - Math.max(0, Math.min(1, progress)))} rotation="-90" origin="120,120" /></Svg>;
}
export const styles = StyleSheet.create({
  root: { flex: 1 }, page: { padding: 24, paddingBottom: 40, gap: 20, width: '100%', maxWidth: 640, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 30, lineHeight: 40, fontWeight: '800', letterSpacing: -.6 }, heading: { fontSize: 20, lineHeight: 29, fontWeight: '700' }, body: { fontSize: 16, lineHeight: 26 }, small: { fontSize: 13, lineHeight: 21 },
  button: { minHeight: 52, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  card: { borderRadius: 24, padding: 22, gap: 12 }, field: { fontSize: 17, lineHeight: 27, minHeight: 120, padding: 18, borderRadius: 20, textAlignVertical: 'top' },
});
