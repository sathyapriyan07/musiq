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

  function openCreate() {
    setEditing(null);
    setTitle("");
    setArtistId("");
    setReleaseDate("");
    setPublished(true);
    setModalOpen(true);
  }

  function openEdit(row: AlbumRow) {
    setEditing(row);
    setTitle(row.title);
    setArtistId(row.artist_id ?? "");
    setReleaseDate(row.release_date ?? "");
    setPublished(row.is_published);
    setModalOpen(true);
  }

  async function save() {
    setSubmitting(true);
    setError(null);

    const payload = {
      title: title.trim(),
      artist_id: artistId || null,
      release_date: releaseDate || null,
      is_published: published,
    };

    if (!payload.title) {
      setSubmitting(false);
      setError("Title is required.");
      return;
    }

    const res = editing
      ? await supabase.from("albums").update(payload).eq("id", editing.id)
      : await supabase.from("albums").insert(payload);

    setSubmitting(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    setModalOpen(false);
    await refresh();
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
              Artist
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
