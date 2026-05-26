"use client";

import { type AIError as AIErrorType } from "@/lib/ai-fetch";

interface AIErrorProps {
  error: AIErrorType | string;
  onRetry?: () => void;
  /** If true, renders inline (no border box). Default: false (renders as a panel). */
  inline?: boolean;
}

const ICON: Record<string, string> = {
  network: "↯",
  rate_limit: "◷",
  moderation: "⊘",
  server: "△",
  unknown: "△",
};

const HINT: Record<string, string> = {
  network: "Check your connection and try again.",
  rate_limit: "",
  moderation: "",
  server: "Ledger's AI had a hiccup. Try again in a moment.",
  unknown: "Try again — if it keeps failing, refresh the page.",
};

export function AIErrorDisplay({ error, onRetry, inline = false }: AIErrorProps) {
  const message = typeof error === "string" ? error : error.message;
  const code = typeof error === "string" ? "unknown" : (error.code ?? "unknown");
  const icon = ICON[code] ?? ICON.unknown;
  const hint = HINT[code] ?? "";

  if (inline) {
    return (
      <div
        style={{
          marginTop: 12,
          fontFamily: "var(--sans)",
          fontSize: 13,
          color: "var(--cinnabar-ink)",
          lineHeight: 1.5,
        }}
      >
        {message}
        {onRetry && code !== "moderation" && (
          <button
            onClick={onRetry}
            style={{
              marginLeft: 12,
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: "none",
              border: "none",
              color: "var(--cinnabar-ink)",
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid var(--rule)",
        background: "var(--paper-2)",
        padding: "28px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: hint || onRetry ? 20 : 0,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 20,
            color: "var(--cinnabar-ink)",
            lineHeight: 1,
            flexShrink: 0,
            marginTop: 2,
          }}
          aria-hidden
        >
          {icon}
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--cinnabar-ink)",
              marginBottom: 6,
            }}
          >
            {code === "moderation" ? "Request blocked" : code === "rate_limit" ? "Daily limit reached" : "AI unavailable"}
          </div>
          <div
            style={{
              fontFamily: "var(--sans)",
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--ink)",
            }}
          >
            {message}
          </div>
          {hint && (
            <div
              style={{
                fontFamily: "var(--sans)",
                fontSize: 12,
                lineHeight: 1.5,
                color: "var(--ink-3)",
                marginTop: 4,
              }}
            >
              {hint}
            </div>
          )}
        </div>
      </div>

      {onRetry && code !== "moderation" && (
        <div style={{ paddingTop: 16, borderTop: "1px solid var(--rule-2)" }}>
          <button
            onClick={onRetry}
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "7px 16px",
              border: "1px solid var(--rule)",
              background: "transparent",
              color: "var(--ink-2)",
              cursor: "pointer",
              transition: "border-color 160ms ease, color 160ms ease",
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = "var(--ink)";
              e.currentTarget.style.color = "var(--ink)";
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = "var(--rule)";
              e.currentTarget.style.color = "var(--ink-2)";
            }}
          >
            Try again ↺
          </button>
        </div>
      )}
    </div>
  );
}
