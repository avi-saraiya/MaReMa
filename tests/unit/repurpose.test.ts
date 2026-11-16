import Anthropic from "@anthropic-ai/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RepurposeAnalysis } from "@/lib/repurpose";
import { MAX_PHOTO_BYTES, photoSchema } from "@/lib/validation";

// The Claude call itself is mocked; these tests cover validation, error mapping and normalization.
const mocks = vi.hoisted(() => ({
  loggedIn: true,
  analyze: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  requireUser: async () => {
    if (!mocks.loggedIn) throw new Error("REDIRECT:/login");
    return { id: "user-1", name: "Alice" };
  },
}));
vi.mock("@/lib/repurpose", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/repurpose")>()),
  analyzeMaterialsPhoto: mocks.analyze,
}));

const { analyzePhoto } = await import("@/actions/repurpose");
const { normalizeAnalysis } = await import("@/lib/repurpose");

const ANALYSIS: RepurposeAnalysis = {
  notMaterials: false,
  objects: [{ name: "Glass jars", material: "glass" }],
  repurposable: true,
  summary: "Jars are reusable.",
  ideas: [{ title: "Storage", description: "Store small parts." }],
  suggestedTitle: "Glass jars",
};

function photo(type = "image/jpeg", bytes = 10) {
  return new File([new Uint8Array(bytes)], "photo", { type });
}

function photoForm(file: File | string | null) {
  const fd = new FormData();
  if (file !== null) fd.set("photo", file);
  return fd;
}

beforeEach(() => {
  mocks.loggedIn = true;
  mocks.analyze.mockReset();
});

describe("photoSchema", () => {
  it.each(["image/jpeg", "image/png", "image/webp", "image/gif"])("accepts %s", (type) => {
    expect(photoSchema.safeParse(photo(type)).success).toBe(true);
  });

  it.each([
    ["a missing photo", null, "Choose a photo to analyze."],
    ["a text value", "not a file", "Choose a photo to analyze."],
    ["an empty file", photo("image/jpeg", 0), "Choose a photo to analyze."],
    ["a PDF", photo("application/pdf"), "The photo must be a JPEG, PNG, WebP or GIF image."],
    ["an oversized photo", photo("image/jpeg", MAX_PHOTO_BYTES + 1), "The photo must be 4 MB or smaller."],
  ])("rejects %s", (_label, value, message) => {
    const result = photoSchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(message);
  });
});

describe("analyzePhoto", () => {
  it("sends a valid photo as base64 and returns the analysis", async () => {
    mocks.analyze.mockResolvedValue({ analysis: ANALYSIS });
    const file = new File([new Uint8Array([1, 2, 3])], "photo", { type: "image/png" });

    expect(await analyzePhoto({}, photoForm(file))).toEqual({ analysis: ANALYSIS });
    expect(mocks.analyze).toHaveBeenCalledWith("AQID", "image/png");
  });

  it("returns a validation error without calling Claude", async () => {
    expect(await analyzePhoto({}, photoForm(photo("text/plain")))).toEqual({
      error: "The photo must be a JPEG, PNG, WebP or GIF image.",
    });
    expect(mocks.analyze).not.toHaveBeenCalled();
  });

  it("requires a logged-in user", async () => {
    mocks.loggedIn = false;
    await expect(analyzePhoto({}, photoForm(photo()))).rejects.toThrow("REDIRECT:/login");
    expect(mocks.analyze).not.toHaveBeenCalled();
  });

  it("passes through an error from the analyzer, such as a refusal", async () => {
    mocks.analyze.mockResolvedValue({ error: "This photo couldn't be analyzed." });
    expect(await analyzePhoto({}, photoForm(photo()))).toEqual({ error: "This photo couldn't be analyzed." });
  });

  it.each([
    [429, "The photo checker is busy right now. Please try again in a minute."],
    [401, "The photo checker isn't set up yet. You can still create your listing."],
    [500, "The photo couldn't be analyzed. Please try again."],
  ])("maps an API %i error to a friendly message", async (status, message) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.analyze.mockRejectedValue(Anthropic.APIError.generate(status, undefined, "boom", new Headers()));
    expect(await analyzePhoto({}, photoForm(photo()))).toEqual({ error: message });
  });

  it("maps an unexpected error to a friendly message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.analyze.mockRejectedValue(new Error("network down"));
    expect(await analyzePhoto({}, photoForm(photo()))).toEqual({
      error: "The photo checker isn't available right now. You can still create your listing.",
    });
  });
});

describe("normalizeAnalysis", () => {
  it("caps objects, names, ideas and the title to the listing form's limits", () => {
    const result = normalizeAnalysis({
      ...ANALYSIS,
      objects: Array.from({ length: 25 }, (_, i) => ({ name: `${i}`.padEnd(150, "x"), material: "wood" })),
      ideas: Array.from({ length: 8 }, (_, i) => ({ title: `Idea ${i}`, description: "..." })),
      suggestedTitle: "t".repeat(150),
    });
    expect(result.objects).toHaveLength(20);
    expect(result.objects[0].name).toHaveLength(100);
    expect(result.ideas).toHaveLength(5);
    expect(result.suggestedTitle).toHaveLength(100);
  });

  it("drops ideas when the materials are not repurposable", () => {
    expect(normalizeAnalysis({ ...ANALYSIS, repurposable: false }).ideas).toEqual([]);
  });
});
