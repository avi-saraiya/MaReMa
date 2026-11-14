import Link from "next/link";
import { logout } from "@/actions/auth";
import { getCurrentUser } from "@/lib/session";

export default async function Header() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <header className="border-b border-gray-200">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-emerald-800">
          MaReMa
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-600">
            Signed in as <span className="font-medium text-gray-900">{user.name}</span>
          </span>
          <form action={logout}>
            <button type="submit" className="rounded-md border border-gray-300 px-3 py-1 hover:bg-gray-100">
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
