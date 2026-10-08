import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getAppContext } from "@zijinhua/app-sdk";
import { useTheme } from "@zijinhua/app-sdk/ui";
import { CheckCircle2, Circle, Trash2, Plus, ChevronLeft, LogIn } from "lucide-react-native";

interface Todo {
  text: string;
  completed: boolean;
  createdAt: number;
}

export default function App() {
  const app = getAppContext();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [todos, setTodos] = useState<{id: string, data: Todo}[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(app.auth.getUser());

  const collection = app.cloud.private.collection<Todo>("todos");

  const loadTodos = async () => {
    setLoading(true);
    try {
      const res = await collection.list();
      setTodos(res.items);
    } catch (e) {
      console.log(e);
      app.toast.show("加载失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = app.auth.subscribe(() => {
      const u = app.auth.getUser();
      setUser(u);
      if (u) {
        loadTodos();
      } else {
        setTodos([]);
        setLoading(false);
      }
    });

    if (user) {
      loadTodos();
    } else {
      setLoading(false);
    }
    return unsub;
  }, []);

  const addTodo = async () => {
    if (!user) {
      await app.auth.requireLogin();
      if (!app.auth.getUser()) return;
    }

    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText("");
    app.haptics.trigger("selection");

    const newTodo: Todo = {
      text,
      completed: false,
      createdAt: Date.now(),
    };

    const tempId = `temp_${Date.now()}`;
    setTodos(prev => [{ id: tempId, data: newTodo }, ...prev]);

    try {
      const created = await collection.create(newTodo);
      setTodos(prev => prev.map(t => t.id === tempId ? { id: created.id, data: newTodo } : t));
    } catch (e) {
      app.toast.show("添加失败", "error");
      loadTodos();
    }
  };

  const toggleTodo = async (id: string, currentCompleted: boolean) => {
    app.haptics.trigger("selection");
    setTodos(prev => prev.map(t => t.id === id ? { ...t, data: { ...t.data, completed: !currentCompleted } } : t));

    if (id.startsWith('temp_')) return;
    try {
      await collection.update(id, { completed: !currentCompleted });
    } catch (e) {
      app.toast.show("更新失败", "error");
      loadTodos();
    }
  };

  const deleteTodo = async (id: string) => {
    app.haptics.trigger("selection");
    setTodos(prev => prev.filter(t => t.id !== id));

    if (id.startsWith('temp_')) return;
    try {
      await collection.remove(id);
    } catch (e) {
      app.toast.show("删除失败", "error");
      loadTodos();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, height: 56, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Pressable onPress={app.navigation.back} style={{ padding: 8, marginRight: 8, marginLeft: -8 }}>
          <ChevronLeft color={colors.text} size={24} />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text, flex: 1 }}>待办事项</Text>
        {!user && (
          <Pressable onPress={() => app.auth.requireLogin()} style={{ padding: 8, marginRight: -8 }}>
            <LogIn color={colors.text} size={20} />
          </Pressable>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : (
        <FlatList
          data={[...todos].sort((a, b) => b.data.createdAt - a.data.createdAt)}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 48 }}>
              <Text style={{ color: colors.muted, fontSize: 16 }}>
                {user ? "暂无待办事项，快去添加吧" : "请先登录以保存您的待办事项"}
              </Text>
              {!user && (
                <Pressable
                  onPress={() => app.auth.requireLogin()}
                  style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.surface, borderRadius: colors.radius.md, borderWidth: 1, borderColor: colors.line }}
                >
                  <Text style={{ color: colors.text, fontSize: 16 }}>立即登录</Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, padding: 16, borderRadius: colors.radius.md, marginBottom: 12 }}>
              <Pressable onPress={() => toggleTodo(item.id, item.data.completed)} style={{ marginRight: 12 }}>
                {item.data.completed ? <CheckCircle2 color={colors.greenText} size={24} /> : <Circle color={colors.muted} size={24} />}
              </Pressable>
              <Text style={{ flex: 1, color: item.data.completed ? colors.muted : colors.text, fontSize: 16, textDecorationLine: item.data.completed ? 'line-through' : 'none' }}>
                {item.data.text}
              </Text>
              <Pressable onPress={() => deleteTodo(item.id)} style={{ padding: 8, marginLeft: 8, marginRight: -8 }}>
                <Trash2 color={colors.redText} size={20} />
              </Pressable>
            </View>
          )}
        />
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: 16, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line }}>
          <TextInput
            style={{ flex: 1, height: 44, backgroundColor: colors.field, borderRadius: colors.radius.md, paddingHorizontal: 16, color: colors.text, fontSize: 16 }}
            placeholder="添加新待办..."
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={addTodo}
            returnKeyType="done"
          />
          <Pressable
            onPress={addTodo}
            style={{
              width: 44,
              height: 44,
              backgroundColor: inputText.trim() ? colors.greenText : colors.field,
              borderRadius: colors.radius.md,
              justifyContent: "center",
              alignItems: "center",
              marginLeft: 12
            }}
          >
            <Plus color={inputText.trim() ? "#fff" : colors.muted} size={24} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
