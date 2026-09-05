import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "./brand-mark";

// Assumes it's rendered inside a container that already sets max-width and
// horizontal padding (every page here wraps its content in
// `<main className="mx-auto max-w-5xl px-6">`).
export function SiteNav() {
  return (
    <nav className="flex items-center justify-between py-6">
      <Link href="/" className="flex items-center gap-2.5">
        <BrandMark size={30} />
        <span className="u-brand text-lg text-text">StudyLedger</span>
      </Link>
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost" size="md">
            Sign in
          </Button>
        </Link>
        <Link href="/login">
          <Button size="md">
            Get started <ArrowRight size={15} />
          </Button>
        </Link>
      </div>
    </nav>
  );
}
