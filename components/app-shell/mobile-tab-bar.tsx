"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LayoutGrid, TrendingUp, Settings, type LucideIcon } from "lucide-react";
import { playClick } from "@/lib/sound";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tools", label: "Tools", icon: LayoutGrid },
  { href: "/score", label: "Score", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

// The icon rail (components/app-shell/icon-rail.tsx) doesn't fit a phone
// screen, this is its mobile equivalent, a fixed bottom tab bar, same 4
// destinations. Only one of the two ever renders (rail hidden below md,
// this hidden at md and up, see app/(app)/layout.tsx).
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            onPointerDown={() => playClick("nav")}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 ${
              active ? "text-accent-strong" : "text-text-3"
            }`}
          >
            <Icon size={20} strokeWidth={2} />
            <span className="u-label text-[0.6rem]">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
