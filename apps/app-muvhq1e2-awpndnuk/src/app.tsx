import React, { useState, useEffect } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { getAppContext } from "@zijinhua/app-sdk";
import {
  Screen,
  ScreenBar,
  PageHeader,
  Surface,
  Input,
  Button,
  Switch,
  Icon,
  Text,
  useTheme,
  Pressy,
} from "@zijinhua/app-sdk/ui";

const STORAGE_KEY = "todo-list";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export default function App() {
  const ctx = getAppContext();
  const { colors } = useTheme();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState("");

  useEffect(() => {
    const loadTodos = () => {
      const stored = ctx.storage.get(STORAGE_KEY);
      if (stored) {
        try {
          setTodos(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse todos", e);
        }
      }
    };
    loadTodos();
  }, [ctx.storage]);

  useEffect(() => {
    ctx.storage.set(STORAGE_KEY, JSON.stringify(todos));
  }, [todos, ctx.storage]);

  const addTodo = () => {
    if (!inputText.trim()) return;
    const newTodo: Todo = {
      id: Date.now().toString(),
      text: inputText.trim(),
      completed: false,
    };
    setTodos((prev) => [newTodo, ...prev]);
    setInputText("");
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  const renderItem = ({ item }: { item: Todo }) => (
    <Surface
      tone="raised"
      radius={colors.radius.md}
      style={[styles.todoItem, { marginBottom: colors.spacing.item }]}
    >
      <View style={styles.todoContent}>
        <Switch
          checked={item.completed}
          onCheckedChange={() => toggleTodo(item.id)}
        />
        <Text
          variant="body"
          style={[
            styles.todoText,
            { color: item.completed ? colors.muted : colors.text },
            item.completed && styles.todoTextCompleted,
          ]}
        >
          {item.text}
        </Text>
      </View>
      <Pressy
        onPress={() => deleteTodo(item.id)}
        style={[styles.deleteButton, { backgroundColor: colors.hover }]}
      >
        <Icon name="close" size={16} color={colors.danger} />
      </Pressy>
    </Surface>
  );

  return (
    <Screen>
      <ScreenBar>
        <PageHeader title="待办事项" onBack={ctx.navigation.back} />
      </ScreenBar>

      <View style={[styles.container, { padding: colors.spacing.page }]}>
        <View style={[styles.inputRow, { marginBottom: colors.spacing.page }]}>
          <Input
            placeholder="添加新任务..."
            value={inputText}
            onChangeText={setInputText}
            containerStyle={{ flex: 1, marginRight: colors.spacing.control }}
            onSubmitEditing={addTodo}
          />
          <Button label="添加" onPress={addTodo} intent="brand" />
        </View>

        <FlatList
          data={todos}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <Text variant="caption" style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>
              暂无待办事项
            </Text>
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  todoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  todoContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  todoText: {
    marginLeft: 12,
    flex: 1,
  },
  todoTextCompleted: {
    textDecorationLine: "line-through",
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
});
