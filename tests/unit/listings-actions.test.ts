import type { User } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Server-action dependencies that need a Next.js request context are mocked; the database is real (prisma/test.db).
const session = vi.hoisted(() => ({ user: null as User | null }));

vi.mock("@/lib/session", () => ({
  requireUser: async () => {
    if (!session.user) throw new Error("REDIRECT:/login");
    return session.user;
  },
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { acceptListing, createListing } = await import("@/actions/listings");
const { db } = await import("@/lib/db");

let alice: User;
let bob: User;
let carol: User;
let listingId: string;

beforeEach(async () => {
  await db.listing.deleteMany();
  await db.user.deleteMany();
  [alice, bob, carol] = await Promise.all(
    ["Alice", "Bob", "Carol"].map((name) => db.user.create({ data: { name } })),
  );
  const listing = await db.listing.create({
    data: {
      type: "SUPPLY",
      title: "Lab glassware",
      materials: '["Beakers"]',
      exchangeLocation: "Science Building",
      priceCents: 500,
      creatorId: alice.id,
    },
  });
  listingId = listing.id;
  session.user = null;
});

function formData(values: Record<string, string | string[]>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const v of Array.isArray(value) ? value : [value]) fd.append(key, v);
  }
  return fd;
}

describe("createListing", () => {
  it("creates a PENDING listing owned by the current user and redirects to /listings", async () => {
    session.user = bob;
    const fd = formData({
      type: "REQUEST",
      title: "Need cardboard",
      materials: ["Cardboard", ""],
      exchangeLocation: "Studio",
      price: "0",
    });

    await expect(createListing({}, fd)).rejects.toThrow("REDIRECT:/listings");

    const created = await db.listing.findFirstOrThrow({ where: { title: "Need cardboard" } });
    expect(created).toMatchObject({
      type: "REQUEST",
      materials: '["Cardboard"]',
      exchangeLocation: "Studio",
      priceCents: 0,
      status: "PENDING",
      creatorId: bob.id,
      acceptedById: null,
    });
  });

  it("returns field errors and creates nothing for invalid input", async () => {
    session.user = bob;
    const result = await createListing({}, formData({ type: "SELL", title: "", price: "-1" }));

    expect(Object.keys(result.errors ?? {}).sort()).toEqual(
      ["exchangeLocation", "materials", "priceCents", "title", "type"].sort(),
    );
    expect(await db.listing.count()).toBe(1);
  });

  it("requires a logged-in user", async () => {
    await expect(createListing({}, formData({}))).rejects.toThrow("REDIRECT:/login");
  });
});

describe("acceptListing", () => {
  it("lets another user accept, recording who accepted and when", async () => {
    session.user = bob;
    await expect(acceptListing(listingId)).rejects.toThrow("REDIRECT:/listings?accepted=1");

    const listing = await db.listing.findUniqueOrThrow({ where: { id: listingId } });
    expect(listing.status).toBe("ACTIVE");
    expect(listing.acceptedById).toBe(bob.id);
    expect(listing.acceptedAt).toBeInstanceOf(Date);
  });

  it("refuses the creator's own listing", async () => {
    session.user = alice;
    expect(await acceptListing(listingId)).toEqual({ error: "You can't accept your own listing." });
    expect((await db.listing.findUniqueOrThrow({ where: { id: listingId } })).status).toBe("PENDING");
  });

  it("refuses a listing that is already ACTIVE", async () => {
    session.user = bob;
    await expect(acceptListing(listingId)).rejects.toThrow("REDIRECT");

    session.user = carol;
    expect(await acceptListing(listingId)).toEqual({ error: "Someone else has already accepted this listing." });
    const listing = await db.listing.findUniqueOrThrow({ where: { id: listingId } });
    expect(listing.acceptedById).toBe(bob.id);
  });

  it("reports a listing that does not exist", async () => {
    session.user = bob;
    expect(await acceptListing("00000000-0000-0000-0000-000000000000")).toEqual({
      error: "This listing no longer exists.",
    });
  });

  it("lets exactly one of two concurrent accepts succeed", async () => {
    // requireUser is read synchronously at call time, so swap the user between the two calls.
    session.user = bob;
    const first = acceptListing(listingId);
    session.user = carol;
    const second = acceptListing(listingId);
    const results = await Promise.allSettled([first, second]);

    const succeeded = results.filter((r) => r.status === "rejected" && String(r.reason).includes("REDIRECT"));
    const refused = results.filter((r) => r.status === "fulfilled" && r.value.error);
    expect(succeeded).toHaveLength(1);
    expect(refused).toHaveLength(1);

    const listing = await db.listing.findUniqueOrThrow({ where: { id: listingId } });
    expect(listing.status).toBe("ACTIVE");
    expect([bob.id, carol.id]).toContain(listing.acceptedById);
  });
});
