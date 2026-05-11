import {
  LayoutDashboard,
  BookOpen,
  Library,
  Layers,
  Link2,
  Sparkles,
  Timer,
  Calendar,
  BarChart2,
  Settings,
  FlaskConical,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  group: "study" | "manage" | "app"
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Today",      href: "/",          icon: LayoutDashboard, group: "study" },
  { label: "Review",     href: "/review",    icon: BookOpen,        group: "study" },
  { label: "Flashcards", href: "/flashcards", icon: Layers,         group: "study" },
  { label: "AI Tutor",        href: "/ai",        icon: Sparkles,      group: "study" },
  { label: "Study Extractor", href: "/resources", icon: FlaskConical,  group: "study" },
  { label: "Subjects",   href: "/subjects",  icon: Library,         group: "manage" },
  { label: "Resources",  href: "/resources", icon: Link2,           group: "manage" },
  { label: "Planner",    href: "/planner",   icon: Calendar,        group: "manage" },
  { label: "Timer",      href: "/timer",     icon: Timer,           group: "manage" },
  { label: "Progress",   href: "/progress",  icon: BarChart2,       group: "manage" },
  { label: "Settings",   href: "/settings",  icon: Settings,        group: "app" },
]

export const NAV_GROUPS: { key: NavItem["group"]; label: string }[] = [
  { key: "study",  label: "Study" },
  { key: "manage", label: "Manage" },
  { key: "app",    label: "App" },
]
