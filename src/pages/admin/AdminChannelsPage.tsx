import { useEffect, useMemo, useState } from "react";
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
import { listChannels, type ChannelRow } from "../../admin/supabaseAdmin";

export function AdminChannelsPage() {
  const [rows, setRows] = useState<ChannelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChannelRow | null>(null);

  const [name, setName] = useState("");
  const [published, setPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  async function refresh() {
    setLoading(true);
    setError(null);
    const res = await listChannels();
    if (res.error) setError(res.error.message);
    setRows((res.data ?? []) as ChannelRow[]);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setPublished(true);
    setLogoFile(null);
    setLogoPath(null);
    setModalOpen(true);
  }

  function openEdit(row: ChannelRow) {
    setEditing(row);
    setName(row.name);
    setPublished(row.is_published);
    setLogoFile(null);
    setLogoPath(row.logo_path ?? null);
    setModalOpen(true);
  }

  function extFromFilename(filename: string) {
    const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : null;
  }

  async function uploadChannelLogo(channelId: string, file: File) {
    const ext = extFromFilename(file.name) ?? "jpg";
    const path = `channels/${channelId}.${ext}`;

    const uploadRes = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (uploadRes.error) throw uploadRes.error;
    return uploadRes.data.path as string;
  }

  async function save() {
    setSubmitting(true);
    setError(null);

    const basePayload = {
      name: name.trim(),
      is_published: published,
    } as const;

    if (!basePayload.name) {
      setSubmitting(false);
      setError("Name is required.");
      return;
    }

    let channelId = editing?.id ?? null;

    if (editing) {
      const updateRes = await supabase.from("channels").update(basePayload).eq("id", editing.id);
      if (updateRes.error) {
        setSubmitting(false);
        setError(updateRes.error.message);
        return;
      }
      channelId = editing.id;
    } else {
      const insertRes = await supabase.from("channels").insert(basePayload).select("id").single();
      if (insertRes.error) {
        setSubmitting(false);
        setError(insertRes.error.message);
        return;
      }
      channelId = (insertRes.data as { id: string } | null)?.id ?? null;
    }

    if (channelId) {
      try {
        let nextLogoPath = logoPath;
        if (logoFile) {
          nextLogoPath = await uploadChannelLogo(channelId, logoFile);
        }

        const logoUpdateRes = await supabase
          .from("channels")
          .update({ logo_path: nextLogoPath })
          .eq("id", channelId);
        if (logoUpdateRes.error) throw logoUpdateRes.error;
      } catch (e) {
        setSubmitting(false);
        setError(e instanceof Error ? e.message : "Failed to upload channel logo");
        return;
      }
    }

    setModalOpen(false);
    await refresh();
    setSubmitting(false);
  }

  async function remove(row: ChannelRow) {
    if (!confirm(`Delete channel "${row.name}"?`)) return;
    const res = await supabase.from("channels").delete().eq("id", row.id);
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
          title="No channels yet"
          description="Create a channel, then assign it to songs/albums in Admin."
        />
      );
    }

    return (
      <DataTable
        rows={rows}
        keyForRow={(r) => r.id}
        columns={[
          {
            key: "logo",
            header: "Logo",
            cell: (r) => {
              const url = publicAssetUrl("logos", r.logo_path);
              return url ? (
                <img src={url} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                "—"
              );
            },
          },
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

  const displayedLogoUrl = logoPreviewUrl ?? publicAssetUrl("logos", logoPath);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-bold text-text">Admin · Channels</div>
          <div className="text-xs text-muted">Rights holders for songs and albums.</div>
        </div>
        <AdminButton variant="primary" onClick={openCreate}>
          Add channel
        </AdminButton>
      </div>

      {error ? <ErrorState title="Error" description={error} /> : null}

      <AdminCard title="Channels">{table}</AdminCard>

      <AdminModal
        open={modalOpen}
        title={editing ? "Edit channel" : "Add channel"}
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
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
              placeholder="Channel name"
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Logo</div>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 overflow-hidden rounded-full bg-panel2">
                {displayedLogoUrl ? (
                  <img src={displayedLogoUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="mt-2 text-xs text-muted">
              Uses Storage bucket <span className="text-text">logos</span> (path:{" "}
              <span className="text-text">channels/&lt;id&gt;.&lt;ext&gt;</span>). You can also paste a URL/path below.
            </div>
            <input
              value={logoPath ?? ""}
              onChange={(e) => setLogoPath(e.target.value || null)}
              className="mt-2 h-11 w-full rounded-xl border bg-panel px-4 text-sm text-text outline-none"
              placeholder="Logo URL or storage path (optional)"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Published
          </label>
        </div>
      </AdminModal>
    </div>
  );
}

