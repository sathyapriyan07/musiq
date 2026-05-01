export type ItunesTrack = {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  releaseDate?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
  trackNumber?: number;
  trackViewUrl?: string;
};

export async function searchItunesTracks(term: string, limit = 25): Promise<ItunesTrack[]> {
  const q = term.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    term: q,
    entity: "song",
    limit: String(limit),
  });

  const res = await fetch(`https://itunes.apple.com/search?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`iTunes search failed (${res.status})`);
  }

  const json = (await res.json()) as { results?: unknown[] };
  const results = Array.isArray(json.results) ? json.results : [];

  return results
    .map((r) => r as Partial<ItunesTrack>)
    .filter((r) => typeof r.trackId === "number" && typeof r.trackName === "string")
    .map((r) => ({
      trackId: r.trackId!,
      trackName: r.trackName!,
      artistName: r.artistName ?? "Unknown",
      collectionName: r.collectionName,
      releaseDate: r.releaseDate,
      previewUrl: r.previewUrl,
      artworkUrl100: r.artworkUrl100,
      trackTimeMillis: r.trackTimeMillis,
      trackNumber: r.trackNumber,
      trackViewUrl: r.trackViewUrl,
    }));
}

