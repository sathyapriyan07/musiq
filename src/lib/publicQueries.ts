import { supabase } from "./supabaseClient";

export type Artist = {
  id: string;
  name: string;
  bio: string | null;
  image_path: string | null;
  is_published: boolean;
  updated_at: string;
};

export type Album = {
  id: string;
  title: string;
  artist_id: string | null;
  release_date: string | null;
  cover_path: string | null;
  is_published: boolean;
  updated_at: string;
};

export type Channel = {
  id: string;
  name: string;
  logo_path: string | null;
  is_published: boolean;
  updated_at: string;
};

export type Song = {
  id: string;
  title: string;
  primary_artist_id: string | null;
  album_id: string | null;
  track_number: number | null;
  duration_seconds: number | null;
  preview_url: string | null;
  youtube_url: string | null;
  cover_path: string | null;
  is_published: boolean;
  updated_at: string;
  deezer_id: number | null;
  explicit: boolean;
  deezer_url: string | null;
};

export type SongArtistCredit = {
  song_id?: string;
  artist_id: string;
  role: string | null;
  sort_order: number | null;
  artist: Pick<Artist, "id" | "name" | "image_path"> | Pick<Artist, "id" | "name" | "image_path">[] | null;
};

export type SongChannelCredit = {
  channel_id: string;
  sort_order: number | null;
  channel: Pick<Channel, "id" | "name" | "logo_path"> | Pick<Channel, "id" | "name" | "logo_path">[] | null;
};

export type AlbumChannelCredit = {
  channel_id: string;
  sort_order: number | null;
  channel: Pick<Channel, "id" | "name" | "logo_path"> | Pick<Channel, "id" | "name" | "logo_path">[] | null;
};

export type LinkRow = {
  id: string;
  category: "official" | "live" | "lyrics" | "covers" | "other";
  platform: string;
  url: string;
};

export type ArtistSongCredit = {
  role: string | null;
  sort_order: number | null;
  song:
    | Pick<
        Song,
        | "id"
        | "title"
        | "primary_artist_id"
        | "album_id"
        | "track_number"
        | "duration_seconds"
        | "cover_path"
        | "is_published"
        | "updated_at"
      >
    | Pick<
        Song,
        | "id"
        | "title"
        | "primary_artist_id"
        | "album_id"
        | "track_number"
        | "duration_seconds"
        | "cover_path"
        | "is_published"
        | "updated_at"
      >[]
    | null;
};

export async function getArtists() {
  return await supabase
    .from("artists")
    .select("id, name, bio, image_path, is_published, updated_at")
    .eq("is_published", true)
    .order("updated_at", { ascending: false });
}

export async function getArtist(id: string) {
  return await supabase
    .from("artists")
    .select("id, name, bio, image_path, is_published, updated_at")
    .eq("id", id)
    .maybeSingle();
}

export async function getAlbums() {
  return await supabase
    .from("albums")
    .select("id, title, artist_id, release_date, cover_path, is_published, updated_at")
    .eq("is_published", true)
    .order("updated_at", { ascending: false });
}

export async function getAlbum(id: string) {
  return await supabase
    .from("albums")
    .select("id, title, artist_id, release_date, cover_path, is_published, updated_at")
    .eq("id", id)
    .maybeSingle();
}

export async function getSongs(limit = 200) {
  return await supabase
    .from("songs")
    .select(
      "id, title, primary_artist_id, album_id, track_number, duration_seconds, preview_url, youtube_url, cover_path, is_published, updated_at",
    )
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(limit);
}

export async function getSong(id: string) {
  return await supabase
    .from("songs")
    .select(
      "id, title, primary_artist_id, album_id, track_number, duration_seconds, preview_url, youtube_url, cover_path, is_published, updated_at",
    )
    .eq("id", id)
    .maybeSingle();
}

export async function getSongsByAlbum(albumId: string) {
  return await supabase
    .from("songs")
    .select(
      "id, title, primary_artist_id, album_id, track_number, duration_seconds, preview_url, youtube_url, cover_path, is_published, updated_at",
    )
    .eq("is_published", true)
    .eq("album_id", albumId)
    .order("track_number", { ascending: true })
    .order("title", { ascending: true });
}

export async function getAlbumsByArtist(artistId: string) {
  return await supabase
    .from("albums")
    .select("id, title, artist_id, release_date, cover_path, is_published, updated_at")
    .eq("is_published", true)
    .eq("artist_id", artistId)
    .order("release_date", { ascending: false })
    .order("updated_at", { ascending: false });
}

export async function getSongsByArtist(artistId: string, limit = 50) {
  return await supabase
    .from("songs")
    .select(
      "id, title, primary_artist_id, album_id, track_number, duration_seconds, preview_url, youtube_url, cover_path, is_published, updated_at",
    )
    .eq("is_published", true)
    .eq("primary_artist_id", artistId)
    .order("updated_at", { ascending: false })
    .limit(limit);
}

export async function getSongCreditsByArtist(artistId: string, limit?: number | null) {
  let query = supabase
    .from("song_artists")
    .select(
      "role, sort_order, song:songs(id, title, primary_artist_id, album_id, track_number, duration_seconds, cover_path, is_published, updated_at)",
    )
    .eq("artist_id", artistId)
    .eq("song.is_published", true)
    .order("updated_at", { ascending: false, foreignTable: "song" });

  if (limit != null && limit > 0) {
    query = query.limit(limit);
  }

  return await query;
}

export async function getRelatedArtists(artistId: string) {
  const { data, error } = await supabase
    .from("song_artists")
    .select(`
      song:songs(
        id,
        song_artists:song_artists(artist:artists(id, name, image_path, is_published))
      )
    `)
    .eq("artist_id", artistId);

  if (error) return { data: null, error };

  const artistMap: Record<string, { id: string; name: string; image_path: string | null }> = {};
  (data ?? []).forEach((row: any) => {
    const song = Array.isArray(row.song) ? row.song[0] : row.song;
    if (!song) return;
    const credits = Array.isArray(song.song_artists) ? song.song_artists : [];
    credits.forEach((c: any) => {
      const a = Array.isArray(c.artist) ? c.artist[0] : c.artist;
      if (!a || a.id === artistId || !a.is_published) return;
      artistMap[a.id] = { id: a.id, name: a.name, image_path: a.image_path };
    });
  });

  return { data: Object.values(artistMap), error: null };
}

export async function getSongLinks(songId: string) {
  return await supabase
    .from("song_links")
    .select("id, category, platform, url")
    .eq("song_id", songId)
    .order("category", { ascending: true })
    .order("platform", { ascending: true });
}

export async function getSongArtistCredits(songId: string) {
  return await supabase
    .from("song_artists")
    .select("artist_id, role, sort_order, artist:artists(id, name, image_path)")
    .eq("song_id", songId)
    .order("sort_order", { ascending: true });
}

export async function getSongArtistCreditsForSongs(songIds: string[]) {
  if (!songIds.length) return { data: [], error: null };
  return await supabase
    .from("song_artists")
    .select("song_id, artist_id, role, sort_order, artist:artists(id, name, image_path)")
    .in("song_id", songIds)
    .order("song_id", { ascending: true })
    .order("sort_order", { ascending: true });
}

export async function getSongChannels(songId: string) {
  return await supabase
    .from("song_channels")
    .select("channel_id, sort_order, channel:channels(id, name, logo_path)")
    .eq("song_id", songId)
    .order("sort_order", { ascending: true });
}

export async function getAlbumChannels(albumId: string) {
  return await supabase
    .from("album_channels")
    .select("channel_id, sort_order, channel:channels(id, name, logo_path)")
    .eq("album_id", albumId)
    .order("sort_order", { ascending: true });
}
