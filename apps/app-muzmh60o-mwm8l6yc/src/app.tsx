import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableWithoutFeedback, Animated, Easing, Dimensions, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, Button } from "@zijinhua/app-sdk/ui";
import { getAppContext } from "@zijinhua/app-sdk";

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

const DIALOGUES = [
  "你好。请不要按这个红按钮。",
  "嘿，我刚才说了，别按它！",
  "你是有什么执念吗？",
  "停下！你这样会把事情搞砸的！",
  "我警告你，再按会有不好的事情发生。",
  "好了好了，算我求你，别按了行吗？",
  "你看，按钮都变小了，你还按得到吗？",
  "太执着了！我要让它跑起来！",
  "抓不到我了吧？哈哈！",
  "停停停，我投降。你想怎样？",
];

const MAX_CLICKS_BEFORE_END = 12;

export default function App() {
  const { colors } = useTheme();
  const app = getAppContext();

  const [clicks, setClicks] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'peace' | 'destroyed' | 'hidden'>('playing');
  const [idleTime, setIdleTime] = useState(0);

  // Animation values
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Idle timer for hidden ending
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (gameState === 'playing' && clicks > 0) {
      timer = setInterval(() => {
        setIdleTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [clicks, gameState]);

  useEffect(() => {
    if (idleTime >= 15 && gameState === 'playing' && clicks > 0) {
      setGameState('hidden');
    }
  }, [idleTime, gameState, clicks]);

  const triggerShake = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const handlePress = () => {
    if (gameState !== 'playing') return;

    setIdleTime(0); // Reset idle timer
    const newClicks = clicks + 1;
    setClicks(newClicks);

    app.haptics.trigger('impactHeavy');
    triggerShake();

    if (newClicks === 6) {
      Animated.spring(scale, { toValue: 0.6, useNativeDriver: true }).start();
    } else if (newClicks === 7) {
       Animated.spring(scale, { toValue: 0.4, useNativeDriver: true }).start();
    } else if (newClicks >= 8 && newClicks < 10) {
      // Move randomly
      const randomX = (Math.random() - 0.5) * 200;
      const randomY = (Math.random() - 0.5) * 300;
      Animated.spring(translateX, { toValue: randomX, useNativeDriver: true }).start();
      Animated.spring(translateY, { toValue: randomY, useNativeDriver: true }).start();
    } else if (newClicks >= 10 && newClicks < MAX_CLICKS_BEFORE_END) {
       Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
       Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
       Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    } else if (newClicks >= MAX_CLICKS_BEFORE_END) {
       // Destroyed ending
       Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
          setGameState('destroyed');
       });
       app.toast.show('你把它按坏了...', 'error');
    }
  };

  const handlePeace = () => {
    setGameState('peace');
    app.haptics.trigger('notificationSuccess');
  };

  const resetGame = () => {
    setClicks(0);
    setIdleTime(0);
    setGameState('playing');
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
    shake.setValue(0);
    opacity.setValue(1);
  };

  const getDialogue = () => {
    if (gameState === 'peace') return "谢谢你放过我。我们和解了。";
    if (gameState === 'destroyed') return "......\n(这里什么都没有了)";
    if (gameState === 'hidden') return "你竟然...能忍住这么久不按？\n好吧，你赢了。这是隐藏的耐心奖励。";

    if (clicks < DIALOGUES.length) {
      return DIALOGUES[clicks];
    }
    return "你还在按？好吧，看你什么时候把它按坏。";
  };

  const renderContent = () => {
    if (gameState === 'playing') {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{
            transform: [
              { scale },
              { translateX },
              { translateY },
              { translateX: shake }
            ],
            opacity
          }}>
            <TouchableWithoutFeedback onPress={handlePress}>
              <View style={{
                width: 150,
                height: 150,
                borderRadius: 75,
                backgroundColor: '#E53935',
                borderWidth: 8,
                borderColor: '#B71C1C',
                elevation: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                 <View style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: '#EF5350',
                    borderWidth: 2,
                    borderColor: 'rgba(255,255,255,0.2)',
                 }}/>
              </View>
            </TouchableWithoutFeedback>
          </Animated.View>

          {clicks >= 9 && clicks < MAX_CLICKS_BEFORE_END && (
             <View style={{ marginTop: 60 }}>
                <Button intent="neutral" label="好吧，我不按了" onPress={handlePeace} />
             </View>
          )}
        </View>
      );
    }

    return (
       <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>
             {gameState === 'peace' ? '和平结局' : gameState === 'destroyed' ? '破坏结局' : '隐藏结局'}
          </Text>
          <Button intent="brand" label="重新开始" onPress={resetGame} />
       </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ padding: 24, alignItems: 'center', marginTop: 40 }}>
         <Text style={{
            color: colors.text,
            fontSize: 20,
            textAlign: 'center',
            lineHeight: 32,
            minHeight: 100
         }}>
            {getDialogue()}
         </Text>
      </View>
      {renderContent()}
    </SafeAreaView>
  );
}