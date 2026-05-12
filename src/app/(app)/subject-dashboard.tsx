"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Plus, BookOpen, Layers, ChevronRight,
  FlaskConical, Clock, Calendar, Sparkles,
  BarChart2, X, ArrowRight,
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
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function greetingEmoji() {
  const h = new Date().getHours()
  if (h < 12) return "☀️"
  if (h < 17) return "🌤️"
  return "🌙"
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
    <div className="space-y-10">

      {/* ── Hero header ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-indigo-600 px-8 py-8 shadow-lg shadow-primary/20">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-12 -right-4 h-56 w-56 rounded-full bg-white/5" />
        <div className="absolute top-4 right-32 h-16 w-16 rounded-full bg-white/5" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-primary-foreground/70 text-sm font-medium mb-1">
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </p>
            <h1 className="text-3xl font-bold text-primary-foreground tracking-tight">
              {greeting()} {greetingEmoji()}
            </h1>
            <p className="text-primary-foreground/70 text-sm mt-2">
              {subjects.length > 0
                ? `You have ${subjects.length} subject${subjects.length !== 1 ? "s" : ""} · ${totalCards} flashcards`
                : "Welcome to your study dashboard"}
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 backdrop-blur-sm shrink-0"
          >
            <Plus className="h-4 w-4" />
            New subject
          </button>
        </div>
      </div>

      {/* ── Add subject form ───────────────────────────────────── */}
      {showAdd && (
        <div className="rounded-2xl border border-primary/20 bg-card p-6 shadow-lg space-y-5 ring-1 ring-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">Add a subject</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Set up your subject and import the spec with AI</p>
            </div>
            <button onClick={() => setShowAdd(false)} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
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

      {/* ── Stats row ──────────────────────────────────────────── */}
      {subjects.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reviewed today</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-base">✅</span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">{reviewedToday}</p>
            <p className="text-xs text-muted-foreground">cards reviewed</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total cards</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/30 text-base">🗂️</span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight text-violet-600 dark:text-violet-400">{totalCards}</p>
            <p className="text-xs text-muted-foreground">across all subjects</p>
          </div>
        </div>
      )}

      {/* ── Subject grid ───────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg tracking-tight">Your subjects</h2>
          {subjects.length > 0 && (
            <Link href="/subjects" className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {subjects.length === 0 && !showAdd ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <FlaskConical className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-bold text-lg">No subjects yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-xs">Add your first subject to start building your revision materials</p>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
              <Plus className="h-4 w-4" />Add your first subject
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map(s => <SubjectCard key={s.id} subject={s} />)}
            <button
              onClick={() => { setShowAdd(true); window.scrollTo({ top: 0, behavior: "smooth" }) }}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 p-8 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200 min-h-[200px] group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-current mb-3 group-hover:border-primary/40 transition-colors">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold">Add subject</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Today's sessions ───────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg tracking-tight flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Today&apos;s sessions
          </h2>
          <Link href="/planner" className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium flex items-center gap-1">
            Open planner <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {todaySessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">No sessions planned for today.</p>
            <Link href="/planner" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              <Plus className="h-3 w-3" /> Schedule one
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {todaySessions.map(s => (
              <div key={s.id} className={cn(
                "flex items-center gap-4 rounded-xl border px-5 py-3.5 transition-colors",
                s.status === "completed" ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-800/40 dark:bg-emerald-900/20"
                : s.status === "skipped"   ? "border-border opacity-40"
                : "border-border bg-card hover:bg-muted/30"
              )}>
                <span className="h-3 w-3 rounded-full shrink-0 ring-2 ring-white dark:ring-card" style={{ backgroundColor: s.subject.colour }} />
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
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-1">
                    ✓ Done
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick access ───────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="font-bold text-lg tracking-tight">Quick access</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { href: "/timer",      label: "Focus Timer",     desc: "Pomodoro sessions",   emoji: "⏱️", color: "bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 border-amber-100 dark:border-amber-800/30" },
            { href: "/ai",         label: "AI Tutor",        desc: "Chat & get help",     emoji: "✨", color: "bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/30 border-violet-100 dark:border-violet-800/30" },
            { href: "/flashcards", label: "Flashcards",      desc: "Browse all decks",    emoji: "🗂️", color: "bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border-blue-100 dark:border-blue-800/30" },
            { href: "/progress",   label: "Progress",        desc: "View your stats",     emoji: "📊", color: "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800/30" },
            { href: "/resources",  label: "Study Extractor", desc: "Extract & save notes", emoji: "📚", color: "bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/30 border-rose-100 dark:border-rose-800/30" },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className={cn("flex items-center gap-3.5 rounded-2xl border px-4 py-4 transition-all duration-150 group", item.color)}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 dark:bg-white/10 text-xl shadow-sm shrink-0">
                {item.emoji}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{item.label}</p>
                <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
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
    <div className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 transition-all duration-200 flex flex-col group">
      {/* Colour bar */}
      <div className="h-1 w-full" style={{ backgroundColor: s.colour }} />
      <div className="p-5 flex flex-col flex-1 gap-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-base leading-tight">{s.name}</h3>
            <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm"
              style={{ backgroundColor: s.colour }}>
              {s.qualification}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {s.examBoard}{s.tier !== "Both" ? ` · ${s.tier}` : ""}
            {s.specCode ? ` · ${s.specCode}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="font-semibold text-foreground">{s.topicCount}</span> topic{s.topicCount !== 1 ? "s" : ""}
          </span>
          <span className="text-muted-foreground/30">·</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="font-semibold text-foreground">{s.cardCount}</span> card{s.cardCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-border">
          <Link href={`/subjects/${s.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold bg-primary/8 hover:bg-primary/15 text-primary transition-colors">
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
