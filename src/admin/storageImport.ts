import { supabase } from "../lib/supabaseClient";

function extFromContentType(contentType: string | null) {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("image/png")) return "png";
  if (ct.includes("image/webp")) return "webp";
  if (ct.includes("image/jpeg") || ct.includes("image/jpg")) return "jpg";
  return "jpg";
}

export function toItunesHiResArtwork(url: string) {
  return url.replace(/\/\d+x\d+bb\./, "/600x600bb.");
}

export async function uploadImageFromUrl({
  bucketId,
  url,
  pathWithoutExt,
}: {
  bucketId: string;
  url: string;
  pathWithoutExt: string;
}) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  const blob = await res.blob();

  const ext = extFromContentType(res.headers.get("content-type"));
  const path = `${pathWithoutExt}.${ext}`;

  const upload = await supabase.storage.from(bucketId).upload(path, blob, {
    contentType: res.headers.get("content-type") ?? undefined,
    upsert: true,
  });

  if (upload.error) throw upload.error;
  return path;
}

