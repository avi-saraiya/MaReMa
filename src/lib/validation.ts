import { z } from "zod";
import { LISTING_TYPES, WEIGHT_CATEGORIES, WEIGHT_CATEGORY_INFO, weightCategoryFor } from "@/lib/listing";

export const loginSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter your name.")
    .max(50, "Name must be 50 characters or fewer."),
});

const MAX_PRICE_CENTS = 10_000_00;
const MAX_WEIGHT_GRAMS = 10_000_000; // 10,000 kg

// Parse a decimal string into integer minor units without floating-point rounding
// (e.g. dollars "19.99" -> 1999 cents with places = 2, kg "2.5" -> 2500 g with places = 3).
function decimalToMinorUnits(value: string, places: number): number {
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 10 ** places + Number(fraction.padEnd(places, "0"));
}

const listingFieldsSchema = z.object({
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
    .transform((value) => decimalToMinorUnits(value, 2))
    .refine((cents) => cents <= MAX_PRICE_CENTS, "Price must be $10,000 or less."),
  weightCategory: z.enum(WEIGHT_CATEGORIES, {
    errorMap: () => ({ message: "Choose a weight category." }),
  }),
  weightGrams: z
    .string()
    .trim()
    .min(1, "Please enter the weight in kg.")
    .regex(/^\d+(\.\d{1,3})?$/, "Weight must be a positive number of kg with at most 3 decimal places.")
    .transform((value) => decimalToMinorUnits(value, 3))
    .refine((grams) => grams > 0, "Weight must be more than 0 kg.")
    .refine((grams) => grams <= MAX_WEIGHT_GRAMS, "Weight must be 10,000 kg or less."),
});

// The exact weight must fall inside the chosen category's range. Zod only runs this once every field is valid.
export const createListingSchema = listingFieldsSchema.superRefine((listing, ctx) => {
  if (weightCategoryFor(listing.weightGrams) !== listing.weightCategory) {
    const { label, range } = WEIGHT_CATEGORY_INFO[listing.weightCategory];
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["weightGrams"],
      message: `${label} listings must weigh ${range.toLowerCase()}. Change the weight or the category.`,
    });
  }
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
    weightCategory: formData.get("weightCategory") ?? undefined,
    weightGrams: formData.get("weight") ?? "",
  };
}
