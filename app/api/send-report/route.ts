import { NextResponse } from "next/server";
import { Resend } from "resend";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Exam = { name: string; subject: string; date: string; board: string };
type UserData = {
  exams?: Exam[];
  marks?: { subjects: Array<{ name: string; score: number; weight: number }>; target: number };
  focus?: { streak: number; lastDate: string };
  weakTopics?: Record<string, number>;
  papersCount?: number;
  emailEnabled?: boolean;
};

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

async function generateStudyTips(data: {
  name: string;
  exams: Exam[];
  weakTopics: string[];
  streak: number;
  marks: Array<{ name: string; score: number }>;
}): Promise<string[]> {
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: "You are a concise academic coach for Indian high-school students. Respond with a JSON array of exactly 5 short, specific, actionable study tips. No markdown, just a JSON array of strings.",
      messages: [{
        role: "user",
        content: `Student: ${data.name}
Upcoming exams: ${data.exams.map(e => `${e.name} in ${daysUntil(e.date)} days`).join(", ") || "none set"}
Weak topics from practice: ${data.weakTopics.join(", ") || "none yet"}
Study streak: ${data.streak} days
Current marks: ${data.marks.map(m => `${m.name}: ${m.score}%`).join(", ") || "none entered"}

Generate 5 specific, actionable study tips for this student this week. Be concrete. Reference their actual exams and weak topics. Keep each tip under 2 sentences.`,
      }],
    });
    const text = msg.content[0].type === "text" ? msg.content[0].text : "[]";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]) as string[];
  } catch {}
  return [
    "Focus your first study session on your weakest topic each day.",
    "Use the Past Papers tool for at least 2 sessions this week.",
    "Set a 25-minute Pomodoro for every topic you attempt.",
    "Review wrong answers from your last paper session before starting a new one.",
    "Add your exam dates to the Planner to see your cognitive debt meter.",
  ];
}

function buildEmailHtml(params: {
  name: string;
  email: string;
  streak: number;
  sessionsThisWeek: number;
  exams: Exam[];
  weakTopics: Array<{ topic: string; count: number }>;
  marks: Array<{ name: string; score: number; target: number }>;
  tips: string[];
}) {
  const { name, streak, sessionsThisWeek, exams, weakTopics, marks, tips } = params;
  const upcoming = exams.filter(e => daysUntil(e.date) > 0).sort((a, b) => daysUntil(a.date) - daysUntil(b.date));

  const examRows = upcoming.length
    ? upcoming.map(e => {
        const d = daysUntil(e.date);
        return `<tr>
          <td style="padding:10px 16px;border-bottom:1px solid #e0d8ce;font-family:Georgia,serif;font-size:15px;font-weight:600;">${e.name}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #e0d8ce;font-family:monospace;font-size:12px;color:#888;">${e.subject}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #e0d8ce;font-family:monospace;font-size:12px;color:#888;">${new Date(e.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #e0d8ce;font-family:monospace;font-size:13px;font-weight:700;color:${d<=7?"#b83c1a":"#222"};">${d}d</td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="4" style="padding:16px;font-family:monospace;font-size:12px;color:#aaa;">No exams scheduled. Add them on your dashboard.</td></tr>`;

  const weakRows = weakTopics.length
    ? weakTopics.slice(0, 5).map(wt => `<tr>
        <td style="padding:8px 16px;border-bottom:1px solid #e0d8ce;font-family:Georgia,serif;font-size:14px;">${wt.topic}</td>
        <td style="padding:8px 16px;border-bottom:1px solid #e0d8ce;font-family:monospace;font-size:12px;color:#b83c1a;">${wt.count} wrong</td>
      </tr>`).join("")
    : `<tr><td colspan="2" style="padding:12px 16px;font-family:monospace;font-size:12px;color:#aaa;">No practice data yet. Try a paper session.</td></tr>`;

  const marksRows = marks.length
    ? marks.map(m => `<tr>
        <td style="padding:8px 16px;border-bottom:1px solid #e0d8ce;font-family:Georgia,serif;font-size:14px;">${m.name}</td>
        <td style="padding:8px 16px;border-bottom:1px solid #e0d8ce;font-family:monospace;font-size:13px;font-weight:700;color:${m.score>=m.target?"#1a7a3c":"#b83c1a"};">${m.score}%</td>
      </tr>`).join("")
    : `<tr><td colspan="2" style="padding:12px 16px;font-family:monospace;font-size:12px;color:#aaa;">No marks entered yet.</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Ledger · Weekly Study Report</title></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;">
  <div style="max-width:640px;margin:0 auto;background:#faf6ee;border:1px solid #222;">

    <!-- Header -->
    <div style="padding:0;border-bottom:3px double #222;">
      <div style="padding:8px 24px;border-bottom:1px solid #222;background:#faf6ee;">
        <span style="font-family:monospace;font-size:10px;color:#888;letter-spacing:0.08em;">STUDYLEDGER.IN · WEEKLY STUDY REPORT · ${new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).toUpperCase()}</span>
      </div>
      <div style="padding:28px 24px 20px;">
        <div style="font-family:Georgia,serif;font-style:italic;font-weight:700;font-size:40px;letter-spacing:-0.02em;line-height:0.9;color:#222;">
          The Ledger<span style="color:#b83c1a;">.</span>
        </div>
        <div style="font-family:monospace;font-size:11px;color:#888;margin-top:10px;letter-spacing:0.05em;">THE STUDENT'S OPERATING SYSTEM · WEEKLY BRIEFING</div>
      </div>
    </div>

    <!-- Greeting -->
    <div style="padding:28px 24px 20px;border-bottom:1px solid #e0d8ce;">
      <div style="font-family:monospace;font-size:10px;color:#b83c1a;letter-spacing:0.08em;text-transform:uppercase;">Weekly Dispatch · ${name}</div>
      <h1 style="font-family:Georgia,serif;font-size:26px;font-style:italic;font-weight:400;color:#222;margin:10px 0 0;line-height:1.2;">
        Here is where you stand, ${name}.
      </h1>
      <p style="font-family:Arial,sans-serif;font-size:13px;color:#666;line-height:1.6;margin:12px 0 0;">
        Your weekly study report from Ledger. Below you will find your exam countdown, weak topics to address, marks summary, and five specific things to do this week.
      </p>
    </div>

    <!-- Stats strip -->
    <div style="display:grid;border-bottom:1px solid #222;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding:16px 20px;border-right:1px solid #e0d8ce;text-align:center;">
            <div style="font-family:monospace;font-size:9px;color:#888;letter-spacing:0.08em;text-transform:uppercase;">Study Streak</div>
            <div style="font-family:Georgia,serif;font-size:36px;font-style:italic;font-weight:700;color:#222;line-height:1;margin-top:4px;">${streak}d</div>
          </td>
          <td style="padding:16px 20px;border-right:1px solid #e0d8ce;text-align:center;">
            <div style="font-family:monospace;font-size:9px;color:#888;letter-spacing:0.08em;text-transform:uppercase;">Sessions</div>
            <div style="font-family:Georgia,serif;font-size:36px;font-style:italic;font-weight:700;color:#222;line-height:1;margin-top:4px;">${sessionsThisWeek}</div>
          </td>
          <td style="padding:16px 20px;text-align:center;">
            <div style="font-family:monospace;font-size:9px;color:#888;letter-spacing:0.08em;text-transform:uppercase;">Next Exam</div>
            <div style="font-family:Georgia,serif;font-size:36px;font-style:italic;font-weight:700;color:${upcoming[0]&&daysUntil(upcoming[0].date)<=7?"#b83c1a":"#222"};line-height:1;margin-top:4px;">${upcoming[0] ? daysUntil(upcoming[0].date)+"d" : "—"}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Exam countdown -->
    <div style="border-bottom:1px solid #222;">
      <div style="padding:14px 20px;background:#f0ebe0;border-bottom:1px solid #e0d8ce;">
        <span style="font-family:monospace;font-size:10px;color:#b83c1a;letter-spacing:0.08em;text-transform:uppercase;">Exam Countdown</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr style="background:#f9f5ee;">
          <th style="padding:8px 16px;text-align:left;font-family:monospace;font-size:9px;color:#888;font-weight:normal;letter-spacing:0.06em;border-bottom:1px solid #e0d8ce;">EXAM</th>
          <th style="padding:8px 16px;text-align:left;font-family:monospace;font-size:9px;color:#888;font-weight:normal;letter-spacing:0.06em;border-bottom:1px solid #e0d8ce;">SUBJECT</th>
          <th style="padding:8px 16px;text-align:left;font-family:monospace;font-size:9px;color:#888;font-weight:normal;letter-spacing:0.06em;border-bottom:1px solid #e0d8ce;">DATE</th>
          <th style="padding:8px 16px;text-align:left;font-family:monospace;font-size:9px;color:#888;font-weight:normal;letter-spacing:0.06em;border-bottom:1px solid #e0d8ce;">DAYS</th>
        </tr>
        ${examRows}
      </table>
    </div>

    <!-- Weak topics -->
    <div style="border-bottom:1px solid #222;">
      <div style="padding:14px 20px;background:#f0ebe0;border-bottom:1px solid #e0d8ce;">
        <span style="font-family:monospace;font-size:10px;color:#b83c1a;letter-spacing:0.08em;text-transform:uppercase;">Topics Needing Work</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${weakRows}
      </table>
    </div>

    <!-- Marks -->
    <div style="border-bottom:1px solid #222;">
      <div style="padding:14px 20px;background:#f0ebe0;border-bottom:1px solid #e0d8ce;">
        <span style="font-family:monospace;font-size:10px;color:#b83c1a;letter-spacing:0.08em;text-transform:uppercase;">Current Marks</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${marksRows}
      </table>
    </div>

    <!-- AI Tips -->
    <div style="border-bottom:1px solid #222;">
      <div style="padding:14px 20px;background:#222;border-bottom:1px solid #444;">
        <span style="font-family:monospace;font-size:10px;color:#ccc;letter-spacing:0.08em;text-transform:uppercase;">Your Study Plan This Week · AI-Generated</span>
      </div>
      <div style="padding:20px 24px;background:#222;">
        ${tips.map((tip, i) => `
        <div style="display:flex;gap:14px;margin-bottom:${i < tips.length - 1 ? "14px" : "0"};padding-bottom:${i < tips.length - 1 ? "14px" : "0"};border-bottom:${i < tips.length - 1 ? "1px solid #444" : "none"};">
          <span style="font-family:monospace;font-size:11px;color:#b83c1a;flex-shrink:0;margin-top:2px;">${String(i+1).padStart(2,"0")}</span>
          <span style="font-family:Arial,sans-serif;font-size:13px;color:#e8e0d0;line-height:1.55;">${tip}</span>
        </div>`).join("")}
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:20px 24px;border-top:1px solid #222;">
      <div style="font-family:monospace;font-size:10px;color:#888;line-height:1.8;">
        <a href="https://studyledger.in/dashboard" style="color:#b83c1a;text-decoration:none;">Open Ledger →</a>
        &nbsp;·&nbsp; studyledger.in
        &nbsp;·&nbsp; © MMXXVI Ledger Study Co.
      </div>
      <div style="font-family:monospace;font-size:9px;color:#bbb;margin-top:8px;">
        You're receiving this because you enabled weekly reports. Manage preferences on your dashboard.
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
  const resend = new Resend(process.env.RESEND_API_KEY);

  let userId: string, userEmail: string, userName: string;
  try {
    const body = await req.json();
    userId = body.userId;
    userEmail = body.email;
    userName = body.name || userEmail.split("@")[0];
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Load user data from Supabase
  const { data } = await supabaseAdmin.from("user_data").select("*").eq("id", userId).single();
  const ud = (data || {}) as UserData;

  const exams: Exam[] = ud.exams || [];
  const weakTopicsRaw: Record<string, number> = ud.weakTopics || {};
  const weakTopics = Object.entries(weakTopicsRaw).sort(([, a], [, b]) => b - a).map(([topic, count]) => ({ topic, count }));
  const marks = ud.marks?.subjects?.map(s => ({ name: s.name, score: s.score, target: ud.marks!.target })) || [];
  const streak = ud.focus?.streak || 0;
  const sessionsThisWeek = ud.papersCount || 0;

  const tips = await generateStudyTips({
    name: userName,
    exams,
    weakTopics: weakTopics.slice(0, 5).map(w => w.topic),
    streak,
    marks,
  });

  const html = buildEmailHtml({
    name: userName,
    email: userEmail,
    streak,
    sessionsThisWeek,
    exams,
    weakTopics,
    marks,
    tips,
  });

  const { error } = await resend.emails.send({
    from: "Ledger <reports@studyledger.in>",
    to: userEmail,
    subject: `Your weekly study report · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`,
    html,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
