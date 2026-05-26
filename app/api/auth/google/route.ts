import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: "https://studyledger.in/auth/callback",
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: 400 });
  }

  const { id_token, access_token } = await res.json();
  return NextResponse.json({ id_token, access_token });
}
