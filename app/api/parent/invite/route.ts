import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireBearerUser, userRpcClient } from "@/lib/parent-space-server";
import { generateInvitationToken, hashInvitationToken, invitationExpiry, isValidEmail } from "@/lib/parent-space";

export const dynamic = "force-dynamic";

// Student-initiated invitation (architecture N.3). Replaces SharePanel's
// `parentCode` mint: instead of publishing a bare, unauthenticated bearer
// link, this creates a single-use, hashed, short-expiry token and emails it
// to the parent's own address, so acceptance is tied to an identity the
// student named — not to whoever next opens the link.
export async function POST(req: Request) {
  const auth = await requireBearerUser(req);
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let email: string;
  try {
    const body = await req.json();
    email = String(body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Expected { email }." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = invitationExpiry();

  const client = userRpcClient(auth.token);
  const { data, error } = await client.rpc("create_parent_invitation", {
    p_email: email,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt.toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://studyledger.in";
  const acceptUrl = `${base}/parent/accept?token=${token}`;

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Ledger <reports@studyledger.in>",
      to: email,
      subject: "You've been invited to a StudyLedger parent view",
      html: `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:24px;">
        <p style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.6;">
          You've been invited to view a student's progress on StudyLedger — their score, subjects and what they're working on. Not individual mistakes; StudyLedger never shows those to a parent, by design.
        </p>
        <p><a href="${acceptUrl}" style="font-family:monospace;font-size:13px;color:#b83c1a;">Accept the invitation →</a></p>
        <p style="font-family:monospace;font-size:11px;color:#888;">This link expires in 72 hours and can be used once.</p>
      </div>`,
    }).catch(() => {}); // Email delivery is best-effort; the invitation itself already exists.
  }

  return NextResponse.json({ ok: true, invitation: data, acceptUrl });
}
