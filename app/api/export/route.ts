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
  // Added 0018 and missed here until lib/rls-policy-audit.test.ts went looking.
  // The list drifted a third time; the test is now what stops a fourth.
  "mistake_reviews",
] as const;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
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

  // A read that failed used to become an empty array here, which is the one
  // thing this file must never do. The privacy page calls this export
  // everything StudyLedger stores about you, and a student who opens it after a
  // failed query sees a table with no rows: indistinguishable from having
  // logged nothing, permanent once they delete the account on the strength of
  // it, and wrong in the direction that loses their record rather than
  // duplicating it.
  //
  // The comment above about date_of_birth is the same lesson learned once
  // already, about a column list rather than an error. An incomplete export
  // presented as complete is worse than no export, so this refuses instead.
  const failed = [
    ...(profileError ? ["profiles"] : []),
    ...TABLES.filter((_, i) => tableResults[i].error),
  ];
  if (failed.length > 0) {
    console.error("[export] incomplete, refusing to send:", failed.join(", "));
    return NextResponse.json(
      {
        error:
          "We couldn't read all of your data just now, so we haven't sent a partial file. " +
          "Nothing is wrong with your account. Try again in a minute.",
        incomplete: failed,
      },
      { status: 503 },
    );
  }

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
