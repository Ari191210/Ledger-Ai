"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LayoutGrid,
  TrendingUp,
  Settings,
  type LucideIcon,
} from "lucide-react";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tools", label: "Tools", icon: LayoutGrid },
  { href: "/score", label: "Score", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function IconRail() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-y-0 left-0 z-40 flex w-[68px] flex-col items-center border-r border-border bg-surface py-4">
      <Link
        href="/dashboard"
        aria-label="StudyLedger"
        className="mb-6 grid size-9 place-items-center rounded-md bg-accent text-sm font-extrabold text-accent-on"
      >
        S
      </Link>

      <ul className="flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                title={label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`group grid size-11 place-items-center rounded-lg transition-colors ${
                  active
                    ? "bg-accent-weak text-accent"
                    : "text-text-3 hover:bg-surface-2 hover:text-text"
                }`}
              >
                <Icon size={20} strokeWidth={2} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
