const BASE_URL = 'https://api.deezer.com';
const PROXY = 'https://corsproxy.io/?url=';

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

export const searchTracks = async (query: string) => {
  const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(`${PROXY}${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`Deezer search failed: ${res.status}`);
  const json = await res.json();
  console.log('[deezer] search response:', json);
  return json;
};

const proxyFetch = (path: string) =>
  fetch(`${PROXY}${encodeURIComponent(`${BASE_URL}${path}`)}`);

export const searchArtists = async (query: string) => {
  const res = await proxyFetch(`/search/artist?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to search artists');
  return res.json();
};

export const searchAlbums = async (query: string) => {
  const res = await proxyFetch(`/search/album?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to search albums');
  return res.json();
};

export const getTrack = async (id: number): Promise<DeezerTrack> => {
  const res = await proxyFetch(`/track/${id}`);
  if (!res.ok) throw new Error('Failed to fetch track');
  return res.json();
};

export const getArtist = async (id: number): Promise<DeezerArtist> => {
  const res = await proxyFetch(`/artist/${id}`);
  if (!res.ok) throw new Error('Failed to fetch artist');
  return res.json();
};

export const getAlbum = async (id: number): Promise<DeezerAlbum> => {
  const res = await proxyFetch(`/album/${id}`);
  if (!res.ok) throw new Error('Failed to fetch album');
  return res.json();
};
