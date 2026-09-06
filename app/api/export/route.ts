import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Full, honest export of everything StudyLedger stores for this user, one
// row set per table, unfiltered (not the score engine's derived views).
//
// The privacy page promises this is everything, so a new user-scoped table has
// to be added here in the same change that creates it. This list had already
// drifted behind focus_sessions and subscriptions before anyone noticed, which
// is exactly how that promise quietly stops being true.
const TABLES = [
  "activity_days",
  "mistakes",
  "pyq_attempts",
  "syllabus_topics",
  "habits",
  "habit_logs",
  "deadlines",
  "parental_consents",
  "focus_sessions",
  "subscriptions",
  "ai_advice",
  "ai_invocations",
] as const;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    // Every column, not a list. An explicit list is how date_of_birth and
    // guardian_email went missing after migration 0009 while the privacy page
    // still promised a full export. The table list above learned this lesson;
    // the column list had not.
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const tableResults = await Promise.all(
    TABLES.map((t) => supabase.from(t).select("*").eq("user_id", user.id)),
  );

  const data: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile: profile ?? null,
  };
  TABLES.forEach((t, i) => {
    data[t] = tableResults[i].data ?? [];
  });

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="studyledger-export-${user.id.slice(0, 8)}.json"`,
    },
  });
}
