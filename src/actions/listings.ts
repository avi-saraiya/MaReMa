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

export type AcceptListingState = { error?: string };

export async function acceptListing(listingId: string): Promise<AcceptListingState> {
  const user = await requireUser();
  if (typeof listingId !== "string") return { error: "Invalid listing." };

  // Single conditional update so two users accepting at once can't both succeed.
  const { count } = await db.listing.updateMany({
    where: { id: listingId, status: "PENDING", creatorId: { not: user.id } },
    data: { status: "ACTIVE", acceptedById: user.id, acceptedAt: new Date() },
  });

  if (count === 0) {
    const listing = await db.listing.findUnique({ where: { id: listingId }, select: { creatorId: true } });
    if (!listing) return { error: "This listing no longer exists." };
    if (listing.creatorId === user.id) return { error: "You can't accept your own listing." };
    return { error: "Someone else has already accepted this listing." };
  }

  revalidatePath("/listings");
  redirect("/listings?accepted=1");
}

export type CompleteExchangeState = { error?: string };

export async function completeExchange(listingId: string): Promise<CompleteExchangeState> {
  const user = await requireUser();
  if (typeof listingId !== "string") return { error: "Invalid listing." };

  // Single conditional update: only an ACTIVE listing, and only by its creator or the user who accepted it.
  const { count } = await db.listing.updateMany({
    where: {
      id: listingId,
      status: "ACTIVE",
      OR: [{ creatorId: user.id }, { acceptedById: user.id }],
    },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  if (count === 0) {
    const listing = await db.listing.findUnique({
      where: { id: listingId },
      select: { status: true, creatorId: true, acceptedById: true },
    });
    if (!listing) return { error: "This listing no longer exists." };
    if (listing.creatorId !== user.id && listing.acceptedById !== user.id) {
      return { error: "Only the people in this exchange can mark it as completed." };
    }
    if (listing.status === "COMPLETED") return { error: "This exchange has already been marked as completed." };
    return { error: "This listing hasn't been accepted yet." };
  }

  revalidatePath(`/listings/${listingId}`);
  return {};
}
