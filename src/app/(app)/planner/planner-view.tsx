"use client"

import { useState, useCallback } from "react"
import {
  ChevronLeft, ChevronRight, Plus, Check, X, Clock,
  Trash2, CalendarDays, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createSession, updateSessionStatus, deleteSession } from "./actions"
import type { Subject, Topic, Session } from "@/generated/prisma/client"

type TopicSimple = Pick<Topic, "id" | "name">
type SubjectWithTopics = Subject & { topics: TopicSimple[] }
type SessionWithRefs = Session & { subject: Subject; topic: Topic | null }

const DURATIONS = [15, 30, 45, 60, 90, 120]
const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function isToday(d: Date) { return isSameDay(d, new Date()) }

/** Returns the grid of days (always full weeks, Mon-Sun) for the given month. */
function getCalendarGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7  // 0 = Monday
  const start = new Date(firstDay)
  start.setDate(1 - startOffset)
  const days: Date[] = []
  const cursor = new Date(start)
  while (cursor <= lastDay || days.length % 7 !== 0) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
    if (days.length > 42) break // max 6 weeks
  }
  return days
}

function sessionsByDay(sessions: SessionWithRefs[]): Map<string, SessionWithRefs[]> {
  const map = new Map<string, SessionWithRefs[]>()
  for (const s of sessions) {
    const key = new Date(s.plannedAt).toDateString()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  return map
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}
function fmtDur(min: number) {
  return min < 60 ? `${min}m` : min === 60 ? "1h" : `${min / 60}h`
}

// ── Empty form factory ────────────────────────────────────────────────────────
function emptyForm(date = "") {
  return { subjectId: "", topicId: "", date, time: "16:00", durationMin: 60, notes: "" }
}

// ── Main component ────────────────────────────────────────────────────────────
export function PlannerView({
  subjects,
  sessions,
}: {
  subjects: SubjectWithTopics[]
  sessions: SessionWithRefs[]
}) {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [form,  setForm]  = useState(emptyForm(now.toISOString().slice(0, 10)))
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]  = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [selected, setSelected] = useState<SessionWithRefs | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const grid    = getCalendarGrid(year, month)
  const byDay   = sessionsByDay(sessions)
  const selSubject = subjects.find((s) => s.id === form.subjectId)

  // ── Navigation ──────────────────────────────────────────────────────────────
  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }
  function goToday() {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-GB", {
    month: "long", year: "numeric",
  })
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  // ── Add session ─────────────────────────────────────────────────────────────
  function openAddForm(day?: Date) {
    const dateStr = day ? day.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    setForm(emptyForm(dateStr))
    setFormError(null)
    setSelected(null)
    setShowForm(true)
  }

  async function handleCreate() {
    if (!form.subjectId || !form.date || !form.time) {
      setFormError("Subject, date, and time are required.")
      return
    }
    setSaving(true)
    setFormError(null)
    const result = await createSession({
      subjectId: form.subjectId,
      topicId: form.topicId || undefined,
      plannedAt: `${form.date}T${form.time}:00`,
      durationMin: form.durationMin,
      notes: form.notes,
    })
    setSaving(false)
    if (result.error) { setFormError(result.error); return }
    setShowForm(false)
    setForm(emptyForm())
  }

  // ── Session actions ──────────────────────────────────────────────────────────
  const handleStatus = useCallback(async (id: string, status: "planned" | "completed" | "skipped") => {
    setUpdatingId(id)
    await updateSessionStatus(id, status)
    setUpdatingId(null)
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this session?")) return
    setUpdatingId(id)
    await deleteSession(id)
    setUpdatingId(null)
    setSelected(null)
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Header bar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-lg font-bold w-44 text-center">{monthLabel}</span>
          <button
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {!isCurrentMonth && (
            <button
              onClick={goToday}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-accent transition-colors"
            >
              Today
            </button>
          )}
        </div>
        <button
          onClick={() => openAddForm()}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add session
        </button>
      </div>

      {/* ── Add form ────────────────────────────────────────────── */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">New study session</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {/* Subject */}
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Subject *</label>
              <select
                value={form.subjectId}
                onChange={(e) => setForm(f => ({ ...f, subjectId: e.target.value, topicId: "" }))}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select subject…</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {/* Topic */}
            {selSubject && selSubject.topics.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Topic</label>
                <select
                  value={form.topicId}
                  onChange={(e) => setForm(f => ({ ...f, topicId: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Any topic</option>
                  {selSubject.topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            {/* Date */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Time */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Time *</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Duration */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Duration</label>
              <select
                value={form.durationMin}
                onChange={(e) => setForm(f => ({ ...f, durationMin: Number(e.target.value) }))}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {DURATIONS.map(d => <option key={d} value={d}>{fmtDur(d)}</option>)}
              </select>
            </div>
            {/* Notes */}
            <div className="space-y-1 col-span-2 sm:col-span-3">
              <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
              <input
                type="text"
                placeholder="What to focus on…"
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save session
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Calendar grid ───────────────────────────────────────── */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAY_HEADERS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {grid.map((day, idx) => {
            const isCurrentMonthDay = day.getMonth() === month
            const today = isToday(day)
            const daySessions = byDay.get(day.toDateString()) ?? []
            const overflow = daySessions.length > 3
            const visible = daySessions.slice(0, 3)
            const isLastRow = idx >= grid.length - 7

            return (
              <div
                key={day.toDateString()}
                className={cn(
                  "min-h-[100px] p-1.5 border-b border-r border-border cursor-pointer group transition-colors",
                  !isLastRow ? "border-b" : "border-b-0",
                  (idx + 1) % 7 === 0 ? "border-r-0" : "",
                  isCurrentMonthDay ? "bg-card hover:bg-accent/30" : "bg-muted/20 hover:bg-muted/40",
                  today ? "bg-primary/5 hover:bg-primary/10" : ""
                )}
                onClick={() => openAddForm(day)}
              >
                {/* Date number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      today
                        ? "bg-primary text-primary-foreground"
                        : isCurrentMonthDay
                        ? "text-foreground"
                        : "text-muted-foreground/40"
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {daySessions.length === 0 && (
                    <Plus className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-opacity" />
                  )}
                </div>

                {/* Session chips */}
                <div className="space-y-0.5" onClick={(e) => e.stopPropagation()}>
                  {visible.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelected(selected?.id === s.id ? null : s)}
                      className={cn(
                        "w-full text-left rounded px-1.5 py-0.5 text-[10px] font-medium truncate transition-opacity leading-relaxed",
                        s.status === "completed" ? "opacity-60 line-through" : "",
                        s.status === "skipped"   ? "opacity-40 line-through" : "",
                        selected?.id === s.id    ? "ring-1 ring-offset-0" : ""
                      )}
                      style={{
                        backgroundColor: s.subject.colour + "28",
                        color: s.subject.colour,
                        borderLeft: `2px solid ${s.subject.colour}`,
                      }}
                    >
                      {fmtTime(new Date(s.plannedAt))} {s.subject.name}
                    </button>
                  ))}
                  {overflow && (
                    <p className="text-[10px] text-muted-foreground pl-1">
                      +{daySessions.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Session detail panel ─────────────────────────────────── */}
      {selected && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full shrink-0 mt-0.5"
                style={{ backgroundColor: selected.subject.colour }}
              />
              <div>
                <p className="font-semibold">
                  {selected.subject.name}
                  {selected.topic && (
                    <span className="font-normal text-muted-foreground"> · {selected.topic.name}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {new Date(selected.plannedAt).toLocaleDateString("en-GB", {
                    weekday: "short", day: "numeric", month: "short",
                  })}
                  {" · "}{fmtTime(new Date(selected.plannedAt))}
                  {" · "}{fmtDur(selected.durationMin)}
                  {selected.notes && <> · <span>{selected.notes}</span></>}
                </p>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-1">
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
              selected.status === "completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" :
              selected.status === "skipped"   ? "bg-muted text-muted-foreground" :
                                                "bg-primary/10 text-primary"
            )}>
              {selected.status === "completed" && <Check className="h-3 w-3" />}
              {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {selected.status !== "completed" && (
              <button
                onClick={() => handleStatus(selected.id, "completed")}
                disabled={updatingId === selected.id}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                Mark complete
              </button>
            )}
            {selected.status !== "skipped" && selected.status !== "completed" && (
              <button
                onClick={() => handleStatus(selected.id, "skipped")}
                disabled={updatingId === selected.id}
                className="flex items-center gap-1.5 rounded-lg hover:bg-accent px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Skip
              </button>
            )}
            {(selected.status === "completed" || selected.status === "skipped") && (
              <button
                onClick={() => handleStatus(selected.id, "planned")}
                disabled={updatingId === selected.id}
                className="flex items-center gap-1.5 rounded-lg hover:bg-accent px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors disabled:opacity-50"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Reopen
              </button>
            )}
            <button
              onClick={() => handleDelete(selected.id)}
              disabled={updatingId === selected.id}
              className="flex items-center gap-1.5 rounded-lg hover:bg-destructive/10 text-destructive px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ml-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
