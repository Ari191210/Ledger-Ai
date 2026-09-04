import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  body,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  hint?: string;
}) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent-weak text-accent-strong">
        <Icon size={22} />
      </div>
      <h2 className="mt-4 text-base font-bold text-text">{title}</h2>
      <p className="mt-1.5 text-sm text-text-2">{body}</p>
      {hint && (
        <p className="mt-4 inline-block rounded-full bg-surface-2 px-3 py-1 text-xs text-text-3">
          {hint}
        </p>
      )}
    </div>
  );
}
