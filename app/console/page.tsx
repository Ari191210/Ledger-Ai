import { permanentRedirect } from "next/navigation";

// ═══════════════════════════════════════════════════════════════════════════
// /console — MERGED INTO /home. M3-1.
//
// This page was the Console's NOW surface: score, one next move, exam
// context. `PRODUCT_DECISIONS` §2.4 merges it into Home, and Home is built on
// its shell and its primitives — so nothing it did was dropped, it moved. The
// page body now lives at `app/home/page.tsx`, extended with the exam-day
// state M3-2 absorbed.
//
// The `/console` SEGMENT is not deleted. `app/console/layout.tsx` still
// serves `/console/ai`, `/console/analytics`, `/console/practice` and
// `/console/work`, which §2.4 merges into Capture, Record and Practise in
// later milestones and which must keep resolving until then (§2.5).
// `console.css` also remains the shell's stylesheet, imported by
// `app/home/layout.tsx`.
// ═══════════════════════════════════════════════════════════════════════════

export default function ConsoleNowMerged(): never {
  permanentRedirect("/today");
}
