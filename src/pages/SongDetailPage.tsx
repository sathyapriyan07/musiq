import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { LinkButtons, type LinkCategory } from "../components/LinkButtons";
import { EmptyState, ErrorState } from "../components/States";
import { formatDuration, parseYouTubeId, publicAssetUrl } from "../lib/media";
import {
  getAlbum,
  getArtist,
  getSong,
  getSongArtistCredits,
  getSongLinks,
  type Album,
  type Artist,
  type LinkRow,
  type Song,
  type SongArtistCredit,
} from "../lib/publicQueries";
import { isSupabaseConfigured } from "../lib/supabaseClient";

function PreviewPlayer({ src, title }: { src: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    const onTime = () => {
      if (isSeeking) return;
      setCurrentTime(audio.currentTime);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [isSeeking]);

  const timeLabel = formatDuration(Math.floor(isSeeking ? seekValue : currentTime)) ?? "0:00";
  const durationLabel = formatDuration(Math.floor(duration)) ?? "0:00";
  const max = duration > 0 ? duration : 30;
  const progress = isSeeking ? seekValue : currentTime;

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }

  function onSeekStart(v: number) {
    setIsSeeking(true);
    setSeekValue(v);
  }

  function onSeekEnd(v: number) {
    const audio = audioRef.current;
    if (audio) audio.currentTime = v;
    setCurrentTime(v);
    setIsSeeking(false);
  }

  return (
    <div className="rounded-2xl border bg-panel2 p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border bg-panel text-text hover:bg-panel"
          aria-label={isPlaying ? "Pause preview" : "Play preview"}
          title={isPlaying ? "Pause" : "Play"}
        >
          <span className="text-lg">{isPlaying ? "❚❚" : "▶"}</span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-text">{title}</div>
          <div className="mt-2">
            <input
              type="range"
              min={0}
              max={max}
              step={0.1}
              value={Math.min(progress, max)}
              onChange={(e) => onSeekStart(Number(e.target.value))}
              onMouseUp={(e) => onSeekEnd(Number((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => onSeekEnd(Number((e.target as HTMLInputElement).value))}
              className="h-2 w-full cursor-pointer accent-[color:var(--accent)]"
              aria-label="Seek preview"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-muted">
              <span>{timeLabel}</span>
              <span>{durationLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}

function creditArtist(credit: SongArtistCredit) {
  if (!credit.artist) return null;
  return Array.isArray(credit.artist) ? credit.artist[0] ?? null : credit.artist;
}

export function SongDetailPage() {
  const { songId } = useParams();
  const [song, setSong] = useState<Song | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [album, setAlbum] = useState<Album | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [credits, setCredits] = useState<SongArtistCredit[]>([]);
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

      const [linksRes, creditsRes, artistRes, albumRes] = await Promise.all([
        getSongLinks(row.id),
        getSongArtistCredits(row.id),
        row.primary_artist_id ? getArtist(row.primary_artist_id) : Promise.resolve({ data: null, error: null }),
        row.album_id ? getAlbum(row.album_id) : Promise.resolve({ data: null, error: null }),
      ]);
      if (cancelled) return;
      if (creditsRes.error) setError(creditsRes.error.message);
      if (artistRes?.error) setError(artistRes.error.message);
      if (albumRes?.error) setError(albumRes.error.message);
      if (linksRes.error) setError(linksRes.error.message);
      setArtist((artistRes.data ?? null) as Artist | null);
      setAlbum((albumRes.data ?? null) as Album | null);
      setLinks((linksRes.data ?? []) as LinkRow[]);
      setCredits((creditsRes.data ?? []) as SongArtistCredit[]);

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
  const coverUrl = publicAssetUrl("covers", album?.cover_path);

  const displayCredits = useMemo(() => {
    if (credits.length) return credits;
    if (artist?.id) {
      return [
        {
          artist_id: artist.id,
          role: "Primary",
          sort_order: 0,
          artist: { id: artist.id, name: artist.name, image_path: artist.image_path },
        } satisfies SongArtistCredit,
      ];
    }
    return [];
  }, [artist?.id, artist?.image_path, artist?.name, credits]);

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
          <div className="flex flex-col items-center text-center">
            <div className="w-44 md:w-52">
              <div className="aspect-square overflow-hidden rounded-2xl bg-panel2 shadow-soft">
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
              <div className="text-lg font-bold text-text">{song.title}</div>
              {durationLabel ? (
                <div className="pt-2">
                  <span className="inline-flex rounded-full bg-panel2 px-3 py-1 text-xs text-muted">
                    {durationLabel}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-5">
            {album?.title ? (
              <div className="text-sm text-muted">
                Album:{" "}
                <Link to={`/albums/${album.id}`} className="text-text hover:underline">
                  {album.title}
                </Link>
              </div>
            ) : null}

            <div className="rounded-2xl border bg-panel p-5">
              <div className="text-lg font-bold text-text">Artists</div>
              {!displayCredits.length ? (
                <div className="mt-2 text-sm text-muted">No artists credited.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {displayCredits.map((c) => {
                    const a = creditArtist(c);
                    const name = a?.name ?? c.artist_id;
                    const img = a?.image_path ? publicAssetUrl("avatars", a.image_path) : null;
                    const role = c.role?.trim() ? c.role.trim() : c.sort_order === 0 ? "Primary" : null;
                    const artistId = a?.id ?? c.artist_id;
                    return (
                      <Link
                        key={`${c.artist_id}:${c.sort_order ?? 0}`}
                        to={`/artists/${artistId}`}
                        className="block rounded-xl p-2 -m-2 hover:bg-panel2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 overflow-hidden rounded-full bg-panel2">
                            {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-text">{name}</div>
                            {role ? <div className="truncate text-xs text-muted">{role}</div> : null}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold text-text">Preview</div>
              {song.preview_url ? (
                <PreviewPlayer src={song.preview_url} title="Preview" />
              ) : (
                <div className="rounded-2xl border bg-panel2 p-4 text-sm text-muted">
                  No preview available.
                </div>
              )}
            </div>

            {youtubeId ? (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-text">YouTube</div>
                <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-soft">
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

            {links.length ? <LinkButtons links={groupedLinks} /> : null}
          </div>
        </div>
      )}
    </div>
  );
}
