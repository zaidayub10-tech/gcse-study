"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Plus, BookOpen, Layers, ChevronRight,
  FlaskConical,
  Clock, Calendar, Sparkles,
  BarChart2, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createSubjectFromSettings } from "./settings/actions"
import { SubjectForm } from "@/components/subject-form"
import type { Session, Subject, Topic } from "@/generated/prisma/client"

type SubjectWithStats = {
  id: string
  name: string
  qualification: string
  examBoard: string
  specCode: string | null
  tier: string
  colour: string
  topicCount: number
  cardCount: number
}

type SessionWithRefs = Session & { subject: Subject; topic: Topic | null }

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning ☀️"
  if (h < 17) return "Good afternoon 🌤️"
  return "Good evening 🌙"
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}
function fmtDur(min: number) {
  return min < 60 ? `${min}m` : min === 60 ? "1h" : `${min / 60}h`
}

// ── Main component ────────────────────────────────────────────────────────────
export function SubjectDashboard({
  subjects,
  reviewedToday = 0,
  todaySessions = [],
}: {
  subjects: SubjectWithStats[]
  reviewedToday?: number
  todaySessions?: SessionWithRefs[]
}) {
  const [showAdd, setShowAdd] = useState(false)

  async function handleCreate(values: Parameters<typeof createSubjectFromSettings>[0]): Promise<string | null> {
    const result = await createSubjectFromSettings(values)
    if (result.error) return result.error
    setShowAdd(false)
    return null
  }

  const totalCards = subjects.reduce((s, sub) => s + sub.cardCount, 0)

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greeting()}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New subject
        </button>
      </div>

      {/* ── Add subject form ───────────────────────────────────── */}
      {showAdd && (
        <div className="rounded-xl border-2 border-primary/20 bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Add a subject</h2>
            <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <SubjectForm
            onSubmit={handleCreate}
            submitLabel="Add subject"
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}

      {/* ── Subject grid ───────────────────────────────────────── */}
      {subjects.length === 0 && !showAdd ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-20 text-center">
          <FlaskConical className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="font-bold text-lg">No subjects yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Add your first subject to get started</p>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />Add subject
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map(s => <SubjectCard key={s.id} subject={s} />)}
          <button
            onClick={() => { setShowAdd(true); window.scrollTo({ top: 0, behavior: "smooth" }) }}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/50 p-8 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all min-h-[180px]"
          >
            <Plus className="h-8 w-8 mb-2 opacity-50" />
            <span className="text-sm font-medium">Add subject</span>
          </button>
        </div>
      )}

      {/* ── Stats row ──────────────────────────────────────────── */}
      {subjects.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: reviewedToday, label: "reviewed today", emoji: "✅", bg: "bg-[#C9A961]/12 dark:bg-[#C9A961]/20", num: "text-[#8B6914] dark:text-amber-300" },
            { value: totalCards,    label: "total cards",    emoji: "🗂️", bg: "bg-[#CD774D]/10 dark:bg-[#CD774D]/20", num: "text-[#9B4F24] dark:text-orange-300" },
          ].map(s => (
            <div key={s.label} className={`rounded-xl px-4 py-4 flex flex-col gap-1.5 ${s.bg}`}>
              <span className="text-xl leading-none">{s.emoji}</span>
              <p className={`text-2xl font-extrabold leading-none ${s.num}`}>{s.value}</p>
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Today's sessions ───────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Today&apos;s sessions
          </h2>
          <Link href="/planner" className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium">
            Open planner →
          </Link>
        </div>
        {todaySessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-5 py-6 text-center">
            <p className="text-sm text-muted-foreground">No sessions planned for today.</p>
            <Link href="/planner" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <Plus className="h-3 w-3" /> Schedule one
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {todaySessions.map(s => (
              <div key={s.id} className={cn(
                "flex items-center gap-4 rounded-xl border px-5 py-3.5",
                s.status === "completed" ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-900/20 opacity-80"
                : s.status === "skipped"   ? "border-border opacity-40"
                : "border-border bg-card"
              )}>
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: s.subject.colour }} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold", s.status === "skipped" && "line-through")}>
                    {s.subject.name}
                    {s.topic && <span className="font-normal text-muted-foreground"> · {s.topic.name}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {fmtTime(new Date(s.plannedAt))} · {fmtDur(s.durationMin)}
                    {s.notes && <> · {s.notes}</>}
                  </p>
                </div>
                {s.status === "completed" && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">Done ✓</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick access ───────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="font-bold">Quick access</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { href: "/timer",      label: "Focus Timer",  icon: Clock,         desc: "Start a Pomodoro",      bg: "bg-[#C9A961]/10 hover:bg-[#C9A961]/18", iconBg: "bg-[#C9A961]/20", emoji: "⏱️" },
            { href: "/ai",         label: "AI Tools",     icon: Sparkles,      desc: "Generate & chat",       bg: "bg-[#CD774D]/8 hover:bg-[#CD774D]/16",  iconBg: "bg-[#CD774D]/15", emoji: "✨" },
            { href: "/flashcards", label: "Flashcards",   icon: Layers,        desc: "Browse all decks",      bg: "bg-[#0F1E3D]/6 hover:bg-[#0F1E3D]/12",  iconBg: "bg-[#0F1E3D]/10", emoji: "🗂️" },
            { href: "/progress",   label: "Progress",     icon: BarChart2,     desc: "View your stats",       bg: "bg-[#C9A961]/10 hover:bg-[#C9A961]/18", iconBg: "bg-[#C9A961]/20", emoji: "📊" },
            { href: "/resources",  label: "Resources",    icon: BookOpen,      desc: "Notes & links",         bg: "bg-[#CD774D]/8 hover:bg-[#CD774D]/16",  iconBg: "bg-[#CD774D]/15", emoji: "📚" },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className={cn("flex items-center gap-3.5 rounded-xl border border-transparent px-4 py-4 transition-colors dark:bg-white/5 dark:hover:bg-white/10", item.bg)}>
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg shrink-0 text-lg", item.iconBg)}>
                {item.emoji}
              </span>
              <div>
                <p className="text-sm font-bold">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}

// ── Subject card ──────────────────────────────────────────────────────────────
function SubjectCard({ subject: s }: { subject: SubjectWithStats }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <div className="h-1.5 w-full" style={{ backgroundColor: s.colour }} />
      <div className="p-5 flex flex-col flex-1 gap-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-base leading-tight">{s.name}</h3>
            <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
              style={{ backgroundColor: s.colour }}>
              {s.qualification}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {s.examBoard}{s.tier !== "Both" ? ` · ${s.tier}` : ""}
            {s.specCode ? ` · ${s.specCode}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">{s.topicCount} topic{s.topicCount !== 1 ? "s" : ""}</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground">{s.cardCount} card{s.cardCount !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border">
          <Link href={`/subjects/${s.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold hover:bg-accent transition-colors">
            <ChevronRight className="h-3.5 w-3.5" />Topics
          </Link>
          <Link href="/review"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold hover:bg-accent text-muted-foreground transition-colors">
            <BookOpen className="h-3.5 w-3.5" />Review
          </Link>
          <Link href="/flashcards"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold hover:bg-accent text-muted-foreground transition-colors">
            <Layers className="h-3.5 w-3.5" />Cards
          </Link>
        </div>
      </div>
    </div>
  )
}
