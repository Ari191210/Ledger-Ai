import { ThemeLab } from "./theme-lab";

// Dev-only token editor, not linked from anywhere in the product. Kept
// around for design iteration; not part of the public site.
export default function ThemeLabPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <span className="u-label">dev</span>
      <h1 className="mt-1 text-lg font-bold text-text">Theme Lab</h1>
      <p className="mt-2 text-sm text-text-2">
        Live token editor. Changes persist to localStorage on this device only.
      </p>
      <div className="mt-8">
        <ThemeLab />
      </div>
    </main>
  );
}
