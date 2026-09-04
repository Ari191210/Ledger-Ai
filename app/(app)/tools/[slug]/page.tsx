import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CATEGORIES, getTool } from "@/lib/tools/registry";

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const category = CATEGORIES.find((c) => c.id === tool.category);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/tools"
        className="u-mono inline-flex items-center gap-1.5 text-2xs text-text-3 hover:text-text"
      >
        <ArrowLeft size={12} /> tools
      </Link>

      <div className="u-card u-grille mt-4 p-8 text-center">
        <span className="u-label">
          {category?.label.toLowerCase()}
          {tool.signature && <span className="ml-1.5 text-accent-strong">★</span>}
        </span>
        <h1 className="mt-2 text-xl font-bold text-text">{tool.name}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-text-2">{tool.blurb}</p>
        <p className="u-mono mt-6 inline-block rounded-full border border-border bg-surface-2 px-3 py-1 text-2xs text-text-3">
          {tool.kind === "ai" ? "not wired yet" : "not built yet"}
        </p>
      </div>
    </div>
  );
}
