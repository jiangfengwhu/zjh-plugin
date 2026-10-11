import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Image,
  useWindowDimensions,
  ScrollView,
  Linking,
} from 'react-native';
import { getAppContext } from '@zijinhua/app-sdk';
import { useTheme, Pressy, Button, Icon, EmptyState, RichMarkdown, Loading } from '@zijinhua/app-sdk/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Book, searchBooks } from './api';

export default function App() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const { width: windowWidth } = useWindowDimensions();
  // 3 columns
  const numColumns = 3;
  const itemMargin = 8;
  const listPadding = 16;
  const itemWidth = (windowWidth - listPadding * 2 - itemMargin * (numColumns - 1)) / numColumns;
  // standard book ratio ~1:1.5
  const itemHeight = itemWidth * 1.5;

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

  const handleExternalSearch = (engine: 'qidian' | 'baidu') => {
    if (!query.trim()) {
      getAppContext().toast.show('请输入书名', 'info');
      return;
    }
    let url = '';
    if (engine === 'qidian') {
      url = `https://m.qidian.com/search?kw=${encodeURIComponent(query)}`;
    } else if (engine === 'baidu') {
      url = `https://www.baidu.com/s?wd=${encodeURIComponent(query + ' 小说 免费阅读')}`;
    }

    Linking.openURL(url).catch(() => {
      getAppContext().toast.show('无法打开外部浏览器', 'error');
    });
  };

  const handleBack = () => {
    setSelectedBook(null);
  };

  const renderBookItem = ({ item }: { item: Book }) => {
    return (
      <Pressy onPress={() => setSelectedBook(item)} style={{ width: itemWidth, marginBottom: 16 }}>
        <View style={[styles.bookCoverContainer, { height: itemHeight, backgroundColor: theme.colors.surface, borderColor: theme.colors.line }]}>
          {item.coverUrl ? (
            <Image
              source={{ uri: item.source === 'iTunes' ? item.coverUrl.replace('100x100bb', '300x300bb') : item.coverUrl }}
              style={styles.bookCover}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.bookCover, { justifyContent: 'center', alignItems: 'center' }]}>
              <Icon name="box" color={theme.colors.muted} size={32} />
            </View>
          )}
        </View>
        <Text style={[styles.bookTitle, { color: theme.colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.bookAuthor, { color: theme.colors.muted }]} numberOfLines={1}>
          {item.author}
        </Text>
        <Text style={[styles.bookSource, { color: theme.colors.muted }]} numberOfLines={1}>
          {item.source}
        </Text>
      </Pressy>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.canvas }]}>
      {!selectedBook ? (
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <View style={[styles.header, { borderBottomColor: theme.colors.line }]}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>书城</Text>
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

          <View style={styles.externalLinksContainer}>
            <Text style={{ color: theme.colors.muted, fontSize: 12, marginRight: 8 }}>或者全网找书:</Text>
            <Button variant="outline" label="起点中文网" onPress={() => handleExternalSearch('qidian')} style={styles.externalBtn} />
            <Button variant="outline" label="百度搜索" onPress={() => handleExternalSearch('baidu')} style={styles.externalBtn} />
          </View>

          {loading ? (
             <Loading style={{ flex: 1 }} label="正在多源（iTunes 书城、Gutendex）并行搜索..." />
          ) : (
            <FlatList
              data={books}
              renderItem={renderBookItem}
              keyExtractor={item => item.id}
              numColumns={numColumns}
              contentContainerStyle={styles.listContent}
              columnWrapperStyle={{ gap: itemMargin }}
              ListEmptyComponent={
                !loading && query ? (
                  <EmptyState>
                    <Text style={{ color: theme.colors.muted }}>应用内未找到相关书籍</Text>
                  </EmptyState>
                ) : undefined
              }
            />
          )}
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

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
             <View style={styles.detailCoverWrapper}>
               {selectedBook.coverUrl ? (
                 <Image
                   source={{ uri: selectedBook.source === 'iTunes' ? selectedBook.coverUrl.replace('100x100bb', '600x600bb') : selectedBook.coverUrl }}
                   style={{ width: 160, height: 240, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.line }}
                   resizeMode="cover"
                 />
               ) : (
                 <View style={{ width: 160, height: 240, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.line, backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center' }}>
                    <Icon name="box" color={theme.colors.muted} size={48} />
                 </View>
               )}
             </View>
             <Text style={[styles.detailTitle, { color: theme.colors.text }]}>{selectedBook.title}</Text>
             <Text style={[styles.detailAuthor, { color: theme.colors.muted }]}>{selectedBook.author}</Text>
             <Text style={[styles.detailSource, { color: theme.colors.muted, backgroundColor: theme.colors.surface }]}>来源: {selectedBook.source}</Text>

             <View style={[styles.divider, { backgroundColor: theme.colors.line }]} />

             <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>简介</Text>
             {selectedBook.description ? (
               <RichMarkdown
                 markdown={selectedBook.description}
                 fontFamily="System"
                 fontSize={16}
                 lineHeight={24}
                 selectable={true}
               />
             ) : (
               <Text style={{ color: theme.colors.muted, fontSize: 16 }}>暂无简介</Text>
             )}
          </ScrollView>
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
    paddingBottom: 8,
    gap: 12,
  },
  externalLinksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  externalBtn: {
    paddingHorizontal: 8,
    height: 32,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  listContent: {
    padding: 16,
  },
  bookCoverContainer: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 8,
  },
  bookCover: {
    width: '100%',
    height: '100%',
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  bookAuthor: {
    fontSize: 12,
    marginBottom: 2,
  },
  bookSource: {
    fontSize: 10,
  },
  readerHeader: {
    height: 56 + 40,
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
  detailCoverWrapper: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  detailAuthor: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  detailSource: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  }
});
