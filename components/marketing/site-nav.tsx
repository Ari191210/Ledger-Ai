import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
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
        <ButtonLink href="/login" variant="ghost" size="md" className="whitespace-nowrap">
          Sign in
        </ButtonLink>
        <ButtonLink href="/login" size="md">
          Get started <ArrowRight size={15} />
        </ButtonLink>
      </div>
    </nav>
  );
}
