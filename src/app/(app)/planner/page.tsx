import { db } from "@/lib/db"

export const dynamic = "force-dynamic"
import { PlannerView } from "./planner-view"

export default async function PlannerPage() {
  const now = new Date()
  // Load 6 months back + 6 months forward so the calendar can navigate freely
  const past = new Date(now.getFullYear(), now.getMonth() - 6, 1)
  const future = new Date(now.getFullYear(), now.getMonth() + 7, 0)

  const [subjects, sessions] = await Promise.all([
    db.subject.findMany({
      orderBy: { name: "asc" },
      include: { topics: { orderBy: { order: "asc" } } },
    }),
    db.session.findMany({
      where: { plannedAt: { gte: past, lte: future } },
      orderBy: { plannedAt: "asc" },
      include: { subject: true, topic: true },
    }),
  ])

  return <PlannerView subjects={subjects} sessions={sessions} />
}
