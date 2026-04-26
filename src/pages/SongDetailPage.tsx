import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { LinkButtons, type LinkCategory } from "../components/LinkButtons";
import { MediaCard } from "../components/MediaCard";
import { EmptyState, ErrorState } from "../components/States";
import { formatDuration, parseYouTubeId, publicAssetUrl } from "../lib/media";
import {
  getAlbum,
  getArtist,
  getSong,
  getSongLinks,
  type Album,
  type Artist,
  type LinkRow,
  type Song,
} from "../lib/publicQueries";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export function SongDetailPage() {
  const { songId } = useParams();
  const [song, setSong] = useState<Song | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [album, setAlbum] = useState<Album | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!songId) {
        setLoading(false);
        setError("Missing song id.");
        return;
      }
      if (!isSupabaseConfigured) {
        setLoading(false);
        setError("Supabase is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
        return;
      }
      setLoading(true);
      setError(null);

      const songRes = await getSong(songId);
      if (cancelled) return;
      if (songRes.error) {
        setError(songRes.error.message);
        setSong(null);
        setLoading(false);
        return;
      }

      const row = (songRes.data ?? null) as Song | null;
      setSong(row);
      if (!row) {
        setLoading(false);
        return;
      }

      const [linksRes, artistRes, albumRes] = await Promise.all([
        getSongLinks(row.id),
        row.primary_artist_id ? getArtist(row.primary_artist_id) : Promise.resolve({ data: null, error: null }),
        row.album_id ? getAlbum(row.album_id) : Promise.resolve({ data: null, error: null }),
      ]);
      if (cancelled) return;
      if (artistRes?.error) setError(artistRes.error.message);
      if (albumRes?.error) setError(albumRes.error.message);
      if (linksRes.error) setError(linksRes.error.message);
      setArtist((artistRes.data ?? null) as Artist | null);
      setAlbum((albumRes.data ?? null) as Album | null);
      setLinks((linksRes.data ?? []) as LinkRow[]);

      setLoading(false);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [songId]);

  const groupedLinks = useMemo(() => {
    const grouped: Partial<Record<LinkCategory, { href: string; label: string }[]>> = {};
    for (const l of links) {
      const category = l.category;
      grouped[category] ??= [];
      grouped[category]!.push({ href: l.url, label: l.platform });
    }
    return grouped;
  }, [links]);

  const durationLabel = formatDuration(song?.duration_seconds);
  const youtubeId = parseYouTubeId(song?.youtube_url);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link className="hover:text-text" to="/songs">
          Songs
        </Link>
        <span>/</span>
        <span className="text-text">{song ? song.title : `Song ${songId ?? ""}`}</span>
      </div>

      {loading ? (
        <div className="rounded-xl border bg-panel p-6 text-sm text-muted">Loading…</div>
      ) : error ? (
        <ErrorState title="Failed to load song" description={error} />
      ) : !song ? (
        <EmptyState title="Song not found" description="It may have been deleted or unpublished." />
      ) : (
        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          <MediaCard
            title={song.title}
            subtitle={artist?.name ?? "—"}
            imageUrl={publicAssetUrl("covers", album?.cover_path) ?? undefined}
            rightSlot={
              durationLabel ? (
                <span className="rounded-full border bg-panel px-3 py-1 text-xs text-muted">
                  {durationLabel}
                </span>
              ) : null
            }
          />

          <div className="space-y-5">
            <div className="rounded-2xl border bg-panel p-5">
              <div className="text-lg font-bold text-text">Song details</div>
              <div className="mt-2 text-sm text-muted">
                {artist?.name ? `Artist: ${artist.name}` : "Artist: —"}
                {album?.title ? ` · Album: ${album.title}` : ""}
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-xl border bg-panel2 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Preview
                  </div>
                  {song.preview_url ? (
                    <audio className="mt-2 w-full" controls src={song.preview_url} />
                  ) : (
                    <div className="mt-2 text-sm text-muted">No preview URL.</div>
                  )}
                </div>

                {youtubeId ? (
                  <div className="rounded-xl border bg-panel2 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                      YouTube
                    </div>
                    <div className="mt-3 aspect-video overflow-hidden rounded-lg border bg-black">
                      <iframe
                        className="h-full w-full"
                        src={`https://www.youtube.com/embed/${youtubeId}`}
                        title="YouTube video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {links.length ? <LinkButtons links={groupedLinks} /> : null}
          </div>
        </div>
      )}
    </div>
  );
}
