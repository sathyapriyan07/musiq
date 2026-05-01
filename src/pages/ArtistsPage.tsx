import { useEffect, useMemo, useState } from "react";

import { MediaCard } from "../components/MediaCard";
import { PageHeader } from "../components/Page";
import { EmptyState, ErrorState } from "../components/States";
import { publicAssetUrl } from "../lib/media";
import { getArtists, type Artist } from "../lib/publicQueries";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export function ArtistsPage() {
  const [rows, setRows] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        setError(
          "Supabase is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).",
        );
        return;
      }
      setLoading(true);
      setError(null);
      const res = await getArtists();
      if (cancelled) return;
      if (res.error) setError(res.error.message);
      setRows((res.data ?? []) as Artist[]);
      setLoading(false);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(() => {
    return rows.map((a) => (
      <MediaCard
        key={a.id}
        title={a.name}
        subtitle="Artist"
        shape="round"
        to={`/artists/${a.id}`}
        imageUrl={publicAssetUrl("avatars", a.image_path) ?? undefined}
      />
    ));
  }, [rows]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Artists"
        subtitle="Clean profiles with circular artwork."
      />

      {loading ? (
        <div className="p-6 text-sm text-muted">
          Loading...
        </div>
      ) : error ? (
        <ErrorState title="Failed to load artists" description={error} />
      ) : !rows.length ? (
        <EmptyState
          title="No artists found"
          description="Import songs in Admin -> Songs -> Import iTunes, or add artists manually."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">{cards}</div>
      )}
    </div>
  );
}

