"use client";
import { useState } from "react";
import Link from "next/link";

type SourceType = "book" | "journal" | "website" | "newspaper" | "video";
const STYLES = ["APA 7", "MLA 9", "Chicago 17", "Harvard", "Vancouver"];

function formatCitation(type: SourceType, style: string, f: Record<string, string>): string {
  const authors = f.authors || "Unknown Author";
  const year    = f.year    || "n.d.";
  const title   = f.title   || "Untitled";
  const pub     = f.publisher || f.journal || f.website || "";
  const vol     = f.volume; const iss = f.issue; const pp = f.pages;
  const url     = f.url; const doi = f.doi; const accessed = f.accessed || "n.d.";

  if (style === "APA 7") {
    if (type === "book")    return `${authors} (${year}). *${title}*. ${pub}. ${doi ? `https://doi.org/${doi}` : ""}`;
    if (type === "journal") return `${authors} (${year}). ${title}. *${pub}*, *${vol || ""}*${iss ? `(${iss})` : ""}, ${pp || ""}. ${doi ? `https://doi.org/${doi}` : url || ""}`;
    if (type === "website") return `${authors} (${year}, ${accessed}). *${title}*. ${pub}. ${url}`;
    return `${authors} (${year}). ${title}. ${pub}.`;
  }
  if (style === "MLA 9") {
    if (type === "book")    return `${authors}. *${title}*. ${pub}, ${year}.`;
    if (type === "journal") return `${authors}. "${title}." *${pub}*, vol. ${vol || ""}, no. ${iss || ""}, ${year}, pp. ${pp || ""}. ${doi ? `doi:${doi}` : ""}`;
    if (type === "website") return `${authors}. "${title}." *${pub}*, ${year}, ${url}. Accessed ${accessed}.`;
    return `${authors}. "${title}." ${pub}, ${year}.`;
  }
  if (style === "Chicago 17") {
    if (type === "book")    return `${authors}. *${title}*. ${pub}, ${year}.`;
    if (type === "journal") return `${authors}. "${title}." *${pub}* ${vol || ""}${iss ? `, no. ${iss}` : ""} (${year}): ${pp || ""}. ${doi ? `https://doi.org/${doi}` : ""}`;
    return `${authors}. "${title}." ${pub}, ${year}. ${url || ""}`;
  }
  if (style === "Harvard") {
    if (type === "book")    return `${authors} (${year}) *${title}*. ${pub}.`;
    if (type === "journal") return `${authors} (${year}) '${title}', *${pub}*, ${vol || ""}${iss ? `(${iss})` : ""}, pp. ${pp || ""}. ${doi ? `doi: ${doi}` : ""}`;
    if (type === "website") return `${authors} (${year}) *${title}* [Online]. Available at: ${url} (Accessed: ${accessed}).`;
    return `${authors} (${year}) ${title}. ${pub}.`;
  }
  return `${authors} (${year}). ${title}. ${pub}.`;
}

const SOURCE_FIELDS: Record<SourceType, { key: string; label: string; placeholder: string }[]> = {
  book:      [{ key:"authors",label:"Author(s)",placeholder:"Last, F. M., & Last, F." },{ key:"year",label:"Year",placeholder:"2023" },{ key:"title",label:"Book title",placeholder:"The title of the book" },{ key:"publisher",label:"Publisher",placeholder:"Oxford University Press" },{ key:"doi",label:"DOI (optional)",placeholder:"10.xxxx/xxxxx" }],
  journal:   [{ key:"authors",label:"Author(s)",placeholder:"Last, F. M." },{ key:"year",label:"Year",placeholder:"2023" },{ key:"title",label:"Article title",placeholder:"The article title" },{ key:"journal",label:"Journal name",placeholder:"Nature" },{ key:"volume",label:"Volume",placeholder:"12" },{ key:"issue",label:"Issue",placeholder:"3" },{ key:"pages",label:"Pages",placeholder:"45-67" },{ key:"doi",label:"DOI",placeholder:"10.xxxx/xxxxx" }],
  website:   [{ key:"authors",label:"Author / Organisation",placeholder:"Last, F. or BBC" },{ key:"year",label:"Year",placeholder:"2024" },{ key:"title",label:"Page title",placeholder:"Article or page title" },{ key:"website",label:"Website name",placeholder:"BBC News" },{ key:"url",label:"URL",placeholder:"https://..." },{ key:"accessed",label:"Date accessed",placeholder:"15 March 2024" }],
  newspaper: [{ key:"authors",label:"Author",placeholder:"Last, F." },{ key:"year",label:"Year",placeholder:"2024" },{ key:"title",label:"Article title",placeholder:"Headline here" },{ key:"publisher",label:"Newspaper",placeholder:"The Guardian" },{ key:"pages",label:"Page (optional)",placeholder:"p. 12" }],
  video:     [{ key:"authors",label:"Creator / Channel",placeholder:"Name, F. or Channel Name" },{ key:"year",label:"Year",placeholder:"2023" },{ key:"title",label:"Video title",placeholder:"Video title" },{ key:"url",label:"URL",placeholder:"https://youtube.com/..." },{ key:"accessed",label:"Date accessed",placeholder:"5 Jan 2024" }],
};

export default function CitationPage() {
  const [sourceType, setSourceType] = useState<SourceType>("journal");
  const [style, setStyle]   = useState(STYLES[0]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [citations, setCitations] = useState<{ style: string; text: string }[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  function setField(k: string, v: string) { setFields(f => ({ ...f, [k]: v })); }

  function generate() {
    const results = (style === "All styles" ? STYLES : [style]).map(s => ({ style: s, text: formatCitation(sourceType, s, fields) }));
    setCitations(results);
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 2000); });
  }

  const currentFields = SOURCE_FIELDS[sourceType] || SOURCE_FIELDS.book;

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 22 · Citation Generator</div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 900, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Format a citation</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>APA, MLA, Chicago, Harvard — instantly.</h2>

        <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)", marginBottom: 20, flexWrap: "wrap" }}>
          {(["book","journal","website","newspaper","video"] as SourceType[]).map((t, i, arr) => (
            <button key={t} onClick={() => { setSourceType(t); setFields({}); setCitations([]); }}
              style={{ flex: 1, minWidth: 80, padding: "10px", fontFamily: "var(--mono)", fontSize: 10, background: sourceType === t ? "var(--ink)" : "var(--paper)", color: sourceType === t ? "var(--paper)" : "var(--ink-3)", border: "none", borderRight: i < arr.length - 1 ? "1px solid var(--ink)" : "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          {currentFields.map(f => (
            <div key={f.key} style={{ gridColumn: ["title","doi","url"].includes(f.key) ? "1/-1" : "auto" }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 5, fontSize: 10 }}>{f.label}</div>
              <input value={fields[f.key] || ""} onChange={e => setField(f.key, e.target.value)} placeholder={f.placeholder}
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <select value={style} onChange={e => setStyle(e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)" }}>
            {[...STYLES, "All styles"].map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="btn" onClick={generate} style={{ flex: 1 }}>Generate citation →</button>
        </div>

        {citations.length > 0 && (
          <div style={{ border: "1px solid var(--ink)" }}>
            <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
              <div className="mono cin">Your citation{citations.length > 1 ? "s" : ""}</div>
            </div>
            {citations.map((c, i) => (
              <div key={i} style={{ padding: "16px 18px", borderBottom: i < citations.length - 1 ? "1px solid var(--rule)" : "none" }}>
                {citations.length > 1 && <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, marginBottom: 6 }}>{c.style}</div>}
                <div style={{ fontFamily: "Georgia, serif", fontSize: 14, lineHeight: 1.8, color: "var(--ink)", marginBottom: 10 }}>{c.text}</div>
                <button onClick={() => copy(c.text, c.style)} style={{ fontFamily: "var(--mono)", fontSize: 10, background: "none", border: "1px solid var(--rule)", padding: "5px 12px", cursor: "pointer", color: copied === c.style ? "#2d7a3c" : "var(--ink-3)" }}>
                  {copied === c.style ? "Copied ✓" : "Copy"}
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 22 of 44.</div>
        </div>
      </main>
    </div>
  );
}
