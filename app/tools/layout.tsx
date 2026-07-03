import AppNav from "@/components/app-nav";
import AuthGuard from "@/components/auth-guard";
import { FocusProvider } from "@/lib/focus-context";
import FloatingTimer from "@/components/floating-timer";
import { UIProvider } from "@/components/ui-context";
import SplitView from "@/components/split-view";
import ToolsBackground from "@/components/tools-background";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <FocusProvider>
        <UIProvider>
          {/* Background sits at z-index 1, covers the root WebGL canvas (z-index 0) */}
          <ToolsBackground />
          {/* Content at z-index 2 so it renders above the background layers */}
          <div id="main-content" tabIndex={-1} style={{ position: "relative", zIndex: 2, minHeight: "100vh", background: "transparent", color: "var(--ink)" }}>
            <AppNav />
            <SplitView>{children}</SplitView>
            <FloatingTimer />
          </div>
        </UIProvider>
      </FocusProvider>
    </AuthGuard>
  );
}
