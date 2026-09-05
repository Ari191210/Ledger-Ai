"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Last-resort boundary: this replaces the root layout, so it has to render its
 * own <html> and <body> and cannot rely on anything the app normally provides.
 *
 * Styles are inline on purpose. If the thing that broke is the stylesheet or a
 * chunk load, a class-based page would render unstyled at the worst possible
 * moment. The colours are the real brand tokens from globals.css, hard-coded so
 * this page stands on its own.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e0e0d",
          color: "#f3f2ee",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "42ch", textAlign: "center" }}>
          <div
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#8a8980",
            }}
          >
            error
          </div>

          <h1
            style={{
              margin: "12px 0 0",
              fontSize: "24px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            Something broke on our side.
          </h1>

          <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#9d9c96" }}>
            Your logged data is safe. This page failed to render, and we have been
            told about it automatically.
          </p>

          {error.digest && (
            <p
              style={{
                margin: "16px 0 0",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "11px",
                color: "#8a8980",
              }}
            >
              reference {error.digest}
            </p>
          )}

          <a
            href="/"
            style={{
              display: "inline-block",
              marginTop: "24px",
              padding: "12px 24px",
              borderRadius: "6px",
              background: "#c8f43a",
              color: "#141600",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Back to StudyLedger
          </a>
        </div>
      </body>
    </html>
  );
}
