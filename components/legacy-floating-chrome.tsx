"use client";
// Legacy floating chrome, shown only on the routes that expect it.
//
// The WhatsApp button and the rank whisper are part of the legacy surface.
// Rendering them unconditionally from the root layout puts a fixed, animated
// button over the academic OS pages, which contradicts the restraint those
// surfaces are built on — and Constitution §4's rule against attention-seeking
// interactions.
//
// Gating by pathname keeps both surfaces intact without touching either
// component: the legacy routes are unchanged, and the OS routes stay quiet.

import { usePathname } from "next/navigation";
import { LegacyChromeWhisper } from "@/components/legacy-chrome";
import { WhatsAppWidget } from "@/components/whatsapp-widget";

/** Route prefixes that render the academic OS and must stay free of the
 *  legacy floating chrome. */
const OS_ROUTES = ["/journey", "/os", "/about"];

export function LegacyFloatingChrome() {
  const path = usePathname() ?? "";
  const isOS = OS_ROUTES.some(r => path === r || path.startsWith(`${r}/`));
  if (isOS) return null;
  return (
    <>
      <LegacyChromeWhisper />
      <WhatsAppWidget />
    </>
  );
}
