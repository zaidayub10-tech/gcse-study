import { db } from "@/lib/db"

export const dynamic = "force-dynamic"
import { listConversations } from "./tutor-actions"
import { AITools } from "./ai-tools"

export default async function AIPage() {
  const [subjects, initialConversations] = await Promise.all([
    db.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        topics: {
          orderBy: { order: "asc" },
          include: {
            subtopics: { orderBy: { order: "asc" } },
          },
        },
      },
    }),
    listConversations(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tutor Rec</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Chat with Rec, your personal tutor — explain concepts, exam technique, and more.
        </p>
      </div>
      <AITools subjects={subjects} initialConversations={initialConversations} />
    </div>
  )
}
