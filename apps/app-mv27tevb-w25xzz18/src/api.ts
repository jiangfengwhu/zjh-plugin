export interface Book {
  id: string; // Unified string ID
  title: string;
  author: string;
  coverUrl: string | null;
  description?: string;
  source: 'iTunes' | 'Gutendex';
}

export async function searchBooks(query: string): Promise<Book[]> {
  const itunesQuery = encodeURIComponent(query);
  const itunesUrl = `https://itunes.apple.com/search?term=${itunesQuery}&entity=ebook&country=cn`;

  const hasChinese = /[\u4e00-\u9fa5]/.test(query);
  let gutendexUrl = `https://gutendex.com/books/?search=${encodeURIComponent(query)}`;
  if (hasChinese) {
    gutendexUrl += '&languages=zh';
  }

  // Fetch both in parallel
  const [itunesResponse, gutendexResponse] = await Promise.all([
    fetch(itunesUrl).catch(e => null),
    fetch(gutendexUrl).catch(e => null),
  ]);

  let unifiedResults: Book[] = [];

  // Parse iTunes
  if (itunesResponse && itunesResponse.ok) {
    try {
      const data = await itunesResponse.json();
      if (data && data.results) {
        unifiedResults.push(...data.results.map((item: any) => ({
          id: `itunes-${item.trackId}`,
          title: item.trackName,
          author: item.artistName || 'Unknown',
          coverUrl: item.artworkUrl100 || null,
          description: item.description,
          source: 'iTunes' as const,
        })));
      }
    } catch (e) {
      // Ignore parse errors for a single source
    }
  }

  // Parse Gutendex
  if (gutendexResponse && gutendexResponse.ok) {
    try {
      const data = await gutendexResponse.json();
      if (data && data.results) {
        unifiedResults.push(...data.results.map((item: any) => {
          // Extract cover from formats if available
          const coverUrl = item.formats['image/jpeg'] || item.formats['image/png'] || null;
          return {
            id: `gutendex-${item.id}`,
            title: item.title,
            author: item.authors && item.authors.length > 0 ? item.authors.map((a: any) => a.name).join(', ') : 'Unknown',
            coverUrl: coverUrl,
            description: undefined, // Gutendex doesn't reliably provide descriptions in standard search results
            source: 'Gutendex' as const,
          };
        }));
      }
    } catch (e) {
      // Ignore parse errors for a single source
    }
  }

  return unifiedResults;
}
