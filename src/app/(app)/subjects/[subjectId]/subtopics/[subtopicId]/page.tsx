import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { db } from "@/lib/db"
import { DeckManager } from "./deck-manager"

export default async function SubtopicPage({
  params,
}: {
  params: Promise<{ subjectId: string; subtopicId: string }>
}) {
  const { subjectId, subtopicId } = await params

  const subtopic = await db.subtopic.findUnique({
    where: { id: subtopicId },
    include: {
      topic: {
        include: { subject: true },
      },
      decks: {
        include: { _count: { select: { cards: true } } },
        orderBy: { name: "asc" },
      },
    },
  })

  if (!subtopic || subtopic.topic.subjectId !== subjectId) notFound()

  const subject = subtopic.topic.subject

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href={`/subjects/${subjectId}`}
          className="hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: subject.colour }}
          />
          {subject.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="text-muted-foreground/70">{subtopic.topic.name}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="text-foreground font-medium">{subtopic.name}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold">{subtopic.name}</h1>
        {subtopic.specRef && (
          <p className="text-sm text-muted-foreground mt-0.5">
            Spec ref: {subtopic.specRef}
          </p>
        )}
      </div>

      <DeckManager
        subjectId={subjectId}
        subtopicId={subtopicId}
        decks={subtopic.decks}
      />
    </div>
  )
}
