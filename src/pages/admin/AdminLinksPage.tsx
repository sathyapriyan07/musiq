import { AdminCard, AdminEmpty } from "../../components/admin/AdminComponents";

export function AdminLinksPage() {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-xl font-bold text-text">Admin · Links</div>
        <div className="text-xs text-muted">Categorized platform links (official, lyrics, etc.).</div>
      </div>

      <AdminCard title="Link sets">
        <AdminEmpty title="No link sets yet" description="Add official/lyrics/live/covers links." />
      </AdminCard>
    </div>
  );
}

