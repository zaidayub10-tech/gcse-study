"use client"

import { useState } from "react"
import { Sparkles, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { generateFlashcards, saveGeneratedCards, createDeckAndSaveCards } from "@/app/(app)/ai/actions"
import type { Subject, Topic, Subtopic, Deck } from "@/generated/prisma/client"

type SubtopicWithDecks = Subtopic & { decks?: Deck[] }
type TopicWithSubtopics = Topic & { subtopics: SubtopicWithDecks[] }
type SubjectFull = Subject & { topics: TopicWithSubtopics[] }

type ResourceOption = {
  id: string
  title: string
  extractedText: string | null
  subject: { name: string }
  topic: { name: string } | null
}

type GeneratedCard = { front: string; back: string }

export function FlashcardGenerator({
  subjects,
  resources,
}: {
  subjects: SubjectFull[]
  resources: ResourceOption[]
}) {
  const [subjectId, setSubjectId] = useState("")
  const [topicId, setTopicId] = useState("")
  const [source, setSource] = useState<"paste" | "resource">("paste")
  const [resourceId, setResourceId] = useState("")
  const [notes, setNotes] = useState("")
  const [instructions, setInstructions] = useState("")
  const [count, setCount] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState<GeneratedCard[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // Save state
  const [saveDeckId, setSaveDeckId] = useState("")
  const [newDeckName, setNewDeckName] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const selectedSubject = subjects.find((s) => s.id === subjectId)
  const selectedTopic = selectedSubject?.topics.find((t) => t.id === topicId)

  const allDecks = selectedSubject?.topics.flatMap((t) =>
    t.subtopics.flatMap((st) => st.decks ?? [])
  ) ?? []

  const notesText =
    source === "resource"
      ? resources.find((r) => r.id === resourceId)?.extractedText ?? ""
      : notes

  async function handleGenerate() {
    if (!subjectId || !notesText.trim()) {
      setError("Select a subject and provide notes or a resource.")
      return
    }
    setLoading(true)
    setError(null)
    setGenerated(null)
    setSaved(false)
    setSaveError(null)
    setSaveDeckId("")
    setNewDeckName("")
    const result = await generateFlashcards({
      notes: notesText.slice(0, 8000),
      subject: selectedSubject!.name,
      topic: selectedTopic?.name,
      count,
      instructions: instructions.trim() || undefined,
    })
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setGenerated(result.cards ?? [])
    setSelected(new Set(result.cards?.map((_, i) => i) ?? []))
  }

  async function handleSave() {
    if (!generated || selected.size === 0) return
    const cards = generated.filter((_, i) => selected.has(i))
    setSaveError(null)

    if (saveDeckId) {
      setSaving(true)
      const result = await saveGeneratedCards(saveDeckId, cards)
      setSaving(false)
      if (result.error) { setSaveError(result.error); return }
      setSaved(true); setGenerated(null); setSelected(new Set()); setNotes("")
      return
    }

    if (subjectId && newDeckName.trim()) {
      setSaving(true)
      const result = await createDeckAndSaveCards(subjectId, newDeckName.trim(), cards)
      setSaving(false)
      if (result.error) { setSaveError(result.error); return }
      setSaved(true); setGenerated(null); setSelected(new Set()); setNotes("")
      return
    }

    setSaveError("Enter a deck name to save.")
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Paste your notes or pick an extracted resource, and Rec will generate flashcards for you.
      </p>

      {/* Subject / Topic */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Subject *</label>
          <select
            value={subjectId}
            onChange={(e) => { setSubjectId(e.target.value); setTopicId("") }}
            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Select subject…</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {selectedSubject && selectedSubject.topics.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Topic (optional)</label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">None</option>
              {selectedSubject.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Source toggle */}
      <div className="flex gap-2">
        <Button size="sm" variant={source === "paste" ? "default" : "outline"} onClick={() => setSource("paste")}>
          Paste notes
        </Button>
        <Button
          size="sm"
          variant={source === "resource" ? "default" : "outline"}
          onClick={() => setSource("resource")}
          disabled={resources.length === 0}
        >
          Use resource {resources.length === 0 && "(none extracted yet)"}
        </Button>
      </div>

      {source === "paste" ? (
        <Textarea
          placeholder="Paste your notes, a passage, or exam questions here…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={8}
          className="resize-none text-sm"
        />
      ) : (
        <select
          value={resourceId}
          onChange={(e) => setResourceId(e.target.value)}
          className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Select a resource…</option>
          {resources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.subject.name}{r.topic ? ` · ${r.topic.name}` : ""} — {r.title}
            </option>
          ))}
        </select>
      )}

      {/* Custom instructions */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          Custom instructions <span className="font-normal normal-case tracking-normal">(optional)</span>
        </label>
        <Textarea
          placeholder="e.g. Focus on definitions only, make cards harder, use AQA command words…"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
          className="resize-none text-sm"
        />
      </div>

      {/* Count + Generate */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Cards:</label>
          {[5, 10, 15, 20].map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className={`h-7 w-9 rounded text-sm font-medium border transition-colors ${
                count === n ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-accent"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <Button onClick={handleGenerate} disabled={loading} className="gap-2">
          {loading
            ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" /> Generating…</>
            : <><Sparkles className="h-3.5 w-3.5" /> Generate</>}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-green-600 dark:text-green-400">✓ Cards saved to deck!</p>}

      {/* Generated cards */}
      {generated && (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{generated.length} cards generated</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelected(new Set(generated.map((_, i) => i)))}>All</Button>
                <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>None</Button>
              </div>
            </div>
            <div className="space-y-2">
              {generated.map((card, i) => (
                <div
                  key={i}
                  onClick={() => setSelected((s) => {
                    const next = new Set(s)
                    if (next.has(i)) next.delete(i); else next.add(i)
                    return next
                  })}
                  className={`cursor-pointer rounded-lg border px-4 py-3 grid grid-cols-2 gap-4 transition-colors ${
                    selected.has(i) ? "border-primary bg-primary/5" : "border-border bg-card opacity-50"
                  }`}
                >
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Front</p>
                    <p className="text-sm">{card.front}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Back</p>
                    <p className="text-sm">{card.back}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save panel */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-medium">Save {selected.size} card{selected.size !== 1 ? "s" : ""} to a deck</p>
            <div className="space-y-3">
              {allDecks.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Existing deck</label>
                  <select
                    value={saveDeckId}
                    onChange={(e) => { setSaveDeckId(e.target.value); setNewDeckName("") }}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="">+ Create new deck</option>
                    {allDecks.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {!saveDeckId && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {allDecks.length > 0 ? "Or new deck name" : "Deck name"}
                  </label>
                  <input
                    type="text"
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    placeholder="e.g. Chapter 1 Flashcards"
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus:border-ring"
                  />
                </div>
              )}
            </div>
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || selected.size === 0 || (!saveDeckId && !newDeckName.trim())}
                size="sm"
              >
                {saving ? "Saving…" : `Save ${selected.size} card${selected.size !== 1 ? "s" : ""}`}
              </Button>
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
