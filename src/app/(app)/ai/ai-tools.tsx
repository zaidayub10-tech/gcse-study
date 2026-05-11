"use client"

import { TutorShell } from "./tutor-shell"
import type { Subject, Topic } from "@/generated/prisma/client"
import type { ConvSummary } from "./tutor-actions"

type SubjectWithTopics = Subject & { topics: (Topic & { subtopics: { id: string; name: string }[] })[] }

export function AITools({
  subjects,
  initialConversations,
}: {
  subjects: SubjectWithTopics[]
  initialConversations: ConvSummary[]
}) {
  return (
    <TutorShell subjects={subjects} initialConversations={initialConversations} />
  )
}
