"use client"

import { useState } from "react"
import { Layers, Sparkles } from "lucide-react"
import { FlashcardsManager } from "./flashcards-manager"
import { FlashcardGenerator } from "./flashcard-generator"
import type { Subject, Topic, Subtopic, Deck } from "@/generated/prisma/client"

type DeckWithCount = Deck & { _count: { cards: number } }
type SubtopicWithDecks = Subtopic & { decks: DeckWithCount[] }
type TopicWithSubtopics = Topic & { subtopics: SubtopicWithDecks[] }
type SubjectFull = Subject & {
  topics: TopicWithSubtopics[]
  decks: DeckWithCount[]
}

type ResourceOption = {
  id: string
  title: string
  extractedText: string | null
  subject: { name: string }
  topic: { name: string } | null
}

type Tab = "decks" | "generate"

export function FlashcardsShell({
  subjects,
  resources,
}: {
  subjects: SubjectFull[]
  resources: ResourceOption[]
}) {
  const [tab, setTab] = useState<Tab>("decks")

  return (
    <div className="space-y-5">
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("decks")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === "decks"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          My Decks
        </button>
        <button
          onClick={() => setTab("generate")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === "generate"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate with AI
        </button>
      </div>

      {tab === "decks" && <FlashcardsManager subjects={subjects} />}
      {tab === "generate" && <FlashcardGenerator subjects={subjects} resources={resources} />}
    </div>
  )
}
