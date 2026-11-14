import { PrismaClient } from "@prisma/client";
import { serializeMaterials } from "../src/lib/listing";

const db = new PrismaClient();

async function main() {
  const alice = await db.user.upsert({ where: { name: "Alice" }, update: {}, create: { name: "Alice" } });
  const bob = await db.user.upsert({ where: { name: "Bob" }, update: {}, create: { name: "Bob" } });

  await db.listing.deleteMany();
  await db.listing.createMany({
    data: [
      {
        type: "SUPPLY",
        title: "Leftover lab glassware",
        materials: serializeMaterials(["Beakers (250 mL)", "Graduated cylinders", "Petri dishes"]),
        exchangeLocation: "Science Building, Room 102",
        priceCents: 500,
        weightCategory: "LIGHT",
        weightGrams: 3_000,
        creatorId: alice.id,
      },
      {
        type: "SUPPLY",
        title: "Plywood offcuts",
        materials: serializeMaterials(["Plywood sheets", "2x4 offcuts"]),
        exchangeLocation: "Engineering workshop loading dock",
        priceCents: 0,
        weightCategory: "HEAVY",
        weightGrams: 45_000,
        creatorId: bob.id,
      },
      {
        type: "REQUEST",
        title: "Need cardboard for model building",
        materials: serializeMaterials(["Corrugated cardboard", "Foam board"]),
        exchangeLocation: "Architecture studio",
        priceCents: 300,
        weightCategory: "MEDIUM",
        weightGrams: 8_000,
        creatorId: alice.id,
      },
      {
        // A finished exchange so both Alice's and Bob's impact dashboards have something to show.
        type: "SUPPLY",
        title: "Spare textbook shelving",
        materials: serializeMaterials(["Metal shelving unit", "Shelf brackets"]),
        exchangeLocation: "Main library, back entrance",
        priceCents: 1000,
        weightCategory: "HEAVY",
        weightGrams: 32_000,
        status: "COMPLETED",
        creatorId: bob.id,
        acceptedById: alice.id,
        acceptedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ],
  });
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
