import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { MediaCard } from "../components/MediaCard";
import { EmptyState, ErrorState } from "../components/States";
import { publicAssetUrl } from "../lib/media";
import {
  getAlbum,
  getAlbumsByArtist,
  getArtist,
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
  const [songAlbums, setSongAlbums] = useState<Record<string, Album>>({});
  const albumsScrollerRef = useRef<HTMLDivElement | null>(null);
  const [albumsCanScrollLeft, setAlbumsCanScrollLeft] = useState(false);
  const [albumsCanScrollRight, setAlbumsCanScrollRight] = useState(false);
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

      const [albumsRes, songsRes] = await Promise.all([
        getAlbumsByArtist(row.id),
        getSongCreditsByArtist(row.id, 24),
      ]);
      if (cancelled) return;
      if (albumsRes.error) setError(albumsRes.error.message);
      if (songsRes.error) setError(songsRes.error.message);
      const fetchedAlbums = (albumsRes.data ?? []) as Album[];
      setAlbums(fetchedAlbums);
      const credits = (songsRes.data ?? []) as ArtistSongCredit[];
      setSongCredits(credits);

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

  useEffect(() => {
    function update() {
      const el = albumsScrollerRef.current;
      if (!el) {
        setAlbumsCanScrollLeft(false);
        setAlbumsCanScrollRight(false);
        return;
      }
      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      setAlbumsCanScrollLeft(el.scrollLeft > 0);
      setAlbumsCanScrollRight(el.scrollLeft < maxScrollLeft - 1);
    }

    update();
    window.addEventListener("resize", update);
    const el = albumsScrollerRef.current;
    el?.addEventListener("scroll", update, { passive: true });

    return () => {
      window.removeEventListener("resize", update);
      el?.removeEventListener("scroll", update);
    };
  }, [albums.length]);

  function scrollAlbums(direction: -1 | 1) {
    const el = albumsScrollerRef.current;
    if (!el) return;
    const delta = Math.max(240, Math.floor(el.clientWidth * 0.85));
    el.scrollBy({ left: direction * delta, behavior: "smooth" });
  }

  const albumCards = useMemo(() => {
    return albums.map((a) => (
      <Link key={a.id} to={`/albums/${a.id}`} className="block w-52 shrink-0 snap-start md:w-56">
        <div className="group">
          <div className="aspect-square overflow-hidden rounded-2xl bg-panel2 shadow-soft">
            {a.cover_path ? (
              <img
                src={publicAssetUrl("covers", a.cover_path) ?? undefined}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted">
                <span className="text-xs uppercase tracking-wider">No Image</span>
              </div>
            )}
          </div>

          <div className="mt-3 space-y-1 px-1">
            <div className="line-clamp-2 text-sm font-semibold leading-snug text-text">{a.title}</div>
            {(() => {
              if (!a.release_date) return null;
              const d = new Date(a.release_date);
              if (!Number.isFinite(d.getTime())) return null;
              return <div className="text-xs text-muted">{d.getFullYear()}</div>;
            })()}
          </div>
        </div>
      </Link>
    ));
  }, [albums]);

  const songCards = useMemo(() => {
    function creditSong(credit: ArtistSongCredit) {
      if (!credit.song) return null;
      return Array.isArray(credit.song) ? credit.song[0] ?? null : credit.song;
    }

    return songCredits
      .map((c) => {
        const s = creditSong(c);
        if (!s) return null;
        const role = c.role?.trim() || (s.primary_artist_id === artist?.id ? "Primary" : "");
        const subtitle = role ? `Song · ${role}` : "Song";
        const coverUrl = publicAssetUrl("covers", s.cover_path) ?? undefined;
        return <MediaCard key={`${s.id}:${c.sort_order ?? 0}`} title={s.title} subtitle={subtitle} to={`/songs/${s.id}`} imageUrl={coverUrl} />;
      })
      .filter(Boolean);
  }, [artist?.id, songCredits, songAlbums]);

  const avatarUrl = publicAssetUrl("avatars", artist?.image_path);

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
                <div className="flex items-center justify-between gap-3">
                  <div className="text-2xl font-bold text-text">Albums</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => scrollAlbums(-1)}
                      disabled={!albumsCanScrollLeft}
                      aria-label="Scroll albums left"
                      className="surface flex h-9 w-9 items-center justify-center rounded-full border text-text shadow-soft transition hover:bg-panel2 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollAlbums(1)}
                      disabled={!albumsCanScrollRight}
                      aria-label="Scroll albums right"
                      className="surface flex h-9 w-9 items-center justify-center rounded-full border text-text shadow-soft transition hover:bg-panel2 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div
                  ref={albumsScrollerRef}
                  className="no-scrollbar -mx-2 flex snap-x snap-mandatory gap-6 overflow-x-auto px-2 pb-2"
                >
                  {albumCards}
                </div>
              </section>
            ) : null}

            {songCredits.length ? (
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
