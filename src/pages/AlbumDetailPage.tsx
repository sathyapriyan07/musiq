import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState } from "../components/States";
import { publicAssetUrl, formatDuration } from "../lib/media";
import {
  getAlbum,
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

      const [artistRes, songsRes, channelsRes] = await Promise.all([
        row.artist_id ? getArtist(row.artist_id) : Promise.resolve({ data: null, error: null }),
        getSongsByAlbum(row.id),
        getAlbumChannels(row.id),
      ]);
      if (cancelled) return;
      if (artistRes.error) setError(artistRes.error.message);
      if (songsRes.error) setError(songsRes.error.message);
      if (channelsRes.error) setError(channelsRes.error.message);
      const fetchedArtist = (artistRes.data ?? null) as Artist | null;
      const fetchedSongs = (songsRes.data ?? []) as Song[];
      setChannels((channelsRes.data ?? []) as AlbumChannelCredit[]);
      setArtist(fetchedArtist);
      setSongs(fetchedSongs);

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
      const duration = formatDuration(s.duration_seconds);
      const songArtist = s.primary_artist_id ? songArtists[s.primary_artist_id] : null;
      const creditedNames = formatCreditNames(songCredits[s.id] ?? []);
      const displayArtist = creditedNames ?? songArtist?.name ?? null;
      const songCoverUrl = publicAssetUrl("covers", s.cover_path);
      return (
        <Link
          key={s.id}
          to={`/songs/${s.id}`}
          className="flex items-center gap-3 px-4 py-3 hover:bg-panel2 overflow-hidden"
        >
          <div className="w-6 shrink-0 text-right text-xs text-muted">{s.track_number ?? "—"}</div>
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-panel2">
            {songCoverUrl ? <img src={songCoverUrl} alt="" className="h-full w-full object-contain" loading="lazy" /> : null}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="truncate text-sm font-semibold text-text">{s.title}</div>
            {displayArtist ? <div className="truncate text-xs text-muted">{displayArtist}</div> : null}
          </div>
          {duration ? <div className="ml-auto shrink-0 text-xs text-muted">{duration}</div> : null}
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
              <div className="w-full max-w-2xl overflow-x-auto">
                <div className="flex flex-col gap-1">{trackRows}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
