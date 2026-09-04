import { SiteNav } from "./site-nav";
import { SiteFooter } from "./site-footer";

export function LegalPage({
  label,
  title,
  updated,
  children,
}: {
  label: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-5xl px-6">
      <SiteNav />
      <article className="max-w-2xl py-8">
        <span className="u-label">{label}</span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.02em] text-text">{title}</h1>
        <p className="u-mono mt-2 text-2xs text-text-3">last updated {updated}</p>
        <div className="mt-8 space-y-7">{children}</div>
      </article>
      <SiteFooter />
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-bold text-text">{title}</h2>
      <div className="mt-2.5 space-y-3 text-sm leading-relaxed text-text-2 [&_a]:text-accent-strong [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}
