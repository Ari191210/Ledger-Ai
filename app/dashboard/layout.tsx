import AppNav from "@/components/app-nav";
import AuthGuard from "@/components/auth-guard";
import StudyEntrance from "@/components/study-entrance";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div style={{ position: "relative", zIndex: 2, minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
        <StudyEntrance />
        <AppNav />
        {children}
      </div>
    </AuthGuard>
  );
}
