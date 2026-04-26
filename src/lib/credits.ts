export type CreditArtist = {
  id: string;
  name: string;
  image_path: string | null;
};

export type CreditRow = {
  artist_id: string;
  artist: CreditArtist | CreditArtist[] | null;
  sort_order: number | null;
};

export function creditArtist(credit: CreditRow): CreditArtist | null {
  if (!credit.artist) return null;
  return Array.isArray(credit.artist) ? credit.artist[0] ?? null : credit.artist;
}

export function formatCreditNames(credits: CreditRow[]): string | null {
  const names = credits
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((c) => creditArtist(c)?.name ?? "")
    .filter(Boolean);

  return names.length ? names.join(", ") : null;
}

