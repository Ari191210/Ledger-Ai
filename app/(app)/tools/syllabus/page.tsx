import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSyllabus } from "@/lib/study/queries";
import { SyllabusTracker } from "@/components/tools/syllabus-tracker";

export default async function SyllabusTrackerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const topics = await getSyllabus(supabase, user!.id);

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/tools"
        className="u-mono inline-flex items-center gap-1.5 text-2xs text-text-3 hover:text-text"
      >
        <ArrowLeft size={12} /> tools
      </Link>

      <div className="mt-4 mb-3">
        <span className="u-label">learn</span>
        <h1 className="mt-1 text-lg font-bold text-text">Syllabus Tracker</h1>
      </div>

      <SyllabusTracker topics={topics} />
    </div>
  );
}
