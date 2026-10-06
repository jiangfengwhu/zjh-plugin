import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAppContext } from "@zijinhua/app-sdk";
import { useTheme } from "@zijinhua/app-sdk/ui";
import HomeView from "./screens/Home";
import CalendarView from "./screens/Calendar";
import ChartsView from "./screens/Charts";
import AIChatView from "./screens/AIChat";

type TabType = 'home' | 'calendar' | 'charts' | 'chat';

export default function App() {
  const ctx = getAppContext();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('home');

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeView />;
      case 'calendar': return <CalendarView />;
      case 'charts': return <ChartsView />;
      case 'chat': return <AIChatView />;
      default: return <HomeView />;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
        case 'home': return 'AI 记账';
        case 'calendar': return '日历视图';
        case 'charts': return '统计图表';
        case 'chat': return '财务顾问';
        default: return '应用';
    }
  };

  const TabButton = ({ tab, label }: { tab: TabType, label: string }) => {
    const isActive = activeTab === tab;
    return (
      <Pressable
        onPress={() => {
            setActiveTab(tab);
            ctx.haptics.trigger('selection');
        }}
        style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}
      >
        <Text style={{
            color: isActive ? colors.accentText : colors.muted,
            fontWeight: isActive ? 'bold' : 'normal'
        }}>
            {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{flex:1,backgroundColor:colors.canvas}} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 44, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Pressable accessibilityRole="button" onPress={ctx.navigation.back} style={{ padding: 8, marginLeft: -8 }}>
                <Text style={{color:colors.text}}>返回</Text>
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>{getTitle()}</Text>
            </View>
            <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
            {renderContent()}
        </View>

        {/* Bottom Tab Bar */}
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.canvas }}>
            <TabButton tab="home" label="明细" />
            <TabButton tab="calendar" label="日历" />
            <TabButton tab="charts" label="图表" />
            <TabButton tab="chat" label="AI分析" />
        </View>
    </SafeAreaView>
  );
}
