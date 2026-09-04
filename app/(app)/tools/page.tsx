import { LayoutGrid } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-lg font-bold text-text">Tools</h1>
      <EmptyState
        icon={LayoutGrid}
        title="The toolkit is being rebuilt"
        body="Forty-odd tools — planners, PYQ dissectors, mistake trackers, mark schemes — all calibrated to your board and target exam. Landing here soon."
        hint="Next up in the build"
      />
    </div>
  );
}
