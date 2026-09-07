import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IconRail } from "@/components/app-shell/icon-rail";
import { MobileTabBar } from "@/components/app-shell/mobile-tab-bar";
import { TopBar } from "@/components/app-shell/top-bar";
import { Suspense } from "react";
import { LedgerChips, LedgerChipsFallback } from "@/components/app-shell/ledger-chips";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarded_at) redirect("/onboard");

  const label = profile.display_name || user.email || "";
  const initial = (label.trim()[0] || "?").toUpperCase();

  // Deliberately not awaited here. The score and streak chips need the whole
  // ledger computed, and blocking the shell on that meant no page painted until
  // it finished. They stream in beside the page instead.

  return (
    <div className="min-h-screen bg-bg">
      <IconRail initial={initial} />
      <div className="flex min-h-screen flex-col md:pl-[60px]">
        <TopBar
          email={user.email ?? ""}
          stats={
            <Suspense fallback={<LedgerChipsFallback />}>
              <LedgerChips userId={user.id} />
            </Suspense>
          }
        />
        <main className="flex-1 px-4 py-4 pb-20 lg:px-6 lg:py-5 md:pb-5">{children}</main>
      </div>
      <MobileTabBar />
    </div>
  );
}
