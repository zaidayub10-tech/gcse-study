"use client"

import { useState } from "react"
import { Layers, ChevronRight, ChevronDown, Play, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { CardReviewer } from "@/components/card-reviewer"
import { getCardsForDeck } from "./actions"
import type { DeckCard } from "./actions"
import type { Subject, Topic, Subtopic, Deck } from "@/generated/prisma/client"

type DeckWithCount = Deck & { _count: { cards: number } }
type SubtopicWithDecks = Subtopic & { decks: DeckWithCount[] }
type TopicWithSubtopics = Topic & { subtopics: SubtopicWithDecks[] }
type SubjectFull = Subject & {
  topics: TopicWithSubtopics[]
  decks: DeckWithCount[]
}

// ── Deck row ─────────────────────────────────────────────────────────────────

function DeckRow({
  deck,
  subjectColour,
  onStart,
}: {
  deck: DeckWithCount
  subjectColour: string
  onStart: (deckId: string) => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/40 transition-colors group">
      <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="flex-1 text-sm truncate">{deck.name}</span>
      <Badge variant="outline" className="text-xs shrink-0">
        {deck._count.cards} card{deck._count.cards !== 1 ? "s" : ""}
      </Badge>
      <button
        onClick={() => onStart(deck.id)}
        disabled={deck._count.cards === 0}
        className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90"
      >
        <Play className="h-3 w-3" />
        Review
      </button>
    </div>
  )
}

// ── Deck picker ───────────────────────────────────────────────────────────────

export function DeckPicker({ subjects }: { subjects: SubjectFull[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(subjects.map((s) => s.id))
  )
  const [loadingDeckId, setLoadingDeckId] = useState<string | null>(null)
  const [reviewCards, setReviewCards] = useState<DeckCard[] | null>(null)
  const [reviewDeckName, setReviewDeckName] = useState("")
  const [loadError, setLoadError] = useState("")

  function toggleSubject(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function startDeck(deckId: string, deckName: string) {
    setLoadError("")
    setLoadingDeckId(deckId)
    const result = await getCardsForDeck(deckId)
    setLoadingDeckId(null)
    if (result.error) { setLoadError(result.error); return }
    setReviewCards(result.cards!)
    setReviewDeckName(deckName)
  }

  // ── Active review session ────────────────────────────────────────────────────
  if (reviewCards !== null) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setReviewCards(null); setReviewDeckName("") }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            ← Back to decks
          </button>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-sm font-medium">{reviewDeckName}</span>
        </div>
        {reviewCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 gap-3 text-center">
            <Layers className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">This deck has no cards yet.</p>
          </div>
        ) : (
          <CardReviewer cards={reviewCards} />
        )}
      </div>
    )
  }

  // ── Deck browser ─────────────────────────────────────────────────────────────
  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 gap-3 text-center">
        <Layers className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No decks yet. Create some in the Flashcards section.</p>
      </div>
    )
  }

  // Flatten: subject-level decks + subtopic decks (deduplicated by ID)
  function getAllDecks(subject: SubjectFull): { deck: DeckWithCount; subtopicId?: string }[] {
    const seen = new Set<string>()
    const result: { deck: DeckWithCount; subtopicId?: string }[] = []

    for (const d of subject.decks) {
      if (!seen.has(d.id)) { seen.add(d.id); result.push({ deck: d }) }
    }
    for (const t of subject.topics) {
      for (const st of t.subtopics) {
        for (const d of st.decks) {
          if (!seen.has(d.id)) { seen.add(d.id); result.push({ deck: d, subtopicId: st.id }) }
        }
      }
    }
    return result
  }

  const totalDecks = subjects.reduce((acc, s) => acc + getAllDecks(s).length, 0)

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {totalDecks} deck{totalDecks !== 1 ? "s" : ""} — hover a deck and click Review to start
      </p>

      {loadError && (
        <p className="text-sm text-destructive">{loadError}</p>
      )}

      {subjects.map((subject) => {
        const allDecks = getAllDecks(subject)
        if (allDecks.length === 0) return null
        const isOpen = expanded.has(subject.id)

        return (
          <div key={subject.id} className="rounded-lg border border-border bg-card overflow-hidden">
            <button
              onClick={() => toggleSubject(subject.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
            >
              {isOpen
                ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              }
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: subject.colour }} />
              <span className="font-medium flex-1">{subject.name}</span>
              <span className="text-xs text-muted-foreground">
                {allDecks.length} deck{allDecks.length !== 1 ? "s" : ""}
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-border px-3 py-2 space-y-0.5">
                {allDecks.map(({ deck }) => (
                  loadingDeckId === deck.id ? (
                    <div key={deck.id} className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading {deck.name}…
                    </div>
                  ) : (
                    <DeckRow
                      key={deck.id}
                      deck={deck}
                      subjectColour={subject.colour}
                      onStart={(id) => startDeck(id, deck.name)}
                    />
                  )
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
