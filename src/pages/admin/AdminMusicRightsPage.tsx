import { AdminCard, AdminEmpty } from "../../components/admin/AdminComponents";

export function AdminMusicRightsPage() {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-xl font-bold text-text">Admin · Music Rights</div>
        <div className="text-xs text-muted">Track ownership and publishing info.</div>
      </div>

      <AdminCard title="Rights">
        <AdminEmpty title="No rights data yet" description="Add rights metadata per song/album." />
      </AdminCard>
    </div>
  );
}

