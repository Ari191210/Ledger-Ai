import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function buildWelcomeHtml(params: { name: string }) {
  const { name } = params;
  const date = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).toUpperCase();

  const tools = [
    {
      label: "Exam Countdown",
      desc: "Add your exam dates. See your cognitive debt meter tick down.",
      href: "https://studyledger.in/tools/exam-countdown",
    },
    {
      label: "Past Papers",
      desc: "Upload or pick a paper. Get question-by-question marking.",
      href: "https://studyledger.in/tools/past-papers",
    },
    {
      label: "Weak Topic Finder",
      desc: "Spot the gaps. Stop revising what you already know.",
      href: "https://studyledger.in/tools/weak-topic-finder",
    },
    {
      label: "Ledger Score",
      desc: "One composite score across all subjects. Updated as you work.",
      href: "https://studyledger.in/tools/score",
    },
  ];

  const toolRows = tools.map((t, i) => `
    <tr>
      <td style="padding:14px 20px;border-bottom:${i < tools.length - 1 ? "1px solid #e0d8ce" : "none"};">
        <a href="${t.href}" style="text-decoration:none;display:block;">
          <div style="font-family:Georgia,serif;font-size:15px;font-weight:600;color:#b83c1a;margin-bottom:4px;">${t.label}</div>
          <div style="font-family:Arial,sans-serif;font-size:12px;color:#666;line-height:1.5;">${t.desc}</div>
        </a>
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to Ledger.</title></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;">
  <div style="max-width:640px;margin:0 auto;background:#faf6ee;border:1px solid #222;">

    <!-- Masthead -->
    <div style="border-bottom:3px double #222;">
      <div style="padding:8px 24px;border-bottom:1px solid #222;background:#faf6ee;">
        <span style="font-family:monospace;font-size:10px;color:#888;letter-spacing:0.08em;">STUDYLEDGER.IN · ${date}</span>
      </div>
      <div style="padding:28px 24px 20px;">
        <div style="font-family:Georgia,serif;font-style:italic;font-weight:700;font-size:40px;letter-spacing:-0.02em;line-height:0.9;color:#222;">
          The Ledger<span style="color:#b83c1a;">.</span>
        </div>
        <div style="font-family:monospace;font-size:11px;color:#888;margin-top:10px;letter-spacing:0.05em;">THE STUDENT'S OPERATING SYSTEM</div>
      </div>
    </div>

    <!-- Welcome -->
    <div style="padding:32px 24px 24px;border-bottom:1px solid #e0d8ce;">
      <div style="font-family:monospace;font-size:10px;color:#b83c1a;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;">Welcome · ${name}</div>
      <h1 style="font-family:Georgia,serif;font-size:30px;font-style:italic;font-weight:400;color:#222;margin:0 0 16px;line-height:1.2;">
        Your student OS is ready.
      </h1>
      <p style="font-family:Arial,sans-serif;font-size:13px;color:#555;line-height:1.7;margin:0 0 12px;">
        Ledger is forty-eight tools for the serious student — exam planner, past papers, GPA simulator, weak topic tracker, AI essay coach, and more. All in one place. All talking to each other.
      </p>
      <p style="font-family:Arial,sans-serif;font-size:13px;color:#555;line-height:1.7;margin:0;">
        Start with the four tools below. They do the most with the least effort, and they set up everything else.
      </p>
    </div>

    <!-- Tools to try -->
    <div style="border-bottom:1px solid #222;">
      <div style="padding:12px 20px;background:#f0ebe0;border-bottom:1px solid #e0d8ce;">
        <span style="font-family:monospace;font-size:10px;color:#b83c1a;letter-spacing:0.08em;text-transform:uppercase;">Start here — four tools</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${toolRows}
      </table>
    </div>

    <!-- CTA -->
    <div style="padding:32px 24px;border-bottom:1px solid #222;text-align:center;">
      <a href="https://studyledger.in/dashboard"
        style="display:inline-block;background:#222;color:#faf6ee;font-family:monospace;font-size:12px;letter-spacing:0.08em;text-decoration:none;padding:14px 32px;border:1px solid #222;">
        OPEN YOUR DASHBOARD →
      </a>
      <div style="font-family:monospace;font-size:10px;color:#aaa;margin-top:16px;">studyledger.in/dashboard</div>
    </div>

    <!-- Footer -->
    <div style="padding:20px 24px;">
      <div style="font-family:monospace;font-size:10px;color:#888;line-height:1.8;">
        <a href="https://studyledger.in" style="color:#b83c1a;text-decoration:none;">studyledger.in</a>
        &nbsp;·&nbsp; © MMXXVI Ledger Study Co.
      </div>
      <div style="font-family:monospace;font-size:9px;color:#bbb;margin-top:8px;">
        You're receiving this because you just created a Ledger account. Questions? Reply to this email.
      </div>
    </div>

  </div>
</body>
</html>`;
}

export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set." }, { status: 500 });
  }

  let userId: string, displayName: string;
  try {
    const body = await req.json();
    userId = body.userId;
    displayName = body.name || "";
    if (!userId) throw new Error("missing userId");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch user from Supabase auth — source of truth for email and sent-flag
  const { data: { user: authUser }, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userErr || !authUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Idempotency: skip if already sent
  if (authUser.app_metadata?.welcomeSent) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const email = authUser.email!;
  const name =
    displayName ||
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    email.split("@")[0];

  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = buildWelcomeHtml({ name });

  const { error: sendErr } = await resend.emails.send({
    from: "Ledger <hello@studyledger.in>",
    to: email,
    subject: "Welcome to Ledger.",
    html,
  });

  if (sendErr) return NextResponse.json({ error: sendErr.message }, { status: 500 });

  // Mark sent so this never fires again for this account
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { ...authUser.app_metadata, welcomeSent: true },
  });

  return NextResponse.json({ ok: true });
}
