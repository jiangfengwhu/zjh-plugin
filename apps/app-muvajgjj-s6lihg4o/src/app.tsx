import React, { useState, useRef } from "react";
import { View, Text, TextInput, ScrollView, Animated, Platform } from "react-native";
import { getAppContext } from "@zijinhua/app-sdk";
import { BackChip, useTheme, Pressy, Icon, Screen, ScreenBar } from "@zijinhua/app-sdk/ui";

const defaultCandidates = ["火锅", "烧烤", "麦当劳", "肯德基", "拉面", "炒饭", "饺子", "披萨", "寿司", "沙拉"];

export default function App() {
  const ctx = getAppContext();
  const { colors } = useTheme();

  const [candidates, setCandidates] = useState<string[]>(defaultCandidates);
  const [newCandidate, setNewCandidate] = useState("");

  const [isDrawing, setIsDrawing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [displayIndex, setDisplayIndex] = useState<number>(0);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const addCandidate = () => {
    const text = newCandidate.trim();
    if (text && !candidates.includes(text)) {
      setCandidates([...candidates, text]);
      setNewCandidate("");
    }
  };

  const removeCandidate = (indexToRemove: number) => {
    setCandidates(candidates.filter((_, index) => index !== indexToRemove));
  };

  const startDraw = () => {
    if (candidates.length === 0 || isDrawing) return;

    setIsDrawing(true);
    setResult(null);
    scaleAnim.setValue(1);
    opacityAnim.setValue(1);

    let count = 0;
    const totalFlips = 20 + Math.floor(Math.random() * 10);
    const interval = 50;

    const flip = () => {
      count++;
      setDisplayIndex(Math.floor(Math.random() * candidates.length));
      ctx.haptics.trigger('selection');

      if (count < totalFlips) {
        setTimeout(flip, interval + count * 2); // gradually slow down
      } else {
        const finalWinner = candidates[Math.floor(Math.random() * candidates.length)];
        setResult(finalWinner);
        setIsDrawing(false);
        ctx.haptics.trigger('notificationSuccess');

        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.5,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1.2,
            friction: 4,
            useNativeDriver: true,
          })
        ]).start();
      }
    };

    flip();
  };

  return (
    <Screen style={{ flex: 1 }}>
      <ScreenBar style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
        <BackChip onPress={ctx.navigation.back} />
      </ScreenBar>

      <View style={{ flex: 1 }}>
        {/* Draw Area */}
        <View style={{
          alignItems: 'center',
          justifyContent: 'center',
          height: 200,
          marginVertical: 16
        }}>
          {isDrawing ? (
            <Animated.Text style={{
              fontSize: 32,
              fontWeight: 'bold',
              color: colors.text,
              opacity: opacityAnim
            }}>
              {candidates[displayIndex] || "？"}
            </Animated.Text>
          ) : result ? (
            <Animated.Text style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: colors.gold,
              transform: [{ scale: scaleAnim }]
            }}>
              {result}
            </Animated.Text>
          ) : (
             <Text style={{ fontSize: 24, color: colors.muted }}>
              今天吃什么？
            </Text>
          )}
        </View>

        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Pressy
            onPress={startDraw}
            disabled={isDrawing || candidates.length === 0}
            style={{
              backgroundColor: isDrawing ? colors.inset : colors.gold,
              paddingHorizontal: 48,
              paddingVertical: 16,
              borderRadius: 32,
              shadowColor: colors.gold,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{
              color: isDrawing ? colors.muted : '#fff',
              fontSize: 20,
              fontWeight: 'bold'
            }}>
              {isDrawing ? '正在抽取...' : '开始抽选'}
            </Text>
          </Pressy>
        </View>

        {/* Candidate List */}
        <View style={{ flex: 1, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
            候选名单 ({candidates.length})
          </Text>

          <ScrollView style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {candidates.map((item, index) => (
                <View
                  key={`${item}-${index}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.canvas,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.line
                  }}
                >
                  <Text style={{ color: colors.text, marginRight: 8 }}>{item}</Text>
                  <Pressy onPress={() => removeCandidate(index)} style={{ padding: 4 }}>
                    <Icon name="close" size={14} color={colors.muted} />
                  </Pressy>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Add New Candidate */}
          <View style={{ flexDirection: 'row', marginTop: 16, alignItems: 'center' }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: colors.canvas,
                color: colors.text,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: colors.line,
                marginRight: 12
              }}
              placeholder="添加新候选..."
              placeholderTextColor={colors.muted}
              value={newCandidate}
              onChangeText={setNewCandidate}
              onSubmitEditing={addCandidate}
              returnKeyType="done"
            />
            <Pressy
              onPress={addCandidate}
              style={{
                backgroundColor: colors.surfaceRaised,
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.line
              }}
            >
              <Icon name="plus" size={20} color={colors.text} />
            </Pressy>
          </View>
        </View>
      </View>
    </Screen>
  );
}
