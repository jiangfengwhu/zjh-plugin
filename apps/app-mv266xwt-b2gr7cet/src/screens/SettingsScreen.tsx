import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Surface, Text, Switch, useTheme } from '@zijinhua/app-sdk/ui';
import { getAppContext } from '@zijinhua/app-sdk';
import { storage } from '../storage';

export function SettingsScreen() {
  const theme = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [timeStr, setTimeStr] = useState('20:00'); // HH:mm

  useEffect(() => {
    storage.getReminderSettings().then(settings => {
      setEnabled(settings.enabled);
      setTimeStr(settings.timeStr);
    });
  }, []);

  const handleToggle = async (newEnabled: boolean) => {
    setEnabled(newEnabled);
    await storage.saveReminderSettings({ enabled: newEnabled, timeStr });

    if (newEnabled) {
      const permission = await getAppContext().phone.requestNotifications();
      if (permission.ok && permission.granted) {
          scheduleReminder(timeStr);
      } else {
          setEnabled(false);
          await storage.saveReminderSettings({ enabled: false, timeStr });
          getAppContext().toast.show("需要通知权限才能设置提醒", "error");
      }
    } else {
      await getAppContext().phone.cancelSchedule('mood_daily_reminder');
    }
  };

  const scheduleReminder = async (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      const now = new Date();
      let targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

      if (targetTime.getTime() <= now.getTime()) {
          // If time has passed today, schedule for tomorrow
          targetTime.setDate(targetTime.getDate() + 1);
      }

      await getAppContext().phone.schedule(
          'mood_daily_reminder',
          '该记录心情啦',
          '花一分钟记录下此刻的心情吧~',
          targetTime.getTime()
      );
  };

  // Simplified time picker using pre-defined times
  const TIMES = ['09:00', '12:00', '18:00', '20:00', '22:00'];

  const handleTimeChange = async (newTime: string) => {
      setTimeStr(newTime);
      await storage.saveReminderSettings({ enabled, timeStr: newTime });
      if (enabled) {
          await scheduleReminder(newTime);
          getAppContext().toast.show(`提醒时间已更新为 ${newTime}`, "success");
      }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.canvas }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.colors.text }]}>设置</Text>

      <Surface tone="base" radius={theme.colors.radius.lg} style={styles.section}>
        <View style={styles.settingRow}>
            <View>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>每日提醒</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 4 }}>提醒自己记录当天心情</Text>
            </View>
            <Switch checked={enabled} onCheckedChange={handleToggle} />
        </View>

        {enabled && (
            <View style={styles.timeSelection}>
                <Text style={[styles.settingLabel, { color: theme.colors.text, marginBottom: 15 }]}>选择提醒时间</Text>
                <View style={styles.timeGrid}>
                    {TIMES.map(t => (
                        <Text
                            key={t}
                            onPress={() => handleTimeChange(t)}
                            style={[
                                styles.timeBadge,
                                {
                                    color: t === timeStr ? theme.colors.canvas : theme.colors.text,
                                    backgroundColor: t === timeStr ? theme.colors.text : 'transparent',
                                    borderColor: theme.colors.line
                                }
                            ]}
                        >
                            {t}
                        </Text>
                    ))}
                </View>
            </View>
        )}
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    padding: 20,
    marginBottom: 20,
  },
  settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  settingLabel: {
      fontSize: 16,
      fontWeight: '500',
  },
  timeSelection: {
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: '#ccc',
  },
  timeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
  },
  timeBadge: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      overflow: 'hidden',
  }
});
