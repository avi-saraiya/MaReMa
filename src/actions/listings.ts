"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { serializeMaterials } from "@/lib/listing";
import { requireUser } from "@/lib/session";
import { createListingSchema, readListingForm, type CreateListingErrors } from "@/lib/validation";

export type CreateListingState = { errors?: CreateListingErrors };

export async function createListing(_prev: CreateListingState, formData: FormData): Promise<CreateListingState> {
  const user = await requireUser();

  const parsed = createListingSchema.safeParse(readListingForm(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const { materials, ...rest } = parsed.data;
  await db.listing.create({
    data: { ...rest, materials: serializeMaterials(materials), creatorId: user.id },
  });

  revalidatePath("/listings");
  redirect("/listings");
}
