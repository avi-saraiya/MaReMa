import Link from "next/link";

type TileProps = {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
};

export default function Tile({ href, title, description, icon }: TileProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-emerald-600 hover:shadow-md focus-visible:outline-2 focus-visible:outline-emerald-600"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100">
        {icon}
      </span>
      <span className="text-xl font-semibold text-gray-900">{title}</span>
      <span className="text-sm text-gray-600">{description}</span>
    </Link>
  );
}
