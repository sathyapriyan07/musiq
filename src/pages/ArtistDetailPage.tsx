import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { MediaCard } from "../components/MediaCard";
import { EmptyState, ErrorState } from "../components/States";
import { publicAssetUrl } from "../lib/media";
import {
  getAlbumsByArtist,
  getArtist,
  getSongsByArtist,
  type Album,
  type Artist,
  type Song,
} from "../lib/publicQueries";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export function ArtistDetailPage() {
  const { artistId } = useParams();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!artistId) {
        setLoading(false);
        setError("Missing artist id.");
        return;
      }
      if (!isSupabaseConfigured) {
        setLoading(false);
        setError("Supabase is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
        return;
      }
      setLoading(true);
      setError(null);

      const artistRes = await getArtist(artistId);
      if (cancelled) return;
      if (artistRes.error) {
        setError(artistRes.error.message);
        setArtist(null);
        setLoading(false);
        return;
      }
      const row = (artistRes.data ?? null) as Artist | null;
      setArtist(row);
      if (!row) {
        setAlbums([]);
        setSongs([]);
        setLoading(false);
        return;
      }

      const [albumsRes, songsRes] = await Promise.all([
        getAlbumsByArtist(row.id),
        getSongsByArtist(row.id, 24),
      ]);
      if (cancelled) return;
      if (albumsRes.error) setError(albumsRes.error.message);
      if (songsRes.error) setError(songsRes.error.message);
      setAlbums((albumsRes.data ?? []) as Album[]);
      setSongs((songsRes.data ?? []) as Song[]);
      setLoading(false);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [artistId]);

  const albumCards = useMemo(() => {
    return albums.map((a) => (
      <MediaCard
        key={a.id}
        title={a.title}
        subtitle="Album"
        aspect="poster"
        to={`/albums/${a.id}`}
        imageUrl={publicAssetUrl("covers", a.cover_path) ?? undefined}
      />
    ));
  }, [albums]);

  const songCards = useMemo(() => {
    return songs.map((s) => (
      <MediaCard key={s.id} title={s.title} subtitle="Song" to={`/songs/${s.id}`} />
    ));
  }, [songs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link className="hover:text-text" to="/artists">
          Artists
        </Link>
        <span>/</span>
        <span className="text-text">{artist ? artist.name : `Artist ${artistId ?? ""}`}</span>
      </div>

      {loading ? (
        <div className="rounded-xl border bg-panel p-6 text-sm text-muted">Loading…</div>
      ) : error ? (
        <ErrorState title="Failed to load artist" description={error} />
      ) : !artist ? (
        <EmptyState title="Artist not found" description="It may have been deleted or unpublished." />
      ) : (
        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          <MediaCard
            title={artist.name}
            subtitle="Artist"
            shape="round"
            imageUrl={publicAssetUrl("avatars", artist.image_path) ?? undefined}
          />

          <div className="space-y-5">
            <div className="rounded-2xl border bg-panel p-5">
              <div className="text-lg font-bold text-text">About</div>
              <div className="mt-2 text-sm text-muted">
                {artist.bio ? artist.bio : "No biography yet."}
              </div>
            </div>

            {albums.length ? (
              <section className="space-y-3">
                <div className="text-sm font-semibold text-text">Albums</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{albumCards}</div>
              </section>
            ) : null}

            {songs.length ? (
              <section className="space-y-3">
                <div className="text-sm font-semibold text-text">Songs</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{songCards}</div>
              </section>
            ) : !albums.length ? (
              <EmptyState
                title="No content for this artist yet"
                description="Import songs for this artist, or add albums/songs in Admin."
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
