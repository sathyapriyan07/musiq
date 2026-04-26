import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
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
        const coverUrl = s.album_id ? publicAssetUrl("covers", songAlbums[s.album_id]?.cover_path) ?? undefined : undefined;
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
            <div className="rounded-2xl border bg-panel p-5">
              <div className="text-lg font-bold text-text">About</div>
              <div className="mt-2 text-sm text-muted">
                {artist.bio ? artist.bio : "No biography yet."}
              </div>
            </div>

            {albums.length ? (
              <section className="space-y-3">
                <div className="text-sm font-semibold text-text">Albums</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{albumCards}</div>
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
