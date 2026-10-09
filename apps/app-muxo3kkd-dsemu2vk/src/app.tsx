import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAppContext } from "@zijinhua/app-sdk";
import { useTheme } from "@zijinhua/app-sdk/ui";

import { Home } from "./pages/Home";
import { CalendarView } from "./pages/CalendarView";
import { StatsView } from "./pages/StatsView";

export default function App() {
  const ctx = getAppContext();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'stats'>('home');

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <Home />;
      case 'calendar': return <CalendarView />;
      case 'stats': return <StatsView />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: insets.top + 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.line
      }}>
        <Pressable accessibilityRole="button" onPress={ctx.navigation.back} style={{ padding: 8, marginRight: 8 }}>
          <Text style={{ color: colors.accentText, fontSize: 16 }}>返回</Text>
        </Pressable>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "bold", flex: 1, textAlign: "center", marginRight: 40 }}>
          心情记录
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>

      <View style={{
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: colors.line,
        backgroundColor: colors.surface,
        paddingBottom: insets.bottom,
      }}>
        {[
          { key: 'home', label: '签到' },
          { key: 'calendar', label: '日历' },
          { key: 'stats', label: '统计' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              style={{
                flex: 1,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text style={{
                color: isActive ? colors.accentText : colors.muted,
                fontWeight: isActive ? "bold" : "normal",
                fontSize: 14
              }}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}