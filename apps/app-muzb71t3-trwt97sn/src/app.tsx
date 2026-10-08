import React, { useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAppContext } from "@zijinhua/app-sdk";
import { useTheme, Text, TextInput, Button, Icon } from "@zijinhua/app-sdk/ui";

export default function App() {
  const ctx = getAppContext();
  const { colors } = useTheme();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCompose = async () => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      await ctx.feed.compose({ html: text });
      setText("");
      ctx.toast.show("发布成功", "success");
    } catch (e) {
      // User cancelled or failed, do nothing and keep text
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Pressable accessibilityRole="button" onPress={ctx.navigation.back} style={{ padding: 8 }}>
          <Icon name="back" color={colors.text} size={24} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600' }}>分享想法</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <TextInput
          multiline
          placeholder="畅所欲言，分享你的想法..."
          value={text}
          onChangeText={setText}
          style={{ minHeight: 200, textAlignVertical: 'top', fontSize: 16, marginBottom: 24 }}
        />
        <Button
          label="发推"
          intent="brand"
          onPress={handleCompose}
          disabled={!text.trim() || loading}
          busy={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
