import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { getAppContext } from "@zijinhua/app-sdk";
import { BackChip, useTheme, Pressy, Icon } from "@zijinhua/app-sdk/ui";
import Svg, { Circle } from "react-native-svg";

const WORK_TIME = 25 * 60;

export default function App() {
  const ctx = getAppContext();
  const { colors, mode } = useTheme();

  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [flowerCount, setFlowerCount] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isTimerRunning && timeLeft === 0) {
      // Timer complete
      setIsTimerRunning(false);
      setFlowerCount((prev) => prev + 1);
      setTimeLeft(WORK_TIME);

      // Rest reminder and soft sound/vibration
      ctx.phone.speak("辛苦了，专注完成！休息一下吧。");
      ctx.phone.vibrate();
      ctx.phone.notify("tomato-rest", "专注完成", "休息一下吧！");
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timeLeft]);

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Ring properties
  const radius = 100;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / WORK_TIME;
  const strokeDashoffset = circumference - progress * circumference;
  const size = (radius + strokeWidth) * 2;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ padding: 24, paddingBottom: 0, flexDirection: 'row', alignItems: 'center' }}>
        <BackChip onPress={ctx.navigation.back} />
      </View>

      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>

        {/* Counter and flowers */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 40 }}>
          <Text style={{ fontSize: 24, marginRight: 8, color: colors.text }}>今日专注</Text>
          <Text style={{ fontSize: 24, marginRight: 8 }}>🌸</Text>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.accent }}>{flowerCount}</Text>
        </View>

        {/* Countdown Ring */}
        <View style={{ position: "relative", justifyContent: "center", alignItems: "center" }}>
          <Svg width={size} height={size}>
            {/* Background Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.surfaceRaised}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.accent}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>
          {/* Time Text */}
          <View style={{ position: "absolute" }}>
            <Text style={{ fontSize: 48, fontWeight: "bold", color: colors.text }}>
              {formatTime(timeLeft)}
            </Text>
          </View>
        </View>

        {/* Start/Pause Button */}
        <View style={{ marginTop: 60 }}>
          <Pressy
            onPress={toggleTimer}
            style={{
              backgroundColor: colors.accent,
              paddingHorizontal: 40,
              paddingVertical: 16,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: colors.onAccent, fontSize: 20, fontWeight: "bold" }}>
              {isTimerRunning ? "暂停" : "开始专注"}
            </Text>
          </Pressy>
        </View>

      </View>
    </View>
  );
}
