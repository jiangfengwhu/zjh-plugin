import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { getAppContext } from "@zijinhua/app-sdk";
import { BackChip, useTheme } from "@zijinhua/app-sdk/ui";
import { Flower, Share, Plus, Trash2 } from "lucide-react-native";

interface Record {
  id: string;
  date: number;
  description: string;
  amount: number;
}

export default function App() {
  const ctx = getAppContext();
  const { colors } = useTheme();

  const [records, setRecords] = useState<Record[]>([]);
  const [description, setDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const data = ctx.storage.getString("flower-records");
    if (data) {
      try {
        setRecords(JSON.parse(data));
      } catch (e) {
        console.error("Failed to parse records", e);
      }
    }
  }, []);

  const saveRecords = (newRecords: Record[]) => {
    setRecords(newRecords);
    ctx.storage.set("flower-records", JSON.stringify(newRecords));
  };

  const totalFlowers = records.reduce((sum, r) => sum + r.amount, 0);

  const handleAdd = () => {
    if (!description.trim()) {
      ctx.toast.show("请输入原因", "error");
      return;
    }
    const newRecord: Record = {
      id: Date.now().toString() + Math.random().toString(),
      date: Date.now(),
      description: description.trim(),
      amount: 1, // Can only add 1 flower at a time in this simple version
    };
    saveRecords([newRecord, ...records]);
    setDescription("");
    setIsAdding(false);
    ctx.toast.show("成功获得一朵小红花！", "success");
    ctx.haptics.trigger("notificationSuccess");
  };

  const handleDelete = (id: string) => {
    saveRecords(records.filter(r => r.id !== id));
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const post = await ctx.feed.share({
        body: `我的小红花记录本：已经收集了 ${totalFlowers} 朵小红花！`,
        html: `<div style="padding:16px;background-color:#ffebee;border-radius:12px;text-align:center;">
          <h2 style="color:#d32f2f;margin:0 0 8px 0;">🌸 小红花记录本 🌸</h2>
          <p style="font-size:16px;color:#333;margin:0;">我总共获得了 <strong style="font-size:24px;color:#d32f2f;">${totalFlowers}</strong> 朵小红花！</p>
          ${records.length > 0 ? `<p style="font-size:14px;color:#666;margin-top:12px;">最近获得原因：${records[0].description}</p>` : ''}
        </div>`,
        requestId: `share-flowers-${Date.now()}`
      });
      ctx.toast.show("分享成功", "success");
    } catch (e: any) {
      ctx.toast.show(e?.message || "分享失败", "error");
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ paddingTop: 24, paddingHorizontal: 24, paddingBottom: 16, backgroundColor: '#ffebee', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <BackChip onPress={ctx.navigation.back} />

        <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Flower color="#d32f2f" size={36} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 48, fontWeight: 'bold', color: '#d32f2f' }}>{totalFlowers}</Text>
          </View>
          <Text style={{ fontSize: 16, color: '#d32f2f', marginTop: 8 }}>总共获得的小红花</Text>
        </View>

        <TouchableOpacity
          style={{ position: 'absolute', top: 24, right: 24, padding: 8, backgroundColor: 'rgba(211,47,47,0.1)', borderRadius: 20 }}
          onPress={handleShare}
          disabled={sharing}
        >
          <Share color="#d32f2f" size={20} />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, padding: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>获得记录</Text>
          {!isAdding && (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#d32f2f', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 }}
              onPress={() => setIsAdding(true)}
            >
              <Plus color="white" size={16} />
              <Text style={{ color: 'white', marginLeft: 4, fontWeight: 'bold' }}>记录</Text>
            </TouchableOpacity>
          )}
        </View>

        {isAdding && (
          <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>为什么获得小红花？</Text>
            <TextInput
              style={{ backgroundColor: colors.canvas, padding: 12, borderRadius: 8, color: colors.text, fontSize: 16, minHeight: 80, textAlignVertical: 'top' }}
              placeholder="例如：今天按时完成了作业..."
              placeholderTextColor={colors.secondaryText}
              value={description}
              onChangeText={setDescription}
              multiline
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity style={{ padding: 8, marginRight: 8 }} onPress={() => setIsAdding(false)}>
                <Text style={{ color: colors.secondaryText }}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: '#d32f2f', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
                onPress={handleAdd}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {records.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.5 }}>
            <Flower color={colors.secondaryText} size={48} style={{ marginBottom: 16 }} />
            <Text style={{ color: colors.secondaryText, fontSize: 16 }}>还没有记录小红花哦</Text>
            <Text style={{ color: colors.secondaryText, fontSize: 14, marginTop: 4 }}>点击右上角记录一朵吧</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {records.map((record) => (
              <View key={record.id} style={{ backgroundColor: colors.card, padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
                <View style={{ backgroundColor: '#ffebee', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Flower color="#d32f2f" size={24} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, color: colors.text, marginBottom: 4 }}>{record.description}</Text>
                  <Text style={{ fontSize: 12, color: colors.secondaryText }}>
                    {new Date(record.date).toLocaleString()}
                  </Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#d32f2f', marginHorizontal: 12 }}>+{record.amount}</Text>
                <TouchableOpacity onPress={() => handleDelete(record.id)} style={{ padding: 4 }}>
                  <Trash2 color={colors.secondaryText} size={20} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </View>
  );
}
