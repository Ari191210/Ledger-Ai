import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function buildResetHtml(params: { resetLink: string }) {
  const { resetLink } = params;
  const date = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).toUpperCase();

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reset your Ledger password.</title></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:0 auto;background:#faf6ee;border:1px solid #222;">

    <div style="border-bottom:3px double #222;">
      <div style="padding:8px 24px;border-bottom:1px solid #222;background:#faf6ee;">
        <span style="font-family:monospace;font-size:10px;color:#888;letter-spacing:0.08em;">STUDYLEDGER.IN · ${date}</span>
      </div>
      <div style="padding:24px 24px 18px;">
        <div style="font-family:Georgia,serif;font-style:italic;font-weight:700;font-size:36px;letter-spacing:-0.02em;line-height:0.9;color:#222;">
          The Ledger<span style="color:#b83c1a;">.</span>
        </div>
      </div>
    </div>

    <div style="padding:32px 24px 24px;border-bottom:1px solid #e0d8ce;">
      <div style="font-family:monospace;font-size:10px;color:#b83c1a;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;">Password Reset</div>
      <h1 style="font-family:Georgia,serif;font-size:26px;font-style:italic;font-weight:400;color:#222;margin:0 0 16px;line-height:1.2;">
        Reset your password.
      </h1>
      <p style="font-family:Arial,sans-serif;font-size:13px;color:#555;line-height:1.7;margin:0 0 24px;">
        Someone requested a password reset for your Ledger account. If that was you, click the button below to set a new password. This link expires in 1 hour.
      </p>
      <a href="${resetLink}"
        style="display:inline-block;background:#222;color:#faf6ee;font-family:monospace;font-size:12px;letter-spacing:0.08em;text-decoration:none;padding:14px 32px;border:1px solid #222;">
        SET NEW PASSWORD →
      </a>
    </div>

    <div style="padding:20px 24px;">
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#888;line-height:1.6;margin:0 0 8px;">
        If you didn't request this, you can safely ignore this email — your account has not been changed.
      </p>
      <div style="font-family:monospace;font-size:10px;color:#888;line-height:1.8;">
        <a href="https://studyledger.in" style="color:#b83c1a;text-decoration:none;">studyledger.in</a>
        &nbsp;·&nbsp; © MMXXVI Ledger Study Co.
      </div>
    </div>

  </div>
</body>
</html>`;
}

export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Email service not configured." }, { status: 500 });
  }

  let email: string;
  try {
    const body = await req.json();
    email = (body.email ?? "").trim().toLowerCase();
    if (!email) throw new Error("missing email");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: "https://studyledger.in/auth/reset" },
  });

  if (linkErr) {
    // Return a generic message so we don't confirm whether an email exists
    return NextResponse.json({ ok: true });
  }

  const resetLink = data.properties.action_link;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = buildResetHtml({ resetLink });

  await resend.emails.send({
    from: "Ledger <hello@studyledger.in>",
    to: email,
    subject: "Reset your Ledger password.",
    html,
  });

  return NextResponse.json({ ok: true });
}
