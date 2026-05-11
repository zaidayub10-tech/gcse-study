"use client"

import { useState } from "react"
import { Layers, BookMarked } from "lucide-react"
import { DeckPicker } from "./deck-picker"
import { ResourceLibrary } from "@/app/(app)/resources/library"
import type { Subject, Topic, Subtopic, Deck, Resource } from "@/generated/prisma/client"

// ── Types ────────────────────────────────────────────────────────────────────

type DeckWithCount = Deck & { _count: { cards: number } }
type SubtopicWithDecks = Subtopic & { decks: DeckWithCount[] }
type TopicWithSubtopics = Topic & { subtopics: SubtopicWithDecks[] }
type SubjectFull = Subject & {
  topics: TopicWithSubtopics[]
  decks: DeckWithCount[]
}

type ResourceWithRefs = Resource & {
  subject: Subject
  topic: Topic | null
  _count: { cards: number }
}

type Tab = "flashcards" | "resources"

// ── Shell ────────────────────────────────────────────────────────────────────

export function ReviewShell({
  subjects,
  resources,
}: {
  subjects: SubjectFull[]
  resources: ResourceWithRefs[]
}) {
  const [tab, setTab] = useState<Tab>("flashcards")

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-semibold">Review</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Study your flashcards and resources in one place.
        </p>
      </div>

      {/* Top-level tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("flashcards")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === "flashcards"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Flashcards
        </button>
        <button
          onClick={() => setTab("resources")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === "resources"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookMarked className="h-3.5 w-3.5" />
          Resources
          {resources.length > 0 && (
            <span className="ml-1 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold px-1.5 py-0.5 leading-none">
              {resources.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Flashcards tab ──────────────────────────────────────────────────── */}
      {tab === "flashcards" && (
        <DeckPicker subjects={subjects} />
      )}

      {/* ── Resources tab ───────────────────────────────────────────────────── */}
      {tab === "resources" && (
        <ResourceLibrary
          resources={resources}
          subjects={subjects}
        />
      )}
    </div>
  )
}
