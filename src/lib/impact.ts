import { db } from "@/lib/db";
import { parseMaterials } from "@/lib/listing";

export type ImpactStats = {
  weightGrams: number;
  materialsCount: number;
  exchangesCount: number;
};

// Totals over a user's completed exchanges. Listings created before weights existed count as 0 g.
export function summarizeImpact(listings: { materials: string; weightGrams: number | null }[]): ImpactStats {
  return listings.reduce<ImpactStats>(
    (totals, listing) => ({
      weightGrams: totals.weightGrams + (listing.weightGrams ?? 0),
      materialsCount: totals.materialsCount + parseMaterials(listing.materials).length,
      exchangesCount: totals.exchangesCount + 1,
    }),
    { weightGrams: 0, materialsCount: 0, exchangesCount: 0 },
  );
}

// A user takes part in an exchange as its creator or as the user who accepted it, whether the
// listing was a Supply or a Request, so both sides of a completed exchange get the same credit.
function participantIn(userId: string) {
  return { OR: [{ creatorId: userId }, { acceptedById: userId }] };
}

const exchangeSelect = {
  id: true,
  type: true,
  title: true,
  materials: true,
  weightGrams: true,
  acceptedAt: true,
  completedAt: true,
  creator: { select: { id: true, name: true } },
  acceptedBy: { select: { id: true, name: true } },
} as const;

export async function getUserExchanges(userId: string) {
  const [completed, inProgress] = await Promise.all([
    db.listing.findMany({
      where: { status: "COMPLETED", ...participantIn(userId) },
      select: exchangeSelect,
      orderBy: { completedAt: "desc" },
    }),
    db.listing.findMany({
      where: { status: "ACTIVE", ...participantIn(userId) },
      select: exchangeSelect,
      orderBy: { acceptedAt: "desc" },
    }),
  ]);
  return { stats: summarizeImpact(completed), completed, inProgress };
}

export type UserExchange = Awaited<ReturnType<typeof getUserExchanges>>["completed"][number];
