import { useEffect, useMemo, useState } from "react";
import { MediaCard } from "../components/MediaCard";
import { EmptyState, ErrorState } from "../components/States";
import { publicAssetUrl } from "../lib/media";
import { getAlbums, getArtists, getSongs, type Album, type Artist, type Song } from "../lib/publicQueries";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export function HomePage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        setError("Supabase is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
        return;
      }
      setLoading(true);
      setError(null);
      const [songsRes, albumsRes, artistsRes] = await Promise.all([
        getSongs(8),
        getAlbums(),
        getArtists(),
      ]);
      if (cancelled) return;
      if (songsRes.error) setError(songsRes.error.message);
      if (albumsRes.error) setError(albumsRes.error.message);
      if (artistsRes.error) setError(artistsRes.error.message);
      setSongs((songsRes.data ?? []) as Song[]);
      setAlbums(((albumsRes.data ?? []) as Album[]).slice(0, 8));
      setArtists(((artistsRes.data ?? []) as Artist[]).slice(0, 8));
      setLoading(false);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const songCards = useMemo(() => {
    const coverByAlbumId = new Map<string, string>();
    for (const a of albums) {
      const url = publicAssetUrl("covers", a.cover_path);
      if (url) coverByAlbumId.set(a.id, url);
    }

    return songs.map((s) => (
      <MediaCard
        key={s.id}
        title={s.title}
        subtitle="Song"
        to={`/songs/${s.id}`}
        imageUrl={s.album_id ? coverByAlbumId.get(s.album_id) : undefined}
      />
    ));
  }, [albums, songs]);

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

  const artistCards = useMemo(() => {
    return artists.map((a) => (
      <MediaCard
        key={a.id}
        title={a.name}
        subtitle="Artist"
        shape="round"
        to={`/artists/${a.id}`}
        imageUrl={publicAssetUrl("avatars", a.image_path) ?? undefined}
      />
    ));
  }, [artists]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-panel p-6">
        <div className="text-2xl font-bold text-text">Welcome to ONL Music</div>
        <div className="mt-2 text-sm text-muted">
          Spotify-inspired UI + Supabase backend (Auth, Storage, RLS).
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border bg-panel p-6 text-sm text-muted">Loading…</div>
      ) : error ? (
        <ErrorState title="Failed to load homepage" description={error} />
      ) : !songs.length && !albums.length && !artists.length ? (
        <EmptyState
          title="No content yet"
          description="Import content in Admin → Songs → Import iTunes, then come back here."
        />
      ) : (
        <>
          {songs.length ? (
            <section className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-text">Latest Songs</div>
                <div className="text-xs text-muted">Imported from iTunes.</div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{songCards}</div>
            </section>
          ) : null}

          {albums.length ? (
            <section className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-text">Latest Albums</div>
                <div className="text-xs text-muted">From your catalog.</div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{albumCards}</div>
            </section>
          ) : null}

          {artists.length ? (
            <section className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-text">Artists</div>
                <div className="text-xs text-muted">From your catalog.</div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-6">{artistCards}</div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
