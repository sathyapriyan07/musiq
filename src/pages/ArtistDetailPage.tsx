import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { MediaCard } from "../components/MediaCard";
import { EmptyState, ErrorState } from "../components/States";
import { publicAssetUrl } from "../lib/media";
import {
  getAlbum,
  getAlbumsByArtist,
  getArtist,
  getRelatedArtists,
  getSongCreditsByArtist,
  type Album,
  type Artist,
  type ArtistSongCredit,
} from "../lib/publicQueries";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export function ArtistDetailPage() {
  const { artistId } = useParams();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [songCredits, setSongCredits] = useState<ArtistSongCredit[]>([]);
  const [showAllSongs, setShowAllSongs] = useState(false);
  const [albumViewMode, setAlbumViewMode] = useState<"grid" | "list">("grid");
  const [songViewMode, setSongViewMode] = useState<"grid" | "list">("grid");
  const [relatedArtists, setRelatedArtists] = useState<{ id: string; name: string; image_path: string | null }[]>([]);
  const [visibleRelatedArtists, setVisibleRelatedArtists] = useState(4);
  const [songAlbums, setSongAlbums] = useState<Record<string, Album>>({});
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
        setSongCredits([]);
        setLoading(false);
        return;
      }

      const [albumsRes, songsRes, relatedRes] = await Promise.all([
        getAlbumsByArtist(row.id),
        getSongCreditsByArtist(row.id),
        getRelatedArtists(row.id),
      ]);
      if (cancelled) return;
      if (albumsRes.error) setError(albumsRes.error.message);
      if (songsRes.error) setError(songsRes.error.message);
      if (relatedRes.error) setError(relatedRes.error.message);
      const fetchedAlbums = (albumsRes.data ?? []) as Album[];
      setAlbums(fetchedAlbums);
      const credits = (songsRes.data ?? []) as ArtistSongCredit[];
      setSongCredits(credits);
      setRelatedArtists((relatedRes.data ?? []) as { id: string; name: string; image_path: string | null }[]);

      const albumMap: Record<string, Album> = {};
      fetchedAlbums.forEach((a) => { albumMap[a.id] = a; });

      const songAlbumIds = [...new Set(
        credits
          .map((c) => (Array.isArray(c.song) ? c.song[0] : c.song)?.album_id)
          .filter((id): id is string => !!id && !(id in albumMap))
      )];
      if (songAlbumIds.length) {
        const results = await Promise.all(songAlbumIds.map((id) => getAlbum(id)));
        results.forEach((r) => { if (r.data) albumMap[(r.data as Album).id] = r.data as Album; });
      }
      setSongAlbums(albumMap);
      setLoading(false);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [artistId]);

  const albumCards = useMemo(() => {
    return albums.map((a: Album) => {
      const coverUrl = a.cover_path ? publicAssetUrl("covers", a.cover_path) ?? undefined : undefined;
      return (
        <MediaCard
          key={a.id}
          title={a.title}
          subtitle="Album"
          aspect="square"
          variant="artwork"
          to={`/albums/${a.id}`}
          imageUrl={coverUrl}
        />
      );
    });
  }, [albums]);

  const displayedSongCredits = useMemo(() => {
    return showAllSongs ? songCredits : songCredits.slice(0, 16);
  }, [songCredits, showAllSongs]);

  const songCards = useMemo(() => {
    function creditSong(credit: ArtistSongCredit) {
      if (!credit.song) return null;
      return Array.isArray(credit.song) ? credit.song[0] ?? null : credit.song;
    }

    return displayedSongCredits
      .map((c) => {
        const s = creditSong(c);
        if (!s) return null;
        const role = c.role?.trim() || (s.primary_artist_id === artist?.id ? "Primary" : "");
        const subtitle = role ? `Song · ${role}` : "Song";
        const coverUrl = s.cover_path ? publicAssetUrl("covers", s.cover_path) ?? undefined : undefined;
        return (
          <MediaCard
            key={`${s.id}:${c.sort_order ?? 0}`}
            title={s.title}
            subtitle={subtitle}
            variant="artwork"
            to={`/songs/${s.id}`}
            imageUrl={coverUrl}
          />
        );
      })
      .filter(Boolean);
  }, [artist?.id, displayedSongCredits, songAlbums]);

  const avatarUrl = publicAssetUrl("avatars", artist?.image_path) ?? undefined;

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
          <div className="flex flex-col items-center text-center">
            <div className="w-44 md:w-52">
              <div className="aspect-square overflow-hidden rounded-full bg-panel2 shadow-soft">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted">
                    <span className="text-xs uppercase tracking-wider">No Image</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <div className="text-lg font-bold text-text">{artist.name}</div>
              <div className="text-sm text-muted">Artist</div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="p-5">
              <div className="text-lg font-bold text-text">About</div>
              <div className="mt-2 text-sm text-muted">
                {artist.bio ? artist.bio : "No biography yet."}
              </div>
            </div>

            {albums.length ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-text">Albums</div>
                  <div className="flex gap-2">
                    <button onClick={() => setAlbumViewMode("grid")} className={`rounded-lg p-2 ${albumViewMode === "grid" ? "bg-panel2" : "hover:bg-panel2"}`} title="Grid view">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                    </button>
                    <button onClick={() => setAlbumViewMode("list")} className={`rounded-lg p-2 ${albumViewMode === "list" ? "bg-panel2" : "hover:bg-panel2"}`} title="List view">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="17" width="18" height="4" rx="1"/></svg>
                    </button>
                  </div>
                </div>
                {albumViewMode === "grid" ? (
                  <div className="grid grid-cols-4 gap-3">{albumCards}</div>
                ) : (
                  <div className="space-y-1">
                    {albums.map((a) => {
                      const coverUrl = a.cover_path ? publicAssetUrl("covers", a.cover_path) ?? undefined : undefined;
                      return (
                        <Link key={a.id} to={`/albums/${a.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-panel2">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-panel2">
                            {coverUrl ? <img src={coverUrl} alt="" className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-text">{a.title}</div>
                            {a.release_date ? <div className="truncate text-xs text-muted">{a.release_date}</div> : null}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : null}

            {songCredits.length ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-text">Songs</div>
                  <div className="flex gap-2">
                    <button onClick={() => setSongViewMode("grid")} className={`rounded-lg p-2 ${songViewMode === "grid" ? "bg-panel2" : "hover:bg-panel2"}`} title="Grid view">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                    </button>
                    <button onClick={() => setSongViewMode("list")} className={`rounded-lg p-2 ${songViewMode === "list" ? "bg-panel2" : "hover:bg-panel2"}`} title="List view">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="17" width="18" height="4" rx="1"/></svg>
                    </button>
                  </div>
                </div>
                {songViewMode === "grid" ? (
                  <div className="grid grid-cols-4 gap-3">{songCards}</div>
                ) : (
                  <div className="space-y-1">
                    {displayedSongCredits.map((c) => {
                      const s = (Array.isArray(c.song) ? c.song[0] : c.song) ?? null;
                      if (!s) return null;
                      const role = c.role?.trim() || (s.primary_artist_id === artist?.id ? "Primary" : "");
                      const songCoverUrl = publicAssetUrl("covers", s.cover_path);
                      return (
                        <Link key={`${s.id}:${c.sort_order ?? 0}`} to={`/songs/${s.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-panel2">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-panel2">
                            {songCoverUrl ? <img src={songCoverUrl} alt="" className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-text">{s.title}</div>
                            {role ? <div className="truncate text-xs text-muted">{role}</div> : null}
                          </div>
                          {s.duration_seconds ? <div className="text-xs text-muted">{Math.floor(s.duration_seconds / 60)}:{(s.duration_seconds % 60).toString().padStart(2, "0")}</div> : null}
                        </Link>
                      );
                    })}
                  </div>
                )}
                {!showAllSongs && songCredits.length > 16 && (
                  <button onClick={() => setShowAllSongs(true)} className="text-sm font-medium text-accent hover:underline">
                    View More
                  </button>
                )}
              </section>
            ) : !albums.length ? (
              <EmptyState
                title="No content for this artist yet"
                description="Import songs for this artist, or add albums/songs in Admin."
              />
            ) : null}

            {relatedArtists.length ? (
              <section className="space-y-3">
                <div className="text-sm font-semibold text-text">Related Artists</div>
                <div className="grid grid-cols-4 gap-3">
                  {relatedArtists.slice(0, visibleRelatedArtists).map((a) => {
                    const imageUrl = a.image_path ? publicAssetUrl("avatars", a.image_path) ?? undefined : undefined;
                    return (
                      <MediaCard
                        key={a.id}
                        title={a.name}
                        subtitle="Artist"
                        shape="round"
                        variant="artwork"
                        to={`/artists/${a.id}`}
                        imageUrl={imageUrl}
                      />
                    );
                  })}
                </div>
                {visibleRelatedArtists < relatedArtists.length && (
                  <button
                    onClick={() => setVisibleRelatedArtists(prev => prev + 4)}
                    className="text-sm font-medium text-accent hover:underline"
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
