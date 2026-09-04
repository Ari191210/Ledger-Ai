import { ToolsGrid } from "@/components/tools/tools-grid";

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <span className="u-label">tools</span>
      <h1 className="mt-1 text-lg font-bold text-text">Tools</h1>

      <div className="mt-4">
        <ToolsGrid />
      </div>
    </div>
  );
}
