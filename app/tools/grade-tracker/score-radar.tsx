"use client";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis } from "recharts";

// Dynamically imported from page.tsx — keeps recharts (~60 KB gz) out of the
// grade-tracker first-load bundle.

const radarConfig = { pct: { label: "Score %" } } satisfies ChartConfig;

export default function ScoreRadar({ data }: { data: { pillar: string; pct: number }[] }) {
  return (
    <ChartContainer config={radarConfig} style={{ height: 200, marginBottom: 24 }}>
      <RadarChart data={data}>
        <PolarGrid stroke="var(--rule)" />
        <PolarAngleAxis dataKey="pillar" tick={{ fontFamily: "var(--mono)", fontSize: 9, fill: "var(--ink-3)", letterSpacing: "0.1em" }} />
        <Radar dataKey="pct" stroke="var(--cinnabar-ink)" fill="var(--cinnabar-ink)" fillOpacity={0.15} />
        <ChartTooltip content={<ChartTooltipContent />} />
      </RadarChart>
    </ChartContainer>
  );
}
