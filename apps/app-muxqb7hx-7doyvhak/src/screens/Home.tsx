import React, { useCallback, useState } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, Text, Icon, EmptyState } from "@zijinhua/app-sdk/ui";
import { getAppContext } from "@zijinhua/app-sdk";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../app";
import { Diary, store } from "../store";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Home">;
};

export default function Home({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [diaries, setDiaries] = useState<Diary[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadDiaries();
    }, [])
  );

  const loadDiaries = async () => {
    const data = await store.getDiaries();
    setDiaries(data);
  };

  const renderItem = ({ item }: { item: Diary }) => {
    const preview = item.content.length > 50 ? item.content.slice(0, 50) + "..." : item.content;
    const date = new Date(item.date);
    return (
      <TouchableOpacity
        style={[styles.card, {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          shadowColor: colors.ink
        }]}
        onPress={() => navigation.navigate("Detail", { diary: item })}
      >
        <View style={styles.cardHeader}>
          <Text variant="title" style={{ flex: 1, color: colors.text }} numberOfLines={1}>
            {item.title || "无标题"}
          </Text>
          <Text variant="caption" style={{ color: colors.muted }}>
            {`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`}
          </Text>
        </View>
        <Text style={{ color: colors.text, marginTop: 8 }} numberOfLines={2}>
          {preview}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.line }]}>
        <TouchableOpacity onPress={() => getAppContext().navigation.back()}>
          <Icon name="back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text variant="title" style={{ color: colors.text }}>
          日记本
        </Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={diaries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        ListEmptyComponent={
          <EmptyState>
            <Text style={{ color: colors.text }}>暂无日记</Text>
            <Text style={{ color: colors.muted, marginTop: 8 }}>点击右下角按钮开始记录第一篇日记吧</Text>
          </EmptyState>
        }
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent, bottom: insets.bottom + 24 }]}
        onPress={() => navigation.navigate("Edit", {})}
      >
        <Icon name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fab: {
    position: "absolute",
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
