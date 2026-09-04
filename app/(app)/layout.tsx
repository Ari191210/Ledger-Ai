import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IconRail } from "@/components/app-shell/icon-rail";
import { MobileTabBar } from "@/components/app-shell/mobile-tab-bar";
import { TopBar } from "@/components/app-shell/top-bar";
import { getDashboardData } from "@/lib/score/inputs";

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

  const { score, streakDays } = await getDashboardData(supabase, user.id);

  return (
    <div className="min-h-screen bg-bg">
      <IconRail initial={initial} />
      <div className="flex min-h-screen flex-col md:pl-[60px]">
        <TopBar email={user.email ?? ""} score={score.total} streak={streakDays} />
        <main className="flex-1 px-4 py-4 pb-20 lg:px-6 lg:py-5 md:pb-5">{children}</main>
      </div>
      <MobileTabBar />
    </div>
  );
}
