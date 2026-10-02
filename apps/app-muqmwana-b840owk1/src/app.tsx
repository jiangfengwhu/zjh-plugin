import React, { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity } from "react-native";
import { format, addDays, subDays, parseISO } from "date-fns";
import { getAppContext } from "@zijinhua/app-sdk";
import { BackChip, useTheme, Screen, ScreenBar, Surface, SectionTitle, Pressy, Icon } from "@zijinhua/app-sdk/ui";

function updateIndex(ctx: ReturnType<typeof getAppContext>, dateStr: string, add: boolean) {
  let index: string[] = [];
  const indexData = ctx.storage.get("diary_index");
  if (indexData) {
    try {
      index = JSON.parse(indexData);
    } catch (e) {
      // ignore
    }
  }

  if (add) {
    if (!index.includes(dateStr)) {
      index.push(dateStr);
      index.sort((a, b) => b.localeCompare(a));
      ctx.storage.set("diary_index", JSON.stringify(index));
    }
  } else {
    const newIndex = index.filter(d => d !== dateStr);
    if (newIndex.length !== index.length) {
      ctx.storage.set("diary_index", JSON.stringify(newIndex));
    }
  }
}

function DetailView({ date, onBack, onChangeDate }: { date: Date, onBack: () => void, onChangeDate: (d: Date) => void }) {
  const ctx = getAppContext();
  const { colors } = useTheme();

  const [heartbeats, setHeartbeats] = useState("");
  const [wishes, setWishes] = useState("");
  const [thoughts, setThoughts] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const dateStr = format(date, "yyyy-MM-dd");
  const dateKey = `diary_${dateStr}`;

  useEffect(() => {
    const data = ctx.storage.get(dateKey);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setHeartbeats(parsed.heartbeats || "");
        setWishes(parsed.wishes || "");
        setThoughts(parsed.thoughts || "");
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
    updateIndex(ctx, dateStr, true);
    ctx.toast.show("保存成功", "success");
    setIsEditing(false);
  };

  const handleClear = () => {
    setHeartbeats("");
    setWishes("");
    setThoughts("");
    ctx.storage.remove(dateKey);
    updateIndex(ctx, dateStr, false);
    ctx.toast.show("已清空", "success");
    setIsEditing(true);
  };

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
        <BackChip onPress={onBack} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Pressy onPress={() => onChangeDate(subDays(date, 1))} style={{ padding: 4 }}>
            <Icon name="chevron" color={colors.text} size={24} />
          </Pressy>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "bold" }}>
            {dateStr}
          </Text>
          <Pressy onPress={() => onChangeDate(addDays(date, 1))} style={{ padding: 4 }}>
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

function ListView({ onSelectDate }: { onSelectDate: (d: Date) => void }) {
  const ctx = getAppContext();
  const { colors } = useTheme();
  const [index, setIndex] = useState<string[]>([]);

  useEffect(() => {
    const indexData = ctx.storage.get("diary_index");
    if (indexData) {
      try {
        setIndex(JSON.parse(indexData));
      } catch (e) {
        setIndex([]);
      }
    } else {
      setIndex([]);
    }
  }, [ctx.storage]);

  return (
    <Screen style={{ backgroundColor: colors.canvas }}>
      <ScreenBar style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <BackChip onPress={ctx.navigation.back} />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "bold" }}>心晴手账</Text>
        <Pressy onPress={() => onSelectDate(new Date())} style={{ padding: 8 }}>
          <Icon name="plus" color={colors.text} size={24} />
        </Pressy>
      </ScreenBar>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {index.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ color: colors.muted, fontSize: 16 }}>暂无日记，点击右上角开始记录吧</Text>
          </View>
        ) : (
          index.map(dateStr => (
            <Pressy key={dateStr} onPress={() => onSelectDate(parseISO(dateStr))}>
              <Surface tone="raised" radius={12} style={{ padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "500" }}>{dateStr}</Text>
                <Icon name="chevron" color={colors.muted} size={20} style={{ transform: [{ rotate: "180deg" }] }} />
              </Surface>
            </Pressy>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

export default function App() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  if (currentDate) {
    return <DetailView date={currentDate} onBack={() => setCurrentDate(null)} onChangeDate={setCurrentDate} />;
  }

  return <ListView onSelectDate={setCurrentDate} />;
}
