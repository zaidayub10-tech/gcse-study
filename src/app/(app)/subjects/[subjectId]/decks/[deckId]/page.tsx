import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { db } from "@/lib/db"
import { CardListSubject } from "./card-list-subject"

export default async function SubjectDeckPage({
  params,
}: {
  params: Promise<{
    subjectId: string
    deckId: string
  }>
}) {
  const { subjectId, deckId } = await params

  const deck = await db.deck.findUnique({
    where: { id: deckId },
    include: {
      subject: true,
      cards: { orderBy: { createdAt: "asc" } },
    },
  })

  if (!deck || deck.subjectId !== subjectId) notFound()

  const subject = deck.subject!

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
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
        <span className="text-foreground font-medium">{deck.name}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold">{deck.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {deck.cards.length} card{deck.cards.length !== 1 ? "s" : ""}
          {deck.source !== "manual" && ` · ${deck.source}`}
        </p>
      </div>

      <CardListSubject
        subjectId={subjectId}
        deckId={deckId}
        cards={deck.cards}
      />
    </div>
  )
}
