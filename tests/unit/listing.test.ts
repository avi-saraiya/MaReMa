import { describe, expect, it } from "vitest";
import {
  formatPrice,
  formatWeight,
  formatWeightCategory,
  parseMaterials,
  serializeMaterials,
  weightCategoryFor,
} from "@/lib/listing";

describe("materials JSON helpers", () => {
  it("round-trips a list of materials", () => {
    const materials = ["Plywood", 'Bolts "M6"', "Ünïcode"];
    expect(parseMaterials(serializeMaterials(materials))).toEqual(materials);
  });

  it("returns an empty list for malformed or non-array JSON", () => {
    expect(parseMaterials("not json")).toEqual([]);
    expect(parseMaterials('{"a":1}')).toEqual([]);
    expect(parseMaterials('["ok", 3, null]')).toEqual(["ok"]);
  });
});

describe("formatPrice", () => {
  it("shows Free for zero and dollars otherwise", () => {
    expect(formatPrice(0)).toBe("Free");
    expect(formatPrice(5)).toBe("$0.05");
    expect(formatPrice(1250)).toBe("$12.50");
  });
});

describe("formatWeightCategory", () => {
  it("shows the label and range for known categories", () => {
    expect(formatWeightCategory("LIGHT")).toBe("Light (under 5 kg)");
    expect(formatWeightCategory("MEDIUM")).toBe("Medium (5–20 kg)");
    expect(formatWeightCategory("HEAVY")).toBe("Heavy (over 20 kg)");
  });

  it("shows Not specified for missing or unknown values", () => {
    expect(formatWeightCategory(null)).toBe("Not specified");
    expect(formatWeightCategory("toString")).toBe("Not specified");
  });
});

describe("weightCategoryFor", () => {
  it("maps grams to categories at the boundaries", () => {
    expect(weightCategoryFor(4_999)).toBe("LIGHT");
    expect(weightCategoryFor(5_000)).toBe("MEDIUM");
    expect(weightCategoryFor(20_000)).toBe("MEDIUM");
    expect(weightCategoryFor(20_001)).toBe("HEAVY");
  });
});

describe("formatWeight", () => {
  it("shows grams as kg, or Not specified when missing", () => {
    expect(formatWeight(12_500)).toBe("12.5 kg");
    expect(formatWeight(1)).toBe("0.001 kg");
    expect(formatWeight(1_250_000)).toBe("1,250 kg");
    expect(formatWeight(null)).toBe("Not specified");
  });
});
