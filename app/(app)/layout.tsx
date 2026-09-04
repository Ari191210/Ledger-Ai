import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IconRail } from "@/components/app-shell/icon-rail";
import { TopBar } from "@/components/app-shell/top-bar";

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

  // placeholder — wired to the real score/streak engine later
  const score = 742;
  const streak = 14;

  return (
    <div className="min-h-screen bg-bg">
      <IconRail initial={initial} />
      <div className="flex min-h-screen flex-col pl-[60px]">
        <TopBar email={user.email ?? ""} score={score} streak={streak} />
        <main className="flex-1 px-4 py-4 lg:px-6 lg:py-5">{children}</main>
      </div>
    </div>
  );
}
