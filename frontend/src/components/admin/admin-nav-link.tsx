"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AdminNavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`relative py-1 font-medium transition-colors ${
        active ? "text-brand" : "text-foreground/70 hover:text-foreground"
      }`}
    >
      {children}
      <span
        className={`absolute -bottom-[13px] left-0 h-0.5 rounded-full bg-brand transition-all duration-300 ${
          active ? "w-full" : "w-0"
        }`}
      />
    </Link>
  );
}
