"use client";

import { useActionState } from "react";
import { acceptListing, type AcceptListingState } from "@/actions/listings";

export default function AcceptButton({ listingId }: { listingId: string }) {
  const [state, formAction, pending] = useActionState<AcceptListingState>(
    acceptListing.bind(null, listingId),
    {},
  );

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-700 px-6 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Accepting…" : "Accept"}
      </button>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
