import { TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function ScorePage() {
  return (
    <div className="mx-auto max-w-6xl">
      <span className="u-label">ledger score</span>
      <h1 className="mt-1 text-lg font-bold text-text">Ledger Score</h1>
      <EmptyState
        icon={TrendingUp}
        index="engine offline"
        title="Your track record, one number"
        body="PYQ accuracy, syllabus coverage, mistake velocity and consistency — weighted into a single figure from 0 to 1000, with the full history and what's moving it."
        hint="wiring the engine"
      />
    </div>
  );
}
