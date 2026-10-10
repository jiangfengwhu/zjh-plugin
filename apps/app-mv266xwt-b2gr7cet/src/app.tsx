import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Text, Pressy, Icon } from '@zijinhua/app-sdk/ui';

import { HomeScreen } from './screens/HomeScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { StatsScreen } from './screens/StatsScreen';
import { SettingsScreen } from './screens/SettingsScreen';

type TabType = 'home' | 'calendar' | 'stats' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeScreen />;
      case 'calendar': return <CalendarScreen />;
      case 'stats': return <StatsScreen />;
      case 'settings': return <SettingsScreen />;
    }
  };

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'home', label: '记录', icon: 'edit' },
    { key: 'calendar', label: '日历', icon: 'clock' },
    { key: 'stats', label: '统计', icon: 'info' },
    { key: 'settings', label: '设置', icon: 'engine' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.canvas }]}>
      <View style={styles.content}>
        {renderContent()}
      </View>

      <View style={[
        styles.tabBar,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.line,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 10
        }
      ]}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const color = isActive ? theme.colors.text : theme.colors.muted;
          return (
            <Pressy
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon name={tab.icon} size={24} color={color} />
              <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
            </Pressy>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 5,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
  }
});
