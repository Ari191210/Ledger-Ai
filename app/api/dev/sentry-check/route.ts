import { NextResponse } from "next/server";

/**
 * Deliberately throws, so error reporting can be verified against the real
 * production deployment rather than assumed to work.
 *
 * Guarded by a secret: without it this is a 404, so it is not a public way to
 * fill the error quota. Uses the service role key as the secret because it is
 * already set in production and is never sent to a client.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!expected || key !== expected) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  throw new Error("StudyLedger deliberate server error, verifying Sentry wiring");
}
