import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-5xl px-6">
      <SiteNav />
      <div className="flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
        <span className="u-label">404</span>
        <p className="u-stat-number mt-3 text-6xl leading-none text-text-3">¯\_(ツ)_/¯</p>
        <h1 className="mt-6 text-2xl font-extrabold tracking-[-0.02em] text-text">
          Nothing to see at this address.
        </h1>
        <p className="mt-2 max-w-[36ch] text-sm text-text-2">
          The page you&apos;re looking for doesn&apos;t exist, or it moved.
        </p>
        <Link href="/" className="mt-6">
          <Button size="sm">
            Back to StudyLedger <ArrowRight size={13} />
          </Button>
        </Link>
      </div>
      <SiteFooter />
    </main>
  );
}
