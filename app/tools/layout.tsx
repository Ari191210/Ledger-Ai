import AppNav from "@/components/app-nav";
import AuthGuard from "@/components/auth-guard";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
        <AppNav />
        {children}
      </div>
    </AuthGuard>
  );
}
