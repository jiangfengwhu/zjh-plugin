import React, { useState, useEffect } from "react";
import { View, Pressable, ScrollView, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAppContext, CloudRecord } from "@zijinhua/app-sdk";
import { useTheme, Text, TextInput, Button, Icon, Surface } from "@zijinhua/app-sdk/ui";

type Post = {
  text: string;
};

export default function App() {
  const ctx = getAppContext();
  const { colors } = useTheme();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<CloudRecord<Post>[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const fetchPosts = async () => {
    try {
      const result = await ctx.cloud.public.collection<Post>("posts").list({
        orderBy: { field: "createdAt", direction: "desc" }
      });
      setPosts(result.items);
    } catch (e) {
      ctx.toast.show("加载失败", "error");
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCompose = async () => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      await ctx.cloud.public.collection<Post>("posts").create({ text });
      setText("");
      ctx.toast.show("发布成功", "success");
      fetchPosts();
    } catch (e) {
      ctx.toast.show("发布失败", "error");
    } finally {
      setLoading(false);
    }
  };

  const renderPost = ({ item }: { item: CloudRecord<Post> }) => {
    return (
      <Surface tone="raised" style={{ padding: 16, marginBottom: 12, borderRadius: 12 }}>
        <Text style={{ fontSize: 16, color: colors.text }}>{item.data.text}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
          <Text style={{ fontSize: 12, color: colors.muted }}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
      </Surface>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Pressable accessibilityRole="button" onPress={ctx.navigation.back} style={{ padding: 8 }}>
          <Icon name="back" color={colors.text} size={24} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600' }}>朋友圈</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 24 }}>
            <TextInput
              multiline
              placeholder="分享你的生活..."
              value={text}
              onChangeText={setText}
              style={{ minHeight: 100, textAlignVertical: 'top', fontSize: 16, marginBottom: 12, backgroundColor: colors.surface, padding: 12, borderRadius: 12 }}
            />
            <Button
              label="发布"
              intent="brand"
              onPress={handleCompose}
              disabled={!text.trim() || loading}
              busy={loading}
            />
          </View>
        }
        ListEmptyComponent={
          loadingPosts ? <ActivityIndicator color={colors.text} /> : <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 40 }}>暂无动态，快来发布第一条吧</Text>
        }
      />
    </SafeAreaView>
  );
}
