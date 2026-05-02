import { useEffect, useMemo, useState } from "react";
import { SearchBar } from "../../components/SearchBar";
import {
  AdminButton,
  AdminCard,
  AdminEmpty,
  AdminModal,
  DataTable,
} from "../../components/admin/AdminComponents";
import { ErrorState } from "../../components/States";
import { searchItunesAlbums, searchItunesTracks, type ItunesAlbum, type ItunesTrack } from "../../admin/itunes";
import { toItunesHiResArtwork, uploadImageFromUrl } from "../../admin/storageImport";
import { supabase } from "../../lib/supabaseClient";
import { publicAssetUrl } from "../../lib/media";
import type { AlbumRow, ArtistRow, ChannelRow } from "../../admin/supabaseAdmin";
import { ensureArtistByName, listAlbums, listArtists, listChannels } from "../../admin/supabaseAdmin";

export function AdminAlbumsPage() {
  const [rows, setRows] = useState<AlbumRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [artists, setArtists] = useState<Pick<ArtistRow, "id" | "name">[]>([]);
  const [channels, setChannels] = useState<Pick<ChannelRow, "id" | "name">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AlbumRow | null>(null);

  const [title, setTitle] = useState("");
  const [artistId, setArtistId] = useState<string>("");
  const [releaseDate, setReleaseDate] = useState<string>("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [published, setPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  type AlbumArtistFormRow = {
    key: string;
    artistId: string;
  };

  const [albumArtists, setAlbumArtists] = useState<AlbumArtistFormRow[]>([]);
  const [albumArtistsLoading, setAlbumArtistsLoading] = useState(false);

  type AlbumChannelFormRow = {
    key: string;
    channelId: string;
  };

  const [albumChannels, setAlbumChannels] = useState<AlbumChannelFormRow[]>([]);
  const [albumChannelsLoading, setAlbumChannelsLoading] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importTerm, setImportTerm] = useState("");
  const [importResults, setImportResults] = useState<ItunesAlbum[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importingAlbumId, setImportingAlbumId] = useState<number | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);

    const [albumsRes, artistsRes, channelsRes] = await Promise.all([listAlbums(), listArtists(), listChannels()]);

    if (albumsRes.error) setError(albumsRes.error.message);
    setRows((albumsRes.data ?? []) as AlbumRow[]);

    if (artistsRes.error) {
      setError(artistsRes.error.message);
      setArtists([]);
    } else {
      setArtists(((artistsRes.data ?? []) as ArtistRow[]).map((a) => ({ id: a.id, name: a.name })));
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

  function normalizeAdditionalAlbumArtists(input: AlbumArtistFormRow[], primary: string | null) {
    const cleaned = input
      .map((r) => ({
        ...r,
        artistId: r.artistId.trim(),
        key: r.key || newKey(),
      }))
      .filter((r) => !!r.artistId);

    const withoutPrimary = primary ? cleaned.filter((r) => r.artistId !== primary) : cleaned;

    const deduped: AlbumArtistFormRow[] = [];
    const seen = new Set<string>();
    for (const r of withoutPrimary) {
      if (seen.has(r.artistId)) continue;
      seen.add(r.artistId);
      deduped.push(r);
    }

    return deduped;
  }

  async function loadAlbumArtists(albumId: string, fallbackPrimary: string | null) {
    setAlbumArtistsLoading(true);
    setError(null);
    const res = await supabase
      .from("album_artists")
      .select("artist_id, sort_order")
      .eq("album_id", albumId)
      .order("sort_order", { ascending: true });

    if (res.error) {
      setAlbumArtists([]);
      setAlbumArtistsLoading(false);
      setError(res.error.message);
      return;
    }

    const data = (res.data ?? []) as { artist_id: string; sort_order: number | null }[];
    if (!data.length) {
      setAlbumArtists([]);
      setAlbumArtistsLoading(false);
      return;
    }

    setAlbumArtists(
      data
        .filter((r) => (fallbackPrimary ? r.artist_id !== fallbackPrimary : true))
        .map((r) => ({ key: newKey(), artistId: r.artist_id })),
    );
    setAlbumArtistsLoading(false);
  }

  async function syncAlbumArtists(
    albumId: string,
    primary: string | null,
    additionalToSave: AlbumArtistFormRow[],
  ) {
    const normalizedAdditional = normalizeAdditionalAlbumArtists(additionalToSave, primary);

    const delRes = await supabase.from("album_artists").delete().eq("album_id", albumId);
    if (delRes.error) throw delRes.error;

    const toInsert: { album_id: string; artist_id: string; sort_order: number }[] = [];
    if (primary) {
      toInsert.push({ album_id: albumId, artist_id: primary, sort_order: 0 });
    }
    for (let i = 0; i < normalizedAdditional.length; i++) {
      toInsert.push({
        album_id: albumId,
        artist_id: normalizedAdditional[i].artistId,
        sort_order: (primary ? 1 : 0) + i,
      });
    }

    if (toInsert.length) {
      const insertRes = await supabase.from("album_artists").insert(toInsert);
      if (insertRes.error) throw insertRes.error;
    }

    return { normalizedAdditional };
  }

  function normalizeAlbumChannels(input: AlbumChannelFormRow[]) {
    const cleaned = input
      .map((r) => ({ ...r, channelId: r.channelId.trim(), key: r.key || newKey() }))
      .filter((r) => !!r.channelId);

    const deduped: AlbumChannelFormRow[] = [];
    const seen = new Set<string>();
    for (const r of cleaned) {
      if (seen.has(r.channelId)) continue;
      seen.add(r.channelId);
      deduped.push(r);
    }
    return deduped;
  }

  async function loadAlbumChannels(albumId: string) {
    setAlbumChannelsLoading(true);
    setError(null);
    const res = await supabase
      .from("album_channels")
      .select("channel_id, sort_order")
      .eq("album_id", albumId)
      .order("sort_order", { ascending: true });

    if (res.error) {
      setAlbumChannels([]);
      setAlbumChannelsLoading(false);
      setError(res.error.message);
      return;
    }

    const data = (res.data ?? []) as { channel_id: string; sort_order: number | null }[];
    setAlbumChannels(data.map((r) => ({ key: newKey(), channelId: r.channel_id })));
    setAlbumChannelsLoading(false);
  }

  async function syncAlbumChannels(albumId: string, toSave: AlbumChannelFormRow[]) {
    const normalized = normalizeAlbumChannels(toSave);

    const delRes = await supabase.from("album_channels").delete().eq("album_id", albumId);
    if (delRes.error) throw delRes.error;

    const toInsert: { album_id: string; channel_id: string; sort_order: number }[] = [];
    for (let i = 0; i < normalized.length; i++) {
      toInsert.push({ album_id: albumId, channel_id: normalized[i].channelId, sort_order: i });
    }

    if (toInsert.length) {
      const insertRes = await supabase.from("album_channels").insert(toInsert);
      if (insertRes.error) throw insertRes.error;
    }
  }

  function openCreate() {
    setEditing(null);
    setTitle("");
    setArtistId("");
    setReleaseDate("");
    setCoverPreview(null);
    setCoverFile(null);
    setPublished(true);
    setAlbumArtists([]);
    setAlbumChannels([]);
    setModalOpen(true);
  }

  function openEdit(row: AlbumRow) {
    setEditing(row);
    setTitle(row.title);
    setArtistId(row.artist_id ?? "");
    setReleaseDate(row.release_date ?? "");
    setCoverPreview(row.cover_path ? publicAssetUrl("covers", row.cover_path) : null);
    setCoverFile(null);
    setPublished(row.is_published);
    setAlbumArtists([]);
    setAlbumChannels([]);
    setModalOpen(true);
    void loadAlbumArtists(row.id, row.artist_id ?? null);
    void loadAlbumChannels(row.id);
  }

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

  async function save() {
    setSubmitting(true);
    setError(null);

    let primary = artistId.trim() || null;
    let additionalForSave = albumArtists;

    const normalizedAdditional = normalizeAdditionalAlbumArtists(albumArtists, primary);
    if (!primary && normalizedAdditional.length) {
      primary = normalizedAdditional[0].artistId;
      additionalForSave = normalizedAdditional.slice(1);
    }

    let finalCoverPath: string | null = editing?.cover_path ?? null;
    if (coverFile) {
      const fileExt = coverFile.name.split('.').pop() || 'jpg';
      const pathWithoutExt = `albums/${editing?.id || Date.now()}`;
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
      finalCoverPath = path;
    }

    const payload = {
      title: title.trim(),
      artist_id: primary,
      release_date: releaseDate || null,
      cover_path: finalCoverPath,
      is_published: published,
    };

    if (!payload.title) {
      setSubmitting(false);
      setError("Title is required.");
      return;
    }

    const res = editing
      ? await supabase.from("albums").update(payload).eq("id", editing.id).select("id").single()
      : await supabase.from("albums").insert(payload).select("id").single();

    if (res.error) {
      setSubmitting(false);
      setError(res.error.message);
      return;
    }

    const savedAlbumId = (res.data as { id: string } | null)?.id ?? editing?.id ?? null;
    if (savedAlbumId) {
      try {
        await syncAlbumArtists(savedAlbumId, primary, additionalForSave);
        await syncAlbumChannels(savedAlbumId, albumChannels);
      } catch (e) {
        setSubmitting(false);
        setError(e instanceof Error ? e.message : "Failed to save album relations");
        return;
      }
    }

    setModalOpen(false);
    await refresh();
    setSubmitting(false);
  }

  async function remove(row: AlbumRow) {
    if (!confirm(`Delete album "${row.title}"?`)) return;
    const res = await supabase.from("albums").delete().eq("id", row.id);
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
      const results = await searchItunesAlbums(importTerm, 25);
      setImportResults(results);
    } catch (e) {
      setImportResults([]);
      setImportError(e instanceof Error ? e.message : "Import search failed");
    } finally {
      setImportLoading(false);
    }
  }

  async function importAlbum(album: ItunesAlbum) {
    setImportError(null);
    setImportingAlbumId(album.collectionId);
    try {
      const artistNames = album.artistName.split(/[,&]/).map((name) => name.trim()).filter(Boolean);
      const artistIds: string[] = [];

      for (const name of artistNames) {
        const id = await ensureArtistByName(name);
        if (id && !artistIds.includes(id)) {
          artistIds.push(id);
        }
      }

      const primaryArtistId = artistIds[0] ?? null;
      let coverPath: string | null = null;
      if (album.artworkUrl100) {
        const artworkUrl = toItunesHiResArtwork(album.artworkUrl100);
        coverPath = await uploadImageFromUrl({
          bucketId: "covers",
          url: artworkUrl,
          pathWithoutExt: `albums/${album.collectionId}`,
        });
      }

      const releaseDate = album.releaseDate
        ? (() => {
              const d = new Date(album.releaseDate);
              if (Number.isNaN(d.getTime())) return null;
              return d.toISOString().slice(0, 10);
            })()
        : null;

      const payload = {
        title: album.collectionName,
        artist_id: primaryArtistId,
        cover_path: coverPath,
        release_date: releaseDate,
        is_published: true,
      };

      const res = await supabase.from("albums").insert(payload).select("id").single();
      if (res.error) throw res.error;

      const albumId = (res.data as { id: string } | null)?.id ?? null;
      if (albumId && artistIds.length > 0) {
        const artistRelations = artistIds.map((artistId, index) => ({
          album_id: albumId,
          artist_id: artistId,
          sort_order: index,
        }));

        const relRes = await supabase.from("album_artists").upsert(artistRelations, {
          onConflict: "album_id,artist_id",
        });
        if (relRes.error) throw relRes.error;
      }

      if (albumId && album.collectionViewUrl) {
        const linkRes = await supabase.from("album_links").insert({
          album_id: albumId,
          category: "official",
          platform: "Apple Music",
          url: album.collectionViewUrl,
        });
        if (linkRes.error) throw linkRes.error;
      }

      if (albumId) {
        await importAlbumSongs(album, albumId, primaryArtistId);
      }

      await refresh();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImportingAlbumId(null);
    }
  }

  async function importAlbumSongs(album: ItunesAlbum, albumId: string, primaryArtistId: string | null) {
    try {
      const searchRes = await searchItunesTracks(album.collectionName || "", 50);
        const albumSongs = searchRes.filter(
          (track: ItunesTrack) => track && track.collectionName === album.collectionName
        );

        for (const track of albumSongs) {
        const artistNames = (track as ItunesTrack).artistName.split(/[,&]/).map((name: string) => name.trim()).filter(Boolean);
        const artistIds: string[] = [];
        
        for (const name of artistNames) {
          const id = await ensureArtistByName(name);
          if (id && !artistIds.includes(id)) {
            artistIds.push(id);
          }
        }

        const currentPrimaryArtistId = artistIds[0] ?? primaryArtistId;
          const durationSeconds = track?.trackTimeMillis ? Math.round(track.trackTimeMillis / 1000) : null;

          let songCoverPath: string | null = null;
          if (track?.artworkUrl100) {
            const artworkUrl = toItunesHiResArtwork(track.artworkUrl100);
          songCoverPath = await uploadImageFromUrl({
            bucketId: "covers",
            url: artworkUrl,
            pathWithoutExt: `songs/${track.trackId}`,
          });
        }

        const songPayload = {
          title: track.trackName,
          primary_artist_id: currentPrimaryArtistId,
          album_id: albumId,
          track_number: track.trackNumber ?? null,
          duration_seconds: durationSeconds,
          preview_url: track.previewUrl ?? null,
          cover_path: songCoverPath,
          is_published: true,
        };

        const songRes = await supabase.from("songs").insert(songPayload).select("id").single();
        if (songRes.error) continue;

        const songId = (songRes.data as { id: string } | null)?.id ?? null;
        if (songId && artistIds.length > 0) {
          const artistRelations = artistIds.map((artistId, index) => ({
            song_id: songId,
            artist_id: artistId,
            role: index === 0 ? "Primary" : null,
            sort_order: index,
          }));
          
          await supabase.from("song_artists").upsert(artistRelations, { onConflict: "song_id,artist_id" });
        }

          if (songId && track?.trackViewUrl) {
            await supabase.from("song_links").insert({
              song_id: songId,
              category: "official",
              platform: "Apple Music",
              url: track.trackViewUrl,
          });
        }
      }
    } catch (e) {
      console.error("Failed to import album songs:", e);
    }
  }

  const artistNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of artists) map.set(a.id, a.name);
    return map;
  }, [artists]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const artistName = r.artist_id ? artistNameById.get(r.artist_id) ?? "" : "";
      return (
        r.title.toLowerCase().includes(q) ||
        artistName.toLowerCase().includes(q)
      );
    });
  }, [artistNameById, rows, searchQuery]);

  const table = useMemo(() => {
    if (loading) return null;
    if (!filteredRows.length) {
      return <AdminEmpty title="No albums yet" description="Create an album or import from iTunes." />;
    }

    return (
      <DataTable
        rows={filteredRows}
        keyForRow={(r) => r.id}
        columns={[
          { key: "title", header: "Title", cell: (r) => r.title },
          {
            key: "artist",
            header: "Artist",
            cell: (r) => (r.artist_id ? artistNameById.get(r.artist_id) ?? r.artist_id : "—"),
          },
          { key: "release", header: "Release", cell: (r) => r.release_date ?? "—" },
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
  }, [artistNameById, filteredRows, loading]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xl font-bold text-text">Admin · Albums</div>
          <div className="text-xs text-muted">Create, import, and manage albums.</div>
        </div>
        <div className="flex gap-2">
          <AdminButton onClick={() => setImportOpen(true)}>Import iTunes</AdminButton>
          <AdminButton variant="primary" onClick={openCreate}>
            Add Album
          </AdminButton>
        </div>
      </div>

      <SearchBar
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search albums by title or artist..."
      />

      <AdminCard title="Albums">
        {error ? <ErrorState title="Error" description={error} /> : null}
        {table}
      </AdminCard>

      <AdminModal
        open={modalOpen}
        title={editing ? "Edit album" : "Add album"}
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
              placeholder="Album title"
            />
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

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
              Primary artist
            </div>
            <select
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
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
                Additional artists
              </div>
              <div className="space-y-2 rounded-xl border bg-panel p-3">
                {albumArtistsLoading ? (
                  <div className="text-sm text-muted">Loading artists...</div>
                ) : null}

                {!albumArtistsLoading && !albumArtists.length ? (
                  <div className="text-sm text-muted">No additional artists.</div>
                ) : null}

                {albumArtists.map((r) => (
                  <div
                    key={r.key}
                    className="grid gap-2 md:grid-cols-[1fr_44px] md:items-center"
                  >
                    <select
                      value={r.artistId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAlbumArtists((prev) =>
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

                    <button
                      type="button"
                      onClick={() => setAlbumArtists((prev) => prev.filter((x) => x.key !== r.key))}
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
                      setAlbumArtists((prev) => [...prev, { key: newKey(), artistId: "" }])
                    }
                  >
                    Add artist
                  </AdminButton>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
              Channels (rights)
            </div>
            <div className="space-y-2 rounded-xl border bg-panel p-3">
              {albumChannelsLoading ? (
                <div className="text-sm text-muted">Loading channels...</div>
              ) : null}

              {!albumChannelsLoading && !albumChannels.length ? (
                <div className="text-sm text-muted">No channels assigned.</div>
              ) : null}

              {albumChannels.map((r) => (
                <div key={r.key} className="grid gap-2 md:grid-cols-[1fr_44px] md:items-center">
                  <select
                    value={r.channelId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAlbumChannels((prev) =>
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
                    onClick={() => setAlbumChannels((prev) => prev.filter((x) => x.key !== r.key))}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border bg-panel text-sm text-muted hover:bg-panel2"
                    title="Remove"
                    aria-label="Remove"
                  >
                    −
                  </button>
                </div>
              ))}

              <div className="flex justify-end">
                <AdminButton onClick={() => setAlbumChannels((prev) => [...prev, { key: newKey(), channelId: "" }])}>
                  Add channel
                </AdminButton>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
              Release date
            </div>
            <input
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none"
              type="date"
            />
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
        title="Import from iTunes"
        onClose={() => setImportOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton onClick={() => setImportOpen(false)}>Close</AdminButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={importTerm}
              onChange={(e) => setImportTerm(e.target.value)}
              className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
              placeholder="Search artist or album… (e.g. The Weeknd)"
            />
            <AdminButton variant="primary" onClick={() => void runImportSearch()} disabled={importLoading}>
              {importLoading ? "Searching…" : "Search"}
            </AdminButton>
          </div>

          {importError ? <ErrorState title="Import error" description={importError} /> : null}

          {!importLoading && !importResults.length ? (
            <div className="rounded-xl border bg-panel2 p-4 text-sm text-muted">
              Search for an album, then click Import.
            </div>
          ) : null}

          {importResults.length ? (
            <div className="divide-y rounded-xl border bg-panel">
              {importResults.map((album) => (
                <div key={album.collectionId} className="flex items-center gap-3 px-4 py-3">
                  {album.artworkUrl100 ? (
                    <img
                      src={album.artworkUrl100}
                      alt=""
                      className="h-12 w-12 rounded-lg border object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg border bg-panel2" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-text">
                      {album.collectionName}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {album.artistName}
                      {album.releaseDate ? ` · ${new Date(album.releaseDate).getFullYear()}` : ""}
                    </div>
                  </div>
                  <div className="ml-auto">
                    <AdminButton
                      variant="primary"
                      onClick={() => void importAlbum(album)}
                      disabled={importingAlbumId === album.collectionId}
                    >
                      {importingAlbumId === album.collectionId ? "Importing…" : "Import"}
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
