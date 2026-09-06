import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActivityRange } from "@/lib/study/queries";
import { isoDateIST } from "@/lib/date";
import { getFocusBrief } from "@/lib/focus/brief";
import { FocusTimer } from "@/components/tools/focus-timer";

export default async function FocusToolPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = isoDateIST();
  const [rows, brief] = await Promise.all([
    getActivityRange(supabase, user!.id, today, today),
    getFocusBrief(supabase, user!.id),
  ]);
  const minutesToday = rows[0]?.minutes ?? 0;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Link
        href="/tools"
        className="u-mono inline-flex items-center gap-1.5 text-2xs text-text-3 hover:text-text"
      >
        <ArrowLeft size={12} /> tools
      </Link>

      <div className="u-card u-grille mt-4 p-10">
        <FocusTimer minutesToday={minutesToday} brief={brief} />
      </div>
    </div>
  );
}
