/**
 * Google Identity Services, so Google's sign-in screen names studyledger.in.
 *
 * The redirect flow (signInWithOAuth) sends the student to Google with
 * Supabase's callback as the redirect, so Google's screen reads "Sign in to
 * continue to <project-ref>.supabase.co", which looks like phishing to a
 * parent. Here Google's own button runs on our origin, hands back a signed ID
 * token, and Supabase verifies it (signInWithIdToken). Same Google identity,
 * same Supabase user: an account made through the old flow signs in to the
 * same account through this one.
 *
 * Off unless switched on, because a sign-in path is the last thing to break
 * silently: NEXT_PUBLIC_GOOGLE_GIS=1 turns it on for everyone, and
 * /login?gis=1 turns it on for one browser (?gis=0 turns it off) so it can be
 * tried on production with a real Google account first. If Google's script
 * does not load, the old button stays and keeps working.
 */

// Public by design: it appears in every Google sign-in URL.
export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "940221943110-f2j44ppe723avrmh1a028p0e5hvfg2vh.apps.googleusercontent.com";

const OPT_IN_KEY = "sl-gis";

// On for everyone since 2026-11-06, after a real Google sign-in on production
// through ?gis=1. NEXT_PUBLIC_GOOGLE_GIS=0 turns it off site-wide;
// /login?gis=0 turns it off for one browser (?gis=1 turns it back on).
export function gisEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_GOOGLE_GIS === "0") return false;
  try {
    const p = new URLSearchParams(window.location.search).get("gis");
    if (p === "0") window.localStorage.setItem(OPT_IN_KEY, "0");
    if (p === "1") window.localStorage.removeItem(OPT_IN_KEY);
    return window.localStorage.getItem(OPT_IN_KEY) !== "0";
  } catch {
    return true;
  }
}

type GisCredential = { credential?: string };
type GisButtonOptions = Record<string, string | number>;
type GisId = {
  initialize(o: {
    client_id: string;
    nonce: string;
    callback: (r: GisCredential) => void;
    ux_mode?: "popup";
    itp_support?: boolean;
    use_fedcm_for_button?: boolean;
  }): void;
  renderButton(el: HTMLElement, o: GisButtonOptions): void;
};
declare global {
  interface Window {
    google?: { accounts?: { id?: GisId } };
  }
}

const SRC = "https://accounts.google.com/gsi/client";
let loading: Promise<GisId> | null = null;

/** Loads Google's script once; rejects if it is blocked or slow. */
export function loadGis(timeoutMs = 6000): Promise<GisId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (loading) return loading;
  loading = new Promise<GisId>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    const timer = window.setTimeout(() => reject(new Error("gis timeout")), timeoutMs);
    s.onload = () => {
      window.clearTimeout(timer);
      const id = window.google?.accounts?.id;
      if (id) resolve(id);
      else reject(new Error("gis missing"));
    };
    s.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("gis blocked"));
    };
    document.head.appendChild(s);
  }).catch((e) => {
    loading = null;
    throw e;
  });
  return loading;
}

/**
 * A fresh nonce pair. Google signs the SHA-256 of the raw value into the ID
 * token; Supabase is given the raw value and checks the two match, so a token
 * lifted from somewhere else cannot be replayed here.
 */
export async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return { raw, hashed };
}
