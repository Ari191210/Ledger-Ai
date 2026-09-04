import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Assumes it's rendered inside a container that already sets max-width and
// horizontal padding (every page here wraps its content in
// `<main className="mx-auto max-w-5xl px-6">`).
export function SiteNav() {
  return (
    <nav className="flex items-center justify-between py-6">
      <Link href="/" className="flex items-center gap-2">
        <span className="u-led" />
        <span className="u-brand text-base text-text">StudyLedger</span>
      </Link>
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </Link>
        <Link href="/login">
          <Button size="sm">
            Get started <ArrowRight size={13} />
          </Button>
        </Link>
      </div>
    </nav>
  );
}
