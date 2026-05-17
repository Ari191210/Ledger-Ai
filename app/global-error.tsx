"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          background: "#18241b",
          color: "#faf6ee",
          gap: "1rem",
        }}
      >
        <p style={{ fontSize: "1rem", opacity: 0.6 }}>Something went wrong.</p>
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1.25rem",
            border: "1px solid rgba(250,246,238,0.2)",
            borderRadius: "6px",
            background: "transparent",
            color: "#faf6ee",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
