import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, FlatList } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getAppContext } from "@zijinhua/app-sdk";
import { useTheme, Button, Surface, EmptyState } from "@zijinhua/app-sdk/ui";
import { AppraisalItem, Clue, SavedItem } from "./data";

export default function App() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const app = getAppContext();

  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentItem, setCurrentItem] = useState<AppraisalItem | null>(null);

  const [foundClues, setFoundClues] = useState<Record<string, boolean>>({});
  const [showResult, setShowResult] = useState(false);

  const [currentView, setCurrentView] = useState<"game" | "collection">("game");
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  const loadSavedItems = useCallback(async () => {
    try {
      const storage = app.scope("account").storage;
      const itemsStr = await storage.get("saved_items");
      if (itemsStr) {
        setSavedItems(JSON.parse(itemsStr));
      }
    } catch (e) {
      console.error("Failed to load saved items", e);
    }
  }, [app]);

  useEffect(() => {
    loadSavedItems();
  }, [loadSavedItems]);

  const generateItem = async (theme: string) => {
    setIsGenerating(true);
    setCurrentItem(null);
    setFoundClues({});
    setShowResult(false);
    app.haptics.trigger("selection");

    try {
      const abortController = new AbortController();
      const result = await app.ai.complete({
        messages: [
          { role: "system", content: "你是一个离谱鉴宝游戏的后台系统。请根据用户提供的主题或者随意发挥，生成一个离谱的、搞笑的鉴定物品（大部分是假的，或者有着离谱的真实身份）。返回严格的 JSON 字符串，不要有 markdown 包装。JSON 格式为: { \"name\": \"物品名称\", \"description\": \"物品的描述，带有悬念\", \"emoji\": \"代表物品的一个emoji表情\", \"isReal\": boolean (是否是真品，通常为 false), \"originStory\": \"物品的真实搞笑来历\", \"estimatedValue\": \"估价，如 ￥9.9包邮\", \"clues\": [ { \"id\": \"c1\", \"name\": \"部位名称\", \"hint\": \"点击后看到的搞笑线索内容\", \"x\": number (10-90之间的X坐标百分比), \"y\": number (10-90之间的Y坐标百分比) } ] }。需要提供正好 3 个线索(clues)。" },
          { role: "user", content: theme ? `请生成一个关于“${theme}”的离谱物品。` : "请随机生成一个离谱的鉴宝物品。" }
        ]
      }, { signal: abortController.signal });

      if (result.ok) {
        let jsonStr = result.text.trim();
        // Remove markdown formatting if the model accidentally included it
        if (jsonStr.startsWith("```json")) {
          jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
        } else if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
        }

        try {
          const parsedItem = JSON.parse(jsonStr);
          parsedItem.id = Date.now().toString(); // Ensure an ID exists
          setCurrentItem(parsedItem);
        } catch (e) {
          app.toast.show("生成的内容格式错误，请重试", "error");
          console.error("JSON parse error:", e, "Original string:", result.text);
        }
      } else {
        app.toast.show(`生成失败: ${result.error}`, "error");
      }
    } catch (error) {
       app.toast.show("生成请求发生异常", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClueClick = (clue: Clue) => {
    app.haptics.trigger("selection");
    if (!foundClues[clue.id]) {
      setFoundClues(prev => ({ ...prev, [clue.id]: true }));
      app.toast.show(`发现线索: ${clue.hint}`, "success");
    } else {
      app.toast.show(`你已经发现了这个线索: ${clue.hint}`, "info");
    }
  };

  const handleAppraise = () => {
    app.haptics.trigger("impactMedium");
    setShowResult(true);
  };

  const saveCurrentItem = async () => {
    if (!currentItem) return;
    try {
      const storage = app.scope("account").storage;
      const newItem: SavedItem = { ...currentItem, savedAt: Date.now() };

      const newItems = [newItem, ...savedItems.filter(i => i.id !== newItem.id)];
      await storage.set("saved_items", JSON.stringify(newItems));
      setSavedItems(newItems);
      app.toast.show("收藏成功", "success");
      app.haptics.trigger("notificationSuccess");
    } catch (e) {
      app.toast.show("收藏失败", "error");
      console.error(e);
    }
  };

  const removeSavedItem = async (id: string) => {
    try {
      const storage = app.scope("account").storage;
      const newItems = savedItems.filter(i => i.id !== id);
      await storage.set("saved_items", JSON.stringify(newItems));
      setSavedItems(newItems);
      app.toast.show("已取消收藏", "info");
    } catch (e) {
      app.toast.show("操作失败", "error");
    }
  };

  const allCluesFound = currentItem?.clues.every(c => foundClues[c.id]) ?? false;
  const isCurrentItemSaved = savedItems.some(i => i.id === currentItem?.id);

  if (currentView === "collection") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold' }}>我的收藏 ({savedItems.length})</Text>
          <Button label="返回鉴宝" onPress={() => setCurrentView("game")} intent="neutral" />
        </View>

        {savedItems.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <EmptyState>
              <Text style={{ color: colors.muted, fontSize: 16, textAlign: 'center' }}>还没有收藏任何古董哦</Text>
            </EmptyState>
          </View>
        ) : (
          <FlatList
            data={savedItems}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => (
              <Surface tone="raised" style={{ padding: 16, borderRadius: colors.radius.lg, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 32, marginRight: 12 }}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>{item.name}</Text>
                    <Text style={{ color: item.isReal ? colors.greenText : colors.redText, fontSize: 14 }}>
                      {item.isReal ? "真品" : "一眼假"} · {item.estimatedValue}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 8 }}>{item.originStory}</Text>

                <Button label="取消收藏" onPress={() => removeSavedItem(item.id)} intent="neutral" />
              </Surface>
            )}
          />
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
           <Button label="我的收藏" onPress={() => setCurrentView("collection")} intent="neutral" />
        </View>

        <View style={{ marginBottom: 24, padding: 16, backgroundColor: colors.surface, borderRadius: colors.radius.lg }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
            AI 生成鉴宝物品
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.field,
              color: colors.text,
              padding: 12,
              borderRadius: colors.radius.md,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: colors.line
            }}
            placeholder="输入主题 (例如: 西游记、未来科技)"
            placeholderTextColor={colors.muted}
            value={prompt}
            onChangeText={setPrompt}
          />
          <Button
            label={isGenerating ? "生成中..." : (currentItem ? "重新生成" : "开始生成")}
            onPress={() => generateItem(prompt)}
            intent="brand"
            disabled={isGenerating}
          />
        </View>

        {isGenerating && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 200 }}>
            <ActivityIndicator size="large" color={colors.text} style={{ marginBottom: 16 }} />
            <Text style={{ color: colors.muted, fontSize: 16 }}>AI 正在构思离谱的物品...</Text>
          </View>
        )}

        {!isGenerating && !currentItem && (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <EmptyState>
              <Text style={{ color: colors.text, fontSize: 18, textAlign: 'center', marginBottom: 16 }}>
                欢迎来到离谱鉴宝！
              </Text>
              <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
                输入一个主题或者直接点击生成，来看看今天能遇到什么神奇的宝贝吧。
              </Text>
            </EmptyState>
          </View>
        )}

        {!isGenerating && currentItem && (
          <View>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
                {currentItem.name}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center' }}>
                {currentItem.description}
              </Text>
            </View>

            <Surface tone="base" style={{ padding: 24, borderRadius: colors.radius.lg, alignItems: 'center', marginBottom: 24, minHeight: 300, justifyContent: 'center' }}>
               <Text style={{ fontSize: 120, lineHeight: 140, textAlign: 'center' }}>
                 {currentItem.emoji}
               </Text>

               {/* Clues Overlay */}
               {currentItem.clues.map((clue) => {
                 const isFound = foundClues[clue.id];
                 return (
                   <Pressable
                     key={clue.id}
                     onPress={() => handleClueClick(clue)}
                     style={{
                       position: 'absolute',
                       left: `${clue.x}%`,
                       top: `${clue.y}%`,
                       width: 40,
                       height: 40,
                       marginLeft: -20,
                       marginTop: -20,
                       borderRadius: 20,
                       borderWidth: 2,
                       borderColor: isFound ? colors.greenText : 'rgba(255, 255, 255, 0.5)',
                       backgroundColor: isFound ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                       alignItems: 'center',
                       justifyContent: 'center'
                     }}
                   >
                     <Text style={{ color: isFound ? colors.greenText : colors.text, fontSize: 18 }}>
                       {isFound ? '✓' : '?'}
                     </Text>
                   </Pressable>
                 );
               })}
            </Surface>

            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>已发现线索:</Text>
              {currentItem.clues.map(c => (
                <View key={c.id} style={{ padding: 8, backgroundColor: colors.surface, borderRadius: colors.radius.md, marginBottom: 8 }}>
                  <Text style={{ color: foundClues[c.id] ? colors.text : colors.muted }}>
                    {c.name}: {foundClues[c.id] ? c.hint : "???"}
                  </Text>
                </View>
              ))}
            </View>

            <Button
              label={allCluesFound ? "开始估价揭晓" : "跳过线索，直接出结果"}
              onPress={handleAppraise}
              intent="brand"
            />
          </View>
        )}
      </ScrollView>

      {/* Result UI */}
      {showResult && currentItem && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.canvas, paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: insets.bottom, justifyContent: 'center' }]}>
          <Surface tone="raised" style={{ padding: 24, borderRadius: colors.radius.lg }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: currentItem.isReal ? colors.greenText : colors.redText, textAlign: 'center', marginBottom: 16 }}>
              鉴定结果: {currentItem.isReal ? "真品！" : "一眼假！"}
            </Text>
            <View style={{ marginBottom: 16 }}>
               <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>估价:</Text>
               <Text style={{ color: colors.text, fontSize: 20, marginTop: 4 }}>{currentItem.estimatedValue}</Text>
            </View>
            <View style={{ marginBottom: 24 }}>
               <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>真实来历:</Text>
               <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>{currentItem.originStory}</Text>
            </View>

            <View style={{ gap: 12 }}>
               {!isCurrentItemSaved ? (
                 <Button label="收藏" onPress={saveCurrentItem} intent="brand" />
               ) : (
                 <Button label="已收藏" onPress={() => {}} intent="neutral" disabled />
               )}
               <Button label="重新生成" onPress={() => generateItem(prompt)} intent="neutral" />
            </View>
          </Surface>
        </View>
      )}
    </View>
  );
}
