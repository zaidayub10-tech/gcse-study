import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"
import { db } from "@/lib/db"
import { TopicTree } from "@/components/topic-tree"

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>
}) {
  const { subjectId } = await params

  const subject = await db.subject.findUnique({
    where: { id: subjectId },
    include: {
      disciplines: { orderBy: { order: "asc" } },
      topics: {
        orderBy: { order: "asc" },
        include: {
          subtopics: {
            orderBy: { order: "asc" },
            include: { _count: { select: { decks: true } } },
          },
        },
      },
    },
  })

  if (!subject) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span
          className="h-4 w-4 rounded-full shrink-0"
          style={{ backgroundColor: subject.colour }}
        />
        <div>
          <h1 className="text-2xl font-semibold">{subject.name}</h1>
          <p className="text-sm text-muted-foreground">
            {subject.qualification} · {subject.examBoard}
            {subject.specCode ? ` · ${subject.specCode}` : ""} · {subject.tier}
          </p>
        </div>
      </div>

      <TopicTree
        subjectId={subject.id}
        disciplines={subject.disciplines}
        topics={subject.topics}
      />
    </div>
  )
}
