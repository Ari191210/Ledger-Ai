import { MetadataRoute } from "next";

const BASE = "https://studyledger.in";

const TOOL_SLUGS = [
  // PLAN
  "study-command", "focus-lab", "planner", "focus", "habits", "deadlines",
  "debt-meter", "circadian", "brain-budget", "circuit-breaker",
  // LEARN
  "learn-lab", "language-lab", "syllabus", "notes", "doubt", "feynman",
  "mindmap", "concept-connect", "vocab", "lang-analyzer", "revision-intel",
  // WRITE
  "writing-tools", "research-suite", "presentation", "debate", "citation",
  "lab-report", "model-answer", "reference-builder", "report-tools",
  "essay-blueprint", "grammar", "research",
  // PRACTISE
  "exam-practice", "recall-studio", "exam-planner", "exam-triage", "practice",
  "post-exam", "memory-toolkit", "flashcards", "exam-sim", "forgetting-forecast",
  "calibration", "paper-pattern", "papers", "paper-triage",
  "crunch", "mark-scheme", "formula", "formula-recall", "predict",
  "memory-palace", "analogy", "exam-strategy", "last-night",
  // FUTURE
  "admissions", "resume", "interview", "gpa-sim", "uni-match", "uni-prep",
  "applications",
  // TRACK
  "grade-tracker", "rooms", "compare", "source", "case-study", "timeline",
  "study-guide", "analysis-hub", "personalise", "marks", "score",
  "peer-heatmap", "exam-debrief", "half-life", "coach",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: BASE,                  lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/auth`,        lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/dashboard`,   lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    ...TOOL_SLUGS.map(slug => ({
      url:             `${BASE}/tools/${slug}`,
      lastModified:    now,
      changeFrequency: "monthly" as const,
      priority:        0.7,
    })),
  ];
}
