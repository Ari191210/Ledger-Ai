import { TOOLS } from "@/lib/tools/registry";
import { ToolsGrid } from "@/components/tools/tools-grid";

export default function ToolsPage() {
  const signatureCount = TOOLS.filter((t) => t.signature).length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="u-label">tools</span>
          <h1 className="mt-1 text-lg font-bold text-text">Tools</h1>
        </div>
        <span className="u-mono text-2xs text-text-3">
          {TOOLS.length} tools · {signatureCount} signature
        </span>
      </div>

      <div className="mt-4">
        <ToolsGrid />
      </div>
    </div>
  );
}
