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
  getSongChannels,
  getSongsByAlbum,
  getSongLinks,
  type Album,
  type Artist,
  type SongChannelCredit,
  type LinkRow,
  type Song,
  type SongArtistCredit,
} from "../lib/publicQueries";
import { isSupabaseConfigured } from "../lib/supabaseClient";

function PreviewPlayer({ src }: { src: string }) {
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
    <div className="space-y-3">
      <div className="text-sm font-semibold text-text">Preview</div>
      <div className="bg-panel2 p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-panel text-text hover:bg-panel2"
            aria-label={isPlaying ? "Pause preview" : "Play preview"}
            title={isPlaying ? "Pause" : "Play"}
          >
            <span className="text-lg">{isPlaying ? "❚❚" : "▶"}</span>
          </button>
          <div className="min-w-0 flex-1">
            <div className="mt-2">
              <input
                type="range"
                min={0}
                max={max}
                value={progress}
                onChange={(e) => onSeekStart(Number(e.target.value))}
                onMouseUp={() => onSeekEnd(progress)}
                onKeyUp={() => onSeekEnd(progress)}
                className="w-full"
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted">
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

function creditChannel(credit: SongChannelCredit) {
  if (!credit.channel) return null;
  return Array.isArray(credit.channel) ? credit.channel[0] ?? null : credit.channel;
}

export function SongDetailPage() {
  const { songId } = useParams();
  const [song, setSong] = useState<Song | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [album, setAlbum] = useState<Album | null>(null);
  const [albumSongs, setAlbumSongs] = useState<Song[]>([]);
  const [visibleAlbumSongs, setVisibleAlbumSongs] = useState(4);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [credits, setCredits] = useState<SongArtistCredit[]>([]);
  const [channels, setChannels] = useState<SongChannelCredit[]>([]);
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

      const [linksRes, creditsRes, channelsRes, artistRes, albumRes, albumSongsRes] = await Promise.all([
        getSongLinks(row.id),
        getSongArtistCredits(row.id),
        getSongChannels(row.id),
        row.primary_artist_id ? getArtist(row.primary_artist_id) : Promise.resolve({ data: null, error: null }),
        row.album_id ? getAlbum(row.album_id) : Promise.resolve({ data: null, error: null }),
        row.album_id ? getSongsByAlbum(row.album_id) : Promise.resolve({ data: null, error: null }),
      ]);
      if (cancelled) return;
      if (creditsRes.error) setError(creditsRes.error.message);
      if (channelsRes.error) setError(channelsRes.error.message);
      if (artistRes?.error) setError(artistRes.error.message);
      if (albumRes?.error) setError(albumRes.error.message);
      if (linksRes.error) setError(linksRes.error.message);
      if (albumSongsRes.error) setError(albumSongsRes.error.message);
      setArtist((artistRes.data ?? null) as Artist | null);
      setAlbum((albumRes.data ?? null) as Album | null);
      setLinks((linksRes.data ?? []) as LinkRow[]);
      setCredits((creditsRes.data ?? []) as SongArtistCredit[]);
      setChannels((channelsRes.data ?? []) as SongChannelCredit[]);
      setAlbumSongs((albumSongsRes?.data ?? []) as Song[]);

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
  const coverUrl = publicAssetUrl("covers", song?.cover_path);

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

            <div>
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

            <div>
              <div className="text-lg font-bold text-text">Labels</div>
              {!channels.length ? (
                <div className="mt-2 text-sm text-muted">No channels assigned.</div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {channels.map((c) => {
                    const ch = creditChannel(c);
                    const name = ch?.name ?? c.channel_id;
                    const img = ch?.logo_path ? publicAssetUrl("logos", ch.logo_path) : null;
                    return (
                      <div
                        key={`${c.channel_id}:${c.sort_order ?? 0}`}
                        className="flex items-center gap-2 rounded-full bg-panel2 px-3 py-2"
                      >
                        <div className="h-7 w-7 overflow-hidden rounded-full bg-panel">
                          {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="text-sm font-semibold text-text">{name}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {song.preview_url ? (
                <PreviewPlayer src={song.preview_url} />
              ) : (
                <div className="p-4 text-sm text-muted">
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

            {song.deezer_url ? (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-text">Deezer</div>
                <a
                  href={song.deezer_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1e1e1e] px-4 py-3 text-sm font-semibold text-[#00c853] transition hover:bg-[#2a2a2a]"
                >
                  <span>Listen on Deezer</span>
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm3.78 14.58c-1.08.64-2.88 1.08-4.38 1.08-1.62 0-2.88-.44-3.78-1.16-.3-.22-.36-.64-.18-.94.18-.3.64-.36.94-.18 1.56.98 3.72 1.3 5.28 1.3 1.26 0 2.7-.28 4.08-.84.34-.14.72.02.86.36.14.34-.02.72-.36.86-.44.22-.9.34-1.36.34-.5 0-1.02-.08-1.5-.22zm1.2-3.1c-1.28.76-3.42 1.28-5.28 1.28-1.86 0-3.3-.46-4.32-1.22-.26-.2-.32-.58-.14-.84.2-.26.58-.32.84-.14 1.62.98 3.54 1.36 5.06 1.36 1.42 0 3.06-.36 4.18-1.04.3-.18.68-.08.86.22.18.3.08.68-.22.86-.24.14-.48.22-.72.3-.22.08-.46.12-.7.12-.26 0-.52-.06-.76-.18zm1.28-3.16c-1.46.88-3.9 1.46-6.2 1.46-2.3 0-4.08-.58-5.34-1.46-.24-.18-.3-.52-.12-.76.18-.24.52-.3.76-.12 1.84.98 3.96 1.42 5.46 1.42 1.5 0 3.64-.44 5.08-1.28.26-.18.6-.1.78.16.18.26.1.6-.16.78-.34.2-.68.32-1.02.38-.34.06-.68.1-1.02.1-.36 0-.7-.06-1.04-.18-.36-.12-.7-.3-1.04-.5z"/>
                  </svg>
                </a>
              </div>
            ) : null}

            {song.explicit ? (
              <div className="inline-flex items-center rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
                EXPLICIT
              </div>
            ) : null}

            {links.length ? <LinkButtons links={groupedLinks} /> : null}

            {album && albumSongs.filter(s => s.id !== song?.id).length > 0 ? (
              <section className="space-y-3">
                <div className="text-sm font-semibold text-text">More from {album.title}</div>
                <div className="grid grid-cols-4 gap-3">
                  {albumSongs
                    .filter(s => s.id !== song?.id)
                    .slice(0, visibleAlbumSongs)
                    .map((s) => {
                      const songCoverUrl = publicAssetUrl("covers", s.cover_path);
                      return (
                        <Link key={s.id} to={`/songs/${s.id}`} className="group block">
                          <div className="aspect-square overflow-hidden rounded-xl bg-panel2">
                            {songCoverUrl ? (
                              <img src={songCoverUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-110" loading="lazy" />
                            ) : null}
                          </div>
                          <div className="mt-2">
                            <div className="truncate text-sm font-semibold text-text">{s.title}</div>
                          </div>
                        </Link>
                      );
                    })}
                </div>
                {visibleAlbumSongs < albumSongs.filter(s => s.id !== song?.id).length && (
                  <button
                    onClick={() => setVisibleAlbumSongs(prev => prev + 4)}
                    className="mt-3 text-sm font-medium text-accent hover:underline"
                  >
                    View More
                  </button>
                )}
              </section>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
