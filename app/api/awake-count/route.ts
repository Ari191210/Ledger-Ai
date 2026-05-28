import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STREAM_SIZES: Record<string, number> = {
  jee:    1_400_000,
  neet:   2_000_000,
  cbse:   3_800_000,
  igcse:    500_000,
  ib:       200_000,
};

function istInfo(): { inWindow: boolean; minutesIntoWindow: number; timeStr: string } {
  const now   = new Date();
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour:     "2-digit",
    minute:   "2-digit",
    hour12:   false,
  }).formatToParts(now);

  const h = parseInt(parts.find(p => p.type === "hour")?.value   ?? "0");
  const m = parseInt(parts.find(p => p.type === "minute")?.value ?? "0");
  const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  if (h === 23 && m >= 30) return { inWindow: true, minutesIntoWindow: m - 30,      timeStr };
  if (h === 0  && m <= 15) return { inWindow: true, minutesIntoWindow: 30 + m,       timeStr };
  return                          { inWindow: false, minutesIntoWindow: 0,            timeStr };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const stream     = (searchParams.get("stream") ?? "jee").toLowerCase();
  const streamSize = STREAM_SIZES[stream] ?? STREAM_SIZES.jee;

  const { inWindow, minutesIntoWindow, timeStr } = istInfo();
  if (!inWindow) return NextResponse.json({ inWindow: false });

  // Exponential decay: 92 % awake at 23:30 → 4 % at 00:15 (45-min window)
  // k = ln(0.92 / 0.04) / 45 ≈ 0.0697
  const pctAwake   = 0.92 * Math.exp(-0.0697 * minutesIntoWindow);
  const jitter     = Math.random() * 0.04 - 0.02;                  // ±2 %
  const awakeCount = Math.round(streamSize * Math.max(0.01, pctAwake + jitter));
  const percentile = Math.max(1, Math.round(pctAwake * 100));

  return NextResponse.json({ inWindow: true, awakeCount, percentile, istTime: timeStr, stream });
}
