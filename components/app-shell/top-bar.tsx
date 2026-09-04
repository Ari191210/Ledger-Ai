"use client";

import { Search, LogOut } from "lucide-react";

export function TopBar({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-bg/80 px-6 backdrop-blur lg:px-10">
      <div className="relative max-w-xs flex-1">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-3"
        />
        <input
          type="search"
          placeholder="Search"
          className="w-full rounded-md border border-border bg-surface py-1.5 pl-8 pr-3 text-sm text-text outline-none placeholder:text-text-3 focus:border-accent"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-xs text-text-3 sm:block">{email}</span>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className="grid size-8 place-items-center rounded-md text-text-3 hover:bg-surface-2 hover:text-text"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </header>
  );
}
