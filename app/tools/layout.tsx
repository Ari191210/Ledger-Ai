import AppNav from "@/components/app-nav";
import AuthGuard from "@/components/auth-guard";
import { FocusProvider } from "@/lib/focus-context";
import FloatingTimer from "@/components/floating-timer";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <FocusProvider>
        <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
          <AppNav />
          {children}
          <FloatingTimer />
        </div>
      </FocusProvider>
    </AuthGuard>
  );
}
