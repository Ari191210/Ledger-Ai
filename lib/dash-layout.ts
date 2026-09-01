/**
 * M22-2 — REBUILT per Part S.6's note. This file used to hold five untyped
 * booleans in a browser-storage cache keyed by a per-device dashboard-layout
 * string (`recommendation | recent | score | exams | features`) — unsynced
 * across devices, no ordering, no sizing, no registry (M.2's "CURRENT FACT —
 * the gap"). That mechanism is gone. What is here now is a thin client
 * adapter over the server-persisted
 * `HomeLayout` (`app/api/home-layout/route.ts`, `034_home_layout.sql`) —
 * every consumer that used to call `getDashLayout()/saveDashLayout()`
 * synchronously against device-local browser storage now calls
 * `fetchHomeLayout()` / `saveHomeLayout()`, which are async and hit the
 * account, not the device.
 * That is the whole point: layout now survives a device change.
 *
 * The pure merge, registry and importance logic all live in `lib/home/*`
 * (`lib/home/registry.ts`, `lib/home/layout.ts`, `lib/home/importance.ts`) —
 * this file is I/O only, mirroring the split every other M19–M22 module in
 * this codebase draws between a pure engine and its network-facing caller.
 */

import { defaultHomeLayout, listHomeComponents, validateHomeLayout } from "@/lib/home";
import type { HomeComponentId, HomeLayout } from "@/lib/home";

export type { HomeComponentId, HomeLayout };
export { listHomeComponents };

/** Reads the student's server-persisted layout. Requires an access token —
 *  the same Bearer pattern every other authenticated client read in this
 *  codebase uses (`app/today/page.tsx`, `app/parent/page.tsx`). Falls back to
 *  registry defaults on any failure — an unreachable network never blocks
 *  Home from rendering SOME layout. */
export async function fetchHomeLayout(accessToken: string): Promise<HomeLayout> {
  try {
    const res = await fetch("/api/home-layout", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return defaultHomeLayout();
    const data = await res.json();
    if (!data?.ok || !data?.layout) return defaultHomeLayout();
    return data.layout as HomeLayout;
  } catch {
    return defaultHomeLayout();
  }
}

/** Writes the student's layout to the server. Validates client-side first
 *  (same function the API route re-runs server-side — never trusted alone)
 *  so a caller gets an immediate, specific error rather than a round trip
 *  for something `validateHomeLayout` would have refused anyway. */
export async function saveHomeLayout(accessToken: string, layout: HomeLayout): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = validateHomeLayout(layout);
  if (!result.ok) return { ok: false, error: result.error };

  try {
    const res = await fetch("/api/home-layout", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(result.layout),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body?.error ?? `Save failed (${res.status})` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

/** Toggles a single component's visibility, preserving every other entry —
 *  the operation `components/settings/appearance-fields.tsx` and
 *  `app/tools/personalise/page.tsx` both need. A no-op for `score` (M.2:
 *  `canBeHidden: false` — `validateHomeLayout` would refuse the write
 *  anyway; this short-circuits before the network round trip). */
export function toggleComponentVisibility(layout: HomeLayout, componentId: HomeComponentId): HomeLayout {
  if (componentId === "score") return layout;
  const entries = layout.entries.map(e => (e.componentId === componentId ? { ...e, visible: !e.visible } : e));
  return { ...layout, entries };
}
