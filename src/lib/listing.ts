export const LISTING_TYPES = ["SUPPLY", "REQUEST"] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const LISTING_STATUSES = ["PENDING", "ACTIVE"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const WEIGHT_CATEGORIES = ["LIGHT", "MEDIUM", "HEAVY"] as const;
export type WeightCategory = (typeof WEIGHT_CATEGORIES)[number];

export const WEIGHT_CATEGORY_INFO: Record<WeightCategory, { label: string; range: string; hint: string }> = {
  LIGHT: { label: "Light", range: "Under 5 kg", hint: "Easy to carry by hand." },
  MEDIUM: { label: "Medium", range: "5–20 kg", hint: "One person can carry it." },
  HEAVY: { label: "Heavy", range: "Over 20 kg", hint: "Needs help or a vehicle." },
};

// Older listings have no weight category, and unknown values are treated the same way.
export function formatWeightCategory(value: string | null): string {
  const info = (WEIGHT_CATEGORIES as readonly string[]).includes(value ?? "")
    ? WEIGHT_CATEGORY_INFO[value as WeightCategory]
    : undefined;
  return info ? `${info.label} (${info.range.toLowerCase()})` : "Not specified";
}

// Category boundaries: Light < 5 kg, Medium 5–20 kg (inclusive), Heavy > 20 kg.
export function weightCategoryFor(grams: number): WeightCategory {
  if (grams < 5_000) return "LIGHT";
  if (grams <= 20_000) return "MEDIUM";
  return "HEAVY";
}

// Weights are stored as integer grams and shown in kg.
export function formatWeight(grams: number | null): string {
  if (grams === null) return "Not specified";
  return `${(grams / 1000).toLocaleString("en-US", { maximumFractionDigits: 3 })} kg`;
}

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
