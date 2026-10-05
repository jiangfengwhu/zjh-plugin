import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, Icon, PageHeader, Screen, Surface } from "@zijinhua/app-sdk/ui";
import { getAppContext } from "@zijinhua/app-sdk";
import AccountingTab from "./tabs/AccountingTab";
import CalendarTab from "./tabs/CalendarTab";
import ChartsTab from "./tabs/ChartsTab";
import QaTab from "./tabs/QaTab";

type Tab = "accounting" | "calendar" | "charts" | "qa";

export default function MainLayout() {
  const { colors } = useTheme();
  const [currentTab, setCurrentTab] = useState<Tab>("accounting");
  const ctx = getAppContext();
  const insets = useSafeAreaInsets();

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
    <Screen style={{ flex: 1, backgroundColor: colors.canvas }}>
      <PageHeader
        title="AI 记账本"
        onBack={() => ctx.navigation.back()}
      />
      <View style={{ flex: 1 }}>
        {renderTabContent()}
      </View>
      <Surface tone="raised" style={[styles.tabBar, { borderTopColor: colors.line, paddingBottom: insets.bottom || 10, height: 64 + (insets.bottom || 10) }]}>
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
      </Surface>
    </Screen>
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
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
  }
});
