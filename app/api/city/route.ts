import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Vercel injects x-vercel-ip-city on deployed functions (URL-encoded)
  const raw = req.headers.get("x-vercel-ip-city");
  const city = raw ? decodeURIComponent(raw) : null;
  return NextResponse.json({ city });
}
