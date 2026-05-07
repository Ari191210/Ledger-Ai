"use client"
import { useRouter, usePathname } from "next/navigation"
import { Dock } from "@/components/ui/dock-two"
import {
  LayoutDashboard,
  BookOpen,
  Target,
  Zap,
  User,
  BrainCircuit,
} from "lucide-react"

export default function DashboardDock() {
  const router = useRouter()
  const pathname = usePathname()

  const items = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      onClick: () => router.push("/dashboard"),
      active: pathname === "/dashboard",
    },
    {
      icon: Zap,
      label: "Focus",
      onClick: () => router.push("/tools/focus"),
      active: pathname === "/tools/focus",
    },
    {
      icon: BookOpen,
      label: "Notes",
      onClick: () => router.push("/tools/notes"),
      active: pathname === "/tools/notes",
    },
    {
      icon: Target,
      label: "Papers",
      onClick: () => router.push("/tools/papers"),
      active: pathname === "/tools/papers",
    },
    {
      icon: BrainCircuit,
      label: "Doubt Solver",
      onClick: () => router.push("/tools/doubt"),
      active: pathname === "/tools/doubt",
    },
    {
      icon: User,
      label: "Profile",
      onClick: () => router.push("/dashboard/profile"),
      active: pathname === "/dashboard/profile",
    },
  ]

  return <Dock items={items} />
}
