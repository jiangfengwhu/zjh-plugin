import React, { memo, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@zijinhua/app-sdk/ui';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
const light = {
  paper: '#F0EBE1',
  ink: '#302F29',
  muted: '#6B6255',
  line: '#CEC5B5',
  clay: '#8E543D',
  stone: '#CCC1AC',
  stoneLight: '#DDD5C5',
  moss: '#626A4F',
  onClay: '#FFF8ED',
  sheet: '#F8F3E9',
};
const dark = {
  paper: '#24241F',
  ink: '#E9E1D3',
  muted: '#B6AD9D',
  line: '#4B493E',
  clay: '#D39E82',
  stone: '#57594B',
  stoneLight: '#70715E',
  moss: '#B8C19B',
  onClay: '#29231F',
  sheet: '#303029',
};
export function usePaper() {
  return useTheme().mode === 'dark' ? dark : light;
}
const pebble =
  'M155 18C203 17 241 51 250 96C260 144 240 205 192 226C143 248 73 236 39 202C7 171 13 125 28 87C45 46 104 16 155 18Z';
export const Paper = memo(function Paper() {
  const c = usePaper();
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 400 850"
      >
        <Rect width="400" height="850" fill={c.paper} />
        <Path
          d="M280 0C211 148 401 253 348 392S240 669 400 850H400V0Z"
          fill={c.stone}
          opacity={0.12}
        />
        <G fill={c.ink} opacity={0.12}>
          {Array.from({ length: 96 }, (_, i) => (
            <Circle
              key={i}
              cx={(i * 97 + 19) % 400}
              cy={(i * 139 + 11) % 850}
              r={i % 4 === 0 ? 0.85 : 0.45}
            />
          ))}
        </G>
        <Line x1="26" y1="0" x2="26" y2="850" stroke={c.line} opacity={0.25} />
      </Svg>
    </View>
  );
});
export function InkButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  icon?: React.ReactNode;
}) {
  const c = usePaper();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? 'transparent' : c.ink,
          borderColor: secondary ? c.line : c.ink,
          opacity: disabled ? 0.4 : pressed ? 0.65 : 1,
        },
      ]}
    >
      {icon}
      <Text
        style={{
          color: secondary ? c.ink : c.paper,
          fontSize: 15,
          letterSpacing: 1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function QuietButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = usePaper();
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        justifyContent: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.5 : 1,
      })}
    >
      <Text style={{ color: c.muted, fontSize: 13, letterSpacing: 0.5 }}>
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
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.5 : 1,
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
      entering={FadeInDown.duration(430).reduceMotion(ReduceMotion.System)}
      style={{ flexGrow: 1 }}
    >
      {children}
    </Animated.View>
  );
}
export function Pebble({
  size = 230,
  alive = false,
  active = true,
  level,
  children,
}: {
  size?: number;
  alive?: boolean;
  active?: boolean;
  level?: SharedValue<number>;
  children?: React.ReactNode;
}) {
  const c = usePaper(),
    breath = useSharedValue(0);
  useEffect(() => {
    if (alive && active)
      breath.value = withRepeat(
        withSequence(
          withTiming(1, {
            duration: 2600,
            easing: Easing.inOut(Easing.sin),
            reduceMotion: ReduceMotion.System,
          }),
          withTiming(0, {
            duration: 3200,
            easing: Easing.inOut(Easing.sin),
            reduceMotion: ReduceMotion.System,
          })
        ),
        -1
      );
    else {
      cancelAnimation(breath);
      breath.value = withTiming(0, { duration: 180 });
    }
    return () => cancelAnimation(breath);
  }, [alive, active]);
  const float = useAnimatedStyle(() => ({
    transform: [
      { translateY: -6 * breath.value },
      { scale: 1 + 0.025 * breath.value + (level?.value || 0) * 0.055 },
      { rotate: `${-3 + breath.value * 2}deg` },
    ],
  }));
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
        style={[StyleSheet.absoluteFill, float]}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%" viewBox="0 0 270 260">
          <Path d={pebble} fill={c.stone} />
          <Path
            d="M30 127C29 72 95 28 151 27C191 27 220 46 236 81C203 55 170 59 139 77C102 99 78 137 30 127Z"
            fill={c.stoneLight}
          />
          <Path
            d="M70 199C119 221 185 214 215 174"
            stroke={c.ink}
            opacity={0.12}
            strokeWidth="1"
            fill="none"
          />
          <G fill={c.ink} opacity={0.14}>
            {Array.from({ length: 32 }, (_, i) => (
              <Circle
                key={i}
                cx={65 + ((i * 41) % 137)}
                cy={65 + ((i * 29) % 110)}
                r={i % 3 ? 0.6 : 1.1}
              />
            ))}
          </G>
          <Path
            d="M183 65L166 103L177 120L144 153"
            stroke={c.paper}
            strokeWidth="1.2"
            fill="none"
            opacity={0.6}
          />
        </Svg>
      </Animated.View>
      {children}
    </View>
  );
}
export function Trace({ count = 0 }: { count?: number }) {
  const c = usePaper();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 5,
        minHeight: 24,
      }}
    >
      {Array.from({ length: Math.min(count || 1, 5) }, (_, i) => (
        <Animated.View
          key={`${count ? 'stone' : 'empty'}-${i}`}
          entering={FadeInDown.duration(600).reduceMotion(ReduceMotion.System)}
        >
          <Svg
            width={i % 2 ? 14 : 20}
            height={i % 2 ? 11 : 15}
            viewBox="0 0 270 260"
          >
            <Path d={pebble} fill={count ? c.moss : c.line} />
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}
export function Rule() {
  const c = usePaper();
  return <View style={{ height: 1, backgroundColor: c.line, width: '100%' }} />;
}
export const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingLeft: 28,
    paddingRight: 12,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  page: {
    paddingHorizontal: 32,
    paddingBottom: 30,
    flexGrow: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spread: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 38,
    lineHeight: 54,
    fontWeight: '400',
    letterSpacing: 2,
  },
  heading: {
    fontFamily: 'serif',
    fontSize: 25,
    lineHeight: 38,
    letterSpacing: 1,
  },
  body: { fontSize: 15, lineHeight: 26, letterSpacing: 0.5 },
  small: { fontSize: 12, lineHeight: 21, letterSpacing: 1 },
  eyebrow: { fontSize: 10, lineHeight: 18, letterSpacing: 2.5 },
  button: {
    minHeight: 48,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 2,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 28,
    padding: 28,
    gap: 20,
  },
});
