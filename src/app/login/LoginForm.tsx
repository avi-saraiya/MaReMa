"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/actions/auth";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Your name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={50}
          autoFocus
          autoComplete="name"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-emerald-600 focus:outline-none"
        />
        {state.error && (
          <p role="alert" className="mt-1 text-sm text-red-600">
            {state.error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
