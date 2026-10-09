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
  const [currentUrl, setCurrentUrl] = useState(`https://player.bilibili.com/player.html?bvid=${BVIDS[0]}&autoplay=1`);
  const [searchInput, setSearchInput] = useState("");
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const app = getAppContext();
  const [currentBvidForBookmark, setCurrentBvidForBookmark] = useState(BVIDS[0]); // Keep track for bookmarking if playing a BVID directly

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
    let nextBvid = currentBvidForBookmark;
    while (nextBvid === currentBvidForBookmark) {
      const randomIndex = Math.floor(Math.random() * BVIDS.length);
      nextBvid = BVIDS[randomIndex];
    }
    setCurrentBvidForBookmark(nextBvid);
    setCurrentUrl(`https://player.bilibili.com/player.html?bvid=${nextBvid}&autoplay=1`);
  };

  const handleSearch = () => {
    if (searchInput.trim()) {
      const keyword = encodeURIComponent(searchInput.trim());
      setCurrentUrl(`https://search.bilibili.com/all?keyword=${keyword}`);
      setCurrentBvidForBookmark(""); // Not a specific BVID anymore
      setSearchInput("");
    }
  };

  const playBookmarkedVideo = (bvid: string) => {
    setCurrentBvidForBookmark(bvid);
    setCurrentUrl(`https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=1`);
  }

  const toggleBookmark = () => {
    if (!currentBvidForBookmark) return;
    if (bookmarks.includes(currentBvidForBookmark)) {
      saveBookmarks(bookmarks.filter((b) => b !== currentBvidForBookmark));
    } else {
      saveBookmarks([currentBvidForBookmark, ...bookmarks]);
    }
  };

  const isBookmarked = !!currentBvidForBookmark && bookmarks.includes(currentBvidForBookmark);
  const isSearchMode = currentUrl.includes("search.bilibili.com");

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.canvas }]}>
      <View style={styles.centerContainer}>
        <View style={styles.playerContainer}>
          <WebView
            source={{ uri: currentUrl }}
            style={styles.webview}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo={true}
            userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36" // Add a mobile user agent for better mobile search rendering
          />
        </View>

        <View style={styles.controlsContainer}>
          <TextInput
            style={[styles.searchInput, { borderColor: colors.line, color: colors.text }]}
            placeholder="输入关键词搜索"
            placeholderTextColor={colors.muted}
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={handleSearch}
          />
          <View style={styles.buttonsRow}>
            <Button intent="brand" label="搜索" onPress={handleSearch} />
            <Button intent="neutral" label="随机播放" onPress={handleNextVideo} />
            {!isSearchMode && currentBvidForBookmark ? (
               <Button
                intent={isBookmarked ? "brand" : "neutral"}
                label={isBookmarked ? "取消收藏" : "收藏当前视频"}
                onPress={toggleBookmark}
              />
            ) : null}
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
                  onPress={() => playBookmarkedVideo(item)}
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
    aspectRatio: 16 / 9, // This aspect ratio works well for videos, but for search it might be a bit narrow. However, to keep it simple and fulfill all requirements without complex dynamic layout changes, we'll keep it.
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
