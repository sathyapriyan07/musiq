import { supabase } from "../lib/supabaseClient";

export type ArtistRow = {
  id: string;
  name: string;
  bio: string | null;
  image_path: string | null;
  is_published: boolean;
  updated_at: string;
};

export type AlbumRow = {
  id: string;
  title: string;
  artist_id: string | null;
  release_date: string | null;
  cover_path: string | null;
  is_published: boolean;
  updated_at: string;
};

export type SongRow = {
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
};

export type ChannelRow = {
  id: string;
  name: string;
  logo_path: string | null;
  is_published: boolean;
  updated_at: string;
};

export async function listArtists() {
  return await supabase
    .from("artists")
    .select("id, name, bio, image_path, is_published, updated_at")
    .order("updated_at", { ascending: false });
}

export async function listChannels() {
  return await supabase
    .from("channels")
    .select("id, name, logo_path, is_published, updated_at")
    .order("updated_at", { ascending: false });
}

export async function listAlbums() {
  return await supabase
    .from("albums")
    .select("id, title, artist_id, release_date, cover_path, is_published, updated_at")
    .order("updated_at", { ascending: false });
}

export async function listSongs() {
  return await supabase
    .from("songs")
    .select(
      "id, title, primary_artist_id, album_id, track_number, duration_seconds, preview_url, youtube_url, is_published, updated_at",
    )
    .order("updated_at", { ascending: false });
}

export async function ensureArtistByName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Artist name required");

  const existing = await supabase
    .from("artists")
    .select("id, name")
    .ilike("name", trimmed)
    .maybeSingle();

  if (existing.data?.id) return existing.data.id as string;

  const created = await supabase
    .from("artists")
    .insert({ name: trimmed, is_published: true })
    .select("id")
    .single();

  if (created.error) throw created.error;
  return created.data.id as string;
}

export async function ensureAlbum(title: string, artistId: string | null) {
  const trimmed = title.trim();
  if (!trimmed) return null;

  const query = supabase.from("albums").select("id, title").ilike("title", trimmed);
  const existing = artistId
    ? await query.eq("artist_id", artistId).maybeSingle()
    : await query.is("artist_id", null).maybeSingle();

  if (existing.data?.id) return existing.data.id as string;

  const created = await supabase
    .from("albums")
    .insert({ title: trimmed, artist_id: artistId, is_published: true })
    .select("id")
    .single();

  if (created.error) throw created.error;
  return created.data.id as string;
}
