import AppNav from "@/components/app-nav";
import AuthGuard from "@/components/auth-guard";
import { FocusProvider } from "@/lib/focus-context";
import FloatingTimer from "@/components/floating-timer";
import { UIProvider } from "@/components/ui-context";
import SplitView from "@/components/split-view";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <FocusProvider>
        <UIProvider>
          <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
            <AppNav />
            <SplitView>{children}</SplitView>
            <FloatingTimer />
          </div>
        </UIProvider>
      </FocusProvider>
    </AuthGuard>
  );
}
