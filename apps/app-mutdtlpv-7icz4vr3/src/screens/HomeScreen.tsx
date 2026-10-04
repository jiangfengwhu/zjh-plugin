import React, { useState, useEffect, useMemo } from "react";
import { View, Text, TextInput, FlatList, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search, Plus, Trash2, Calendar, Smile } from "lucide-react-native";
import { getAppContext } from "@zijinhua/app-sdk";
import {
  Screen,
  ScreenBar,
  PageHeader,
  Surface,
  Pressy,
  useTheme,
  Icon,
} from "@zijinhua/app-sdk/ui";
import { store, DiaryEntry } from "../store";

type RootStackParamList = {
  Home: undefined;
  Editor: { id?: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen() {
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const navigation = useNavigation<NavigationProp>();
  const { colors, mode } = useTheme();
  const ctx = getAppContext();

  useEffect(() => {
    const loadDiaries = () => {
      const data = store.getDiaries();
      // Sort by date descending (and then by createdAt as fallback)
      data.sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff === 0) {
          return b.createdAt - a.createdAt;
        }
        return dateDiff;
      });
      setDiaries(data);
    };

    loadDiaries();
    const unsubscribe = store.subscribe(loadDiaries);
    return unsubscribe;
  }, []);

  const filteredDiaries = useMemo(() => {
    if (!searchQuery.trim()) return diaries;
    const query = searchQuery.toLowerCase();
    return diaries.filter(
      (d) =>
        d.title.toLowerCase().includes(query) ||
        d.body.toLowerCase().includes(query) ||
        d.date.includes(query)
    );
  }, [diaries, searchQuery]);

  const handleDelete = (id: string) => {
    Alert.alert("删除日记", "确定要删除这篇日记吗？此操作不可恢复。", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: () => {
          store.deleteDiary(id);
          ctx.toast.show("日记已删除", "success");
        },
      },
    ]);
  };

  const handleExport = async () => {
    if (diaries.length === 0) {
      ctx.toast.show("没有可以导出的日记", "info");
      return;
    }
    try {
      const exportData = JSON.stringify(diaries, null, 2);
      await ctx.clipboard.set(exportData);
      ctx.toast.show("已将所有日记数据复制到剪贴板", "success");
    } catch (e) {
      ctx.toast.show("导出失败", "error");
    }
  };

  const renderItem = ({ item }: { item: DiaryEntry }) => {
    const previewText = item.title || item.body.split("\n")[0] || "无标题";
    return (
      <Surface tone="base" radius={16} style={{ marginBottom: 12 }}>
        <Pressy
          onPress={() => navigation.navigate("Editor", { id: item.id })}
          style={{ padding: 16, flexDirection: "row", alignItems: "flex-start" }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "500", color: colors.text, marginBottom: 8 }} numberOfLines={1}>
              {previewText}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Calendar size={14} color={colors.muted} />
              <Text style={{ fontSize: 12, color: colors.muted, marginLeft: 4, marginRight: 12 }}>
                {item.date}
              </Text>
              {item.mood ? (
                <>
                  <Smile size={14} color={colors.muted} />
                  <Text style={{ fontSize: 12, color: colors.muted, marginLeft: 4 }}>
                    {item.mood}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
          <Pressy
            onPress={() => handleDelete(item.id)}
            style={{ padding: 8, marginLeft: 8 }}
          >
            <Trash2 size={20} color={colors.danger} />
          </Pressy>
        </Pressy>
      </Surface>
    );
  };

  return (
    <Screen style={{ backgroundColor: colors.canvas }}>
      <ScreenBar>
        <PageHeader
          title="日记本"
          onBack={() => ctx.navigation.back()}
          right={
            <Pressy onPress={handleExport} style={{ padding: 8 }}>
              <Text style={{ color: colors.accent, fontSize: 16 }}>导出</Text>
            </Pressy>
          }
        />
      </ScreenBar>

      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.field,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 40,
            marginBottom: 16,
          }}
        >
          <Search size={20} color={colors.muted} />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 15,
              color: colors.text,
            }}
            placeholder="搜索日记..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredDiaries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 40 }}>
              <Text style={{ color: colors.muted, fontSize: 16 }}>
                {searchQuery ? "没有找到匹配的日记" : "暂无日记，点击右下角按钮新建"}
              </Text>
            </View>
          }
        />
      </View>

      <View style={{ position: "absolute", right: 24, bottom: 40 }}>
        <Pressy
          onPress={() => navigation.navigate("Editor", {})}
          style={{
            backgroundColor: colors.accent,
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            elevation: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }}
        >
          <Plus size={32} color={colors.onAccent} />
        </Pressy>
      </View>
    </Screen>
  );
}
