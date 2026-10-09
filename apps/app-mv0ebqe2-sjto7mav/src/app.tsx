import React, { useState, useEffect } from "react";
import { View, StyleSheet, TextInput, FlatList, TouchableOpacity, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, Button } from "@zijinhua/app-sdk/ui";
import { WebView } from "react-native-webview";
import { getAppContext } from "@zijinhua/app-sdk";

const BVIDS = [
  "BV1GJ411x7h7",
  "BV1uT4y1P7CX",
  "BV1xx411c7m9",
  "BV17x411w7KC",
  "BV1sE411w7tQ",
  "BV1a84y1z7D9",
  "BV1Kb411W75N",
  "BV1Kj411K7J9",
];

export default function App() {
  const { colors } = useTheme();
  const [currentBvid, setCurrentBvid] = useState(BVIDS[0]);
  const [searchInput, setSearchInput] = useState("");
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const app = getAppContext();

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const saved = await app.storage.get("bilibili_bookmarks");
      if (saved) {
        setBookmarks(JSON.parse(saved as string));
      }
    } catch (e) {
      console.error("Failed to load bookmarks", e);
    }
  };

  const saveBookmarks = async (newBookmarks: string[]) => {
    try {
      await app.storage.set("bilibili_bookmarks", JSON.stringify(newBookmarks));
      setBookmarks(newBookmarks);
    } catch (e) {
      console.error("Failed to save bookmarks", e);
    }
  };

  const handleNextVideo = () => {
    let nextBvid = currentBvid;
    while (nextBvid === currentBvid) {
      const randomIndex = Math.floor(Math.random() * BVIDS.length);
      nextBvid = BVIDS[randomIndex];
    }
    setCurrentBvid(nextBvid);
  };

  const handleSearch = () => {
    if (searchInput.trim()) {
      setCurrentBvid(searchInput.trim());
      setSearchInput("");
    }
  };

  const toggleBookmark = () => {
    if (bookmarks.includes(currentBvid)) {
      saveBookmarks(bookmarks.filter((b) => b !== currentBvid));
    } else {
      saveBookmarks([currentBvid, ...bookmarks]);
    }
  };

  const isBookmarked = bookmarks.includes(currentBvid);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]}>
      <View style={styles.centerContainer}>
        <View style={styles.playerContainer}>
          <WebView
            source={{ uri: `https://player.bilibili.com/player.html?bvid=${currentBvid}&autoplay=1` }}
            style={styles.webview}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo={true}
          />
        </View>

        <View style={styles.controlsContainer}>
          <TextInput
            style={[styles.searchInput, { borderColor: colors.line, color: colors.text }]}
            placeholder="输入 BVID 搜索"
            placeholderTextColor={colors.muted}
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={handleSearch}
          />
          <View style={styles.buttonsRow}>
            <Button intent="brand" label="搜索" onPress={handleSearch} />
            <Button intent="neutral" label="换一个" onPress={handleNextVideo} />
            <Button
              intent={isBookmarked ? "brand" : "neutral"}
              label={isBookmarked ? "取消收藏" : "收藏"}
              onPress={toggleBookmark}
            />
          </View>
        </View>

        {bookmarks.length > 0 && (
          <View style={styles.bookmarksContainer}>
            <Text style={[styles.bookmarksTitle, { color: colors.text }]}>我的收藏:</Text>
            <FlatList
              data={bookmarks}
              keyExtractor={(item) => item}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.bookmarkItem, { backgroundColor: colors.surface }]}
                  onPress={() => setCurrentBvid(item)}
                >
                  <Text style={{ color: colors.text }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  playerContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "black",
  },
  webview: {
    flex: 1,
  },
  controlsContainer: {
    width: "100%",
    padding: 24,
    gap: 16,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  bookmarksContainer: {
    width: "100%",
    paddingHorizontal: 24,
    marginTop: 16,
  },
  bookmarksTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  bookmarkItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
});
