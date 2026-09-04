import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDueMistakes } from "@/lib/study/queries";
import { ReviewQueue } from "@/components/tools/review-queue";

export default async function SpacedReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const due = await getDueMistakes(supabase, user!.id);

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/tools"
        className="u-mono inline-flex items-center gap-1.5 text-2xs text-text-3 hover:text-text"
      >
        <ArrowLeft size={12} /> tools
      </Link>

      <div className="mt-4 mb-3 flex items-baseline justify-between">
        <div>
          <span className="u-label">practise</span>
          <h1 className="mt-1 text-lg font-bold text-text">Spaced Review</h1>
        </div>
        <span className="u-mono text-2xs text-text-3">{due.length} due</span>
      </div>

      <ReviewQueue due={due} />
    </div>
  );
}
