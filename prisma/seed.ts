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
        creatorId: alice.id,
      },
      {
        type: "SUPPLY",
        title: "Plywood offcuts",
        materials: serializeMaterials(["Plywood sheets", "2x4 offcuts"]),
        exchangeLocation: "Engineering workshop loading dock",
        priceCents: 0,
        weightCategory: "HEAVY",
        creatorId: bob.id,
      },
      {
        type: "REQUEST",
        title: "Need cardboard for model building",
        materials: serializeMaterials(["Corrugated cardboard", "Foam board"]),
        exchangeLocation: "Architecture studio",
        priceCents: 300,
        weightCategory: "MEDIUM",
        creatorId: alice.id,
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
