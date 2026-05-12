import { db } from "@/lib/db"

export const dynamic = "force-dynamic"
import { FlashcardsShell } from "./flashcards-shell"

export default async function FlashcardsPage() {
  const [subjects, resources] = await Promise.all([
    db.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        decks: {
          where: { subtopicId: null },
          include: { _count: { select: { cards: true } } },
          orderBy: { name: "asc" },
        },
        topics: {
          orderBy: { order: "asc" },
          include: {
            subtopics: {
              orderBy: { order: "asc" },
              include: {
                decks: {
                  include: { _count: { select: { cards: true } } },
                  orderBy: { name: "asc" },
                },
              },
            },
          },
        },
      },
    }),
    db.resource.findMany({
      where: { extractedText: { not: null } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        extractedText: true,
        subject: { select: { name: true } },
        topic: { select: { name: true } },
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Flashcards</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse your decks or generate new cards with AI.
        </p>
      </div>
      <FlashcardsShell subjects={subjects} resources={resources} />
    </div>
  )
}
