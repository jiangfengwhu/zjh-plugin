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
  const url = `https://gutendex.com/books/?search=${encodeURIComponent(query)}`;
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
