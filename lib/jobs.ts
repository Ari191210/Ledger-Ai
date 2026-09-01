import { supabaseServer } from "./supabase-server";

export type JobType =
  | "send-report"
  | "send-welcome"
  | "weekly-report-batch"
  | "send-parent-digest"
  // M18-1 — O.1's async export, via this same durable queue.
  | "data-export";

interface JobRow {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  attempts: number;
  scheduled_at: string;
}

const MAX_ATTEMPTS = 3;

/**
 * The origin the job runner calls itself on.
 *
 * ── WHY THE `www.` MATTERS ────────────────────────────────────────────────
 * This defaulted to `https://studyledger.in`, the apex, which 308-redirects
 * to `www.studyledger.in`. `fetch` follows that redirect, and per the Fetch
 * spec a redirect to a DIFFERENT HOST strips the `Authorization` header. So
 * every dispatch arrived at the send route with no credential, and
 * `isInternalCaller()` — correctly — refused it.
 *
 * The failure was invisible from the outside: the cron fired, the dispatcher
 * ran, jobs moved out of the queue, and every one of them landed in `failed`
 * with `Error: Authentication required.` Fifteen welcome emails between 19
 * July and 20 August were never sent.
 *
 * Verified, not assumed: a cross-host redirect drops the header (checked
 * against an echo service), a same-host one does not, and
 * `studyledger.in -> www.studyledger.in` is the cross-host case.
 *
 * `normaliseOrigin` keeps this true even if `NEXT_PUBLIC_SITE_URL` is later
 * set to the apex by hand, because a config value that silently disables
 * every outbound job is not a config value worth trusting.
 */
export function normaliseOrigin(raw: string | undefined): string {
  const fallback = "https://www.studyledger.in";
  if (!raw) return fallback;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fallback;
  }

  // The bare apex redirects; its www form does not. Anything else (a preview
  // deployment, localhost) is left exactly as given.
  if (url.hostname === "studyledger.in") url.hostname = "www.studyledger.in";

  return url.origin;
}

export async function enqueueJob(
  type: JobType,
  payload: Record<string, unknown>,
  scheduledAt?: Date
) {
  const { error } = await supabaseServer.from("jobs").insert({
    type,
    payload,
    status: "pending",
    scheduled_at: (scheduledAt ?? new Date()).toISOString(),
  });
  if (error) throw new Error(`enqueueJob: ${error.message}`);
}

export async function runPendingJobs(limit = 50): Promise<{ ran: number; failed: number }> {
  const { data: jobs, error } = await supabaseServer
    .from("jobs")
    .select("id, type, payload, attempts, scheduled_at")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .lt("attempts", MAX_ATTEMPTS)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (error || !jobs?.length) return { ran: 0, failed: 0 };

  let ran = 0;
  let failed = 0;
  const base = normaliseOrigin(process.env.NEXT_PUBLIC_SITE_URL);

  for (const job of jobs as JobRow[]) {
    await supabaseServer
      .from("jobs")
      .update({ status: "running", started_at: new Date().toISOString(), attempts: job.attempts + 1 })
      .eq("id", job.id);

    try {
      await dispatch(job, base);
      await supabaseServer
        .from("jobs")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("id", job.id);
      ran++;
    } catch (e) {
      const exhausted = job.attempts + 1 >= MAX_ATTEMPTS;
      const retryAt = new Date(Date.now() + 60_000 * 2 ** job.attempts).toISOString();
      await supabaseServer
        .from("jobs")
        .update({
          status: exhausted ? "failed" : "pending",
          error: String(e),
          ...(exhausted ? {} : { scheduled_at: retryAt }),
        })
        .eq("id", job.id);
      failed++;
    }
  }

  return { ran, failed };
}

async function dispatch(job: JobRow, base: string): Promise<void> {
  switch (job.type) {
    case "send-report": {
      const res = await fetch(`${base}/api/send-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${process.env.CRON_SECRET}` },
        body: JSON.stringify(job.payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? `send-report HTTP ${res.status}`);
      }
      return;
    }
    case "send-parent-digest": {
      const res = await fetch(`${base}/api/send-parent-digest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${process.env.CRON_SECRET}` },
        body: JSON.stringify(job.payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? `send-parent-digest HTTP ${res.status}`);
      }
      return;
    }
    case "send-welcome": {
      const res = await fetch(`${base}/api/welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${process.env.CRON_SECRET}` },
        body: JSON.stringify(job.payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? `welcome HTTP ${res.status}`);
      }
      return;
    }
    case "weekly-report-batch": {
      const res = await fetch(`${base}/api/cron/weekly-report`, {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      if (!res.ok) throw new Error(`weekly-report-batch HTTP ${res.status}`);
      return;
    }
    case "data-export": {
      const res = await fetch(`${base}/api/account/export/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${process.env.CRON_SECRET}` },
        body: JSON.stringify(job.payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? `data-export HTTP ${res.status}`);
      }
      return;
    }
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}
