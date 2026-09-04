import Link from "next/link";

const LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
];

// Same assumption as SiteNav: rendered inside a `mx-auto max-w-5xl px-6` container.
export function SiteFooter() {
  return (
    <footer>
      <div className="flex flex-col items-center gap-4 border-t border-border py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="u-led" />
          <span className="u-brand text-sm text-text">StudyLedger</span>
        </div>
        <nav className="flex items-center gap-4">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="u-mono text-2xs text-text-2 hover:text-text">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="u-mono text-2xs text-text-3">for students preparing for boards and entrance exams</p>
      </div>
    </footer>
  );
}
