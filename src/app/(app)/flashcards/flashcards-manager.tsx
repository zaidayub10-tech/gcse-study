"use client"

import { useState } from "react"
import Link from "next/link"
import { PlusCircle, Layers, ChevronDown, ChevronRight, Check, X, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { createDeckFromFlashcards, deleteDeck } from "./actions"
import type { Subject, Topic, Subtopic, Deck } from "@/generated/prisma/client"

type DeckWithCount = Deck & { _count: { cards: number } }
type SubtopicWithDecks = Subtopic & { decks: DeckWithCount[] }
type TopicWithSubtopics = Topic & { subtopics: SubtopicWithDecks[] }
type SubjectFull = Subject & {
  topics: TopicWithSubtopics[]
  decks: DeckWithCount[]
}

type NewDeckState = {
  subjectId: string
  name: string
} | null

export function FlashcardsManager({ subjects }: { subjects: SubjectFull[] }) {
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(
    () => new Set(subjects.map((s) => s.id))
  )
  const [newDeck, setNewDeck] = useState<NewDeckState>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function toggleSubject(id: string) {
    setExpandedSubjects((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCreate() {
    if (!newDeck || !newDeck.name.trim()) return
    setSaving(true)
    setError(null)
    const result = await createDeckFromFlashcards({
      subjectId: newDeck.subjectId,
      name: newDeck.name,
    })
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setNewDeck(null)
  }

  async function handleDelete(deckId: string) {
    setDeletingId(deckId)
    await deleteDeck(deckId)
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  // Count all decks for a subject: subject-level + via subtopics
  function countDecks(subject: SubjectFull) {
    const subjectLevel = subject.decks.length
    const subtopicLevel = subject.topics.reduce(
      (acc, t) => acc + t.subtopics.reduce((a, st) => a + st.decks.length, 0),
      0
    )
    return subjectLevel + subtopicLevel
  }

  const totalDecks = subjects.reduce((acc, s) => acc + countDecks(s), 0)

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 gap-4 text-center">
        <Layers className="h-10 w-10 text-muted-foreground/40" />
        <div className="space-y-1">
          <p className="font-medium">No subjects yet</p>
          <p className="text-sm text-muted-foreground">
            Add subjects in{" "}
            <Link href="/settings" className="underline underline-offset-2">Settings</Link>
            {" "}first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {totalDecks} deck{totalDecks !== 1 ? "s" : ""} across {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
      </p>

      {subjects.map((subject) => {
        const isExpanded = expandedSubjects.has(subject.id)
        const subjectDecks = countDecks(subject)
        const isAddingHere = newDeck?.subjectId === subject.id

        // All decks: subject-level + via subtopics (flat list with label)
        const allDecks: { deck: DeckWithCount; label: string; subtopicId?: string }[] = [
          ...subject.decks.map(d => ({ deck: d, label: d.name })),
          ...subject.topics.flatMap(t =>
            t.subtopics.flatMap(st =>
              st.decks.map(d => ({
                deck: d,
                label: d.name,
                subtopicId: st.id,
              }))
            )
          ),
        ]

        return (
          <div key={subject.id} className="rounded-lg border border-border bg-card overflow-hidden">
            {/* Subject header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => toggleSubject(subject.id)}
                className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: subject.colour }}
                />
                <span className="font-medium flex-1">{subject.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {subjectDecks} deck{subjectDecks !== 1 ? "s" : ""}
                </span>
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 shrink-0"
                onClick={() => setNewDeck({ subjectId: subject.id, name: "" })}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                New deck
              </Button>
            </div>

            {isExpanded && (
              <div className="border-t border-border px-4 py-3 space-y-2">
                {/* New deck inline form */}
                {isAddingHere && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        autoFocus
                        placeholder="Deck name"
                        value={newDeck?.name ?? ""}
                        onChange={(e) =>
                          setNewDeck((d) => d ? { ...d, name: e.target.value } : d)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreate()
                          if (e.key === "Escape") setNewDeck(null)
                        }}
                        className="h-7 text-sm"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={handleCreate}
                        disabled={saving}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setNewDeck(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {error && (
                      <p className="text-xs text-destructive">{error}</p>
                    )}
                  </div>
                )}

                {/* Deck list */}
                {allDecks.length > 0 ? (
                  <div className="space-y-1">
                    {allDecks.map(({ deck, subtopicId }) => {
                      const href = subtopicId
                        ? `/subjects/${subject.id}/subtopics/${subtopicId}/decks/${deck.id}`
                        : `/subjects/${subject.id}/decks/${deck.id}`
                      const isConfirming = confirmDeleteId === deck.id
                      const isDeleting = deletingId === deck.id
                      return (
                        <div
                          key={deck.id}
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent/50 transition-colors group"
                        >
                          <Link href={href} className="flex items-center gap-2 min-w-0 flex-1">
                            <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate group-hover:underline underline-offset-2">
                              {deck.name}
                            </span>
                          </Link>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {deck._count.cards} card{deck._count.cards !== 1 ? "s" : ""}
                          </Badge>
                          {isConfirming ? (
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.preventDefault()}>
                              <button
                                onClick={() => handleDelete(deck.id)}
                                disabled={isDeleting}
                                className="text-[10px] font-semibold text-destructive hover:underline disabled:opacity-50"
                              >
                                {isDeleting ? "Deleting…" : "Delete"}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-[10px] text-muted-foreground hover:text-foreground ml-1"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.preventDefault(); setConfirmDeleteId(deck.id) }}
                              className="h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/15 hover:text-destructive text-muted-foreground transition-all shrink-0"
                              title="Delete deck"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : !isAddingHere ? (
                  <p className="text-sm text-muted-foreground">No decks yet. Click "New deck" to create one.</p>
                ) : null}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
