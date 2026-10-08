import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, Text, Icon, ConfirmDialog, RichMarkdown } from "@zijinhua/app-sdk/ui";
import { getAppContext } from "@zijinhua/app-sdk";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

import { RootStackParamList } from "../app";
import { store } from "../store";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Detail">;
  route: RouteProp<RootStackParamList, "Detail">;
};

export default function Detail({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { diary } = route.params;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    await store.deleteDiary(diary.id);
    setShowDeleteConfirm(false);
    getAppContext().toast.show("已删除", "success");
    navigation.goBack();
  };

  const date = new Date(diary.date);

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.line }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Edit", { diary })}
            style={styles.actionButton}
          >
            <Icon name="edit" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowDeleteConfirm(true)}
            style={styles.actionButton}
          >
            <Icon name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {!!diary.title && (
          <Text variant="title" style={[styles.title, { color: colors.text }]}>
            {diary.title}
          </Text>
        )}
        <View style={styles.meta}>
          <Icon name="clock" size={16} color={colors.muted} />
          <Text variant="caption" style={[styles.date, { color: colors.muted }]}>
            {`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`}
          </Text>
        </View>
        <RichMarkdown markdown={diary.content} fontSize={17} lineHeight={30} />
      </ScrollView>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="删除日记"
        description="确定要删除这篇日记吗？此操作无法撤销。"
        confirmLabel="删除"
        cancelLabel="取消"
        intent="danger"
        onConfirm={handleDelete}
        onClose={() => setShowDeleteConfirm(false)}
      />
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    marginLeft: 20,
  },
  content: {
    padding: 24,
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  date: {
    marginLeft: 8,
  },
  bodyText: {
    fontSize: 17,
    lineHeight: 30,
    letterSpacing: 0.3,
  },
});
