export type ItunesTrack = {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  collectionId?: number;
  releaseDate?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
  trackNumber?: number;
  trackViewUrl?: string;
};

export type ItunesAlbum = {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl100?: string;
  releaseDate?: string;
  collectionViewUrl?: string;
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
      collectionId: r.collectionId,
      releaseDate: r.releaseDate,
      previewUrl: r.previewUrl,
      artworkUrl100: r.artworkUrl100,
      trackTimeMillis: r.trackTimeMillis,
      trackNumber: r.trackNumber,
      trackViewUrl: r.trackViewUrl,
    }));
}

export async function searchItunesAlbums(term: string, limit = 25): Promise<ItunesAlbum[]> {
  const q = term.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    term: q,
    entity: "album",
    limit: String(limit),
  });

  const res = await fetch(`https://itunes.apple.com/search?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`iTunes album search failed (${res.status})`);
  }

  const json = (await res.json()) as { results?: unknown[] };
  const results = Array.isArray(json.results) ? json.results : [];

  return results
    .map((r) => r as Partial<ItunesAlbum>)
    .filter((r) => typeof r.collectionId === "number" && typeof r.collectionName === "string")
    .map((r) => ({
      collectionId: r.collectionId!,
      collectionName: r.collectionName!,
      artistName: r.artistName ?? "Unknown",
      artworkUrl100: r.artworkUrl100,
      releaseDate: r.releaseDate,
      collectionViewUrl: r.collectionViewUrl,
    }));
}

