import { useEffect, useMemo, useState } from "react";

import { MediaCard } from "../components/MediaCard";
import { PageHeader } from "../components/Page";
import { EmptyState, ErrorState } from "../components/States";
import { publicAssetUrl } from "../lib/media";
import { getAlbums, getArtists, type Album, type Artist } from "../lib/publicQueries";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        setError(
          "Supabase is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).",
        );
        return;
      }
      setLoading(true);
      setError(null);
      const [albumsRes, artistsRes] = await Promise.all([getAlbums(), getArtists()]);
      if (cancelled) return;
      if (albumsRes.error) setError(albumsRes.error.message);
      if (artistsRes.error) setError(artistsRes.error.message);
      setAlbums((albumsRes.data ?? []) as Album[]);
      setArtists((artistsRes.data ?? []) as Artist[]);
      setLoading(false);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const artistNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of artists) map.set(a.id, a.name);
    return map;
  }, [artists]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Albums"
        subtitle="Artwork-forward browsing, Apple Music style."
      />

      {loading ? (
        <div className="rounded-2xl border bg-panel p-6 text-sm text-muted surface shadow-soft">
          Loading...
        </div>
      ) : error ? (
        <ErrorState title="Failed to load albums" description={error} />
      ) : !albums.length ? (
        <EmptyState
          title="No albums found"
          description="Import songs in Admin -> Songs -> Import iTunes, or add albums manually."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {albums.map((a) => (
            <MediaCard
              key={a.id}
              title={a.title}
              subtitle={
                a.artist_id ? artistNameById.get(a.artist_id) ?? "—" : "—"
              }
              aspect="square"
              variant="artwork"
              to={`/albums/${a.id}`}
              imageUrl={publicAssetUrl("covers", a.cover_path) ?? undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
