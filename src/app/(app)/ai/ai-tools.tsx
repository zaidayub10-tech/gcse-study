"use client"

import { useState } from "react"
import { MessageSquare, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { TutorShell } from "./tutor-shell"
import { NotesShell } from "./notes-shell"
import type { Subject, Topic } from "@/generated/prisma/client"
import type { ConvSummary } from "./tutor-actions"
import type { NoteSummary } from "./notes-actions"

type SubjectWithTopics = Subject & { topics: (Topic & { subtopics: { id: string; name: string }[] })[] }

type Tab = "chat" | "notes"

export function AITools({
  subjects,
  initialConversations,
  initialNotes,
}: {
  subjects: SubjectWithTopics[]
  initialConversations: ConvSummary[]
  initialNotes: NoteSummary[]
}) {
  const [tab, setTab] = useState<Tab>("chat")

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border">
        {(["chat", "notes"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {t === "chat"
              ? <><MessageSquare className="h-4 w-4" />Chat</>
              : <><FileText className="h-4 w-4" />Notes</>}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "chat" && (
        <TutorShell subjects={subjects} initialConversations={initialConversations} />
      )}
      {tab === "notes" && (
        <NotesShell subjects={subjects} initialNotes={initialNotes} />
      )}
    </div>
  )
}
