export interface Book {
  id: number;
  title: string;
  authors: { name: string }[];
  formats: Record<string, string>;
}

export interface SearchResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: Book[];
}

export async function searchBooks(query: string): Promise<Book[]> {
  // If query contains Chinese characters, append &languages=zh
  const hasChinese = /[\u4e00-\u9fa5]/.test(query);
  let url = `https://gutendex.com/books/?search=${encodeURIComponent(query)}`;
  if (hasChinese) {
    url += '&languages=zh';
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch books');
  }
  const data = await response.json() as SearchResult;
  return data.results;
}

export async function fetchBookText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch book content');
  }
  const text = await response.text();
  return text;
}
