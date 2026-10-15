import React, { memo, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@zijinhua/app-sdk/ui';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

const light = {
  bg: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceSubtle: '#F2ECE4',
  ink: '#1C1B18',
  muted: '#787166',
  line: '#E6DFD5',
  spark: '#E05A36',
  sparkSoft: '#FCECE8',
  moss: '#2E6F57',
  mossSoft: '#E6F2ED',
  amber: '#D9822B',
  onSpark: '#FFFFFF',
  sheet: '#FAF7F2',
};

const dark = {
  bg: '#121417',
  surface: '#1C1F24',
  surfaceSubtle: '#252930',
  ink: '#F3EFEA',
  muted: '#9A948C',
  line: '#2E333B',
  spark: '#F27A54',
  sparkSoft: '#36221C',
  moss: '#56B893',
  mossSoft: '#1B332A',
  amber: '#F0A452',
  onSpark: '#121417',
  sheet: '#1A1D22',
};

export function usePalette() {
  return useTheme().mode === 'dark' ? dark : light;
}

export const Backdrop = memo(function Backdrop() {
  const c = usePalette();
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width="100%" height="100%" viewBox="0 0 400 850" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={c.spark} stopOpacity="0.06" />
            <Stop offset="50%" stopColor={c.bg} stopOpacity="0" />
            <Stop offset="100%" stopColor={c.moss} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        <Rect width="400" height="850" fill={c.bg} />
        <Rect width="400" height="850" fill="url(#glow)" />
      </Svg>
    </View>
  );
});

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  tone = 'spark',
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'spark' | 'moss' | 'ink';
  icon?: React.ReactNode;
  style?: ViewStyle;
}) {
  const c = usePalette();
  const bg = tone === 'moss' ? c.moss : tone === 'ink' ? c.ink : c.spark;
  const fg = tone === 'ink' ? c.bg : c.onSpark;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryBtn,
        {
          backgroundColor: bg,
          opacity: disabled ? 0.38 : pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      {icon}
      <Text style={[styles.primaryBtnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function PillButton({
  label,
  onPress,
  selected = false,
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  const c = usePalette();
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pillBtn,
        {
          backgroundColor: selected ? c.sparkSoft : c.surface,
          borderColor: selected ? c.spark : c.line,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {icon}
      <Text
        style={{
          color: selected ? c.spark : c.ink,
          fontSize: 13,
          fontWeight: selected ? '700' : '500',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  disabled = false,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const c = usePalette();
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: 10,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.55 : 1,
      })}
    >
      <Text
        style={{
          color: danger ? c.spark : c.muted,
          fontSize: 13,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  label,
  onPress,
  children,
  disabled = false,
  subtle = false,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  subtle?: boolean;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: subtle ? c.surfaceSubtle : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

export function Arrival({
  children,
  id,
}: {
  children: React.ReactNode;
  id: string;
}) {
  return (
    <Animated.View
      key={id}
      entering={FadeInDown.duration(320).reduceMotion(ReduceMotion.System)}
      style={{ flexGrow: 1 }}
    >
      {children}
    </Animated.View>
  );
}

export function PulseOrb({
  size = 210,
  alive = false,
  active = true,
  tone = 'spark',
  progress = 0,
  level,
  children,
}: {
  size?: number;
  alive?: boolean;
  active?: boolean;
  tone?: 'spark' | 'moss';
  progress?: number;
  level?: SharedValue<number>;
  children?: React.ReactNode;
}) {
  const c = usePalette();
  const breath = useSharedValue(0);
  const accent = tone === 'moss' ? c.moss : c.spark;
  const soft = tone === 'moss' ? c.mossSoft : c.sparkSoft;

  useEffect(() => {
    if (alive && active) {
      breath.value = withRepeat(
        withSequence(
          withTiming(1, {
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            reduceMotion: ReduceMotion.System,
          }),
          withTiming(0, {
            duration: 2600,
            easing: Easing.inOut(Easing.sin),
            reduceMotion: ReduceMotion.System,
          })
        ),
        -1
      );
    } else {
      cancelAnimation(breath);
      breath.value = withTiming(0, { duration: 200 });
    }
    return () => cancelAnimation(breath);
  }, [alive, active]);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + 0.06 * breath.value + (level?.value || 0) * 0.14 },
    ],
    opacity: 0.45 + 0.35 * breath.value,
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + 0.025 * breath.value + (level?.value || 0) * 0.06 },
    ],
  }));

  const r = (size - 16) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2,
            backgroundColor: soft,
          },
          outerStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          {
            width: size - 16,
            height: size - 16,
            borderRadius: (size - 16) / 2,
            backgroundColor: c.surface,
            borderWidth: 1.5,
            borderColor: c.line,
            alignItems: 'center',
            justifyContent: 'center',
          },
          innerStyle,
        ]}
      >
        {clamped > 0 ? (
          <Svg
            width={size - 16}
            height={size - 16}
            style={StyleSheet.absoluteFill}
          >
            <Circle
              cx={(size - 16) / 2}
              cy={(size - 16) / 2}
              r={r - 2}
              stroke={accent}
              strokeWidth={3.5}
              fill="none"
              strokeDasharray={`${circumference * clamped} ${circumference}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${(size - 16) / 2} ${(size - 16) / 2})`}
            />
          </Svg>
        ) : null}
      </Animated.View>
      {children}
    </View>
  );
}

export function SparkTrail({ count = 0 }: { count?: number }) {
  const c = usePalette();
  return (
    <View style={[styles.row, { gap: 6 }]}>
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
          backgroundColor: count > 0 ? c.mossSoft : c.surfaceSubtle,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: count > 0 ? c.moss : c.muted,
          }}
        />
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: count > 0 ? c.moss : c.muted,
          }}
        >
          已推进 {count} 步
        </Text>
      </View>
    </View>
  );
}

export function Rule() {
  const c = usePalette();
  return <View style={{ height: 1, backgroundColor: c.line, width: '100%' }} />;
}

export const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  page: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    flexGrow: 1,
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spread: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    gap: 14,
  },
  title: {
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heading: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  body: { fontSize: 15, lineHeight: 24 },
  small: { fontSize: 12, lineHeight: 18 },
  eyebrow: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  primaryBtn: {
    minHeight: 52,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pillBtn: {
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 18,
  },
});
