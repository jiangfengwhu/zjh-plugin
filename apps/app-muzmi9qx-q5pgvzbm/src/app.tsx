import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, PanResponder, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, Button } from "@zijinhua/app-sdk/ui";
import { getAppContext } from "@zijinhua/app-sdk";

type GameState = 'home' | 'playing' | 'result';
type TaskType = 'tap' | 'select' | 'drag';

const WIN_MESSAGES = [
  "干得漂亮！老板奖励你一个罐头！",
  "手速惊人！你就是今天的打工猫王！",
  "完美完成！今天的工资保住了！"
];

const LOSE_MESSAGES = [
  "太慢啦！老板扣了你的小鱼干！",
  "摸鱼被发现了！准备好打扫猫砂盆吧！",
  "打工是不可能打工的，只能靠卖萌为生了..."
];

const TASKS = [
  {
    id: 'tap',
    instruction: '老板来了！狂点屏幕装作在键盘上打字！',
    target: 15,
  },
  {
    id: 'select',
    instruction: '给客户选一份高级猫粮！',
    options: ['🐶 骨头', '🐟 新鲜三文鱼', '🪨 破石头'],
    correctIndex: 1,
  },
  {
    id: 'drag',
    instruction: '把桌上的水杯推下去！(向右滑)',
  }
];

export default function App() {
  const { colors } = useTheme();
  const app = getAppContext();

  const [gameState, setGameState] = useState<GameState>('home');
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(10);
  const [currentTask, setCurrentTask] = useState<any>(null);

  // Specific task states
  const [tapCount, setTapCount] = useState(0);

  // Drag task state
  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dx > 100) {
          handleWin();
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [resultMessage, setResultMessage] = useState('');

  // Timer logic
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleLose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  const startGame = (resetLevel = false) => {
    setGameState('playing');
    setTimeLeft(10);
    const newLevel = resetLevel ? 1 : level;
    setLevel(newLevel);

    // Pick random task
    const randomTask = TASKS[Math.floor(Math.random() * TASKS.length)];
    setCurrentTask(randomTask);

    // Reset specific states
    setTapCount(0);
    pan.setValue({ x: 0, y: 0 });

    app.haptics.trigger('impactLight');
  };

  const handleWin = () => {
    setGameState('result');
    setResult('win');
    setResultMessage(WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)]);
    app.haptics.trigger('notificationSuccess');
    setLevel(l => l + 1);
  };

  const handleLose = () => {
    setGameState('result');
    setResult('lose');
    setResultMessage(LOSE_MESSAGES[Math.floor(Math.random() * LOSE_MESSAGES.length)]);
    app.haptics.trigger('notificationError');
  };

  const onTap = () => {
    if (gameState !== 'playing' || currentTask?.id !== 'tap') return;
    const newCount = tapCount + 1;
    setTapCount(newCount);
    app.haptics.trigger('selection');

    if (newCount >= currentTask.target) {
      handleWin();
    }
  };

  const onSelect = (index: number) => {
    if (gameState !== 'playing' || currentTask?.id !== 'select') return;
    if (index === currentTask.correctIndex) {
      handleWin();
    } else {
      handleLose();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>

        {gameState === 'home' && (
          <View style={{ alignItems: 'center', gap: 24 }}>
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.text }}>🐱 猫咪打工记</Text>
            <Text style={{ fontSize: 16, color: colors.muted, textAlign: 'center' }}>
              为了小鱼干，拼了！每局只有 10 秒钟，你能坚持打工多少天？
            </Text>
            <Button label="开始打工" onPress={() => startGame(true)} intent="brand" />
          </View>
        )}

        {gameState === 'playing' && currentTask && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 40 }}>
            <View style={{ alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>第 {level} 天打工</Text>
              <Text style={{ fontSize: 36, fontWeight: 'bold', color: timeLeft <= 3 ? colors.redText : colors.text }}>
                00:{timeLeft.toString().padStart(2, '0')}
              </Text>
              <Text style={{ fontSize: 18, color: colors.text, textAlign: 'center', marginTop: 16 }}>
                {currentTask.instruction}
              </Text>
            </View>

            <View style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
              {currentTask.id === 'tap' && (
                <Pressable
                  onPress={onTap}
                  style={({ pressed }) => [
                    {
                      width: 150,
                      height: 150,
                      borderRadius: 75,
                      backgroundColor: pressed ? colors.surface : colors.field,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 2,
                      borderColor: colors.line
                    }
                  ]}
                >
                  <Text style={{ fontSize: 48 }}>⌨️</Text>
                  <Text style={{ fontSize: 16, color: colors.text, marginTop: 8 }}>
                    {tapCount} / {currentTask.target}
                  </Text>
                </Pressable>
              )}

              {currentTask.id === 'select' && (
                <View style={{ width: '100%', gap: 16 }}>
                  {currentTask.options.map((opt: string, idx: number) => (
                    <Pressable
                      key={idx}
                      onPress={() => onSelect(idx)}
                      style={({ pressed }) => [
                        {
                          padding: 16,
                          borderRadius: 12,
                          backgroundColor: pressed ? colors.surface : colors.field,
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: colors.line
                        }
                      ]}
                    >
                      <Text style={{ fontSize: 24, color: colors.text }}>{opt}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {currentTask.id === 'drag' && (
                <View style={{ width: '100%', alignItems: 'center' }}>
                  <View style={{
                    width: 250,
                    height: 80,
                    backgroundColor: colors.field,
                    borderRadius: 40,
                    justifyContent: 'center',
                    paddingHorizontal: 10,
                    overflow: 'hidden'
                  }}>
                    <Text style={{ position: 'absolute', right: 20, fontSize: 24, color: colors.muted }}>
                      边缘 ➡️
                    </Text>
                    <Animated.View
                      {...panResponder.panHandlers}
                      style={[
                        pan.getLayout(),
                        {
                          width: 60,
                          height: 60,
                          borderRadius: 30,
                          backgroundColor: colors.surface,
                          justifyContent: 'center',
                          alignItems: 'center',
                          elevation: 2,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          borderWidth: 1,
                          borderColor: colors.line
                        }
                      ]}
                    >
                      <Text style={{ fontSize: 28 }}>☕️</Text>
                    </Animated.View>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {gameState === 'result' && (
          <View style={{ alignItems: 'center', gap: 24 }}>
            <Text style={{ fontSize: 64 }}>
              {result === 'win' ? '🎉' : '😿'}
            </Text>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: result === 'win' ? colors.greenText : colors.redText }}>
              {result === 'win' ? '成功！' : '搞砸了！'}
            </Text>
            <Text style={{ fontSize: 18, color: colors.text, textAlign: 'center' }}>
              {resultMessage}
            </Text>

            <View style={{ height: 24 }} />

            {result === 'win' ? (
              <Button label="继续下一天的打工！" onPress={() => startGame(false)} intent="brand" />
            ) : (
              <>
                <Text style={{ fontSize: 16, color: colors.muted }}>
                  你一共坚持了 {level - 1} 天
                </Text>
                <Button label="重新求职" onPress={() => startGame(true)} intent="brand" />
              </>
            )}
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}
