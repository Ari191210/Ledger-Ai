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
          {/* Decorative animated background removed per Product Constitution §1.
              Content sits on the flat body background (var(--paper)). */}
          <div id="main-content" tabIndex={-1} style={{ position: "relative", minHeight: "100vh", background: "transparent", color: "var(--ink)" }}>
            <AppNav />
            <SplitView>{children}</SplitView>
            <FloatingTimer />
          </div>
        </UIProvider>
      </FocusProvider>
    </AuthGuard>
  );
}
