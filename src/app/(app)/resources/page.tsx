import { db } from "@/lib/db"
import { ResourcesShell } from "./shell"

export default async function ResourcesPage() {
  const [subjects, resources] = await Promise.all([
    db.subject.findMany({
      orderBy: { name: "asc" },
      include: { topics: { orderBy: { order: "asc" } } },
    }),
    db.resource.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subject: true,
        topic: true,
        _count: { select: { cards: true } },
      },
    }),
  ])

  return <ResourcesShell subjects={subjects} resources={resources} />
}
