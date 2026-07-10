import { supabaseServer } from "./supabase-server";

export type JobType = "send-report" | "send-welcome" | "weekly-report-batch";

interface JobRow {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  attempts: number;
  scheduled_at: string;
}

const MAX_ATTEMPTS = 3;

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
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://studyledger.in";

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
    case "send-welcome": {
      const res = await fetch(`${base}/api/welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}
