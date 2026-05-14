"use client";

import React from "react";

interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type:    "react_crash",
        message: error.message,
        stack:   error.stack ?? null,
        url:     window.location.href,
        route:   window.location.pathname,
        user_agent: navigator.userAgent,
        context: { componentStack: info.componentStack?.slice(0, 2000) },
      }),
      keepalive: true,
    }).catch(() => {});
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--paper)", fontFamily: "var(--sans)",
      }}>
        <div style={{ maxWidth: 480, padding: "40px 32px", border: "1px solid var(--rule)", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 20 }}>
            System Error
          </div>
          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 24, color: "var(--ink)", marginBottom: 12, letterSpacing: "-0.01em" }}>
            The page hit an unexpected error.
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 28 }}>
            This has been logged automatically. Reload to continue — your data is safe.
          </p>
          <div style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)", marginBottom: 28, padding: "10px 14px", background: "var(--paper-2)", border: "1px solid var(--rule)", textAlign: "left", wordBreak: "break-word" }}>
            {this.state.message || "Unknown error"}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
              padding: "10px 24px", border: "1px solid var(--ink)", background: "var(--ink)",
              color: "var(--paper)", cursor: "pointer",
            }}
          >
            Reload Ledger
          </button>
        </div>
      </div>
    );
  }
}
