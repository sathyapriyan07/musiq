import { useEffect, useMemo, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminEmpty,
  AdminModal,
  DataTable,
} from "../../components/admin/AdminComponents";
import { ErrorState } from "../../components/States";
import { supabase } from "../../lib/supabaseClient";
import type { AlbumRow, ArtistRow } from "../../admin/supabaseAdmin";
import { listAlbums, listArtists } from "../../admin/supabaseAdmin";

export function AdminAlbumsPage() {
  const [rows, setRows] = useState<AlbumRow[]>([]);
  const [artists, setArtists] = useState<Pick<ArtistRow, "id" | "name">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AlbumRow | null>(null);

  const [title, setTitle] = useState("");
  const [artistId, setArtistId] = useState<string>("");
  const [releaseDate, setReleaseDate] = useState<string>("");
  const [published, setPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  type AlbumArtistFormRow = {
    key: string;
    artistId: string;
  };

  const [albumArtists, setAlbumArtists] = useState<AlbumArtistFormRow[]>([]);
  const [albumArtistsLoading, setAlbumArtistsLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);

    const [albumsRes, artistsRes] = await Promise.all([listAlbums(), listArtists()]);

    if (albumsRes.error) setError(albumsRes.error.message);
    setRows((albumsRes.data ?? []) as AlbumRow[]);

    if (artistsRes.error) {
      setError(artistsRes.error.message);
      setArtists([]);
    } else {
      setArtists(((artistsRes.data ?? []) as ArtistRow[]).map((a) => ({ id: a.id, name: a.name })));
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

  function openCreate() {
    setEditing(null);
    setTitle("");
    setArtistId("");
    setReleaseDate("");
    setPublished(true);
    setAlbumArtists([]);
    setModalOpen(true);
  }

  function openEdit(row: AlbumRow) {
    setEditing(row);
    setTitle(row.title);
    setArtistId(row.artist_id ?? "");
    setReleaseDate(row.release_date ?? "");
    setPublished(row.is_published);
    setAlbumArtists([]);
    setModalOpen(true);
    void loadAlbumArtists(row.id, row.artist_id ?? null);
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

    const payload = {
      title: title.trim(),
      artist_id: primary,
      release_date: releaseDate || null,
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
      } catch (e) {
        setSubmitting(false);
        setError(e instanceof Error ? e.message : "Failed to save album artists");
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

  const artistNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of artists) map.set(a.id, a.name);
    return map;
  }, [artists]);

  const table = useMemo(() => {
    if (loading) return null;
    if (!rows.length) {
      return <AdminEmpty title="No albums yet" description="Create an album or import from iTunes." />;
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
  }, [artistNameById, loading, rows]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div className="text-xl font-bold text-text">Admin · Albums</div>
        <AdminButton variant="primary" onClick={openCreate}>
          Add Album
        </AdminButton>
      </div>

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
    </div>
  );
}
