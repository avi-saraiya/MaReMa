import Link from "next/link";
import { getUserExchanges, type UserExchange } from "@/lib/impact";
import { formatWeight } from "@/lib/listing";
import { requireUser } from "@/lib/session";

function StatCard({ id, label, value, hint }: { id: string; label: string; value: string; hint: string }) {
  return (
    <div role="group" aria-labelledby={id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p id={id} className="text-sm font-medium text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-emerald-800">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{hint}</p>
    </div>
  );
}

// Describe the exchange from the viewer's side: the supplier is the creator of a SUPPLY listing,
// or the user who accepted a REQUEST listing.
function describeExchange(exchange: UserExchange, userId: string): string {
  const isCreator = exchange.creator.id === userId;
  const other = isCreator ? exchange.acceptedBy?.name : exchange.creator.name;
  const youSupplied = (exchange.type === "SUPPLY") === isCreator;
  return youSupplied ? `You supplied ${other}` : `${other} supplied you`;
}

function ExchangeList({ exchanges, userId, empty }: { exchanges: UserExchange[]; userId: string; empty: string }) {
  if (exchanges.length === 0) return <p className="mt-4 text-sm text-gray-500 italic">{empty}</p>;
  return (
    <ul className="mt-4 space-y-2">
      {exchanges.map((exchange) => (
        <li key={exchange.id}>
          <Link
            href={`/listings/${exchange.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-600 hover:shadow-md focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            <span>
              <span className="block font-medium text-gray-900">{exchange.title}</span>
              <span className="block text-sm text-gray-600">
                {describeExchange(exchange, userId)} · {formatWeight(exchange.weightGrams)}
              </span>
            </span>
            <span aria-hidden className="text-gray-400">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const { stats, completed, inProgress } = await getUserExchanges(user.id);
  const hasUnweighed = completed.some((exchange) => exchange.weightGrams === null);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/" className="text-sm text-emerald-700 hover:text-emerald-900">
        ← Back to home
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Your environmental impact</h1>
      <p className="mt-1 text-gray-600">
        Totals from your completed exchanges, whether you supplied the materials or received them.
      </p>

      <section aria-label="Impact totals" className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          id="stat-weight"
          label="Weight reused"
          value={formatWeight(stats.weightGrams)}
          hint={hasUnweighed ? "Some older listings had no weight and count as 0 kg." : "Kept out of landfill."}
        />
        <StatCard
          id="stat-materials"
          label="Materials reused"
          value={stats.materialsCount.toLocaleString("en-US")}
          hint="Items listed in your completed exchanges."
        />
        <StatCard
          id="stat-exchanges"
          label="Successful exchanges"
          value={stats.exchangesCount.toLocaleString("en-US")}
          hint="Exchanges marked as completed."
        />
      </section>

      <section aria-labelledby="in-progress-heading" className="mt-10">
        <h2 id="in-progress-heading" className="text-xl font-semibold">
          Waiting to be completed
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Accepted exchanges that will count once you or the other person marks them as completed.
        </p>
        <ExchangeList exchanges={inProgress} userId={user.id} empty="You have no accepted exchanges in progress." />
      </section>

      <section aria-labelledby="completed-heading" className="mt-10">
        <h2 id="completed-heading" className="text-xl font-semibold">
          Completed exchanges
        </h2>
        <ExchangeList exchanges={completed} userId={user.id} empty="You haven't completed any exchanges yet." />
      </section>
    </main>
  );
}
