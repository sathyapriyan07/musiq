import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState } from "../components/States";
import { MediaCard } from "../components/MediaCard";
import { publicAssetUrl } from "../lib/media";
import {
  getAlbum,
  getAlbumsByArtist,
  getArtist,
  getAlbumChannels,
  getSongArtistCreditsForSongs,
  getSongsByAlbum,
  type Album,
  type AlbumChannelCredit,
  type Artist,
  type Song,
  type SongArtistCredit,
} from "../lib/publicQueries";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { formatCreditNames } from "../lib/credits";

function creditChannel(credit: AlbumChannelCredit) {
  if (!credit.channel) return null;
  return Array.isArray(credit.channel) ? credit.channel[0] ?? null : credit.channel;
}

export function AlbumDetailPage() {
  const { albumId } = useParams();
  const [album, setAlbum] = useState<Album | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [artistAlbums, setArtistAlbums] = useState<Album[]>([]);
  const [visibleArtistAlbums, setVisibleArtistAlbums] = useState(4);
  const [channels, setChannels] = useState<AlbumChannelCredit[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [songArtists, setSongArtists] = useState<Record<string, Artist>>({});
  const [songCredits, setSongCredits] = useState<Record<string, SongArtistCredit[]>>({});
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

      const [artistRes, songsRes, channelsRes, artistAlbumsRes] = await Promise.all([
        row.artist_id ? getArtist(row.artist_id) : Promise.resolve({ data: null, error: null }),
        getSongsByAlbum(row.id),
        getAlbumChannels(row.id),
        row.artist_id ? getAlbumsByArtist(row.artist_id) : Promise.resolve({ data: null, error: null }),
      ]);
      if (cancelled) return;
      if (artistRes.error) setError(artistRes.error.message);
      if (songsRes.error) setError(songsRes.error.message);
      if (channelsRes.error) setError(channelsRes.error.message);
      if (artistAlbumsRes.error) setError(artistAlbumsRes.error.message);
      const fetchedArtist = (artistRes.data ?? null) as Artist | null;
      const fetchedSongs = (songsRes.data ?? []) as Song[];
      setChannels((channelsRes.data ?? []) as AlbumChannelCredit[]);
      setArtist(fetchedArtist);
      setSongs(fetchedSongs);
      setArtistAlbums(
        ((artistAlbumsRes.data ?? []) as Album[]).filter((a) => a.id !== row.id),
      );

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

      const artistMap: Record<string, Artist> = {};
      if (fetchedArtist) artistMap[fetchedArtist.id] = fetchedArtist;
      const extraIds = [...new Set(
        fetchedSongs.map((s) => s.primary_artist_id).filter((id): id is string => !!id && !(id in artistMap))
      )];
      if (extraIds.length) {
        const results = await Promise.all(extraIds.map((id) => getArtist(id)));
        results.forEach((r) => { if (r.data) artistMap[(r.data as Artist).id] = r.data as Artist; });
      }
      setSongArtists(artistMap);
      setLoading(false);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [albumId]);

  const coverUrl = publicAssetUrl("covers", album?.cover_path);

  const trackRows = useMemo(() => {
    return songs.map((s) => {
      const songArtist = s.primary_artist_id ? songArtists[s.primary_artist_id] : null;
      const creditedNames = formatCreditNames(songCredits[s.id] ?? []);
      const displayArtist = creditedNames ?? songArtist?.name ?? null;
      const songCoverUrl = publicAssetUrl("covers", s.cover_path);
      return (
        <Link
          key={s.id}
          to={`/songs/${s.id}`}
          className="group block"
        >
          <div className="aspect-square overflow-hidden rounded-xl bg-panel2">
            {songCoverUrl ? (
              <img src={songCoverUrl} alt="" className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]" loading="lazy" />
            ) : null}
          </div>
          <div className="mt-2">
            <div className="truncate text-sm font-semibold text-text">{s.title}</div>
            {displayArtist ? <div className="truncate text-xs text-muted">{displayArtist}</div> : null}
          </div>
        </Link>
      );
    });
  }, [songs, songArtists, songCredits]);

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
        <div className="p-6 text-sm text-muted">Loading…</div>
      ) : error ? (
        <ErrorState title="Failed to load album" description={error} />
      ) : !album ? (
        <EmptyState title="Album not found" description="It may have been deleted or unpublished." />
      ) : (
        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          <div className="flex flex-col items-center text-center">
            <div className="w-40 md:w-52">
              <div className="aspect-square overflow-hidden rounded-2xl bg-panel2">
                {coverUrl ? (
                  <img src={coverUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted">
                    <span className="text-xs uppercase tracking-wider">No Image</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <div className="text-lg font-bold text-text">{album.title}</div>
              {artist ? (
                <Link to={`/artists/${artist.id}`} className="mx-auto mt-2 block w-12 overflow-hidden rounded-full bg-panel2">
                  {artist.image_path ? (
                    <img src={publicAssetUrl("avatars", artist.image_path) ?? undefined} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center text-muted">
                      <span className="text-xs uppercase tracking-wider">No Image</span>
                    </div>
                  )}
                </Link>
              ) : null}
              <div className="text-sm text-muted">{artist?.name ?? "—"}</div>
              {channels.length ? (
                <div className="pt-2">
                  <div className="flex flex-wrap justify-center gap-2">
                    {channels.map((c) => {
                      const ch = creditChannel(c);
                      const name = ch?.name ?? c.channel_id;
                      const img = ch?.logo_path ? publicAssetUrl("logos", ch.logo_path) : null;
                      return (
                        <div
                          key={`${c.channel_id}:${c.sort_order ?? 0}`}
                          className="flex items-center gap-2 rounded-full bg-panel2 px-3 py-2"
                        >
                          <div className="h-6 w-6 overflow-hidden rounded-full bg-panel">
                            {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="text-xs font-semibold text-text">{name}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {album.release_date ? (
                <div className="pt-1 text-xs text-muted">{album.release_date}</div>
              ) : null}
            </div>
          </div>

           <div className="flex flex-col items-center">
            {!songs.length ? (
              <EmptyState title="No tracks yet" description="Import songs for this album, or add them in Admin." />
            ) : (
              <div className="w-full max-w-4xl">
                <div className="grid grid-cols-4 gap-3">{trackRows}</div>
              </div>
            )}

            {artistAlbums.length ? (
              <section className="mt-6 space-y-3 w-full max-w-4xl">
                <div className="text-sm font-semibold text-text">More from {artist?.name ?? "Artist"}</div>
                <div className="grid grid-cols-4 gap-3">
                  {artistAlbums.slice(0, visibleArtistAlbums).map((a) => {
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
                  })}
                </div>
                {visibleArtistAlbums < artistAlbums.length && (
                  <button
                    onClick={() => setVisibleArtistAlbums(prev => prev + 4)}
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
