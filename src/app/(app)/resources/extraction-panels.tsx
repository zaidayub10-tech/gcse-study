"use client"

import { useState } from "react"
import {
  FileText, ListChecks, Layers, HelpCircle,
  Copy, Check, Save, Loader2, X, ChevronDown, BookOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getDecksForSubject, saveExtractedCards, createDeckAndSaveCards } from "./actions"
import type { ExtractionOutput } from "./actions"

const OUTPUT_TABS = [
  { key: "summary",    label: "Summary",    icon: FileText },
  { key: "keyPoints",  label: "Key points", icon: ListChecks },
  { key: "flashcards", label: "Flashcards", icon: Layers },
  { key: "questions",  label: "Questions",  icon: HelpCircle },
] as const

type OutputTab = typeof OUTPUT_TABS[number]["key"]

// ── Top-level view ────────────────────────────────────────────────────────────

export function ExtractionView({
  output,
  subjectId,
  resourceId,
  defaultTab = "summary",
}: {
  output: ExtractionOutput
  subjectId: string
  resourceId?: string
  defaultTab?: OutputTab
}) {
  const [activeTab, setActiveTab] = useState<OutputTab>(defaultTab)

  return (
    <div className="space-y-4">
      {/* Meta line */}
      <p className="text-xs text-muted-foreground">
        {output.keyPoints.length} key points · {output.flashcards.length} flashcards · {output.questions.length} questions
      </p>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {OUTPUT_TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "summary"   && <SummaryPanel   summary={output.summary} />}
        {activeTab === "keyPoints" && <KeyPointsPanel points={output.keyPoints} />}
        {activeTab === "flashcards" && (
          <FlashcardsPanel
            cards={output.flashcards}
            title={output.title}
            subjectId={subjectId}
            resourceId={resourceId}
          />
        )}
        {activeTab === "questions" && <QuestionsPanel questions={output.questions} />}
      </div>
    </div>
  )
}

// ── Summary ───────────────────────────────────────────────────────────────────

function SummaryPanel({ summary }: { summary: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />Summary
        </h3>
        <button onClick={copy} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <><Check className="h-3.5 w-3.5 text-emerald-500" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
        </button>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{summary}</p>
    </div>
  )
}

// ── Key points ────────────────────────────────────────────────────────────────

function KeyPointsPanel({ points }: { points: string[] }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(points.map((p, i) => `${i + 1}. ${p}`).join("\n"))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />Key Points
        </h3>
        <button onClick={copy} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <><Check className="h-3.5 w-3.5 text-emerald-500" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
        </button>
      </div>
      <ul className="space-y-2">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold mt-0.5">
              {i + 1}
            </span>
            <span className="leading-relaxed">{p}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Flashcards ────────────────────────────────────────────────────────────────

export function FlashcardsPanel({
  cards,
  title,
  subjectId,
  resourceId,
}: {
  cards: { front: string; back: string }[]
  title: string
  subjectId: string
  resourceId?: string
}) {
  const [flipped, setFlipped]   = useState<Set<number>>(new Set())
  const [selected, setSelected] = useState<Set<number>>(new Set(cards.map((_, i) => i)))
  const [showSave, setShowSave] = useState(false)
  const [existingDecks, setExistingDecks] = useState<{ id: string; name: string }[]>([])
  const [loadingDecks, setLoadingDecks] = useState(false)
  const [deckId, setDeckId]         = useState("")
  const [newDeckName, setNewDeckName] = useState(title.slice(0, 50))
  const [saving, setSaving]         = useState(false)
  const [saveMsg, setSaveMsg]       = useState("")

  function toggleFlip(i: number) {
    setFlipped(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
  }

  function toggleSelect(i: number, e: React.MouseEvent) {
    e.stopPropagation()
    setSelected(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
  }

  async function openSave() {
    setShowSave(true)
    setSaveMsg("")
    if (existingDecks.length === 0 && !loadingDecks) {
      setLoadingDecks(true)
      const data = await getDecksForSubject(subjectId)
      setExistingDecks(data.map(d => ({ id: d.id, name: d.name })))
      setLoadingDecks(false)
    }
  }

  async function handleSave() {
    if (selected.size === 0) { setSaveMsg("Select at least one card."); return }
    setSaving(true)
    setSaveMsg("")
    const cardsToSave = cards.filter((_, i) => selected.has(i))
    let result
    if (deckId) {
      result = await saveExtractedCards(deckId, cardsToSave, resourceId)
    } else {
      if (!newDeckName.trim()) { setSaveMsg("Enter a deck name."); setSaving(false); return }
      result = await createDeckAndSaveCards(subjectId, newDeckName.trim(), cardsToSave, resourceId)
    }
    setSaving(false)
    if (result.error) { setSaveMsg(result.error); return }
    setSaveMsg(`✓ Saved ${result.saved} cards!`)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{selected.size}</span> of {cards.length} selected — click card to flip, ☑ to select
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSelected(new Set(cards.map((_, i) => i)))}
              className="text-xs text-muted-foreground hover:text-foreground border border-input rounded px-2 py-0.5 hover:bg-accent transition-colors"
            >All</button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground border border-input rounded px-2 py-0.5 hover:bg-accent transition-colors"
            >None</button>
          </div>
        </div>
        <button
          onClick={openSave}
          disabled={selected.size === 0}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save className="h-3.5 w-3.5" />
          Save {selected.size} card{selected.size !== 1 ? "s" : ""} to deck
        </button>
      </div>

      {/* Save panel */}
      {showSave && (
        <div className="rounded-xl border-2 border-primary/20 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Save {selected.size} flashcard{selected.size !== 1 ? "s" : ""}</h4>
            <button onClick={() => setShowSave(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          {loadingDecks ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />Loading decks…
            </div>
          ) : (
            <div className="space-y-3">
              {existingDecks.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Existing deck</label>
                  <select value={deckId} onChange={e => setDeckId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">+ Create new deck</option>
                    {existingDecks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              {!deckId && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {existingDecks.length > 0 ? "Or new deck name" : "New deck name"}
                  </label>
                  <input type="text" value={newDeckName} onChange={e => setNewDeckName(e.target.value)}
                    placeholder="e.g. Chapter 3 Flashcards"
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              )}
              {saveMsg && (
                <p className={cn("text-sm", saveMsg.startsWith("✓") ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                  {saveMsg}
                </p>
              )}
              <button onClick={handleSave} disabled={saving || selected.size === 0}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save {selected.size} card{selected.size !== 1 ? "s" : ""}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((card, i) => (
          <div
            key={i}
            onClick={() => toggleFlip(i)}
            className={cn(
              "relative rounded-xl border text-left p-4 min-h-[100px] transition-colors cursor-pointer",
              selected.has(i)
                ? flipped.has(i) ? "bg-primary/5 border-primary/40" : "bg-card border-primary/30"
                : "bg-card border-border opacity-50"
            )}
          >
            <button
              onClick={e => toggleSelect(i, e)}
              className={cn(
                "absolute top-3 right-3 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                selected.has(i)
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-muted-foreground/30 bg-background hover:border-primary"
              )}
            >
              {selected.has(i) && (
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 pr-6">
              {flipped.has(i)
                ? <span className="text-primary">Answer</span>
                : <span className="text-muted-foreground">Question</span>
              }
            </p>
            <p className="text-sm leading-relaxed pr-2">
              {flipped.has(i) ? card.back : card.front}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Questions ─────────────────────────────────────────────────────────────────

function QuestionsPanel({ questions }: { questions: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set())
  function toggle(i: number) {
    setOpen(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
  }
  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
          <button
            onClick={() => toggle(i)}
            className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm font-medium leading-relaxed">{q.question}</p>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 mt-0.5 transition-transform", open.has(i) && "rotate-180")} />
          </button>
          {open.has(i) && (
            <div className="px-5 pb-4 pt-0 border-t border-border">
              <div className="flex items-center gap-1.5 mb-2 pt-3">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Model answer</span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">{q.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
