"use client";

import { useEffect, useState } from "react";
import { Search, LogOut, Volume2, VolumeX } from "lucide-react";
import { isSoundOn, setSoundOn, playClick } from "@/lib/sound";

export function TopBar({ email }: { email: string }) {
  const [sound, setSound] = useState(true);
  useEffect(() => setSound(isSoundOn()), []);

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-bg/85 px-4 backdrop-blur lg:px-6">
      <div className="relative max-w-[240px] flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3"
        />
        <input
          type="search"
          placeholder="Search"
          className="h-8 w-full rounded-md border border-border bg-surface pl-7 pr-2.5 text-sm text-text outline-none placeholder:text-text-3 focus:border-accent"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => {
            const next = !sound;
            setSoundOn(next);
            setSound(next);
            if (next) playClick("soft");
          }}
          title={sound ? "Sound on" : "Sound off"}
          aria-label={sound ? "Mute UI sounds" : "Unmute UI sounds"}
          className="grid size-8 place-items-center rounded-md text-text-3 hover:bg-surface-2 hover:text-text"
        >
          {sound ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>

        <span className="mx-1 hidden text-xs text-text-3 sm:block">{email}</span>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            onPointerDown={() => playClick("tap")}
            className="grid size-8 place-items-center rounded-md text-text-3 hover:bg-surface-2 hover:text-text"
          >
            <LogOut size={15} />
          </button>
        </form>
      </div>
    </header>
  );
}
