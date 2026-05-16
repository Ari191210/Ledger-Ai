import AppNav from "@/components/app-nav";
import AuthGuard from "@/components/auth-guard";
import DashboardDock from "@/components/dashboard-dock";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div style={{ position: "relative", zIndex: 2, minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
        <AppNav />
        {children}
        <DashboardDock />
      </div>
    </AuthGuard>
  );
}
