"use client";

import { useState } from "react";
import {
  Control,
  Measure,
  Panel,
  Row,
  Rule,
  Spacer,
  Stack,
  Text,
} from "@/components/console/primitives";
import { useAuth } from "@/components/auth-provider";
import { ProfileIdentityCard, StudyProfileCard } from "@/components/settings/profile-fields";
import { AppearanceFields } from "@/components/settings/appearance-fields";
import ExamSchedule from "@/components/settings/exam-schedule";
import SharePanel from "@/components/settings/share-panel";
import PushOptIn from "@/components/push-opt-in";

// ═══════════════════════════════════════════════════════════════════════════
// /settings — M16-1, and the destination of `/dashboard/profile`'s and
// `/tools/personalise`'s redirects.
//
// `PRODUCT_DECISIONS` §2.4: *"**Settings** ← `/dashboard/profile`,
// `personalise`. Two profile editors."* §2.2 names what the route holds:
// *"Profile, subjects, board, plan, parent access."*
//
// FOUR SECTIONS, ONE WORKSPACE (`PRINCIPLES` law 8) — the same `?section=`
// pattern `/diagnosis`, `/capture` and `/record` already use for a mode
// switch inside one route rather than four routes.
//
//   Profile        identity, account details, billing            (was /dashboard/profile)
//   Study profile  grade, board, stream, exam, AI calibration     (was /dashboard/profile)
//   Appearance     palette, density, layout, dashboard sections   (was /tools/personalise)
//   Sharing        exam schedule, parent access, score alerts     (moved here by M3-3 already)
//
// M16-3 — PARENT ACCESS CONTROLS, SURFACED IN /SETTINGS. `SharePanel` below
// IS that control. M17 REBUILT it: invitation + authenticated acceptance
// replace the unauthenticated `parentCode` link, and sharing is now seven
// independent categories (all OFF by default) instead of one switch — see
// `components/settings/share-panel.tsx` and `lib/parent-space.ts`.
// ═══════════════════════════════════════════════════════════════════════════

type Section = "profile" | "study" | "appearance" | "sharing";

const SECTIONS: ReadonlyArray<[Section, string]> = [
  ["profile", "Profile"],
  ["study", "Study profile"],
  ["appearance", "Appearance"],
  ["sharing", "Sharing & parent access"],
];

export default function SettingsPage() {
  const { user, session } = useAuth();
  const [section, setSection] = useState<Section>("profile");

  const displayName = user?.email?.split("@")[0] || "Student";
  const referralCode = user ? user.id.replace(/-/g, "").slice(0, 8).toUpperCase() : "";
  const siteBase = typeof window !== "undefined" ? window.location.origin : "https://studyledger.in";

  return (
    <main id="main-content">
      <Stack>
        <Measure wide>
          <Row gap={3}>
            <Text step="label" tone="ink" weight={600}>
              StudyLedger
            </Text>
            <Spacer />
            <Control tier="tertiary" href="/legal">
              Legal
            </Control>
            <Control tier="tertiary" href="/home">
              Home
            </Control>
          </Row>
        </Measure>
        <Rule />
      </Stack>

      <Measure wide>
        <Stack gap={6}>
          <Stack gap={3}>
            <Text step="title" as="h1" weight={500}>
              Settings
            </Text>
            <Text step="body" tone="secondary">
              Profile, subjects, board, plan and parent access — one editor.
            </Text>
          </Stack>

          <Row gap={2} wrap>
            {SECTIONS.map(([id, label]) => (
              <Control
                key={id}
                tier={section === id ? "primary" : "tertiary"}
                onClick={() => setSection(id)}
              >
                {label}
              </Control>
            ))}
          </Row>

          <Rule />

          <Panel tone="raised" bordered pad={4}>
            {section === "profile" && <ProfileIdentityCard />}
            {section === "study" && <StudyProfileCard />}
            {section === "appearance" && <AppearanceFields />}
            {section === "sharing" && user && (
              <Stack gap={4}>
                <ExamSchedule
                  userId={user.id}
                  userEmail={user.email || ""}
                  userName={displayName}
                />
                <PushOptIn />
                <SharePanel token={session?.access_token} />
                <Panel tone="raised" bordered pad={4}>
                  <Text step="label" tone="ink" weight={600}>Refer a friend</Text>
                  <Text step="micro" tone="secondary">
                    {siteBase}/?ref={referralCode} — referral rewards are coming; nothing is credited yet.
                  </Text>
                </Panel>
              </Stack>
            )}
          </Panel>
        </Stack>
      </Measure>
    </main>
  );
}
