"use client";

import { startTransition, useActionState, useState } from "react";
import { createListing, type CreateListingState } from "@/actions/listings";
import MaterialsInput from "@/components/MaterialsInput";
import { WEIGHT_CATEGORIES, WEIGHT_CATEGORY_INFO } from "@/lib/listing";
import { createListingSchema, readListingForm, type CreateListingErrors } from "@/lib/validation";

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 focus:border-emerald-600 focus:outline-none";

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-red-600">
      {messages[0]}
    </p>
  );
}

export default function CreateListingForm() {
  const [state, formAction, pending] = useActionState<CreateListingState, FormData>(createListing, {});
  const [clientErrors, setClientErrors] = useState<CreateListingErrors | null>(null);
  const errors = clientErrors ?? state.errors ?? {};

  // Validate with the shared schema first; dispatching manually also stops React from resetting the form on a server error.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = createListingSchema.safeParse(readListingForm(formData));
    if (!result.success) {
      setClientErrors(result.error.flatten().fieldErrors);
      return;
    }
    setClientErrors(null);
    startTransition(() => formAction(formData));
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">
      <fieldset aria-describedby="type-error">
        <legend className="text-sm font-medium">What would you like to do?</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {[
            { value: "SUPPLY", label: "Supply materials", hint: "I have materials to give away or sell." },
            { value: "REQUEST", label: "Request materials", hint: "I need materials from someone else." },
          ].map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer gap-3 rounded-lg border border-gray-300 p-3 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50"
            >
              <input type="radio" name="type" value={option.value} className="mt-1 accent-emerald-700" />
              <span>
                <span className="block font-medium">{option.label}</span>
                <span className="block text-sm text-gray-600">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError id="type-error" messages={errors.type} />
      </fieldset>

      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input id="title" name="title" type="text" maxLength={100} aria-describedby="title-error" className={`mt-1 ${inputClass}`} />
        <FieldError id="title-error" messages={errors.title} />
      </div>

      <div>
        <span className="block text-sm font-medium">Materials</span>
        <div className="mt-1">
          <MaterialsInput inputClassName={inputClass} describedBy="materials-error" />
        </div>
        <FieldError id="materials-error" messages={errors.materials} />
      </div>

      <div>
        <label htmlFor="exchangeLocation" className="block text-sm font-medium">
          Exchange location
        </label>
        <input
          id="exchangeLocation"
          name="exchangeLocation"
          type="text"
          maxLength={200}
          placeholder="e.g. Science Building, Room 102"
          aria-describedby="exchangeLocation-error"
          className={`mt-1 ${inputClass}`}
        />
        <FieldError id="exchangeLocation-error" messages={errors.exchangeLocation} />
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium">
          Price ($)
        </label>
        <input
          id="price"
          name="price"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.01}
          placeholder="0.00"
          aria-describedby="price-hint price-error"
          className={`mt-1 ${inputClass} sm:max-w-40`}
        />
        <p id="price-hint" className="mt-1 text-sm text-gray-500">
          Enter 0 if the materials are free.
        </p>
        <FieldError id="price-error" messages={errors.priceCents} />
      </div>

      <fieldset aria-describedby="weightCategory-error">
        <legend className="text-sm font-medium">Weight category</legend>
        <p className="text-sm text-gray-500">Roughly how heavy are the materials in total?</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {WEIGHT_CATEGORIES.map((value) => {
            const { label, range, hint } = WEIGHT_CATEGORY_INFO[value];
            return (
              <label
                key={value}
                className="flex cursor-pointer gap-3 rounded-lg border border-gray-300 p-3 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50"
              >
                <input type="radio" name="weightCategory" value={value} className="mt-1 accent-emerald-700" />
                <span>
                  <span className="block font-medium">{label}</span>
                  <span className="block text-sm text-gray-600">
                    {range}. {hint}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <FieldError id="weightCategory-error" messages={errors.weightCategory} />
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-700 px-5 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create listing"}
      </button>
    </form>
  );
}
