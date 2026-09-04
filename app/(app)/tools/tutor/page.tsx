import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AiTool } from "@/components/tools/ai-tool";
import { PROMPTS } from "@/lib/tools/prompts";

export default function TutorPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/tools" className="u-mono inline-flex items-center gap-1.5 text-2xs text-text-3 hover:text-text">
        <ArrowLeft size={12} /> tools
      </Link>
      <div className="mt-4 mb-3">
        <span className="u-label">learn</span>
        <h1 className="mt-1 text-lg font-bold text-text">Tutor</h1>
        <p className="u-mono mt-1 text-2xs text-text-3">one walkthrough per question, ask again to continue</p>
      </div>
      <AiTool slug="tutor" fields={PROMPTS.tutor.fields} />
    </div>
  );
}
