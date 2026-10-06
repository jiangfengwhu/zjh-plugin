import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAppContext } from "@zijinhua/app-sdk";
import { useTheme, Surface, Button, Input, Icon } from "@zijinhua/app-sdk/ui";

type Student = {
  id: string;
  name: string;
  flowers: number;
};

export default function App() {
  const ctx = getAppContext();
  const { colors } = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState("");
  const STORAGE_KEY = "little-red-flower-data";

  useEffect(() => {
    const data = ctx.storage.get(STORAGE_KEY);
    if (data) {
      try {
        setStudents(JSON.parse(data));
      } catch (e) {
        console.error("Failed to parse storage data", e);
      }
    }
  }, []);

  const saveStudents = (newStudents: Student[]) => {
    setStudents(newStudents);
    ctx.storage.set(STORAGE_KEY, JSON.stringify(newStudents));
  };

  const addStudent = () => {
    if (!newStudentName.trim()) {
      ctx.toast.show("请输入小朋友的名字", "error");
      return;
    }
    const newStudent: Student = {
      id: Date.now().toString(),
      name: newStudentName.trim(),
      flowers: 0,
    };
    saveStudents([...students, newStudent]);
    setNewStudentName("");
    ctx.toast.show("添加成功", "success");
    ctx.haptics.trigger("notificationSuccess");
  };

  const addFlower = (id: string) => {
    const updated = students.map(s => {
      if (s.id === id) {
        return { ...s, flowers: s.flowers + 1 };
      }
      return s;
    });
    saveStudents(updated);
    ctx.haptics.trigger("impactMedium");
  };

  const removeFlower = (id: string) => {
    const updated = students.map(s => {
      if (s.id === id && s.flowers > 0) {
        return { ...s, flowers: s.flowers - 1 };
      }
      return s;
    });
    saveStudents(updated);
    ctx.haptics.trigger("impactLight");
  };

  const removeStudent = (id: string) => {
    const updated = students.filter(s => s.id !== id);
    saveStudents(updated);
    ctx.toast.show("已删除", "success");
    ctx.haptics.trigger("selection");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Pressable accessibilityRole="button" onPress={ctx.navigation.back} style={{ padding: 8, marginRight: 8 }}>
          <Icon name="back" color={colors.text} size={24} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>班级小红花</Text>
      </View>

      <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Input
          value={newStudentName}
          onChangeText={setNewStudentName}
          placeholder="小朋友名字"
          containerStyle={{ flex: 1 }}
        />
        <Button label="添加" onPress={addStudent} intent="brand" />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
        {students.length === 0 ? (
          <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 40 }}>还没有添加小朋友，快来添加吧！</Text>
        ) : (
          students.map(student => (
            <Surface key={student.id} tone="base" radius={colors.radius.md} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.line }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>{student.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ color: colors.muted, marginRight: 8 }}>小红花: {student.flowers}</Text>
                  <Text style={{ fontSize: 16 }}>🌺</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Button label="-1" variant="outline" onPress={() => removeFlower(student.id)} disabled={student.flowers === 0} />
                <Button label="+1" intent="brand" onPress={() => addFlower(student.id)} />
                <Pressable onPress={() => removeStudent(student.id)} style={{ padding: 8 }}>
                    <Icon name="close" color={colors.danger} size={20} />
                </Pressable>
              </View>
            </Surface>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
