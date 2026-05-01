import { Link } from "react-router-dom";
import { AdminButton, AdminCard } from "../../components/admin/AdminComponents";

export function AdminHome() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-bold text-text">Admin</div>
          <div className="text-xs text-muted">Manage content and homepage sections.</div>
        </div>
        <Link
          to="/"
          className="inline-flex h-10 items-center justify-center rounded-full border bg-panel px-4 text-sm font-semibold text-text hover:bg-panel2 surface"
        >
          Back to Website
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AdminCard
          title="Quick links"
          action={
            <Link to="/admin/homepage-sections">
              <AdminButton variant="primary">Homepage Sections</AdminButton>
            </Link>
          }
        >
          <div className="text-sm text-muted">
            Import from iTunes / MusicBrainz / Deezer and curate what shows on the
            homepage.
          </div>
        </AdminCard>

        <AdminCard title="Status">
          <div className="text-sm text-muted">
            RLS + Storage buckets + Auth will be configured in Supabase.
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

