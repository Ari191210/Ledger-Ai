/**
 * Where a sign-in is allowed to send you afterwards.
 *
 * The `next` parameter is attacker-controllable: it arrives on a link anyone
 * can craft and was being concatenated straight onto the origin. Two shapes
 * escape that way, and both were confirmed against the URL parser:
 *
 *   next=@evil.com   ->  https://studyledger.in@evil.com   host: evil.com
 *   next=.evil.com   ->  https://studyledger.in.evil.com   host: attacker's
 *
 * The first turns the real origin into a username, the second into a subdomain
 * label. Either lands a freshly signed-in student on someone else's site with
 * the product's own domain sitting in the address bar, which is exactly the
 * shape a phishing page wants.
 *
 * Only a path on this origin is allowed through; anything else falls back to
 * the dashboard rather than being repaired, because a destination that needed
 * repairing is not one this app chose.
 */
export const DEFAULT_NEXT = "/dashboard";

export function safeNext(raw: string | null | undefined, origin: string): string {
  if (!raw) return DEFAULT_NEXT;

  // A protocol-relative path (//host) and a backslash (which some parsers and
  // browsers treat as a separator) never reach the URL check below.
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return DEFAULT_NEXT;

  try {
    const url = new URL(raw, origin);
    if (url.origin !== new URL(origin).origin) return DEFAULT_NEXT;

    const path = `${url.pathname}${url.search}${url.hash}`;
    // Checking the input is not enough: "/..//evil.com" resolves on this origin,
    // so the origin check above passes, and normalises to a pathname of
    // "//evil.com" which is protocol-relative the moment it is used as a
    // destination. The way out is guarded on the way back as well.
    if (!path.startsWith("/") || path.startsWith("//")) return DEFAULT_NEXT;
    return path;
  } catch {
    return DEFAULT_NEXT;
  }
}
