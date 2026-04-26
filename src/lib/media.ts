import { supabase } from "./supabaseClient";

export function publicAssetUrl(bucketId: string, pathOrUrl: string | null | undefined) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const { data } = supabase.storage.from(bucketId).getPublicUrl(pathOrUrl);
  return data.publicUrl;
}

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function parseYouTubeId(url: string | null | undefined) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return u.pathname.replace("/", "") || null;
    }
    if (u.hostname.includes("youtube.com")) {
      return u.searchParams.get("v") || null;
    }
  } catch {
    // ignore
  }
  return null;
}

