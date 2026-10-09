import React, { useState } from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@zijinhua/app-sdk/ui";
import Video from "react-native-video";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react-native";

interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
}

const PLAYLIST: Track[] = [
  {
    id: "1",
    title: "Canon in D",
    artist: "Johann Pachelbel",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    id: "2",
    title: "Symphony No. 5",
    artist: "Ludwig van Beethoven",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    id: "3",
    title: "Four Seasons - Spring",
    artist: "Antonio Vivaldi",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
];

export default function App() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const currentTrack = PLAYLIST[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % PLAYLIST.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + PLAYLIST.length) % PLAYLIST.length);
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
          backgroundColor: isPlaying ? colors.canvas : 'transparent', // replace surface.inset
          borderBottomWidth: 1,
          borderBottomColor: colors.line, // replace line.base
        }}
        onPress={() => {
          setCurrentIndex(index);
          setPaused(false);
        }}
      >
        <Text style={{ color: isPlaying ? colors.text : colors.muted, fontSize: 16, fontWeight: isPlaying ? 'bold' : 'normal' }}>
          {item.title}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>
          {item.artist}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", padding: 16, color: colors.text }}>
          播放列表
        </Text>
        <FlatList
          data={PLAYLIST}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </View>

      <View
        style={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 24,
          backgroundColor: colors.surface, // replace surface.raised
          borderTopWidth: 1,
          borderTopColor: colors.line, // replace line.base
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
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

      <Video
        source={{ uri: currentTrack.url }}
        paused={paused}
        onEnd={handleNext}
        playInBackground={true}
        style={{ width: 0, height: 0 }}
      />
    </View>
  );
}
