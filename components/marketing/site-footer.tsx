import Link from "next/link";
import { BrandMark } from "./brand-mark";

const LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
];

// Same assumption as SiteNav: rendered inside a `mx-auto max-w-5xl px-6` container.
export function SiteFooter() {
  return (
    <footer>
      <div className="flex flex-col items-center gap-5 border-t border-border py-8 text-center sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-6 sm:text-left">
        {/* left — brand */}
        <div className="flex items-center gap-2 sm:justify-self-start">
          <BrandMark size={24} />
          <span className="u-brand text-sm text-text">StudyLedger</span>
        </div>

        {/* centre — tagline */}
        <p className="u-mono text-2xs text-text-3 sm:text-center">
          for students preparing for boards and entrance exams
        </p>

        {/* right — legal links */}
        <nav className="flex items-center gap-4 sm:justify-self-end">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="u-mono text-2xs text-text-2 hover:text-text">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
