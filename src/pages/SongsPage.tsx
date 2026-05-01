import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { MediaCard } from "../components/MediaCard";
import { PageHeader } from "../components/Page";
import { SearchBar } from "../components/SearchBar";
import { EmptyState, ErrorState } from "../components/States";
import { ViewToggle, type ViewMode } from "../components/ViewToggle";
import { publicAssetUrl } from "../lib/media";
import { formatCreditNames } from "../lib/credits";
import {
  getAlbums,
  getArtists,
  getSongArtistCreditsForSongs,
  getSongs,
  type Album,
  type Artist,
  type Song,
  type SongArtistCredit,
} from "../lib/publicQueries";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export function SongsPage() {
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");

  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [songCredits, setSongCredits] = useState<Record<string, SongArtistCredit[]>>({});
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
      const [songsRes, artistsRes, albumsRes] = await Promise.all([
        getSongs(250),
        getArtists(),
        getAlbums(),
      ]);
      if (cancelled) return;
      if (songsRes.error) setError(songsRes.error.message);
      if (artistsRes.error) setError(artistsRes.error.message);
      if (albumsRes.error) setError(albumsRes.error.message);
      const fetchedSongs = (songsRes.data ?? []) as Song[];
      setSongs(fetchedSongs);
      setArtists((artistsRes.data ?? []) as Artist[]);
      setAlbums((albumsRes.data ?? []) as Album[]);

      const creditsRes = await getSongArtistCreditsForSongs(fetchedSongs.map((s) => s.id));
      if (cancelled) return;
      if (creditsRes.error) setError(creditsRes.error.message);
      const creditRows = (creditsRes.data ?? []) as SongArtistCredit[];
      const creditMap: Record<string, SongArtistCredit[]> = {};
      for (const c of creditRows) {
        const sid = c.song_id;
        if (!sid) continue;
        (creditMap[sid] ??= []).push(c);
      }
      setSongCredits(creditMap);

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

  const albumTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of albums) map.set(a.id, a.title);
    return map;
  }, [albums]);

  const songCoverById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of songs) {
      const url = publicAssetUrl("covers", s.cover_path);
      if (url) map.set(s.id, url);
    }
    return map;
  }, [songs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter((s) => {
      const creditedNames = formatCreditNames(songCredits[s.id] ?? []);
      const artistName = creditedNames ?? (s.primary_artist_id ? artistNameById.get(s.primary_artist_id) ?? "" : "");
      const albumTitle = s.album_id ? albumTitleById.get(s.album_id) ?? "" : "";
      return (
        s.title.toLowerCase().includes(q) ||
        artistName.toLowerCase().includes(q) ||
        albumTitle.toLowerCase().includes(q)
      );
    });
  }, [albumTitleById, artistNameById, query, songs, songCredits]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Songs"
        subtitle="Browse your imported tracks."
        right={
          <div className="flex w-full items-center gap-2 md:w-[520px]">
            <SearchBar
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search songs..."
            />
            <ViewToggle value={view} onChange={setView} />
          </div>
        }
      />

      {loading ? (
        <div className="rounded-2xl border bg-panel p-6 text-sm text-muted surface shadow-soft">
          Loading...
        </div>
      ) : error ? (
        <ErrorState title="Failed to load songs" description={error} />
      ) : !songs.length ? (
        <EmptyState
          title="No songs found"
          description="Import songs in Admin -> Songs -> Import iTunes, or add songs manually."
        />
      ) : !filtered.length ? (
        <EmptyState title="No matches" description="Try a different query." />
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {filtered.map((song) => (
            <MediaCard
              key={song.id}
              title={song.title}
              subtitle={
                formatCreditNames(songCredits[song.id] ?? []) ??
                (song.primary_artist_id
                  ? artistNameById.get(song.primary_artist_id) ?? "—"
                  : "—")
              }
              variant="artwork"
              to={`/songs/${song.id}`}
              imageUrl={songCoverById.get(song.id)}
            />
          ))}
        </div>
      ) : (
        <div className="divide-y rounded-2xl border bg-panel surface shadow-soft">
          {filtered.map((song) => {
            const artistName =
              formatCreditNames(songCredits[song.id] ?? []) ??
              (song.primary_artist_id
                ? artistNameById.get(song.primary_artist_id) ?? "—"
                : "—");
            const albumTitle = song.album_id
              ? albumTitleById.get(song.album_id) ?? ""
              : "";
            const cover = songCoverById.get(song.id);
            return (
              <div key={song.id} className="flex items-center gap-3 px-4 py-3">
                {cover ? (
                  <img
                    src={cover}
                    alt=""
                    className="h-10 w-10 rounded-xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-panel2" />
                )}

                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-text">
                    {song.title}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {artistName}
                    {albumTitle ? ` · ${albumTitle}` : ""}
                  </div>
                </div>

                <Link
                  to={`/songs/${song.id}`}
                  className="ml-auto text-xs font-semibold text-[color:var(--accent)]"
                >
                  Open
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
