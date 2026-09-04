import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDeadlines } from "@/lib/study/deadlines";
import { isoDateIST } from "@/lib/date";
import { DeadlinesList } from "@/components/tools/deadlines-list";

export default async function DeadlinesToolPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const deadlines = await getDeadlines(supabase, user!.id);

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/tools"
        className="u-mono inline-flex items-center gap-1.5 text-2xs text-text-3 hover:text-text"
      >
        <ArrowLeft size={12} /> tools
      </Link>

      <div className="mt-4 mb-3">
        <span className="u-label">plan</span>
        <h1 className="mt-1 text-lg font-bold text-text">Deadlines</h1>
      </div>

      <DeadlinesList deadlines={deadlines} today={isoDateIST()} />
    </div>
  );
}
