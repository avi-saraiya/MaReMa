import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPrice, formatWeight, formatWeightCategory, parseMaterials } from "@/lib/listing";
import { requireUser } from "@/lib/session";
import AcceptButton from "./AcceptButton";
import CompleteButton from "./CompleteButton";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const listing = await db.listing.findUnique({
    where: { id },
    include: { creator: { select: { id: true, name: true } }, acceptedBy: { select: { name: true } } },
  });
  if (!listing) notFound();

  const isSupply = listing.type === "SUPPLY";
  const isPending = listing.status === "PENDING";
  const isActive = listing.status === "ACTIVE";
  const isOwn = listing.creator.id === user.id;
  const isParticipant = isOwn || listing.acceptedById === user.id;
  const statusBadge = isPending
    ? { label: "Pending", className: "bg-amber-100 text-amber-800" }
    : isActive
      ? { label: "Active", className: "bg-sky-100 text-sky-800" }
      : { label: "Completed", className: "bg-emerald-700 text-white" };
  const materials = parseMaterials(listing.materials);

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/listings" className="text-sm text-emerald-700 hover:text-emerald-900">
        ← Back to listings
      </Link>

      <article className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-sm font-medium text-emerald-800">
            {isSupply ? "Materials offered" : "Materials requested"}
          </span>
          <span className={`rounded-full px-3 py-0.5 text-sm font-medium ${statusBadge.className}`}>
            {statusBadge.label}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold">{listing.title}</h1>

        <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-[auto_1fr]">
          <dt className="text-sm font-medium text-gray-500">Materials</dt>
          <dd>
            <ul className="list-inside list-disc">
              {materials.map((material, i) => (
                <li key={i}>{material}</li>
              ))}
            </ul>
          </dd>
          <dt className="text-sm font-medium text-gray-500">Exchange location</dt>
          <dd>{listing.exchangeLocation}</dd>
          <dt className="text-sm font-medium text-gray-500">Price</dt>
          <dd>{formatPrice(listing.priceCents)}</dd>
          <dt className="text-sm font-medium text-gray-500">Weight category</dt>
          <dd>{formatWeightCategory(listing.weightCategory)}</dd>
          <dt className="text-sm font-medium text-gray-500">Weight</dt>
          <dd>{formatWeight(listing.weightGrams)}</dd>
          <dt className="text-sm font-medium text-gray-500">{isSupply ? "Offered by" : "Requested by"}</dt>
          <dd>{listing.creator.name}</dd>
          {listing.acceptedBy && (
            <>
              <dt className="text-sm font-medium text-gray-500">Accepted by</dt>
              <dd>{listing.acceptedBy.name}</dd>
            </>
          )}
          {listing.completedAt && (
            <>
              <dt className="text-sm font-medium text-gray-500">Completed on</dt>
              <dd>{formatDate(listing.completedAt)}</dd>
            </>
          )}
        </dl>

        <div className="mt-8 border-t border-gray-200 pt-6">
          {listing.status === "COMPLETED" ? (
            <p className="text-gray-600">This exchange has been completed.</p>
          ) : isActive && isParticipant ? (
            <CompleteButton listingId={listing.id} />
          ) : isActive ? (
            <p className="text-gray-600">This listing has already been accepted.</p>
          ) : isOwn ? (
            <p className="text-gray-600">This is your listing. Another user can accept it.</p>
          ) : (
            <AcceptButton listingId={listing.id} />
          )}
        </div>
      </article>
    </main>
  );
}
