"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Play, Pause, RotateCcw, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { startTimer, stopTimer } from "./actions"
import type { Subject, Topic, TimerLog } from "@/generated/prisma/client"

type SubjectWithTopics = Subject & { topics: Pick<Topic, "id" | "name">[] }
type LogWithRefs = TimerLog & { subject: Subject; topic: Topic | null }

type Mode = "pomodoro" | "short_break" | "custom"

const PRESETS: Record<Mode, number> = {
  pomodoro: 25 * 60,
  short_break: 5 * 60,
  custom: 45 * 60,
}

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0")
  const s = (seconds % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

function logDuration(log: LogWithRefs) {
  if (!log.endedAt) return ""
  const ms = new Date(log.endedAt).getTime() - new Date(log.startedAt).getTime()
  const mins = Math.round(ms / 60000)
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export function FocusTimer({
  subjects,
  recentLogs,
}: {
  subjects: SubjectWithTopics[]
  recentLogs: LogWithRefs[]
}) {
  const [mode, setMode] = useState<Mode>("pomodoro")
  const [customMins, setCustomMins] = useState(45)
  const [subjectId, setSubjectId] = useState("")
  const [topicId, setTopicId] = useState("")
  const [seconds, setSeconds] = useState(PRESETS.pomodoro)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [logId, setLogId] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedSubject = subjects.find((s) => s.id === subjectId)
  const totalSeconds = mode === "custom" ? customMins * 60 : PRESETS[mode]
  const progress = ((totalSeconds - seconds) / totalSeconds) * 100
  const circumference = 2 * Math.PI * 90

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    setFinished(false)
    setSeconds(mode === "custom" ? customMins * 60 : PRESETS[mode])
    setLogId(null)
  }, [mode, customMins])

  useEffect(() => {
    reset()
  }, [mode, reset])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!)
          setRunning(false)
          setFinished(true)
          if (logId) stopTimer(logId)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [running, logId])

  async function handleStart() {
    if (!subjectId) return
    const result = await startTimer({
      subjectId,
      topicId: topicId || undefined,
      mode,
    })
    if (result.id) setLogId(result.id)
    setRunning(true)
    setFinished(false)
  }

  async function handlePause() {
    setRunning(false)
    if (logId) {
      await stopTimer(logId)
      setLogId(null)
    }
  }

  function handleModeChange(m: Mode) {
    if (running) handlePause()
    setMode(m)
  }

  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="space-y-8 max-w-lg">
      {/* Mode selector */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted w-fit">
        {(["pomodoro", "short_break", "custom"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === m ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "pomodoro" ? "Pomodoro" : m === "short_break" ? "Short break" : "Custom"}
          </button>
        ))}
      </div>

      {/* Custom duration */}
      {mode === "custom" && !running && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Duration:</span>
          <div className="flex gap-1">
            {[15, 20, 30, 45, 60, 90].map((m) => (
              <button
                key={m}
                onClick={() => { setCustomMins(m); setSeconds(m * 60) }}
                className={`h-7 px-2.5 rounded text-sm font-medium border transition-colors ${
                  customMins === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-input hover:bg-accent"
                }`}
              >
                {m < 60 ? `${m}m` : `${m / 60}h`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Subject selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={subjectId}
          onChange={(e) => { setSubjectId(e.target.value); setTopicId("") }}
          disabled={running}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
        >
          <option value="">Select subject…</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {selectedSubject && selectedSubject.topics.length > 0 && (
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            disabled={running}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
          >
            <option value="">Any topic</option>
            {selectedSubject.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      {/* Timer ring */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <svg width="220" height="220" className="-rotate-90">
            <circle cx="110" cy="110" r="90" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
            <circle
              cx="110" cy="110" r="90"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className={finished ? "text-green-500" : "text-primary"}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: running ? "stroke-dashoffset 1s linear" : "none" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-mono font-semibold tabular-nums">{fmt(seconds)}</span>
            {finished && <span className="text-sm text-green-500 font-medium mt-1">Done!</span>}
            {running && selectedSubject && (
              <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                {selectedSubject.name}
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {!running ? (
            <Button
              size="lg"
              onClick={handleStart}
              disabled={!subjectId}
              className="gap-2 px-8"
            >
              <Play className="h-4 w-4" />
              {seconds === totalSeconds ? "Start" : "Resume"}
            </Button>
          ) : (
            <Button size="lg" variant="outline" onClick={handlePause} className="gap-2 px-8">
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={reset} title="Reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {!subjectId && (
          <p className="text-xs text-muted-foreground">Select a subject to start the timer.</p>
        )}
      </div>

      {/* Recent sessions */}
      {recentLogs.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-medium text-sm">Recent sessions</h2>
          <div className="space-y-1">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: log.subject.colour }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    {log.subject.name}
                    {log.topic && <span className="text-muted-foreground"> · {log.topic.name}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {" · "}{log.mode}
                  </p>
                </div>
                <span className="text-sm font-medium shrink-0 flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {logDuration(log)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
