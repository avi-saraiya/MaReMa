import { describe, expect, it } from "vitest";
import { formatPrice, parseMaterials, serializeMaterials } from "@/lib/listing";

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
