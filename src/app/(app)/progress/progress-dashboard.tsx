"use client"

import { useState } from "react"
import type { Subject, Topic, Subtopic, Deck, Review, Card, TimerLog, Session } from "@/generated/prisma/client"

type DeckWithCount = Deck & { _count: { cards: number } }
type SubtopicWithDecks = Subtopic & { decks: DeckWithCount[] }
type TopicWithSubtopics = Topic & { subtopics: SubtopicWithDecks[] }
type SubjectFull = Subject & { topics: TopicWithSubtopics[] }

type ReviewFull = Review & {
  card: Card & {
    deck: Deck & {
      subject: Subject | null
      subtopic: (Subtopic & {
        topic: Topic & { subject: Subject }
      }) | null
    }
  }
}

type TimerLogFull = TimerLog & { subject: Subject }
type SessionFull = Session & { subject: Subject }

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-semibold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function last30Days() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    d.setHours(0, 0, 0, 0)
    return d
  })
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

function formatMins(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function ProgressDashboard({
  subjects,
  reviews,
  timerLogs,
  sessions,
  totalCards,
  dueToday,
  totalDecks,
}: {
  subjects: SubjectFull[]
  reviews: ReviewFull[]
  timerLogs: TimerLogFull[]
  sessions: SessionFull[]
  totalCards: number
  dueToday: number
  totalDecks: number
}) {
  const [subjectFilter, setSubjectFilter] = useState("all")

  const days = last30Days()

  // Helper: get the subjectId for a review's deck
  function reviewSubjectId(r: ReviewFull): string | null {
    return r.card.deck.subtopic?.topic.subjectId ?? r.card.deck.subject?.id ?? null
  }

  // Reviews per day
  const reviewsByDay = new Map<string, number>()
  for (const r of reviews) {
    if (subjectFilter !== "all" && reviewSubjectId(r) !== subjectFilter) continue
    const key = dateKey(new Date(r.reviewedAt))
    reviewsByDay.set(key, (reviewsByDay.get(key) ?? 0) + 1)
  }

  // Study time per day (from timer logs)
  const timeByDay = new Map<string, number>()
  for (const log of timerLogs) {
    if (!log.endedAt) continue
    if (subjectFilter !== "all" && log.subjectId !== subjectFilter) continue
    const mins = Math.round((new Date(log.endedAt).getTime() - new Date(log.startedAt).getTime()) / 60000)
    const key = dateKey(new Date(log.startedAt))
    timeByDay.set(key, (timeByDay.get(key) ?? 0) + mins)
  }

  const filteredReviews = reviews.filter(
    (r) => subjectFilter === "all" || reviewSubjectId(r) === subjectFilter
  )
  const totalReviews = filteredReviews.length
  const correctReviews = filteredReviews.filter((r) => r.rating >= 2).length
  const accuracy = totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0

  const totalStudyMins = Array.from(timeByDay.values()).reduce((a, b) => a + b, 0)

  const completedSessions = sessions.filter(
    (s) => s.status === "completed" && (subjectFilter === "all" || s.subjectId === subjectFilter)
  ).length

  const maxReviews = Math.max(...days.map((d) => reviewsByDay.get(dateKey(d)) ?? 0), 1)
  const maxMins = Math.max(...days.map((d) => timeByDay.get(dateKey(d)) ?? 0), 1)

  // Subject breakdown
  const subjectStats = subjects.map((s) => {
    const subReviews = reviews.filter((r) => reviewSubjectId(r) === s.id)
    const totalCards = s.topics.reduce(
      (a, t) => a + t.subtopics.reduce((b, st) => b + st.decks.reduce((c, d) => c + d._count.cards, 0), 0),
      0
    )
    const subTime = timerLogs
      .filter((l) => l.subjectId === s.id && l.endedAt)
      .reduce((a, l) => a + Math.round((new Date(l.endedAt!).getTime() - new Date(l.startedAt).getTime()) / 60000), 0)
    return { subject: s, reviews: subReviews.length, cards: totalCards, mins: subTime }
  }).filter((s) => s.reviews > 0 || s.cards > 0)

  return (
    <div className="space-y-6">
      {/* Filter */}
      <select
        value={subjectFilter}
        onChange={(e) => setSubjectFilter(e.target.value)}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="all">All subjects</option>
        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Cards reviewed" value={totalReviews} sub="last 30 days" />
        <StatCard label="Accuracy" value={`${accuracy}%`} sub={`${correctReviews}/${totalReviews} correct`} />
        <StatCard label="Study time" value={totalStudyMins > 0 ? formatMins(totalStudyMins) : "0m"} sub="last 30 days" />
        <StatCard label="Sessions done" value={completedSessions} sub="last 30 days" />
      </div>

      {subjectFilter === "all" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Total cards" value={totalCards} sub={`across ${totalDecks} decks`} />
          <StatCard label="Due today" value={dueToday} sub="cards to review" />
          <StatCard label="Subjects" value={subjects.length} />
        </div>
      )}

      {/* Reviews chart */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="font-medium text-sm">Cards reviewed per day</h2>
        <div className="flex items-end gap-0.5 h-24">
          {days.map((d) => {
            const count = reviewsByDay.get(dateKey(d)) ?? 0
            const height = maxReviews > 0 ? (count / maxReviews) * 100 : 0
            const isToday = dateKey(d) === dateKey(new Date())
            return (
              <div key={dateKey(d)} className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative">
                <div
                  className={`w-full rounded-sm transition-all ${isToday ? "bg-primary" : "bg-primary/40"} ${count === 0 ? "opacity-20" : ""}`}
                  style={{ height: `${Math.max(height, count > 0 ? 4 : 2)}%` }}
                />
                {count > 0 && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover border border-border rounded px-1.5 py-0.5 text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                    {count} on {d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* Study time chart */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="font-medium text-sm">Study time per day</h2>
        <div className="flex items-end gap-0.5 h-24">
          {days.map((d) => {
            const mins = timeByDay.get(dateKey(d)) ?? 0
            const height = maxMins > 0 ? (mins / maxMins) * 100 : 0
            const isToday = dateKey(d) === dateKey(new Date())
            return (
              <div key={dateKey(d)} className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative">
                <div
                  className={`w-full rounded-sm transition-all ${isToday ? "bg-blue-500" : "bg-blue-500/40"} ${mins === 0 ? "opacity-20" : ""}`}
                  style={{ height: `${Math.max(height, mins > 0 ? 4 : 2)}%` }}
                />
                {mins > 0 && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover border border-border rounded px-1.5 py-0.5 text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                    {formatMins(mins)} on {d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* Subject breakdown */}
      {subjectStats.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="font-medium text-sm">By subject</h2>
          <div className="space-y-2">
            {subjectStats.map(({ subject: s, reviews: r, cards: c, mins }) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.colour }} />
                <span className="text-sm flex-1 truncate">{s.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{c} cards</span>
                <span className="text-xs text-muted-foreground shrink-0">{r} reviews</span>
                {mins > 0 && <span className="text-xs text-muted-foreground shrink-0">{formatMins(mins)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
