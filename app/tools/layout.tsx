import AppNav from "@/components/app-nav";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
      <AppNav />
      {children}
    </div>
  );
}
