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
import type { ArtistRow } from "../../admin/supabaseAdmin";
import { listArtists } from "../../admin/supabaseAdmin";

export function AdminArtistsPage() {
  const [rows, setRows] = useState<ArtistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ArtistRow | null>(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [published, setPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    const res = await listArtists();
    if (res.error) setError(res.error.message);
    setRows((res.data ?? []) as ArtistRow[]);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setBio("");
    setPublished(true);
    setModalOpen(true);
  }

  function openEdit(row: ArtistRow) {
    setEditing(row);
    setName(row.name);
    setBio(row.bio ?? "");
    setPublished(row.is_published);
    setModalOpen(true);
  }

  async function save() {
    setSubmitting(true);
    setError(null);
    const payload = {
      name: name.trim(),
      bio: bio.trim() || null,
      is_published: published,
    };

    if (!payload.name) {
      setSubmitting(false);
      setError("Name is required.");
      return;
    }

    const res = editing
      ? await supabase.from("artists").update(payload).eq("id", editing.id)
      : await supabase.from("artists").insert(payload);

    setSubmitting(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    setModalOpen(false);
    await refresh();
  }

  async function remove(row: ArtistRow) {
    if (!confirm(`Delete artist "${row.name}"?`)) return;
    const res = await supabase.from("artists").delete().eq("id", row.id);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    await refresh();
  }

  const table = useMemo(() => {
    if (loading) return null;
    if (!rows.length) {
      return (
        <AdminEmpty
          title="No artists yet"
          description="Create an artist or import songs from iTunes (it will auto-create artists)."
        />
      );
    }

    return (
      <DataTable
        rows={rows}
        keyForRow={(r) => r.id}
        columns={[
          { key: "name", header: "Name", cell: (r) => r.name },
          {
            key: "published",
            header: "Published",
            cell: (r) => (r.is_published ? "Yes" : "No"),
          },
          { key: "updated", header: "Updated", cell: (r) => r.updated_at },
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
  }, [loading, rows]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div className="text-xl font-bold text-text">Admin · Artists</div>
        <AdminButton variant="primary" onClick={openCreate}>
          Add Artist
        </AdminButton>
      </div>

      <AdminCard title="Artists">
        {error ? <ErrorState title="Error" description={error} /> : null}
        {table}
      </AdminCard>

      <AdminModal
        open={modalOpen}
        title={editing ? "Edit artist" : "Add artist"}
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
              Name
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
              placeholder="Artist name"
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
              Bio
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="min-h-[120px] w-full rounded-xl border bg-panel px-4 py-3 text-sm text-text outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
              placeholder="Optional artist bio…"
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
