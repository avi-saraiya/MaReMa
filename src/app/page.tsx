import Tile from "@/components/Tile";
import { requireUser } from "@/lib/session";

const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export default async function Home() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold">Welcome, {user.name}</h1>
      <p className="mt-2 text-gray-600">Exchange reusable materials across campus.</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Tile
          href="/listings"
          title="View Listings"
          description="Browse materials on offer and requests from across campus."
          icon={
            <svg {...iconProps}>
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          }
        />
        <Tile
          href="/listings/new"
          title="Create Listing"
          description="Offer materials you no longer need, or request ones you do."
          icon={
            <svg {...iconProps}>
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
        />
      </div>
    </main>
  );
}
