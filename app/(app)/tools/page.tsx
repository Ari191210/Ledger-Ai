import { LayoutGrid } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <span className="u-label">tools</span>
      <h1 className="mt-1 text-lg font-bold text-text">Tools</h1>
      <EmptyState
        icon={LayoutGrid}
        index="under construction"
        title="The toolkit is being rebuilt"
        body="Forty-odd tools — planners, PYQ dissectors, mistake trackers, mark schemes — all calibrated to your board and target exam."
        hint="next in the build"
      />
    </div>
  );
}
