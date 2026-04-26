import { useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminEmpty,
  AdminModal,
} from "../../components/admin/AdminComponents";

export function AdminHomepageSectionsPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xl font-bold text-text">Admin · Homepage Sections</div>
          <div className="text-xs text-muted">
            Curate featured sections (songs, albums, artists, videos).
          </div>
        </div>
        <AdminButton variant="primary" onClick={() => setOpen(true)}>
          Add Section
        </AdminButton>
      </div>

      <AdminCard title="Sections">
        <AdminEmpty
          title="No homepage sections yet"
          description="Create a section to control what appears on Home."
        />
      </AdminCard>

      <AdminModal
        open={open}
        title="Add homepage section"
        onClose={() => setOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton onClick={() => setOpen(false)}>Cancel</AdminButton>
            <AdminButton variant="primary" onClick={() => setOpen(false)}>
              Save
            </AdminButton>
          </div>
        }
      >
        <div className="text-sm text-muted">
          This modal will contain the section editor (type, title, filters, order).
        </div>
      </AdminModal>
    </div>
  );
}

