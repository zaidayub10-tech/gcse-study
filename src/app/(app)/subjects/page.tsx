import Link from "next/link"

export const dynamic = "force-dynamic"
import { db } from "@/lib/db"
import { BookOpen } from "lucide-react"

export default async function SubjectsPage() {
  const subjects = await db.subject.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { topics: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Subjects</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a subject to manage its topics and subtopics.
        </p>
      </div>

      {subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 gap-4 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="font-medium">No subjects yet</p>
            <p className="text-sm text-muted-foreground">
              Add subjects in{" "}
              <Link href="/settings" className="underline underline-offset-2">
                Settings
              </Link>
              .
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <Link
              key={s.id}
              href={`/subjects/${s.id}`}
              className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-4 hover:bg-accent/50 transition-colors"
            >
              <span
                className="h-4 w-4 rounded-full shrink-0"
                style={{ backgroundColor: s.colour }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.qualification} · {s.examBoard}
                  {s.specCode ? ` · ${s.specCode}` : ""}
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {s._count.topics} topic{s._count.topics !== 1 ? "s" : ""}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
