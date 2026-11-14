import Link from "next/link";
import ListingCard from "@/components/ListingCard";
import { db } from "@/lib/db";
import type { ListingType } from "@/lib/listing";
import { requireUser } from "@/lib/session";

const SECTIONS: { type: ListingType; heading: string; description: string; empty: string }[] = [
  {
    type: "SUPPLY",
    heading: "Materials offered",
    description: "People on campus who have materials to give away or sell.",
    empty: "No materials are on offer right now.",
  },
  {
    type: "REQUEST",
    heading: "Materials requested",
    description: "People on campus who are looking for materials.",
    empty: "No one is requesting materials right now.",
  },
];

export default async function ListingsPage() {
  await requireUser();

  // Only pending listings are shown; accepted (ACTIVE) ones stay in the database but drop out of this view.
  const listings = await db.listing.findMany({
    where: { status: "PENDING" },
    select: { id: true, title: true, type: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-5xl p-8">
      <Link href="/" className="text-sm text-emerald-700 hover:text-emerald-900">
        ← Back to home
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Current listings</h1>
          <p className="mt-1 text-gray-600">Select a listing to see its details.</p>
        </div>
        <Link
          href="/listings/new"
          className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800"
        >
          Create listing
        </Link>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {SECTIONS.map((section) => {
          const items = listings.filter((l) => l.type === section.type);
          const headingId = `${section.type.toLowerCase()}-heading`;
          return (
            <section key={section.type} aria-labelledby={headingId} className="rounded-xl bg-gray-50 p-5">
              <h2 id={headingId} className="flex items-center gap-2 text-xl font-semibold">
                {section.heading}
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-sm font-medium text-emerald-800">
                  {items.length}
                </span>
              </h2>
              <p className="mt-1 text-sm text-gray-600">{section.description}</p>
              {items.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500 italic">{section.empty}</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {items.map((listing) => (
                    <li key={listing.id}>
                      <ListingCard id={listing.id} title={listing.title} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
