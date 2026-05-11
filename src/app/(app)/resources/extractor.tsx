"use client"

import { useState } from "react"
import { Sparkles, Link2, FileText, Loader2, X, PlayCircle, Globe, BookMarked, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { processUrl, processText } from "./actions"
import { ExtractionView } from "./extraction-panels"
import type { ExtractionOutput } from "./actions"
import type { Subject, Topic } from "@/generated/prisma/client"

type SubjectWithTopics = Subject & { topics: Topic[] }

const CONTENT_TYPES = [
  { value: "notes",         label: "Notes / text" },
  { value: "past paper",    label: "Past paper / questions" },
  { value: "textbook",      label: "Textbook excerpt" },
  { value: "lesson notes",  label: "Lesson notes" },
  { value: "essay",         label: "Essay / answer" },
]

function isYouTubeUrl(url: string) {
  return /youtube\.com|youtu\.be/.test(url)
}

// ── Main component ─────────────────────────────────────────────────────────────
export function Extractor({
  subjects,
  onSaved,
}: {
  subjects: SubjectWithTopics[]
  onSaved?: (resourceId: string) => void
}) {
  const [mode, setMode]           = useState<"url" | "text">("url")
  const [url, setUrl]             = useState("")
  const [text, setText]           = useState("")
  const [contentType, setContentType] = useState("notes")
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "")
  const [topicId, setTopicId]     = useState("")
  const [instructions, setInstructions] = useState("")
  const [processing, setProcessing] = useState(false)
  const [step, setStep]           = useState("")
  const [error, setError]         = useState("")
  const [output, setOutput]       = useState<ExtractionOutput | null>(null)
  const [resourceId, setResourceId] = useState<string | null>(null)

  const selectedSubject = subjects.find(s => s.id === subjectId)

  async function handleProcess() {
    setError("")
    setOutput(null)
    setResourceId(null)
    setProcessing(true)

    if (mode === "url") {
      if (!url.trim()) { setError("Enter a URL."); setProcessing(false); return }
      setStep(isYouTubeUrl(url) ? "Fetching video info…" : "Extracting page content…")
      await new Promise(r => setTimeout(r, 400))
      setStep("Analysing with AI…")
      const result = await processUrl({ url: url.trim(), subjectId, topicId: topicId || undefined, instructions: instructions.trim() || undefined })
      if (result.error) { setError(result.error); setProcessing(false); return }
      setOutput(result.output!)
      const rid = result.resourceId ?? null
      setResourceId(rid)
      if (rid) onSaved?.(rid)
    } else {
      if (!text.trim()) { setError("Paste some content first."); setProcessing(false); return }
      setStep("Analysing with AI…")
      const result = await processText({ text: text.trim(), contentType, subjectId, topicId: topicId || undefined, instructions: instructions.trim() || undefined })
      if (result.error) { setError(result.error); setProcessing(false); return }
      setOutput(result.output!)
      const rid = result.resourceId ?? null
      setResourceId(rid)
      if (rid) onSaved?.(rid)
    }

    setProcessing(false)
    setStep("")
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Study Extractor
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste a URL or your notes — get a summary, key points, flashcards and practice questions instantly.
        </p>
      </div>

      {/* ── Input card ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5 shadow-sm">

        {/* Mode toggle */}
        <div className="flex rounded-lg border border-border p-1 gap-1 w-fit">
          {([
            { key: "url",  label: "URL",   icon: Link2 },
            { key: "text", label: "Notes", icon: FileText },
          ] as const).map(m => (
            <button
              key={m.key}
              onClick={() => { setMode(m.key); setError("") }}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                mode === m.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <m.icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          ))}
        </div>

        {/* URL input */}
        {mode === "url" && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              URL
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                {url && isYouTubeUrl(url)
                  ? <PlayCircle className="h-4 w-4 text-red-500" />
                  : <Globe className="h-4 w-4 text-muted-foreground" />
                }
              </div>
              <input
                type="url"
                placeholder="Paste a YouTube link, article, past paper, revision site…"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full h-11 rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
              />
              {url && (
                <button onClick={() => setUrl("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Works with YouTube videos, BBC Bitesize, revision sites, articles, and most web pages.
            </p>
          </div>
        )}

        {/* Text input */}
        {mode === "text" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Content
              </label>
              <select
                value={contentType}
                onChange={e => setContentType(e.target.value)}
                className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CONTENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <textarea
              rows={8}
              placeholder="Paste your notes, a past paper question, textbook excerpt, lesson content…"
              value={text}
              onChange={e => setText(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50 leading-relaxed"
            />
            <p className="text-xs text-muted-foreground text-right">{text.split(/\s+/).filter(Boolean).length} words</p>
          </div>
        )}

        {/* Subject + topic */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</label>
            <select
              value={subjectId}
              onChange={e => { setSubjectId(e.target.value); setTopicId("") }}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {selectedSubject && selectedSubject.topics.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Topic <span className="font-normal normal-case tracking-normal">(optional)</span>
              </label>
              <select
                value={topicId}
                onChange={e => setTopicId(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All topics</option>
                {selectedSubject.topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Custom instructions */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            Custom instructions <span className="font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Focus on definitions only, prioritise exam technique, generate harder flashcards, ignore the introduction…"
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50 leading-relaxed"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            {error}
          </p>
        )}

        <button
          onClick={handleProcess}
          disabled={processing || !subjectId}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? (
            <><Loader2 className="h-4 w-4 animate-spin" />{step}</>
          ) : (
            <><Sparkles className="h-4 w-4" />Extract &amp; Analyse</>
          )}
        </button>
      </div>

      {/* ── Output ───────────────────────────────────────────────── */}
      {output && (
        <div className="space-y-4">
          {/* Saved banner */}
          {resourceId && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                <BookMarked className="h-4 w-4" />
                Saved to your library
              </div>
              <button
                onClick={() => onSaved?.(resourceId)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
              >
                View in Library <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <h2 className="font-bold text-lg flex-1">{output.title}</h2>
            <button onClick={() => setOutput(null)} className="text-muted-foreground hover:text-foreground p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ExtractionView output={output} subjectId={subjectId} resourceId={resourceId ?? undefined} />
        </div>
      )}
    </div>
  )
}
