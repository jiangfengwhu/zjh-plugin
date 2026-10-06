import React, { useState } from "react";
import { View, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getAppContext } from "@zijinhua/app-sdk";
import { useTheme, Text, Icon } from "@zijinhua/app-sdk/ui";

import Home from "./Home";
import Charts from "./Charts";
import Chat from "./Chat";

export default function App() {
  const ctx = getAppContext();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"home" | "charts" | "chat">("home");

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <Home />;
      case "charts":
        return <Charts />;
      case "chat":
        return <Chat />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case "home":
        return "智能记账";
      case "charts":
        return "数据图表";
      case "chat":
        return "AI 分析";
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={['top']}>
      {/* Custom Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Pressable onPress={ctx.navigation.back} style={{ paddingRight: 16 }}>
          <Icon name="back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="title" style={{ flex: 1, textAlign: 'center' }}>{getTitle()}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1 }}>
          {renderContent()}
        </View>
      </KeyboardAvoidingView>

      {/* Bottom Tab Bar */}
      <View style={{
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: colors.line,
        backgroundColor: colors.surface,
        paddingBottom: insets.bottom
      }}>
        <Pressable
          onPress={() => setActiveTab("home")}
          style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}
        >
          <Text style={{ color: activeTab === "home" ? colors.accent : colors.muted, fontWeight: activeTab === "home" ? 'bold' : 'normal' }}>记账</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("charts")}
          style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}
        >
          <Text style={{ color: activeTab === "charts" ? colors.accent : colors.muted, fontWeight: activeTab === "charts" ? 'bold' : 'normal' }}>图表</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("chat")}
          style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}
        >
          <Text style={{ color: activeTab === "chat" ? colors.accent : colors.muted, fontWeight: activeTab === "chat" ? 'bold' : 'normal' }}>AI问答</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
