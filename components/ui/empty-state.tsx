import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  index,
  title,
  body,
  hint,
}: {
  icon: LucideIcon;
  index: string;
  title: string;
  body: string;
  hint?: string;
}) {
  return (
    <div className="u-card u-grille mx-auto mt-6 max-w-lg p-10 text-center">
      <div className="mx-auto grid size-11 place-items-center rounded-md border border-border bg-surface-2 text-text-3">
        <Icon size={20} />
      </div>
      <span className="u-label mt-5 block">{index}</span>
      <h2 className="mt-1 text-base font-bold text-text">{title}</h2>
      <p className="mt-2 text-sm text-text-2">{body}</p>
      {hint && (
        <p className="u-mono mt-5 inline-block rounded-full border border-border bg-surface-2 px-3 py-1 text-2xs text-text-3">
          {hint}
        </p>
      )}
    </div>
  );
}
