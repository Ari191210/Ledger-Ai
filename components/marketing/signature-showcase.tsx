import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TOOLS } from "@/lib/tools/registry";

const SIGNATURE = TOOLS.filter((t) => t.signature);

export function SignatureShowcase() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {SIGNATURE.map((t) => (
        <Link
          key={t.slug}
          href={`/login?next=${encodeURIComponent(`/tools/${t.slug}`)}`}
          className="u-card u-card--hover u-grille flex min-h-[9.5rem] flex-col justify-between p-5"
        >
          <div className="flex items-start justify-between">
            <span className="grid size-9 place-items-center rounded-md border border-border bg-surface-2 text-accent-strong">
              <t.icon size={16} />
            </span>
            <ArrowUpRight size={14} className="text-text-3" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">{t.name}</p>
            <p className="mt-1 text-xs text-text-2">{t.blurb}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
