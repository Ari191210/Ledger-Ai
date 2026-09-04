import { TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function ScorePage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-lg font-bold text-text">Ledger Score</h1>
      <EmptyState
        icon={TrendingUp}
        title="Your track record, one number"
        body="PYQ accuracy, syllabus coverage, mistake velocity and consistency — weighted into a single score from 0 to 1000, with the full history and what's moving it."
        hint="Wiring up the engine"
      />
    </div>
  );
}
