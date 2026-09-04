import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AiTool } from "@/components/tools/ai-tool";
import { PROMPTS } from "@/lib/tools/prompts";

export default function EssayGraderPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/tools" className="u-mono inline-flex items-center gap-1.5 text-2xs text-text-3 hover:text-text">
        <ArrowLeft size={12} /> tools
      </Link>
      <div className="mt-4 mb-3">
        <span className="u-label">write</span>
        <h1 className="mt-1 text-lg font-bold text-text">Essay Grader</h1>
      </div>
      <AiTool slug="essay-grader" fields={PROMPTS["essay-grader"].fields} />
    </div>
  );
}
