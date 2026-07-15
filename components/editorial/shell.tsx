import type { ReactNode } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// THE EDITORIAL SHELL
//
// The opt-in marker. Everything in app/editorial.css is scoped beneath
// [data-ui="editorial"], so the entire editorial design system is INERT on any
// page that does not render this component. That is the whole architecture.
//
// The shell — not <body> — paints the paper. It has to:
//
//   <body> lives in the root layout and is shared with all 46 un-migrated
//   routes, whose background comes from globals.css and the legacy palette
//   script. Styling <body> for the editorial system would therefore restyle
//   every legacy page, which is exactly the bleed Phase 0.5 removes.
//
//   So the shell covers the viewport (min-height: 100dvh) and carries the
//   stock and the paper texture itself. The body underneath is never seen.
//
// Server component. It holds no state and must not: the marker has to be
// present in the server-rendered HTML, or the first paint would show the page
// unstyled before hydration attached it.
// ═══════════════════════════════════════════════════════════════════════════

export function EditorialShell({ children }: { children: ReactNode }) {
  return (
    <div data-ui="editorial" className="ed-root">
      {children}
    </div>
  );
}

export default EditorialShell;
