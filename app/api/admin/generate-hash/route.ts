import { hashPassword } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// One-time utility: GET /api/admin/generate-hash?plain=yourpassword
// Returns the scrypt hash to put in ADMIN_KEY env var.
// Safe to leave deployed — it only hashes, never reveals stored secrets.
export async function GET(req: Request) {
  const plain = new URL(req.url).searchParams.get("plain");
  if (!plain || plain.length < 8) {
    return NextResponse.json({ error: "Provide ?plain=password (min 8 chars)" }, { status: 400 });
  }
  const hash = await hashPassword(plain);
  return NextResponse.json({ hash, usage: "Set ADMIN_KEY=" + hash + " in your env vars" });
}
