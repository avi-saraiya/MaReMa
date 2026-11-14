import { describe, expect, it } from "vitest";
import { createListingSchema, loginSchema, readListingForm } from "@/lib/validation";

function listingForm(overrides: Record<string, string | string[] | undefined> = {}) {
  const values: Record<string, string | string[] | undefined> = {
    type: "SUPPLY",
    title: "Spare chairs",
    materials: ["Chairs", "Cushions"],
    exchangeLocation: "Library",
    price: "12.50",
    weightCategory: "MEDIUM",
    weight: "12.5",
    ...overrides,
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) formData.append(key, v);
  }
  return createListingSchema.safeParse(readListingForm(formData));
}

function firstError(result: ReturnType<typeof listingForm>, field: string) {
  if (result.success) return undefined;
  return (result.error.flatten().fieldErrors as Record<string, string[] | undefined>)[field]?.[0];
}

describe("loginSchema", () => {
  it("trims the name", () => {
    expect(loginSchema.parse({ name: "  Alice  " })).toEqual({ name: "Alice" });
  });

  it("rejects blank and overly long names", () => {
    expect(loginSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(loginSchema.safeParse({ name: "x".repeat(51) }).success).toBe(false);
  });
});

describe("createListingSchema", () => {
  it("accepts a valid listing and converts the price to cents", () => {
    const result = listingForm({ title: "  Spare chairs  ", materials: ["Chairs", "  ", " Desk "] });
    expect(result.success && result.data).toEqual({
      type: "SUPPLY",
      title: "Spare chairs",
      materials: ["Chairs", "Desk"],
      exchangeLocation: "Library",
      priceCents: 1250,
      weightCategory: "MEDIUM",
      weightGrams: 12_500,
    });
  });

  it.each([
    ["0.001", "LIGHT", 1],
    ["4.999", "LIGHT", 4_999],
    ["5", "MEDIUM", 5_000],
    ["20", "MEDIUM", 20_000],
    ["20.001", "HEAVY", 20_001],
    ["10000", "HEAVY", 10_000_000],
  ])("parses weight %s kg in category %s as %i grams", (weight, weightCategory, grams) => {
    const result = listingForm({ weight, weightCategory });
    expect(result.success && result.data.weightGrams).toBe(grams);
  });

  it("rejects a weight outside the chosen category's range", () => {
    const result = listingForm({ weight: "2", weightCategory: "HEAVY" });
    expect(firstError(result, "weightGrams")).toBe(
      "Heavy listings must weigh over 20 kg. Change the weight or the category.",
    );
  });

  it.each([
    ["0", 0],
    ["5.5", 550],
    ["19.99", 1999],
    ["10000", 1_000_000],
  ])("parses price %s as %i cents", (price, cents) => {
    const result = listingForm({ price });
    expect(result.success && result.data.priceCents).toBe(cents);
  });

  it.each([
    ["missing type", { type: undefined }, "type"],
    ["unknown type", { type: "SELL" }, "type"],
    ["empty title", { title: "   " }, "title"],
    ["empty materials list", { materials: [] }, "materials"],
    ["only blank materials", { materials: ["", "  "] }, "materials"],
    ["too many materials", { materials: Array.from({ length: 21 }, (_, i) => `m${i}`) }, "materials"],
    ["empty location", { exchangeLocation: "" }, "exchangeLocation"],
    ["blank price", { price: "" }, "priceCents"],
    ["negative price", { price: "-1" }, "priceCents"],
    ["three decimal places", { price: "1.999" }, "priceCents"],
    ["non-numeric price", { price: "abc" }, "priceCents"],
    ["price over $10,000", { price: "10000.01" }, "priceCents"],
    ["missing weight category", { weightCategory: undefined }, "weightCategory"],
    ["unknown weight category", { weightCategory: "ENORMOUS" }, "weightCategory"],
    ["blank weight", { weight: "" }, "weightGrams"],
    ["zero weight", { weight: "0" }, "weightGrams"],
    ["negative weight", { weight: "-3" }, "weightGrams"],
    ["four decimal places of weight", { weight: "1.0001" }, "weightGrams"],
    ["weight over 10,000 kg", { weight: "10000.001", weightCategory: "HEAVY" }, "weightGrams"],
  ])("rejects %s", (_label, overrides, field) => {
    const result = listingForm(overrides);
    expect(result.success).toBe(false);
    expect(firstError(result, field)).toBeTruthy();
  });
});
