export const LISTING_TYPES = ["SUPPLY", "REQUEST"] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const LISTING_STATUSES = ["PENDING", "ACTIVE"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

// SQLite has no array column, so materials are stored as a JSON string.
export function serializeMaterials(materials: string[]): string {
  return JSON.stringify(materials);
}

export function parseMaterials(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((m): m is string => typeof m === "string") : [];
  } catch {
    return [];
  }
}

export function formatPrice(priceCents: number): string {
  return priceCents === 0 ? "Free" : `$${(priceCents / 100).toFixed(2)}`;
}
