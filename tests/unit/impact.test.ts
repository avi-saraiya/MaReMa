import type { User } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getUserExchanges, summarizeImpact } from "@/lib/impact";
import { serializeMaterials } from "@/lib/listing";

describe("summarizeImpact", () => {
  it("returns zeros for no exchanges", () => {
    expect(summarizeImpact([])).toEqual({ weightGrams: 0, materialsCount: 0, exchangesCount: 0 });
  });

  it("sums weight, materials and exchanges, counting a missing weight as 0", () => {
    expect(
      summarizeImpact([
        { materials: serializeMaterials(["Plywood", "Screws"]), weightGrams: 12_500 },
        { materials: serializeMaterials(["Cardboard"]), weightGrams: null },
        { materials: "not json", weightGrams: 500 },
      ]),
    ).toEqual({ weightGrams: 13_000, materialsCount: 3, exchangesCount: 3 });
  });
});

describe("getUserExchanges", () => {
  let alice: User;
  let bob: User;
  let carol: User;

  async function listing(data: {
    type: "SUPPLY" | "REQUEST";
    status: "PENDING" | "ACTIVE" | "COMPLETED";
    creator: User;
    acceptedBy?: User;
    materials: string[];
    weightGrams: number | null;
  }) {
    return db.listing.create({
      data: {
        type: data.type,
        title: `${data.type} ${data.status}`,
        materials: serializeMaterials(data.materials),
        exchangeLocation: "Library",
        priceCents: 0,
        weightGrams: data.weightGrams,
        status: data.status,
        creatorId: data.creator.id,
        acceptedById: data.acceptedBy?.id ?? null,
        acceptedAt: data.acceptedBy ? new Date() : null,
        completedAt: data.status === "COMPLETED" ? new Date() : null,
      },
    });
  }

  beforeEach(async () => {
    await db.listing.deleteMany();
    await db.user.deleteMany();
    [alice, bob, carol] = await Promise.all(
      ["Alice", "Bob", "Carol"].map((name) => db.user.create({ data: { name } })),
    );

    // Alice supplied Bob (Alice created a SUPPLY listing, Bob accepted it).
    await listing({ type: "SUPPLY", status: "COMPLETED", creator: alice, acceptedBy: bob, materials: ["Beakers", "Flasks"], weightGrams: 3_000 });
    // Bob requested and Alice supplied (Bob created a REQUEST listing, Alice accepted it); no weight recorded.
    await listing({ type: "REQUEST", status: "COMPLETED", creator: bob, acceptedBy: alice, materials: ["Cardboard"], weightGrams: null });
    // Carol and Bob completed one that has nothing to do with Alice.
    await listing({ type: "SUPPLY", status: "COMPLETED", creator: carol, acceptedBy: bob, materials: ["Plywood"], weightGrams: 25_000 });
    // Accepted but not completed, and still open: neither counts.
    await listing({ type: "SUPPLY", status: "ACTIVE", creator: alice, acceptedBy: carol, materials: ["Chairs"], weightGrams: 10_000 });
    await listing({ type: "REQUEST", status: "PENDING", creator: alice, materials: ["Desk"], weightGrams: 30_000 });
  });

  it("credits both the supplier and the receiver of each completed exchange", async () => {
    const forAlice = await getUserExchanges(alice.id);
    expect(forAlice.stats).toEqual({ weightGrams: 3_000, materialsCount: 3, exchangesCount: 2 });

    const forBob = await getUserExchanges(bob.id);
    expect(forBob.stats).toEqual({ weightGrams: 28_000, materialsCount: 4, exchangesCount: 3 });

    const forCarol = await getUserExchanges(carol.id);
    expect(forCarol.stats).toEqual({ weightGrams: 25_000, materialsCount: 1, exchangesCount: 1 });
  });

  it("lists accepted exchanges that are still waiting to be completed, for both participants", async () => {
    const forAlice = await getUserExchanges(alice.id);
    const forCarol = await getUserExchanges(carol.id);
    const forBob = await getUserExchanges(bob.id);

    expect(forAlice.inProgress.map((l) => l.title)).toEqual(["SUPPLY ACTIVE"]);
    expect(forCarol.inProgress.map((l) => l.title)).toEqual(["SUPPLY ACTIVE"]);
    expect(forBob.inProgress).toEqual([]);
  });

  it("returns zeros for a user with no exchanges", async () => {
    const dave = await db.user.create({ data: { name: "Dave" } });
    expect((await getUserExchanges(dave.id)).stats).toEqual({ weightGrams: 0, materialsCount: 0, exchangesCount: 0 });
  });
});
