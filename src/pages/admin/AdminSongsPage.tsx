import { useEffect, useMemo, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminEmpty,
  AdminModal,
  DataTable,
} from "../../components/admin/AdminComponents";
import { ErrorState } from "../../components/States";
import { searchItunesTracks, type ItunesTrack } from "../../admin/itunes";
import { searchTracks, type DeezerTrack } from "../../services/deezer";
import { toItunesHiResArtwork, uploadImageFromUrl } from "../../admin/storageImport";
import { publicAssetUrl } from "../../lib/media";
import {
  ensureAlbum,
  ensureArtistByName,
  findSongByDeezerId,
  ensureArtistByDeezer,
  ensureAlbumByDeezer,
  listAlbums,
  listArtists,
  listChannels,
  listSongs,
  type AlbumRow,
  type ArtistRow,
  type ChannelRow,
  type SongRow,
} from "../../admin/supabaseAdmin";
import { supabase } from "../../lib/supabaseClient";

export function AdminSongsPage() {
  const [rows, setRows] = useState<SongRow[]>([]);
  const [artists, setArtists] = useState<Pick<ArtistRow, "id" | "name">[]>([]);
  const [albums, setAlbums] = useState<Pick<AlbumRow, "id" | "title">[]>([]);
  const [channels, setChannels] = useState<Pick<ChannelRow, "id" | "name">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SongRow | null>(null);

  const [title, setTitle] = useState("");
  const [primaryArtistId, setPrimaryArtistId] = useState<string>("");
  const [primaryArtistRole, setPrimaryArtistRole] = useState<string>("");
  const [albumId, setAlbumId] = useState<string>("");
  const [trackNumber, setTrackNumber] = useState<string>("");
  const [durationSeconds, setDurationSeconds] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [published, setPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setCoverFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setCoverPreview(null);
    }
  }

  type SongArtistFormRow = {
    key: string;
    artistId: string;
    role: string;
  };

  const [songArtists, setSongArtists] = useState<SongArtistFormRow[]>([]);
  const [songArtistsLoading, setSongArtistsLoading] = useState(false);

  type SongChannelFormRow = {
    key: string;
    channelId: string;
  };

  const [songChannels, setSongChannels] = useState<SongChannelFormRow[]>([]);
  const [songChannelsLoading, setSongChannelsLoading] = useState(false);

  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [appleMusicUrl, setAppleMusicUrl] = useState("");
  const [youtubeMusicUrl, setYoutubeMusicUrl] = useState("");
  const [jioSaavnUrl, setJioSaavnUrl] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [importSource, setImportSource] = useState<"itunes" | "deezer">("itunes");
  const [importTerm, setImportTerm] = useState("");
  const [importResults, setImportResults] = useState<ItunesTrack[]>([]);
  const [deezerResults, setDeezerResults] = useState<DeezerTrack[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importingTrackId, setImportingTrackId] = useState<number | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);

    const [songsRes, artistsRes, albumsRes, channelsRes] = await Promise.all([
      listSongs(),
      listArtists(),
      listAlbums(),
      listChannels(),
    ]);

    if (songsRes.error) setError(songsRes.error.message);
    setRows((songsRes.data ?? []) as SongRow[]);

    if (artistsRes.error) {
      setError(artistsRes.error.message);
      setArtists([]);
    } else {
      setArtists(((artistsRes.data ?? []) as ArtistRow[]).map((a) => ({ id: a.id, name: a.name })));
    }

    if (albumsRes.error) {
      setError(albumsRes.error.message);
      setAlbums([]);
    } else {
      setAlbums(((albumsRes.data ?? []) as AlbumRow[]).map((a) => ({ id: a.id, title: a.title })));
    }

    if (channelsRes.error) {
      setError(channelsRes.error.message);
      setChannels([]);
    } else {
      setChannels(((channelsRes.data ?? []) as ChannelRow[]).map((c) => ({ id: c.id, name: c.name })));
    }

    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  function newKey() {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function normalizeAdditionalSongArtists(input: SongArtistFormRow[], primary: string | null) {
    const cleaned = input
      .map((r) => ({
        ...r,
        artistId: r.artistId.trim(),
        role: r.role.trim(),
        key: r.key || newKey(),
      }))
      .filter((r) => !!r.artistId);

    const withoutPrimary = primary ? cleaned.filter((r) => r.artistId !== primary) : cleaned;

    const deduped: SongArtistFormRow[] = [];
    const seen = new Set<string>();
    for (const r of withoutPrimary) {
      if (seen.has(r.artistId)) continue;
      seen.add(r.artistId);
      deduped.push(r);
    }

    return deduped;
  }

  async function loadSongArtists(songId: string, fallbackPrimary: string | null) {
    setSongArtistsLoading(true);
    setError(null);
    const res = await supabase
      .from("song_artists")
      .select("artist_id, role, sort_order")
      .eq("song_id", songId)
      .order("sort_order", { ascending: true });

    if (res.error) {
      setSongArtists([]);
      setSongArtistsLoading(false);
      setError(res.error.message);
      return;
    }

    const data = (res.data ?? []) as {
      artist_id: string;
      role: string | null;
      sort_order: number | null;
    }[];

    if (!data.length) {
      setPrimaryArtistRole("");
      setSongArtists([]);
      setSongArtistsLoading(false);
      return;
    }

    if (fallbackPrimary) {
      const primaryRow = data.find((r) => r.artist_id === fallbackPrimary) ?? null;
      setPrimaryArtistRole(primaryRow?.role ?? "");
    } else {
      setPrimaryArtistRole("");
    }

    setSongArtists(
      data
        .filter((r) => (fallbackPrimary ? r.artist_id !== fallbackPrimary : true))
        .map((r) => ({
          key: newKey(),
          artistId: r.artist_id,
          role: r.role ?? "",
        })),
    );
    setSongArtistsLoading(false);
  }

  async function syncSongArtists(
    songId: string,
    primary: string | null,
    primaryRole: string | null,
    additionalToSave: SongArtistFormRow[],
  ) {
    const normalizedAdditional = normalizeAdditionalSongArtists(additionalToSave, primary);

    const delRes = await supabase.from("song_artists").delete().eq("song_id", songId);
    if (delRes.error) throw delRes.error;

    const toInsert: { song_id: string; artist_id: string; role: string | null; sort_order: number }[] = [];
    if (primary) {
      toInsert.push({
        song_id: songId,
        artist_id: primary,
        role: primaryRole?.trim() ? primaryRole.trim() : null,
        sort_order: 0,
      });
    }
    for (let i = 0; i < normalizedAdditional.length; i++) {
      const r = normalizedAdditional[i];
      toInsert.push({
        song_id: songId,
        artist_id: r.artistId,
        role: r.role || null,
        sort_order: (primary ? 1 : 0) + i,
      });
    }

    if (toInsert.length) {
      const insertRes = await supabase.from("song_artists").insert(toInsert);
      if (insertRes.error) throw insertRes.error;
    }
  }

  function normalizeSongChannels(input: SongChannelFormRow[]) {
    const cleaned = input
      .map((r) => ({ ...r, channelId: r.channelId.trim(), key: r.key || newKey() }))
      .filter((r) => !!r.channelId);

    const deduped: SongChannelFormRow[] = [];
    const seen = new Set<string>();
    for (const r of cleaned) {
      if (seen.has(r.channelId)) continue;
      seen.add(r.channelId);
      deduped.push(r);
    }
    return deduped;
  }

  async function loadSongChannels(songId: string) {
    setSongChannelsLoading(true);
    setError(null);
    const res = await supabase
      .from("song_channels")
      .select("channel_id, sort_order")
      .eq("song_id", songId)
      .order("sort_order", { ascending: true });

    if (res.error) {
      setSongChannels([]);
      setSongChannelsLoading(false);
      setError(res.error.message);
      return;
    }

    const data = (res.data ?? []) as { channel_id: string; sort_order: number | null }[];
    setSongChannels(data.map((r) => ({ key: newKey(), channelId: r.channel_id })));
    setSongChannelsLoading(false);
  }

  async function syncSongChannels(songId: string, toSave: SongChannelFormRow[]) {
    const normalized = normalizeSongChannels(toSave);

    const delRes = await supabase.from("song_channels").delete().eq("song_id", songId);
    if (delRes.error) throw delRes.error;

    const toInsert: { song_id: string; channel_id: string; sort_order: number }[] = [];
    for (let i = 0; i < normalized.length; i++) {
      toInsert.push({ song_id: songId, channel_id: normalized[i].channelId, sort_order: i });
    }

    if (toInsert.length) {
      const insertRes = await supabase.from("song_channels").insert(toInsert);
      if (insertRes.error) throw insertRes.error;
    }
  }

  async function loadStreamingLinks(songId: string) {
    setError(null);
    const res = await supabase
      .from("song_links")
      .select("category, platform, url")
      .eq("song_id", songId);

    if (res.error) {
      setError(res.error.message);
      return;
    }

    const rows = (res.data ?? []) as { category: string; platform: string; url: string }[];
    const official = rows.filter((r) => r.category === "official");

    const byPlatform = new Map<string, string>();
    for (const r of official) byPlatform.set(r.platform, r.url);

    setSpotifyUrl(byPlatform.get("Spotify") ?? "");
    setAppleMusicUrl(byPlatform.get("Apple Music") ?? "");
    setYoutubeMusicUrl(byPlatform.get("YouTube Music") ?? "");
    setJioSaavnUrl(byPlatform.get("JioSaavn") ?? "");
  }

  async function syncStreamingLinks(songId: string) {
    const platforms = ["Spotify", "Apple Music", "YouTube Music", "JioSaavn"];

    const delRes = await supabase
      .from("song_links")
      .delete()
      .eq("song_id", songId)
      .eq("category", "official")
      .in("platform", platforms);
    if (delRes.error) throw delRes.error;

    const toInsert: { song_id: string; category: string; platform: string; url: string }[] = [];
    const items: { platform: string; url: string }[] = [
      { platform: "Spotify", url: spotifyUrl.trim() },
      { platform: "Apple Music", url: appleMusicUrl.trim() },
      { platform: "YouTube Music", url: youtubeMusicUrl.trim() },
      { platform: "JioSaavn", url: jioSaavnUrl.trim() },
    ];

    for (const it of items) {
      if (!it.url) continue;
      toInsert.push({ song_id: songId, category: "official", platform: it.platform, url: it.url });
    }

    if (toInsert.length) {
      const insRes = await supabase.from("song_links").insert(toInsert);
      if (insRes.error) throw insRes.error;
    }
  }

  function openCreate() {
    setEditing(null);
    setTitle("");
    setPrimaryArtistId("");
    setPrimaryArtistRole("");
    setAlbumId("");
    setTrackNumber("");
    setDurationSeconds("");
    setPreviewUrl("");
    setYoutubeUrl("");
    setSpotifyUrl("");
    setAppleMusicUrl("");
    setYoutubeMusicUrl("");
    setJioSaavnUrl("");
    setPublished(true);
    setSongArtists([]);
    setSongChannels([]);
    setCoverFile(null);
    setCoverPreview(null);
    setModalOpen(true);
  }

  function openEdit(row: SongRow) {
    setEditing(row);
    setTitle(row.title);
    setPrimaryArtistId(row.primary_artist_id ?? "");
    setPrimaryArtistRole("");
    setAlbumId(row.album_id ?? "");
    setTrackNumber(row.track_number ? String(row.track_number) : "");
    setDurationSeconds(row.duration_seconds ? String(row.duration_seconds) : "");
    setPreviewUrl(row.preview_url ?? "");
    setYoutubeUrl(row.youtube_url ?? "");
    setSpotifyUrl("");
    setAppleMusicUrl("");
    setYoutubeMusicUrl("");
    setJioSaavnUrl("");
    setPublished(row.is_published);
    setSongArtists([]);
    setSongChannels([]);
    setCoverFile(null);
    setCoverPreview(row.cover_path ? publicAssetUrl("covers", row.cover_path) : null);
    setModalOpen(true);
    void loadSongArtists(row.id, row.primary_artist_id ?? null);
    void loadSongChannels(row.id);
    void loadStreamingLinks(row.id);
  }

  async function save() {
    setSubmitting(true);
    setError(null);

    let coverPath: string | null = editing?.cover_path ?? null;

    if (coverFile) {
      const fileExt = coverFile.name.split('.').pop() || 'jpg';
      const pathWithoutExt = `songs/${editing?.id || Date.now()}`;
      const path = `${pathWithoutExt}.${fileExt}`;
      
      const uploadRes = await supabase.storage.from("covers").upload(path, coverFile, {
        contentType: coverFile.type,
        upsert: true,
      });
      
      if (uploadRes.error) {
        setSubmitting(false);
        setError(uploadRes.error.message);
        return;
      }
      coverPath = path;
    }

    const payload = {
      title: title.trim(),
      primary_artist_id: primaryArtistId || null,
      album_id: albumId || null,
      track_number: trackNumber ? Number(trackNumber) : null,
      duration_seconds: durationSeconds ? Number(durationSeconds) : null,
      preview_url: previewUrl.trim() || null,
      youtube_url: youtubeUrl.trim() || null,
      cover_path: coverPath,
      is_published: published,
    };

    if (!payload.title) {
      setSubmitting(false);
      setError("Title is required.");
      return;
    }

    const res = editing
      ? await supabase.from("songs").update(payload).eq("id", editing.id).select("id").single()
      : await supabase.from("songs").insert(payload).select("id").single();

    if (res.error) {
      setSubmitting(false);
      setError(res.error.message);
      return;
    }

    const songId = (res.data as { id: string } | null)?.id ?? editing?.id ?? null;
    if (songId) {
      try {
        await syncSongArtists(
          songId,
          primaryArtistId || null,
          primaryArtistRole || null,
          songArtists,
        );
        await syncSongChannels(songId, songChannels);
        await syncStreamingLinks(songId);
      } catch (e) {
        setSubmitting(false);
        setError(e instanceof Error ? e.message : "Failed to save song relations");
        return;
      }
    }

    setModalOpen(false);
    await refresh();
    setSubmitting(false);
  }

  async function remove(row: SongRow) {
    if (!confirm(`Delete song "${row.title}"?`)) return;
    const res = await supabase.from("songs").delete().eq("id", row.id);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    await refresh();
  }

  async function runImportSearch() {
    setImportLoading(true);
    setImportError(null);
    try {
      if (importSource === "itunes") {
        const results = await searchItunesTracks(importTerm, 25);
        setImportResults(results);
        setDeezerResults([]);
      } else {
        const data = await searchTracks(importTerm);
        setDeezerResults(data.data ?? []);
        setImportResults([]);
      }
    } catch (e) {
      setImportResults([]);
      setDeezerResults([]);
      setImportError(e instanceof Error ? e.message : "Import search failed");
    } finally {
      setImportLoading(false);
    }
  }

  async function importDeezerTrack(track: DeezerTrack) {
    setImportError(null);
    setImportingTrackId(track.id);
    try {
      const existing = await findSongByDeezerId(track.id);
      if (existing.data?.id) {
        setImportError(`Track "${track.title}" already imported (Deezer ID: ${track.id})`);
        setImportingTrackId(null);
        return;
      }

      const artistId = await ensureArtistByDeezer(
        track.artist.id,
        track.artist.name,
        track.artist.picture_medium
      );

      const albumId = await ensureAlbumByDeezer(
        track.album.id,
        track.album.title,
        artistId,
        track.album.cover_medium,
        undefined
      );

      if (albumId && artistId) {
        const albumRelRes = await supabase.from("album_artists").upsert(
          [{ album_id: albumId, artist_id: artistId, sort_order: 0 }],
          { onConflict: "album_id,artist_id" }
        );
        if (albumRelRes.error) throw albumRelRes.error;
      }

      const payload = {
        title: track.title,
        primary_artist_id: artistId,
        album_id: albumId,
        track_number: null,
        duration_seconds: track.duration,
        preview_url: track.preview ?? null,
        youtube_url: null,
        cover_path: track.album.cover_medium,
        is_published: true,
        deezer_id: track.id,
        explicit: track.explicit_lyrics,
        deezer_url: track.link,
      };

      const res = await supabase.from("songs").insert(payload).select("id").single();
      if (res.error) throw res.error;

      const songId = (res.data as { id: string } | null)?.id ?? null;
      if (songId && artistId) {
        const relRes = await supabase.from("song_artists").upsert(
          [{ song_id: songId, artist_id: artistId, role: "Primary", sort_order: 0 }],
          { onConflict: "song_id,artist_id" }
        );
        if (relRes.error) throw relRes.error;
      }

      await refresh();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImportingTrackId(null);
    }
  }

  async function importTrack(track: ItunesTrack) {
    setImportError(null);
    setImportingTrackId(track.trackId);
    try {
      const artistNames = track.artistName.split(/[,&]/).map((name) => name.trim()).filter(Boolean);
      const artistIds: string[] = [];
      
      for (const name of artistNames) {
        const id = await ensureArtistByName(name);
        if (id && !artistIds.includes(id)) {
          artistIds.push(id);
        }
      }
      
      const primaryArtistId = artistIds[0] ?? null;
      const albumId = track.collectionName ? await ensureAlbum(track.collectionName, primaryArtistId) : null;
      const durationSeconds = track.trackTimeMillis ? Math.round(track.trackTimeMillis / 1000) : null;

      if (albumId && primaryArtistId) {
        const albumRelRes = await supabase.from("album_artists").upsert(
          [{ album_id: albumId, artist_id: primaryArtistId, sort_order: 0 }],
          { onConflict: "album_id,artist_id" },
        );
        if (albumRelRes.error) throw albumRelRes.error;
      }

      let coverPath: string | null = null;
      if (track.artworkUrl100) {
        const artworkUrl = toItunesHiResArtwork(track.artworkUrl100);
        coverPath = await uploadImageFromUrl({
          bucketId: "covers",
          url: artworkUrl,
          pathWithoutExt: `songs/${track.trackId}`,
        });

        if (albumId) {
          const releaseDate = track.releaseDate
            ? (() => {
                const d = new Date(track.releaseDate);
                if (Number.isNaN(d.getTime())) return null;
                return d.toISOString().slice(0, 10);
              })()
            : null;

          const updatePayload: { cover_path: string; release_date?: string } = {
            cover_path: coverPath,
          };
          if (releaseDate) updatePayload.release_date = releaseDate;
          const updateRes = await supabase.from("albums").update(updatePayload).eq("id", albumId);
          if (updateRes.error) throw updateRes.error;
        }
      }

      const payload = {
        title: track.trackName,
        primary_artist_id: primaryArtistId,
        album_id: albumId,
        track_number: track.trackNumber ?? null,
        duration_seconds: durationSeconds,
        preview_url: track.previewUrl ?? null,
        cover_path: coverPath,
        is_published: true,
      };

      const res = await supabase.from("songs").insert(payload).select("id").single();
      if (res.error) throw res.error;

      const songId = (res.data as { id: string } | null)?.id ?? null;
      if (songId && artistIds.length > 0) {
        const artistRelations = artistIds.map((artistId, index) => ({
          song_id: songId,
          artist_id: artistId,
          role: index === 0 ? "Primary" : null,
          sort_order: index,
        }));
        
        const relRes = await supabase.from("song_artists").upsert(
          artistRelations,
          { onConflict: "song_id,artist_id" },
        );
        if (relRes.error) throw relRes.error;
      }

      if (songId && track.trackViewUrl) {
        const linkRes = await supabase.from("song_links").insert({
          song_id: songId,
          category: "official",
          platform: "Apple Music",
          url: track.trackViewUrl,
        });
        if (linkRes.error) throw linkRes.error;
      }

      await refresh();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImportingTrackId(null);
    }
  }

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

  const table = useMemo(() => {
    if (loading) return null;
    if (!rows.length) {
      return (
        <AdminEmpty
          title="No songs yet"
          description="Import from iTunes or add manually."
        />
      );
    }

    return (
      <DataTable
        rows={rows}
        keyForRow={(r) => r.id}
        columns={[
          { key: "title", header: "Title", cell: (r) => r.title },
          {
            key: "artist",
            header: "Artist",
            cell: (r) =>
              r.primary_artist_id
                ? artistNameById.get(r.primary_artist_id) ?? r.primary_artist_id
                : "—",
          },
          {
            key: "album",
            header: "Album",
            cell: (r) => (r.album_id ? albumTitleById.get(r.album_id) ?? r.album_id : "—"),
          },
          {
            key: "published",
            header: "Published",
            cell: (r) => (r.is_published ? "Yes" : "No"),
          },
          {
            key: "actions",
            header: "Actions",
            cell: (r) => (
              <div className="flex gap-2">
                <AdminButton onClick={() => openEdit(r)}>Edit</AdminButton>
                <AdminButton variant="danger" onClick={() => void remove(r)}>
                  Delete
                </AdminButton>
              </div>
            ),
          },
        ]}
      />
    );
  }, [albumTitleById, artistNameById, loading, rows]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xl font-bold text-text">Admin · Songs</div>
          <div className="text-xs text-muted">Create, import, and manage songs.</div>
        </div>
        <div className="flex gap-2">
          <AdminButton onClick={() => { setImportSource("itunes"); setImportOpen(true); }}>Import iTunes</AdminButton>
          <AdminButton onClick={() => { setImportSource("deezer"); setImportOpen(true); }}>Import Deezer</AdminButton>
          <AdminButton variant="primary" onClick={openCreate}>
            Add Song
          </AdminButton>
        </div>
      </div>

      <AdminCard title="Songs table">
        {error ? <ErrorState title="Error" description={error} /> : null}
        {table}
      </AdminCard>

      <AdminModal
        open={modalOpen}
        title={editing ? "Edit song" : "Add song"}
        onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton onClick={() => setModalOpen(false)}>Cancel</AdminButton>
            <AdminButton variant="primary" onClick={() => void save()} disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </AdminButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
              Title
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
              placeholder="Song title"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                Primary artist
              </div>
              <select
                value={primaryArtistId}
                onChange={(e) => setPrimaryArtistId(e.target.value)}
                className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none"
              >
                <option value="">— None —</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>

              <div className="mt-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  Primary artist role
                </div>
                <input
                  value={primaryArtistRole}
                  onChange={(e) => setPrimaryArtistRole(e.target.value)}
                  className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none"
                  placeholder="Role (e.g. Vocals, Composer)"
                  disabled={!primaryArtistId}
                />
              </div>

              <div className="mt-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  Additional artists (with roles)
                </div>
                <div className="space-y-2 rounded-xl border bg-panel p-3">
                  {songArtistsLoading ? (
                    <div className="text-sm text-muted">Loading artists...</div>
                  ) : null}

                  {!songArtistsLoading && !songArtists.length ? (
                    <div className="text-sm text-muted">No additional artists.</div>
                  ) : null}

                  {songArtists.map((r) => (
                    <div
                      key={r.key}
                      className="grid gap-2 md:grid-cols-[1fr_1fr_44px] md:items-center"
                    >
                      <select
                        value={r.artistId}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSongArtists((prev) =>
                            prev.map((x) => (x.key === r.key ? { ...x, artistId: v } : x)),
                          );
                        }}
                        className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none"
                      >
                        <option value="">â€” Select artist â€”</option>
                        {artists.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>

                      <input
                        value={r.role}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSongArtists((prev) =>
                            prev.map((x) => (x.key === r.key ? { ...x, role: v } : x)),
                          );
                        }}
                        className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none"
                        placeholder="Role (e.g. Featured, Producer)"
                      />

                      <button
                        type="button"
                        onClick={() => setSongArtists((prev) => prev.filter((x) => x.key !== r.key))}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border bg-panel text-sm text-muted hover:bg-panel2"
                        title="Remove"
                        aria-label="Remove"
                      >
                        âˆ’
                      </button>
                    </div>
                  ))}

                  <div className="flex justify-end">
                    <AdminButton
                      onClick={() =>
                        setSongArtists((prev) => [...prev, { key: newKey(), artistId: "", role: "" }])
                      }
                    >
                      Add artist
                    </AdminButton>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  Channels (rights)
                </div>
                <div className="space-y-2 rounded-xl border bg-panel p-3">
                  {songChannelsLoading ? (
                    <div className="text-sm text-muted">Loading channels...</div>
                  ) : null}

                  {!songChannelsLoading && !songChannels.length ? (
                    <div className="text-sm text-muted">No channels assigned.</div>
                  ) : null}

                  {songChannels.map((r) => (
                    <div key={r.key} className="grid gap-2 md:grid-cols-[1fr_44px] md:items-center">
                      <select
                        value={r.channelId}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSongChannels((prev) =>
                            prev.map((x) => (x.key === r.key ? { ...x, channelId: v } : x)),
                          );
                        }}
                        className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none"
                      >
                        <option value="">— Select channel —</option>
                        {channels.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setSongChannels((prev) => prev.filter((x) => x.key !== r.key))}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border bg-panel text-sm text-muted hover:bg-panel2"
                        title="Remove"
                        aria-label="Remove"
                      >
                        −
                      </button>
                    </div>
                  ))}

                  <div className="flex justify-end">
                    <AdminButton onClick={() => setSongChannels((prev) => [...prev, { key: newKey(), channelId: "" }])}>
                      Add channel
                    </AdminButton>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                Album
              </div>
              <select
                value={albumId}
                onChange={(e) => setAlbumId(e.target.value)}
                className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none"
              >
                <option value="">— None —</option>
                {albums.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
              Cover Image
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              className="w-full rounded-xl border bg-panel px-4 py-3 text-sm text-text outline-none"
            />
            {coverPreview && (
              <div className="mt-3">
                <img src={coverPreview} alt="Cover preview" className="h-32 w-32 rounded-lg object-cover" />
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                Track #
              </div>
              <input
                value={trackNumber}
                onChange={(e) => setTrackNumber(e.target.value)}
                className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none"
                inputMode="numeric"
                placeholder="1"
              />
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                Duration (sec)
              </div>
              <input
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(e.target.value)}
                className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none"
                inputMode="numeric"
                placeholder="210"
              />
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
              Preview URL
            </div>
            <input
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none"
              placeholder="https://…"
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
              YouTube URL
            </div>
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none"
              placeholder="https://youtube.com/watch?v=…"
            />
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">
              Streaming links
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  Spotify
                </div>
                <input
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none"
                  placeholder="https://open.spotify.com/track/..."
                />
              </div>

              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  Apple Music
                </div>
                <input
                  value={appleMusicUrl}
                  onChange={(e) => setAppleMusicUrl(e.target.value)}
                  className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none"
                  placeholder="https://music.apple.com/..."
                />
              </div>

              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  YouTube Music
                </div>
                <input
                  value={youtubeMusicUrl}
                  onChange={(e) => setYoutubeMusicUrl(e.target.value)}
                  className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none"
                  placeholder="https://music.youtube.com/..."
                />
              </div>

              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  JioSaavn
                </div>
                <input
                  value={jioSaavnUrl}
                  onChange={(e) => setJioSaavnUrl(e.target.value)}
                  className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none"
                  placeholder="https://www.jiosaavn.com/..."
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Published
          </label>
        </div>
      </AdminModal>

      <AdminModal
        open={importOpen}
        title="Import Music"
        onClose={() => setImportOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton onClick={() => setImportOpen(false)}>Close</AdminButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <select
              value={importSource}
              onChange={(e) => setImportSource(e.target.value as "itunes" | "deezer")}
              className="h-11 rounded-xl border bg-panel px-4 text-sm text-text outline-none"
            >
              <option value="itunes">iTunes</option>
              <option value="deezer">Deezer</option>
            </select>
            <input
              value={importTerm}
              onChange={(e) => setImportTerm(e.target.value)}
              className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
              placeholder={importSource === "deezer" ? "Search Deezer… (e.g. The Weeknd)" : "Search artist or song… (e.g. The Weeknd)"}
              onKeyDown={(e) => { if (e.key === "Enter") void runImportSearch(); }}
            />
            <AdminButton variant="primary" onClick={() => void runImportSearch()} disabled={importLoading}>
              {importLoading ? "Searching…" : "Search"}
            </AdminButton>
          </div>

          {importError ? <ErrorState title="Import error" description={importError} /> : null}

          {!importLoading && !importResults.length && !deezerResults.length ? (
            <div className="rounded-xl border bg-panel2 p-4 text-sm text-muted">
              Search for a track, then click Import.
            </div>
          ) : null}

          {importResults.length ? (
            <div className="divide-y rounded-xl border bg-panel">
              {importResults.map((t) => (
                <div key={t.trackId} className="flex items-center gap-3 px-4 py-3">
                  {t.artworkUrl100 ? (
                    <img
                      src={t.artworkUrl100}
                      alt=""
                      className="h-12 w-12 rounded-lg border object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg border bg-panel2" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-text">
                      {t.trackName}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {t.artistName}
                      {t.collectionName ? ` · ${t.collectionName}` : ""}
                    </div>
                    {t.previewUrl ? (
                      <a
                        href={t.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-accent"
                      >
                        Preview
                      </a>
                    ) : null}
                  </div>
                  <div className="ml-auto">
                    <AdminButton
                      variant="primary"
                      onClick={() => void importTrack(t)}
                      disabled={importingTrackId === t.trackId}
                    >
                      {importingTrackId === t.trackId ? "Importing…" : "Import"}
                    </AdminButton>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {deezerResults.length ? (
            <div className="divide-y rounded-xl border bg-panel">
              {deezerResults.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  {t.album.cover_medium ? (
                    <img
                      src={t.album.cover_medium}
                      alt=""
                      className="h-12 w-12 rounded-lg border object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg border bg-panel2" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-text">
                      {t.title}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {t.artist.name}
                      {t.album.title ? ` · ${t.album.title}` : ""}
                    </div>
                    {t.preview ? (
                      <audio controls src={t.preview} className="mt-1 h-6" />
                    ) : null}
                  </div>
                  <div className="ml-auto">
                    <AdminButton
                      variant="primary"
                      onClick={() => void importDeezerTrack(t)}
                      disabled={importingTrackId === t.id}
                    >
                      {importingTrackId === t.id ? "Importing…" : "Import"}
                    </AdminButton>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </AdminModal>
    </div>
  );
}
