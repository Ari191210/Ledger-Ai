"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  LayoutGrid,
  TrendingUp,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { playClick } from "@/lib/sound";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tools", label: "Tools", icon: LayoutGrid },
  { href: "/score", label: "Score", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function IconRail() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-y-0 left-0 z-40 flex w-[60px] flex-col items-center border-r border-border bg-surface py-3">
      <Link
        href="/dashboard"
        aria-label="StudyLedger"
        onPointerDown={() => playClick("nav")}
        className="mb-4 grid size-8 place-items-center rounded-md bg-accent text-sm font-extrabold text-accent-on"
      >
        S
      </Link>

      <ul className="flex flex-1 flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="relative">
              {active && (
                <motion.span
                  layoutId="rail-active"
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-accent"
                  transition={{ type: "spring", stiffness: 500, damping: 34 }}
                />
              )}
              <Link
                href={href}
                title={label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                onPointerDown={() => playClick("nav")}
                className={`grid size-10 place-items-center rounded-lg transition-colors ${
                  active
                    ? "bg-accent-weak text-accent"
                    : "text-text-3 hover:bg-surface-2 hover:text-text"
                }`}
              >
                <Icon size={19} strokeWidth={2} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
