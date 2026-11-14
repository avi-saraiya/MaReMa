"use client";

import { useActionState } from "react";
import { completeExchange, type CompleteExchangeState } from "@/actions/listings";

export default function CompleteButton({ listingId }: { listingId: string }) {
  const [state, formAction, pending] = useActionState<CompleteExchangeState>(
    completeExchange.bind(null, listingId),
    {},
  );

  return (
    <form action={formAction}>
      <p className="mb-3 text-gray-600">
        Once the materials have changed hands, mark the exchange as completed so it counts towards both of your
        environmental impact totals.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-700 px-6 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Mark as completed"}
      </button>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
