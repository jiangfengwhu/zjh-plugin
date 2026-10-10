import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { getAppContext } from '@zijinhua/app-sdk';
import { useTheme, Pressy, Surface, Button, Icon, EmptyState, Loading } from '@zijinhua/app-sdk/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Book, searchBooks, fetchBookText } from './api';

export default function App() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [bookContent, setBookContent] = useState<string | null>(null);
  const [bookLoading, setBookLoading] = useState(false);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const results = await searchBooks(query);
      setBooks(results);
    } catch (e) {
      getAppContext().toast.show('Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBookSelect = async (book: Book) => {
    setSelectedBook(book);
    setBookLoading(true);
    setBookContent(null);
    try {
      const textFormat = Object.keys(book.formats).find(k => k.includes('text/plain'));
      if (!textFormat) {
        throw new Error('No text format available');
      }
      let url = book.formats[textFormat];
      // Gutenberg sometimes returns a zip or html if we are not careful, but we take what we can get.
      // Usually it's text/plain; charset=utf-8 or us-ascii

      const text = await fetchBookText(url);
      setBookContent(text);
    } catch (e) {
      getAppContext().toast.show('Failed to load book content', 'error');
      setSelectedBook(null);
    } finally {
      setBookLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedBook(null);
    setBookContent(null);
  };

  const renderBookItem = ({ item }: { item: Book }) => {
    return (
      <Pressy onPress={() => handleBookSelect(item)}>
        <Surface tone="base" radius={theme.colors.radius.md} style={styles.bookItem}>
          <Text style={[styles.bookTitle, { color: theme.colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.bookAuthor, { color: theme.colors.muted }]} numberOfLines={1}>
            {item.authors.map(a => a.name).join(', ')}
          </Text>
        </Surface>
      </Pressy>
    );
  };

  // A simple chunking function for text
  const chunkSize = 1200; // rough characters per page
  const textChunks = React.useMemo(() => {
    if (!bookContent) return [];
    const chunks = [];
    for (let i = 0; i < bookContent.length; i += chunkSize) {
      chunks.push(bookContent.substring(i, i + chunkSize));
    }
    return chunks;
  }, [bookContent]);

  const [currentPage, setCurrentPage] = useState(0);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.canvas }]}>
      {!selectedBook ? (
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <View style={[styles.header, { borderBottomColor: theme.colors.line }]}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>电子书搜索</Text>
          </View>
          <View style={styles.searchContainer}>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.line,
                  borderRadius: theme.colors.radius.md,
                }
              ]}
              placeholder="输入书名..."
              placeholderTextColor={theme.colors.muted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <Button label="搜索" onPress={handleSearch} busy={loading} />
          </View>

          <FlatList
            data={books}
            renderItem={renderBookItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              !loading && query ? (
                <EmptyState>
                  <Text style={{ color: theme.colors.muted }}>未找到相关书籍</Text>
                </EmptyState>
              ) : undefined
            }
          />
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
          <View style={[styles.readerHeader, { paddingTop: insets.top, borderBottomColor: theme.colors.line }]}>
            <Pressy onPress={handleBack} style={styles.backButton}>
              <Icon name="back" color={theme.colors.text} />
            </Pressy>
            <Text style={[styles.readerTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {selectedBook.title}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {bookLoading ? (
            <Loading style={{ flex: 1 }} label="正在加载书籍内容..." />
          ) : (
            <View style={{ flex: 1 }}>
              <FlatList
                data={textChunks}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, index) => index.toString()}
                onMomentumScrollEnd={(e) => {
                  const contentOffsetX = e.nativeEvent.contentOffset.x;
                  const currentIndex = Math.round(contentOffsetX / windowWidth);
                  setCurrentPage(currentIndex);
                }}
                renderItem={({ item }) => (
                  <View style={{ width: windowWidth, padding: 20, paddingBottom: insets.bottom + 40 }}>
                    <Text style={[styles.readerText, { color: theme.colors.text }]}>
                      {item}
                    </Text>
                  </View>
                )}
              />
              <View style={[styles.pageIndicator, { bottom: insets.bottom + 10 }]}>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  {currentPage + 1} / {textChunks.length}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  bookItem: {
    padding: 16,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
  },
  readerHeader: {
    height: 56 + 40, // 40 is a rough estimate for inset, but we use inset.top + 56 in style
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  readerText: {
    fontSize: 18,
    lineHeight: 32,
  },
  pageIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
