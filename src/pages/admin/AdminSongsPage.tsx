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
import { toItunesHiResArtwork, uploadImageFromUrl } from "../../admin/storageImport";
import {
  ensureAlbum,
  ensureArtistByName,
  listAlbums,
  listArtists,
  listSongs,
  type AlbumRow,
  type ArtistRow,
  type SongRow,
} from "../../admin/supabaseAdmin";
import { supabase } from "../../lib/supabaseClient";

export function AdminSongsPage() {
  const [rows, setRows] = useState<SongRow[]>([]);
  const [artists, setArtists] = useState<Pick<ArtistRow, "id" | "name">[]>([]);
  const [albums, setAlbums] = useState<Pick<AlbumRow, "id" | "title">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SongRow | null>(null);

  const [title, setTitle] = useState("");
  const [primaryArtistId, setPrimaryArtistId] = useState<string>("");
  const [albumId, setAlbumId] = useState<string>("");
  const [trackNumber, setTrackNumber] = useState<string>("");
  const [durationSeconds, setDurationSeconds] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [published, setPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importTerm, setImportTerm] = useState("");
  const [importResults, setImportResults] = useState<ItunesTrack[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importingTrackId, setImportingTrackId] = useState<number | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);

    const [songsRes, artistsRes, albumsRes] = await Promise.all([
      listSongs(),
      listArtists(),
      listAlbums(),
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

    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  function openCreate() {
    setEditing(null);
    setTitle("");
    setPrimaryArtistId("");
    setAlbumId("");
    setTrackNumber("");
    setDurationSeconds("");
    setPreviewUrl("");
    setYoutubeUrl("");
    setPublished(true);
    setModalOpen(true);
  }

  function openEdit(row: SongRow) {
    setEditing(row);
    setTitle(row.title);
    setPrimaryArtistId(row.primary_artist_id ?? "");
    setAlbumId(row.album_id ?? "");
    setTrackNumber(row.track_number ? String(row.track_number) : "");
    setDurationSeconds(row.duration_seconds ? String(row.duration_seconds) : "");
    setPreviewUrl(row.preview_url ?? "");
    setYoutubeUrl(row.youtube_url ?? "");
    setPublished(row.is_published);
    setModalOpen(true);
  }

  async function save() {
    setSubmitting(true);
    setError(null);

    const payload = {
      title: title.trim(),
      primary_artist_id: primaryArtistId || null,
      album_id: albumId || null,
      track_number: trackNumber ? Number(trackNumber) : null,
      duration_seconds: durationSeconds ? Number(durationSeconds) : null,
      preview_url: previewUrl.trim() || null,
      youtube_url: youtubeUrl.trim() || null,
      is_published: published,
    };

    if (!payload.title) {
      setSubmitting(false);
      setError("Title is required.");
      return;
    }

    const res = editing
      ? await supabase.from("songs").update(payload).eq("id", editing.id)
      : await supabase.from("songs").insert(payload);

    setSubmitting(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    setModalOpen(false);
    await refresh();
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
      const results = await searchItunesTracks(importTerm, 25);
      setImportResults(results);
    } catch (e) {
      setImportResults([]);
      setImportError(e instanceof Error ? e.message : "Import search failed");
    } finally {
      setImportLoading(false);
    }
  }

  async function importTrack(track: ItunesTrack) {
    setImportError(null);
    setImportingTrackId(track.trackId);
    try {
      const artistId = await ensureArtistByName(track.artistName);
      const albumId = track.collectionName ? await ensureAlbum(track.collectionName, artistId) : null;
      const durationSeconds = track.trackTimeMillis ? Math.round(track.trackTimeMillis / 1000) : null;

      if (albumId && track.artworkUrl100) {
        const artworkUrl = toItunesHiResArtwork(track.artworkUrl100);
        const coverPath = await uploadImageFromUrl({
          bucketId: "covers",
          url: artworkUrl,
          pathWithoutExt: `albums/${albumId}`,
        });

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

      const payload = {
        title: track.trackName,
        primary_artist_id: artistId,
        album_id: albumId,
        track_number: track.trackNumber ?? null,
        duration_seconds: durationSeconds,
        preview_url: track.previewUrl ?? null,
        is_published: true,
      };

      const res = await supabase.from("songs").insert(payload);
      if (res.error) throw res.error;
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
          <AdminButton onClick={() => setImportOpen(true)}>Import iTunes</AdminButton>
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
                Artist
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
              placeholder="Search artist or song… (e.g. The Weeknd)"
            />
            <AdminButton variant="primary" onClick={() => void runImportSearch()} disabled={importLoading}>
              {importLoading ? "Searching…" : "Search"}
            </AdminButton>
          </div>

          {importError ? <ErrorState title="Import error" description={importError} /> : null}

          {!importLoading && !importResults.length ? (
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
        </div>
      </AdminModal>
    </div>
  );
}
