const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deezer-proxy`;

export interface DeezerTrack {
  id: number;
  title: string;
  duration: number;
  preview: string;
  artist: {
    id: number;
    name: string;
    picture: string;
    picture_medium: string;
  };
  album: {
    id: number;
    title: string;
    cover: string;
    cover_medium: string;
  };
  explicit_lyrics: boolean;
  link: string;
}

export interface DeezerArtist {
  id: number;
  name: string;
  picture: string;
  picture_medium: string;
  fans: number;
  link: string;
}

export interface DeezerAlbum {
  id: number;
  title: string;
  cover: string;
  cover_medium: string;
  release_date: string;
  artist: {
    id: number;
    name: string;
  };
  link: string;
}

async function proxyFetch(path: string, query?: string) {
  const url = new URL(PROXY_URL);
  url.searchParams.set('path', path);
  if (query) url.searchParams.set('q', query);

  const res = await fetch(url.toString(), {
    headers: {
      'apikey': `${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Deezer API error: ${res.status} - ${errorText}`);
  }
  return res.json();
}

export const searchTracks = async (query: string) => {
  const data = await proxyFetch('/search', `q=${encodeURIComponent(query)}`);
  console.log('[deezer] search response:', data);
  return data;
};

export const searchArtists = async (query: string) => {
  return proxyFetch('/search/artist', `q=${encodeURIComponent(query)}`);
};

export const searchAlbums = async (query: string) => {
  return proxyFetch('/search/album', `q=${encodeURIComponent(query)}`);
};

export const getTrack = async (id: number): Promise<DeezerTrack> => {
  return proxyFetch(`/track/${id}`);
};

export const getArtist = async (id: number): Promise<DeezerArtist> => {
  return proxyFetch(`/artist/${id}`);
};

export const getAlbum = async (id: number): Promise<DeezerAlbum> => {
  return proxyFetch(`/album/${id}`);
};
