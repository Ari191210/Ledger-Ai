"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import TierGate from "@/components/tier-gate";
import { type UserProfile } from "@/lib/user-data";
import { callAI } from "@/lib/ai-fetch";

type Output = { solution: string; principle: string; practice: string[] };

export default function DoubtPage() {
  const [question,  setQuestion]  = useState("");
  const [image,     setImage]     = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [output,    setOutput]    = useState<Output | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [profile,   setProfile]   = useState<UserProfile>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ledger-profile");
      if (raw) setProfile(JSON.parse(raw));
    } catch {}
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5 MB."); return; }
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImage(null);
    setImageName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function solve() {
    if (!question.trim() && !image) return;
    setLoading(true); setError(""); setOutput(null);
    try {
      const syllabusSubjects = (() => { try { return JSON.parse(localStorage.getItem("ledger-syllabus-subjects") || "[]"); } catch { return []; } })();
      const body: Record<string, unknown> = { tool: "doubt", question, ...profile, syllabusSubjects };
      if (image) body.image = image;
      const res = await callAI(body);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setOutput(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const canSolve = (question.trim().length > 0 || !!image) && !loading;

  return (
    <TierGate requires="pro">
      <div>
        <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Doubt Solver</div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Text or photo · Worked answer</div>
        </header>

        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: output ? "1fr 1fr" : "1fr", gap: 48, maxWidth: output ? "100%" : 700 }}>
            {/* Input */}
            <div>
              {profile.grade && (
                <div style={{ marginBottom: 14, padding: "8px 12px", border: "1px solid var(--rule)", background: "var(--paper-2)", display: "flex", gap: 10, alignItems: "center" }}>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>Profile</div>
                  <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>{profile.grade}{profile.board ? ` · ${profile.board}` : ""}{profile.stream ? ` · ${profile.stream}` : ""}</div>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginLeft: "auto" }}>Solutions follow your board&apos;s marking scheme</div>
                </div>
              )}
              <div className="mono cin" style={{ marginBottom: 14 }}>Input · Type your question or upload a photo</div>
              <textarea
                value={question} onChange={(e) => setQuestion(e.target.value)}
                placeholder={"Describe the problem clearly — or upload a photo of it below.\n\nExamples:\n— A ball is thrown at 30° with 20 m/s. Find max height.\n— Explain why noble gases are unreactive.\n— Differentiate f(x) = 3x² + 2x − 5"}
                rows={8}
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "16px", color: "var(--ink)", resize: "vertical", outline: "none", boxSizing: "border-box" }}
              />

              {/* Image upload */}
              <div style={{ marginTop: 12 }}>
                {image ? (
                  <div style={{ border: "1px solid var(--ink)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, background: "var(--paper-2)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="uploaded" style={{ width: 56, height: 56, objectFit: "cover", border: "1px solid var(--rule)" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink)" }}>{imageName}</div>
                      <div className="mono" style={{ color: "var(--ink-3)", marginTop: 2 }}>Image attached · will be analysed by AI</div>
                    </div>
                    <button onClick={clearImage} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>✕ Remove</button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    style={{ width: "100%", padding: "12px 16px", border: "1px dashed var(--rule)", background: "var(--paper-2)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.06em", textAlign: "center" }}>
                    + Upload photo of question (JPG, PNG · max 5 MB)
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{ display: "none" }} />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button className="btn" onClick={solve} disabled={!canSolve} style={{ opacity: !canSolve ? 0.5 : 1 }}>
                  {loading ? "Solving…" : "Solve →"}
                </button>
                {output && <button className="btn ghost" onClick={() => { setOutput(null); setQuestion(""); clearImage(); }}>Clear</button>}
              </div>
              {error && <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}
            </div>

            {/* Output */}
            {output && (
              <div>
                <div style={{ border: "1px solid var(--ink)" }}>
                  {/* Solution */}
                  <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--ink)" }}>
                    <div className="mono cin" style={{ marginBottom: 12 }}>Worked solution</div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13.5, lineHeight: 1.7, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>
                      {output.solution}
                    </div>
                  </div>

                  {/* Principle */}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ink)", background: "var(--paper-2)" }}>
                    <div className="mono cin" style={{ marginBottom: 8 }}>Underlying principle</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 16, lineHeight: 1.55, fontStyle: "italic" }}>
                      {output.principle}
                    </div>
                  </div>

                  {/* Practice */}
                  <div style={{ padding: "16px 20px" }}>
                    <div className="mono cin" style={{ marginBottom: 10 }}>Three similar problems</div>
                    {output.practice.map((p, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < output.practice.length - 1 ? "1px solid var(--rule)" : "none" }}>
                        <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)" }}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
          </div>
        </main>
      </div>
    </TierGate>
  );
}
