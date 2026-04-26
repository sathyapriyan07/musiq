import { useEffect, useMemo, useState } from "react";
import { MediaCard } from "../components/MediaCard";
import { EmptyState, ErrorState } from "../components/States";
import { PageHeader, SectionHeader } from "../components/Page";
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
        className="w-[220px] shrink-0"
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
        className="w-[190px] shrink-0"
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
        className="w-[160px] shrink-0"
      />
    ));
  }, [artists]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Listen Now"
        subtitle="Your imported catalog, with an Apple Music-like layout."
      />

      <div className="relative overflow-hidden rounded-3xl border bg-panel p-6 surface shadow-soft">
        <div className="absolute inset-0 opacity-60">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[color:var(--accent)] blur-3xl" />
          <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-[color:var(--accent2)] blur-3xl" />
        </div>
        <div className="relative">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            ONL Music
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-text">
            Built for discovery
          </div>
          <div className="mt-2 max-w-2xl text-sm text-muted">
            Import tracks from iTunes in the Admin panel. Album artwork will appear automatically on
            song cards and album pages.
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-panel p-6 text-sm text-muted surface shadow-soft">
          Loading…
        </div>
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
              <SectionHeader title="Latest Songs" subtitle="Imported from iTunes." />
              <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
                {songCards}
              </div>
            </section>
          ) : null}

          {albums.length ? (
            <section className="space-y-3">
              <SectionHeader title="Albums" subtitle="From your catalog." />
              <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
                {albumCards}
              </div>
            </section>
          ) : null}

          {artists.length ? (
            <section className="space-y-3">
              <SectionHeader title="Artists" subtitle="From your catalog." />
              <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
                {artistCards}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
