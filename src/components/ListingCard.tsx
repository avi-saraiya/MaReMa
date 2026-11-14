import Link from "next/link";

type ListingCardProps = { id: string; title: string };

export default function ListingCard({ id, title }: ListingCardProps) {
  return (
    <Link
      href={`/listings/${id}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-600 hover:shadow-md focus-visible:outline-2 focus-visible:outline-emerald-600"
    >
      <span className="font-medium text-gray-900">{title}</span>
      <span aria-hidden className="text-gray-400">
        →
      </span>
    </Link>
  );
}
