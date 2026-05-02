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
import { publicAssetUrl } from "../../lib/media";
import { supabase } from "../../lib/supabaseClient";
import type { ArtistRow } from "../../admin/supabaseAdmin";
import { listArtists } from "../../admin/supabaseAdmin";

export function AdminArtistsPage() {
  const [rows, setRows] = useState<ArtistRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ArtistRow | null>(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [published, setPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

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
    setImageFile(null);
    setImagePath(null);
    setModalOpen(true);
  }

  function openEdit(row: ArtistRow) {
    setEditing(row);
    setName(row.name);
    setBio(row.bio ?? "");
    setPublished(row.is_published);
    setImageFile(null);
    setImagePath(row.image_path ?? null);
    setModalOpen(true);
  }

  function extFromFilename(filename: string) {
    const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : null;
  }

  async function uploadArtistAvatar(artistId: string, file: File) {
    const ext = extFromFilename(file.name) ?? "jpg";
    const path = `artists/${artistId}.${ext}`;

    const uploadRes = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadRes.error) throw uploadRes.error;
    return uploadRes.data.path as string;
  }

  async function save() {
    setSubmitting(true);
    setError(null);

    const basePayload = {
      name: name.trim(),
      bio: bio.trim() || null,
      is_published: published,
    } as const;

    if (!basePayload.name) {
      setSubmitting(false);
      setError("Name is required.");
      return;
    }

    let artistId = editing?.id ?? null;

    if (editing) {
      const updateRes = await supabase.from("artists").update(basePayload).eq("id", editing.id);
      if (updateRes.error) {
        setSubmitting(false);
        setError(updateRes.error.message);
        return;
      }
      artistId = editing.id;
    } else {
      const insertRes = await supabase.from("artists").insert(basePayload).select("id").single();
      if (insertRes.error) {
        setSubmitting(false);
        setError(insertRes.error.message);
        return;
      }
      artistId = (insertRes.data as { id: string } | null)?.id ?? null;
    }

    if (artistId) {
      try {
        let nextImagePath = imagePath;
        if (imageFile) {
          nextImagePath = await uploadArtistAvatar(artistId, imageFile);
        }

        const imageUpdateRes = await supabase
          .from("artists")
          .update({ image_path: nextImagePath })
          .eq("id", artistId);
        if (imageUpdateRes.error) throw imageUpdateRes.error;
      } catch (e) {
        setSubmitting(false);
        setError(e instanceof Error ? e.message : "Failed to upload artist image");
        return;
      }
    }

    setModalOpen(false);
    await refresh();
    setSubmitting(false);
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

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      (r.bio ?? "").toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  const table = useMemo(() => {
    if (loading) return null;
    if (!filteredRows.length) {
      return (
        <AdminEmpty
          title="No artists yet"
          description="Create an artist or import songs from iTunes (it will auto-create artists)."
        />
      );
    }

    return (
      <DataTable
        rows={filteredRows}
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
  }, [filteredRows, loading]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div className="text-xl font-bold text-text">Admin · Artists</div>
        <AdminButton variant="primary" onClick={openCreate}>
          Add Artist
        </AdminButton>
      </div>

      <SearchBar
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search artists by name or bio..."
      />

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

          <div className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">
              Artist image
            </div>

            <div className="mt-3 flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-full border bg-panel">
                {imagePreviewUrl ? (
                  <img src={imagePreviewUrl} alt="" className="h-full w-full object-cover" />
                ) : imagePath ? (
                  <img
                    src={publicAssetUrl("avatars", imagePath) ?? undefined}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border file:bg-panel file:px-4 file:py-2 file:text-sm file:font-semibold file:text-text hover:file:bg-panel2"
                />

                <div className="flex gap-2">
                  <AdminButton
                    onClick={() => {
                      setImageFile(null);
                      setImagePath(null);
                    }}
                  >
                    Remove image
                  </AdminButton>
                </div>
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
    </div>
  );
}
