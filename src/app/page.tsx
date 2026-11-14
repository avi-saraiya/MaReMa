import { requireUser } from "@/lib/session";

export default async function Home() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold">Welcome, {user.name}</h1>
      <p className="mt-2 text-gray-600">Exchange reusable materials across campus.</p>
    </main>
  );
}
