import Link from "next/link";
import { requireUser } from "@/lib/session";
import CreateListingForm from "./CreateListingForm";

export default async function NewListingPage() {
  await requireUser();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/" className="text-sm text-emerald-700 hover:text-emerald-900">
        ← Back to home
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Create a listing</h1>
      <p className="mt-1 text-gray-600">Offer materials you have, or request materials you need.</p>
      <CreateListingForm />
    </main>
  );
}
