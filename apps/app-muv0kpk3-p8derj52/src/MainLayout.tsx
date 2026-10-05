import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme, Icon, PageHeader } from "@zijinhua/app-sdk/ui";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardState } from "react-native-keyboard-controller";
import { getAppContext } from "@zijinhua/app-sdk";
import AccountingTab from "./tabs/AccountingTab";
import CalendarTab from "./tabs/CalendarTab";
import ChartsTab from "./tabs/ChartsTab";
import QaTab from "./tabs/QaTab";

type Tab = "accounting" | "calendar" | "charts" | "qa";

export default function MainLayout() {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const keyboardOpen = useKeyboardState((state) => state.isVisible);
  const [currentTab, setCurrentTab] = useState<Tab>("accounting");
  const ctx = getAppContext();

  const renderTabContent = () => {
    switch (currentTab) {
      case "accounting": return <AccountingTab />;
      case "calendar": return <CalendarTab />;
      case "charts": return <ChartsTab />;
      case "qa": return <QaTab />;
      default: return null;
    }
  };

  const tabs = [
    { id: "accounting" as Tab, label: "记账", icon: "plus" as const },
    { id: "calendar" as Tab, label: "日历", icon: "clock" as const },
    { id: "charts" as Tab, label: "图表", icon: "workshop" as const },
    { id: "qa" as Tab, label: "问答", icon: "info" as const },
  ];

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <PageHeader
        title="AI 记账本"
        onBack={() => ctx.navigation.back()}
      />
      <View style={{ flex: 1 }}>
        {renderTabContent()}
      </View>
      {!keyboardOpen && <View style={[styles.tabBar, {
        paddingBottom: bottom,
        backgroundColor: colors.surfaceRaised,
        borderTopColor: colors.line,
        borderTopLeftRadius: colors.radius.lg,
        borderTopRightRadius: colors.radius.lg,
      }]}>
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => setCurrentTab(tab.id)}
            >
              <Icon
                name={tab.icon}
                color={isActive ? colors.accent : colors.muted}
                size={24}
              />
              <Text style={[styles.tabLabel, { color: isActive ? colors.accent : colors.muted }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    alignItems: "center",
    justifyContent: "space-around"
  },
  tabItem: {
    flex: 1,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
  }
});
