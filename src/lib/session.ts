import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

// Kept in sync with src/middleware.ts, which can't import Prisma-dependent modules.
export const SESSION_COOKIE = "userId";

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;

export async function setSession(userId: string) {
  (await cookies()).set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS_IN_SECONDS,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

// Returns null when there is no cookie or it points to a user that no longer exists (e.g. after a DB reset).
export async function getCurrentUser() {
  const userId = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
