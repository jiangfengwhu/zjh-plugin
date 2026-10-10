export interface Book {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  description?: string;
}

export interface SearchResult {
  resultCount: number;
  results: Book[];
}

export async function searchBooks(query: string): Promise<Book[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=ebook&country=cn`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch books');
  }
  const data = await response.json() as SearchResult;
  return data.results;
}
