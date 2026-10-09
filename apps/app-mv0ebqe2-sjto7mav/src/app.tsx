import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, Button } from "@zijinhua/app-sdk/ui";
import { WebView } from "react-native-webview";

const BVIDS = [
  "BV1GJ411x7h7", // 示例: 某知名动画/鬼畜
  "BV1uT4y1P7CX", // 示例: 罗翔老师
  "BV1xx411c7m9", // 示例: 经典视频
  "BV17x411w7KC", // 示例: 热门视频
  "BV1sE411w7tQ", // 示例: 热门视频
  "BV1a84y1z7D9", // 示例: 热门视频
  "BV1Kb411W75N", // 示例: 热门视频
  "BV1Kj411K7J9", // 示例: 热门视频
];

export default function App() {
  const { colors } = useTheme();
  const [currentBvid, setCurrentBvid] = useState(BVIDS[0]);

  const handleNextVideo = () => {
    let nextBvid = currentBvid;
    while (nextBvid === currentBvid) {
      const randomIndex = Math.floor(Math.random() * BVIDS.length);
      nextBvid = BVIDS[randomIndex];
    }
    setCurrentBvid(nextBvid);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]}>
      <View style={styles.playerContainer}>
        <WebView
          source={{ uri: `https://player.bilibili.com/player.html?bvid=${currentBvid}&autoplay=1` }}
          style={styles.webview}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button
          intent="brand"
          label="换一个视频"
          onPress={handleNextVideo}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  playerContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "black",
  },
  webview: {
    flex: 1,
  },
  buttonContainer: {
    padding: 24,
    alignItems: "center",
  },
});
