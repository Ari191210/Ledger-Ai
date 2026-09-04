// Visibly-unfilled marker for legal facts only the founder can supply
// (entity name, address, jurisdiction, support contact, grievance officer).
// Deliberately loud, not a plausible-looking placeholder — a legal page
// with an invented address is worse than one that admits it's missing.
export function LegalTodo({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-negative-weak px-1.5 py-0.5 font-mono text-[0.85em] font-semibold text-negative">
      [TODO: {children}]
    </span>
  );
}
