import React, { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView } from "react-native";
import { format, addDays, subDays } from "date-fns";
import { getAppContext } from "@zijinhua/app-sdk";
import { BackChip, useTheme, Screen, ScreenBar, Surface, SectionTitle, Pressy, Icon } from "@zijinhua/app-sdk/ui";

export default function App() {
  const ctx = getAppContext();
  const { colors } = useTheme();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [heartbeats, setHeartbeats] = useState("");
  const [wishes, setWishes] = useState("");
  const [thoughts, setThoughts] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const dateKey = `diary_${format(currentDate, "yyyy-MM-dd")}`;

  useEffect(() => {
    const data = ctx.storage.get(dateKey);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setHeartbeats(parsed.heartbeats || "");
        setWishes(parsed.wishes || "");
        setThoughts(parsed.thoughts || "");
        // If there's any data, start in view mode, else in edit mode
        setIsEditing(!(parsed.heartbeats || parsed.wishes || parsed.thoughts));
      } catch (e) {
        setHeartbeats("");
        setWishes("");
        setThoughts("");
        setIsEditing(true);
      }
    } else {
      setHeartbeats("");
      setWishes("");
      setThoughts("");
      setIsEditing(true);
    }
  }, [dateKey]);

  const handleSave = () => {
    ctx.storage.set(dateKey, JSON.stringify({ heartbeats, wishes, thoughts }));
    ctx.toast.show("保存成功", "success");
    setIsEditing(false);
  };

  const handleClear = () => {
    setHeartbeats("");
    setWishes("");
    setThoughts("");
    ctx.storage.remove(dateKey);
    ctx.toast.show("已清空", "success");
    setIsEditing(true);
  };

  const handlePrevDay = () => setCurrentDate(subDays(currentDate, 1));
  const handleNextDay = () => setCurrentDate(addDays(currentDate, 1));

  const inputStyle = {
    color: colors.text,
    fontSize: 16,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top" as const,
  };

  const textStyle = {
    color: colors.text,
    fontSize: 16,
    padding: 12,
    minHeight: 100,
  };

  const placeholderStyle = {
    color: colors.muted,
    fontSize: 16,
    padding: 12,
    fontStyle: "italic" as const,
  };

  return (
    <Screen style={{ backgroundColor: colors.canvas }}>
      <ScreenBar style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <BackChip onPress={ctx.navigation.back} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Pressy onPress={handlePrevDay} style={{ padding: 4 }}>
            <Icon name="chevron" color={colors.text} size={24} />
          </Pressy>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "bold" }}>
            {format(currentDate, "yyyy-MM-dd")}
          </Text>
          <Pressy onPress={handleNextDay} style={{ padding: 4 }}>
            <Icon name="chevron" color={colors.text} size={24} style={{ transform: [{ rotate: "180deg" }] }} />
          </Pressy>
        </View>
        {!isEditing ? (
          <Pressy onPress={() => setIsEditing(true)} style={{ padding: 8 }}>
            <Icon name="edit" color={colors.text} size={24} />
          </Pressy>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </ScreenBar>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <SectionTitle>心动瞬间</SectionTitle>
        <Surface tone="inset" radius={12}>
          {isEditing ? (
            <TextInput
              style={inputStyle}
              placeholder="记录今日的心动..."
              placeholderTextColor={colors.muted}
              multiline
              value={heartbeats}
              onChangeText={setHeartbeats}
            />
          ) : heartbeats ? (
            <Text style={textStyle}>{heartbeats}</Text>
          ) : (
            <Text style={placeholderStyle}>暂无记录</Text>
          )}
        </Surface>

        <SectionTitle>待办小愿望</SectionTitle>
        <Surface tone="inset" radius={12}>
          {isEditing ? (
            <TextInput
              style={inputStyle}
              placeholder="写下你的小愿望..."
              placeholderTextColor={colors.muted}
              multiline
              value={wishes}
              onChangeText={setWishes}
            />
          ) : wishes ? (
            <Text style={textStyle}>{wishes}</Text>
          ) : (
            <Text style={placeholderStyle}>暂无记录</Text>
          )}
        </Surface>

        <SectionTitle>随笔想法</SectionTitle>
        <Surface tone="inset" radius={12}>
          {isEditing ? (
            <TextInput
              style={inputStyle}
              placeholder="随便写点什么..."
              placeholderTextColor={colors.muted}
              multiline
              value={thoughts}
              onChangeText={setThoughts}
            />
          ) : thoughts ? (
            <Text style={textStyle}>{thoughts}</Text>
          ) : (
            <Text style={placeholderStyle}>暂无记录</Text>
          )}
        </Surface>

        {isEditing && (
          <View style={{ flexDirection: "row", gap: 16, marginTop: 16 }}>
            <Pressy onPress={handleClear} style={{ flex: 1 }}>
              <Surface tone="raised" radius={999} style={{ paddingVertical: 14, alignItems: "center", backgroundColor: colors.surface }}>
                <Text style={{ color: colors.danger, fontSize: 16, fontWeight: "bold" }}>一键清空</Text>
              </Surface>
            </Pressy>
            <Pressy onPress={handleSave} style={{ flex: 1 }}>
              <Surface tone="raised" radius={999} style={{ paddingVertical: 14, alignItems: "center", backgroundColor: colors.accent }}>
                <Text style={{ color: colors.onAccent, fontSize: 16, fontWeight: "bold" }}>本地保存</Text>
              </Surface>
            </Pressy>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
