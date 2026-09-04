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

  return (
    <div className="min-h-screen bg-bg">
      <IconRail />
      <div className="flex min-h-screen flex-col pl-[68px]">
        <TopBar email={user.email ?? ""} />
        <main className="flex-1 px-6 py-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
