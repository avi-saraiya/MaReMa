import { z } from "zod";
import { LISTING_TYPES } from "@/lib/listing";

export const loginSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter your name.")
    .max(50, "Name must be 50 characters or fewer."),
});

const MAX_PRICE_CENTS = 10_000_00;

// Parse dollars as a string to avoid floating-point rounding (e.g. "19.99" -> 1999).
function dollarsToCents(value: string): number {
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export const createListingSchema = z.object({
  type: z.enum(LISTING_TYPES, {
    errorMap: () => ({ message: "Choose whether you are supplying or requesting materials." }),
  }),
  title: z
    .string()
    .trim()
    .min(1, "Please enter a title.")
    .max(100, "Title must be 100 characters or fewer."),
  materials: z
    .array(z.string().trim().max(100, "Each material must be 100 characters or fewer."))
    .transform((materials) => materials.filter((m) => m.length > 0))
    .pipe(
      z
        .array(z.string())
        .min(1, "Add at least one material.")
        .max(20, "You can list up to 20 materials."),
    ),
  exchangeLocation: z
    .string()
    .trim()
    .min(1, "Please enter an exchange location.")
    .max(200, "Exchange location must be 200 characters or fewer."),
  priceCents: z
    .string()
    .trim()
    .min(1, "Please enter a price (0 for free).")
    .regex(/^\d+(\.\d{1,2})?$/, "Price must be a non-negative amount with at most 2 decimal places.")
    .transform(dollarsToCents)
    .refine((cents) => cents <= MAX_PRICE_CENTS, "Price must be $10,000 or less."),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type CreateListingErrors = Partial<Record<keyof CreateListingInput, string[]>>;

// Shared by the client form and the server action so both validate identical input.
export function readListingForm(formData: FormData) {
  return {
    type: formData.get("type") ?? undefined,
    title: formData.get("title") ?? "",
    materials: formData.getAll("materials"),
    exchangeLocation: formData.get("exchangeLocation") ?? "",
    priceCents: formData.get("price") ?? "",
  };
}
