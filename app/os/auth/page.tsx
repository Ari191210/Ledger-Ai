import type { Metadata } from "next";
import { Suspense } from "react";
import AuthScreen from "@/components/os/auth";

export const metadata: Metadata = {
  title: "Sign in — StudyLedger",
  description: "Sign in to sync your record across devices.",
};

// AuthScreen reads ?forgot=1 via useSearchParams, which Next requires to sit
// inside a Suspense boundary so the rest of the route can still prerender.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthScreen />
    </Suspense>
  );
}
