"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clearSession, setSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ name: formData.get("name") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Names are unique: logging in with an existing name reuses that user's UUID.
  const { name } = parsed.data;
  const user = await db.user.upsert({ where: { name }, update: {}, create: { name } });

  await setSession(user.id);
  redirect("/");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
