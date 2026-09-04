"use client";

import { useState, useTransition } from "react";
import { Download, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteAccount } from "@/app/(app)/settings/actions";

export function DangerZone() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function runDelete() {
    setErr(null);
    start(async () => {
      const res = await deleteAccount();
      // deleteAccount redirects to /login on success — it only returns here
      // on failure.
      if (res && "error" in res) setErr(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-text">Export your data</span>
          <p className="u-mono text-2xs text-text-3">
            everything StudyLedger stores about you, as JSON
          </p>
        </div>
        <a href="/api/export" download>
          <Button size="sm" variant="secondary">
            <Download size={13} /> Download
          </Button>
        </a>
      </div>

      <div className="rounded-md border border-negative/30 bg-negative-weak p-4">
        <div className="flex items-start gap-2.5">
          <TriangleAlert size={15} className="mt-0.5 shrink-0 text-negative" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">Delete account</p>
            <p className="mt-1 text-xs text-text-2">
              Permanently deletes your account and every mistake, PYQ
              attempt, habit, deadline, and syllabus entry tied to it.
              This can't be undone.
            </p>

            {!confirmOpen ? (
              <Button
                size="sm"
                variant="secondary"
                className="mt-3 border-negative/40 text-negative hover:bg-negative-weak"
                onClick={() => setConfirmOpen(true)}
              >
                Delete my account
              </Button>
            ) : (
              <div className="mt-3 space-y-2">
                <label className="block">
                  <span className="u-label">
                    type <span className="text-text-2">delete</span> to confirm
                  </span>
                  <input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="delete"
                    className="mt-1.5 w-full max-w-xs rounded-md border border-negative/40 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-negative"
                  />
                </label>
                {err && <p className="u-mono text-2xs text-negative">{err}</p>}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={confirmText.trim().toLowerCase() !== "delete" || pending}
                    className="bg-negative text-white hover:opacity-90"
                    onClick={runDelete}
                  >
                    {pending ? "Deleting…" : "Permanently delete"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setConfirmOpen(false);
                      setConfirmText("");
                      setErr(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
