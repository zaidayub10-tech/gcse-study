"use client"

import { useState } from "react"
import { Target, Flame, BookOpen, Clock, Trophy, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { saveGoals } from "./goals-actions"
import { cn } from "@/lib/utils"
import type { Subject } from "@/generated/prisma/client"

type Goals = {
  studyMinutesPerDay: number
  sessionLengthMinutes: number
  flashcardsPerDay: number
  weeklyStudyDays: number
  focusSubjectId: string | null
}

type Progress = {
  flashcardsToday: number
  studyMinutesToday: number
  streak: number
  totalCards: number
  totalReviews: number
  totalStudyHours: number
  goals: Goals | null
}

// ── Progress ring ─────────────────────────────────────────────────────────────

function ProgressRing({ value, max, colour, size = 64 }: { value: number; max: number; colour: string; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / Math.max(max, 1), 1)
  const offset = circ * (1 - pct)
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} className="stroke-muted" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6}
        stroke={colour} strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, colour }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; colour: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", colour)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Slider row ────────────────────────────────────────────────────────────────

function SliderRow({ label, icon: Icon, value, min, max, step, unit, onChange }: {
  label: string; icon: React.ElementType; value: number
  min: number; max: number; step: number; unit: string
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <label className="text-sm font-medium">{label}</label>
        </div>
        <span className="text-sm font-semibold text-primary tabular-nums">{value} {unit}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full accent-primary cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  )
}

// ── Today's goal progress ─────────────────────────────────────────────────────

function TodayProgress({ progress, goals }: { progress: Progress; goals: Goals }) {
  const cards = { value: progress.flashcardsToday, max: goals.flashcardsPerDay, label: "Flashcards", colour: "#6366f1" }
  const study = { value: progress.studyMinutesToday, max: goals.studyMinutesPerDay, label: "Study mins", colour: "#22c55e" }

  const cardsHit = cards.value >= cards.max
  const studyHit = study.value >= study.max

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        Today&apos;s Progress
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {[cards, study].map(g => (
          <div key={g.label} className="flex items-center gap-3">
            <div className="relative shrink-0">
              <ProgressRing value={g.value} max={g.max} colour={g.colour} size={56} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold tabular-nums">
                  {Math.min(Math.round((g.value / Math.max(g.max, 1)) * 100), 100)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold">{g.value}<span className="text-xs text-muted-foreground font-normal"> / {g.max}</span></p>
              <p className="text-xs text-muted-foreground">{g.label}</p>
              {g.value >= g.max && (
                <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Done!
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      {cardsHit && studyHit && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-400 font-semibold text-center">
          🎉 All goals hit today — great work!
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function GoalsManager({
  initialGoals,
  progress,
  subjects,
}: {
  initialGoals: Goals
  progress: Progress
  subjects: Subject[]
}) {
  const [goals, setGoals] = useState<Goals>(initialGoals)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof Goals>(key: K, value: Goals[K]) {
    setGoals(g => ({ ...g, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    const result = await saveGoals(goals)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setSaved(true)
  }

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  return (
    <div className="space-y-8">

      {/* ── Today's progress ── */}
      <TodayProgress progress={progress} goals={goals} />

      {/* ── All-time stats ── */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">All-time</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={Flame} label="Day streak" colour="text-orange-500 bg-orange-50 dark:bg-orange-950/40"
            value={progress.streak} sub={progress.streak === 1 ? "Keep it up!" : progress.streak > 6 ? "On fire 🔥" : ""}
          />
          <StatCard
            icon={BookOpen} label="Cards reviewed" colour="text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
            value={progress.totalReviews.toLocaleString()}
          />
          <StatCard
            icon={Clock} label="Hours studied" colour="text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
            value={progress.totalStudyHours}
          />
          <StatCard
            icon={Trophy} label="Cards created" colour="text-amber-500 bg-amber-50 dark:bg-amber-950/40"
            value={progress.totalCards.toLocaleString()}
          />
        </div>
      </div>

      {/* ── Goal settings ── */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Set Your Goals
        </h3>

        <SliderRow
          label="Daily study time" icon={Clock}
          value={goals.studyMinutesPerDay} min={10} max={180} step={5} unit="min"
          onChange={v => set("studyMinutesPerDay", v)}
        />

        <SliderRow
          label="Session length" icon={Clock}
          value={goals.sessionLengthMinutes} min={5} max={90} step={5} unit="min"
          onChange={v => set("sessionLengthMinutes", v)}
        />

        <SliderRow
          label="Flashcards per day" icon={BookOpen}
          value={goals.flashcardsPerDay} min={5} max={200} step={5} unit="cards"
          onChange={v => set("flashcardsPerDay", v)}
        />

        {/* Study days */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium">Study days per week</label>
            </div>
            <span className="text-sm font-semibold text-primary">{goals.weeklyStudyDays} days</span>
          </div>
          <div className="flex gap-2">
            {DAYS.map((_, i) => {
              const dayNum = i + 1
              const active = dayNum <= goals.weeklyStudyDays
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => set("weeklyStudyDays", dayNum)}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-xs font-semibold transition-colors border",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-input hover:border-primary/50"
                  )}
                >
                  {DAYS[i]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Focus subject */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Focus subject</label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => set("focusSubjectId", null)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                !goals.focusSubjectId
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-input hover:border-primary/50"
              )}
            >
              All subjects
            </button>
            {subjects.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => set("focusSubjectId", s.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium border-2 transition-colors",
                  goals.focusSubjectId === s.id
                    ? "text-white"
                    : "bg-background text-muted-foreground border-input hover:opacity-80"
                )}
                style={goals.focusSubjectId === s.id
                  ? { backgroundColor: s.colour, borderColor: s.colour }
                  : { borderColor: s.colour + "60" }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-1">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving…</> : "Save goals"}
          </Button>
          {saved && (
            <span className="text-sm text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </div>
    </div>
  )
}
