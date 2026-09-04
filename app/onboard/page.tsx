import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardForm } from "@/components/onboard/onboard-form";
import { SplitLayout } from "@/components/auth/split-layout";

export default async function OnboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarded_at) redirect("/dashboard");

  return (
    <SplitLayout form="lg">
      <OnboardForm />
    </SplitLayout>
  );
}
