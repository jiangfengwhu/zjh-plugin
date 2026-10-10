import React, { useState, useEffect } from "react";
import { View, Text, Pressable, FlatList, TextInput, ActivityIndicator, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@zijinhua/app-sdk/ui";
import { getAppContext } from "@zijinhua/app-sdk";
import Video from "react-native-video";
import { Play, Pause, SkipBack, SkipForward, Search } from "lucide-react-native";

interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  artworkUrl?: string;
}

const DEFAULT_ARTISTS = ["Taylor Swift", "周杰伦", "Ed Sheeran", "Adele", "Bruno Mars", "Coldplay"];

export default function App() {
  const app = getAppContext();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const currentTrack = playlist[currentIndex];

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        let historyStr = app.storage.get("searchHistory");
        let history: string[] = [];
        if (historyStr) {
          try {
            history = JSON.parse(historyStr);
          } catch(e) {}
        }

        let promptText = "请推荐一位当下流行的歌手的名字，只返回歌手名字，不要包含任何其他说明字符，不需要标点符号。";
        if (history.length > 0) {
          promptText = `用户之前搜索过这些歌手或歌曲: ${history.join(", ")}。请根据这些搜索历史，推测用户的喜好，推荐一位风格相似的其他歌手的名字。只返回该歌手的名字，不要包含任何其他说明字符或标点符号。`;
        }

        const aiResult = await app.ai.complete({
          messages: [{ role: "user", content: promptText }]
        }, { signal: new AbortController().signal });

        let recommendedArtist = "";
        if (aiResult.ok && aiResult.text.trim()) {
           recommendedArtist = aiResult.text.trim();
        } else {
           recommendedArtist = DEFAULT_ARTISTS[Math.floor(Math.random() * DEFAULT_ARTISTS.length)];
        }

        if (!active) return;
        setQuery(recommendedArtist);
        await handleSearchWithQuery(recommendedArtist, false);
      } catch (e) {
        console.error(e);
        if (!active) return;
        const fallback = DEFAULT_ARTISTS[Math.floor(Math.random() * DEFAULT_ARTISTS.length)];
        setQuery(fallback);
        await handleSearchWithQuery(fallback, false);
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    };
    init();

    return () => { active = false; };
  }, []);

  const handleSearchWithQuery = async (searchQuery: string, saveToHistory: boolean = true) => {
    if (!searchQuery.trim()) return;
    setLoading(true);

    if (saveToHistory) {
      let historyStr = app.storage.get("searchHistory");
      let history: string[] = [];
      if (historyStr) {
        try {
          history = JSON.parse(historyStr);
        } catch(e) {}
      }
      history = history.filter(item => item !== searchQuery);
      history.unshift(searchQuery);
      if (history.length > 10) history = history.slice(0, 10);
      app.storage.set("searchHistory", JSON.stringify(history));
    }

    try {
      const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&entity=song&limit=25`);
      const data = await response.json();

      const tracks: Track[] = data.results
        .filter((item: any) => item.previewUrl)
        .map((item: any) => ({
          id: item.trackId.toString(),
          title: item.trackName,
          artist: item.artistName,
          url: item.previewUrl,
          artworkUrl: item.artworkUrl100,
        }));

      setPlaylist(tracks);
      setCurrentIndex(0);
      setPaused(false);
    } catch (e) {
      console.error(e);
      app.toast.show("加载失败，请重试", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    handleSearchWithQuery(query, true);
  };

  const handleNext = () => {
    if (playlist.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
  };

  const handlePrev = () => {
    if (playlist.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
  };

  const togglePlayPause = () => {
    setPaused((prev) => !prev);
  };

  const renderItem = ({ item, index }: { item: Track; index: number }) => {
    const isPlaying = index === currentIndex;

    return (
      <Pressable
        style={{
          padding: 16,
          backgroundColor: isPlaying ? colors.surface : 'transparent',
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
          flexDirection: "row",
          alignItems: "center",
          gap: 12
        }}
        onPress={() => {
          setCurrentIndex(index);
          setPaused(false);
        }}
      >
        {item.artworkUrl && (
          <Image source={{ uri: item.artworkUrl }} style={{ width: 48, height: 48, borderRadius: 6, backgroundColor: colors.surface }} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: isPlaying ? colors.text : colors.muted, fontSize: 16, fontWeight: isPlaying ? 'bold' : 'normal' }} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 12 }}>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              color: colors.text,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 8,
              fontSize: 16
            }}
            placeholder="搜索歌手或歌曲..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <Pressable onPress={handleSearch} style={{ padding: 12, backgroundColor: colors.surface, borderRadius: 8 }}>
            {loading || initializing ? <ActivityIndicator color={colors.text} /> : <Search color={colors.text} size={20} />}
          </Pressable>
        </View>

        {playlist.length === 0 && !loading && !initializing ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: colors.muted }}>搜索你想听的歌曲</Text>
          </View>
        ) : (
          <FlatList
            data={playlist}
            keyExtractor={(item, index) => item.id + index}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </View>

      {currentTrack && (
        <View
          style={{
            paddingTop: 16,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: 24,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.line,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {currentTrack.artworkUrl && (
            <Image source={{ uri: currentTrack.artworkUrl }} style={{ width: 40, height: 40, borderRadius: 4, marginRight: 12 }} />
          )}
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "bold" }} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 14 }} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Pressable onPress={handlePrev} style={{ padding: 8 }}>
              <SkipBack color={colors.text} size={24} />
            </Pressable>
            <Pressable onPress={togglePlayPause} style={{ padding: 8, backgroundColor: colors.canvas, borderRadius: 24 }}>
              {paused ? (
                <Play color={colors.text} size={32} />
              ) : (
                <Pause color={colors.text} size={32} />
              )}
            </Pressable>
            <Pressable onPress={handleNext} style={{ padding: 8 }}>
              <SkipForward color={colors.text} size={24} />
            </Pressable>
          </View>
        </View>
      )}

      {currentTrack && (
        <Video
          source={{ uri: currentTrack.url }}
          paused={paused}
          onEnd={handleNext}
          playInBackground={true}
          style={{ width: 0, height: 0 }}
        />
      )}
    </View>
  );
}
