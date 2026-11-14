import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="mx-auto mt-16 max-w-sm p-6">
      <h1 className="text-2xl font-bold">Welcome to MaReMa</h1>
      <p className="mt-1 text-gray-600">Enter your name to start exchanging materials.</p>
      <LoginForm />
    </main>
  );
}
