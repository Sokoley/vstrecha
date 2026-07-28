"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminHeaderAction() {
  const pathname = usePathname();

  if (pathname === "/admin" || pathname === "/admin/") {
    return null;
  }

  return (
    <Link
      href="/admin"
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-900/75 hover:bg-white hover:text-ink-950"
    >
      Главная
    </Link>
  );
}
