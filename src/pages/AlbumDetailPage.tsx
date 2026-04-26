import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState } from "../components/States";
import { publicAssetUrl, formatDuration } from "../lib/media";
import {
  getAlbum,
  getArtist,
  getSongsByAlbum,
  type Album,
  type Artist,
  type Song,
} from "../lib/publicQueries";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export function AlbumDetailPage() {
  const { albumId } = useParams();
  const [album, setAlbum] = useState<Album | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!albumId) {
        setLoading(false);
        setError("Missing album id.");
        return;
      }
      if (!isSupabaseConfigured) {
        setLoading(false);
        setError("Supabase is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
        return;
      }
      setLoading(true);
      setError(null);

      const albumRes = await getAlbum(albumId);
      if (cancelled) return;
      if (albumRes.error) {
        setError(albumRes.error.message);
        setAlbum(null);
        setLoading(false);
        return;
      }
      const row = (albumRes.data ?? null) as Album | null;
      setAlbum(row);
      if (!row) {
        setSongs([]);
        setArtist(null);
        setLoading(false);
        return;
      }

      const [artistRes, songsRes] = await Promise.all([
        row.artist_id ? getArtist(row.artist_id) : Promise.resolve({ data: null, error: null }),
        getSongsByAlbum(row.id),
      ]);
      if (cancelled) return;
      if (artistRes.error) setError(artistRes.error.message);
      if (songsRes.error) setError(songsRes.error.message);
      setArtist((artistRes.data ?? null) as Artist | null);
      setSongs((songsRes.data ?? []) as Song[]);
      setLoading(false);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [albumId]);

  const trackRows = useMemo(() => {
    return songs.map((s) => {
      const duration = formatDuration(s.duration_seconds);
      return (
        <Link
          key={s.id}
          to={`/songs/${s.id}`}
          className="flex items-center gap-3 px-4 py-3 hover:bg-panel2"
        >
          <div className="w-8 text-right text-xs text-muted">
            {s.track_number ?? "—"}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-text">{s.title}</div>
          </div>
          {duration ? <div className="ml-auto text-xs text-muted">{duration}</div> : null}
        </Link>
      );
    });
  }, [songs]);

  const coverUrl = publicAssetUrl("covers", album?.cover_path);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link className="hover:text-text" to="/albums">
          Albums
        </Link>
        <span>/</span>
        <span className="text-text">{album ? album.title : `Album ${albumId ?? ""}`}</span>
      </div>

      {loading ? (
        <div className="rounded-xl border bg-panel p-6 text-sm text-muted">Loading…</div>
      ) : error ? (
        <ErrorState title="Failed to load album" description={error} />
      ) : !album ? (
        <EmptyState title="Album not found" description="It may have been deleted or unpublished." />
      ) : (
        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          <div className="flex flex-col items-center text-center">
            <div className="w-40 md:w-52">
              <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-panel2 shadow-soft">
                {coverUrl ? (
                  <img src={coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted">
                    <span className="text-xs uppercase tracking-wider">No Image</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <div className="text-lg font-bold text-text">{album.title}</div>
              <div className="text-sm text-muted">{artist?.name ?? "—"}</div>
              {album.release_date ? (
                <div className="pt-1 text-xs text-muted">{album.release_date}</div>
              ) : null}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border bg-panel p-5">
              <div className="text-lg font-bold text-text">Tracklist</div>
              <div className="mt-2 text-sm text-muted">
                {artist?.name ? `Artist: ${artist.name}` : "Artist: —"}
                {album.release_date ? ` · Release: ${album.release_date}` : ""}
              </div>
            </div>

            {!songs.length ? (
              <EmptyState title="No tracks yet" description="Import songs for this album, or add them in Admin." />
            ) : (
              <div className="overflow-hidden rounded-2xl border bg-panel">
                <div className="border-b px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
                  Tracks
                </div>
                <div className="divide-y">{trackRows}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
