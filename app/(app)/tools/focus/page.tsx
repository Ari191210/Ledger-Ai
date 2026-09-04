import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActivityRange } from "@/lib/study/queries";
import { FocusTimer } from "@/components/tools/focus-timer";

export default async function FocusToolPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().slice(0, 10);
  const rows = await getActivityRange(supabase, user!.id, today, today);
  const minutesToday = rows[0]?.minutes ?? 0;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/tools"
        className="u-mono inline-flex items-center gap-1.5 text-2xs text-text-3 hover:text-text"
      >
        <ArrowLeft size={12} /> tools
      </Link>

      <div className="u-card u-grille mt-4 p-10">
        <FocusTimer minutesToday={minutesToday} />
      </div>
    </div>
  );
}
