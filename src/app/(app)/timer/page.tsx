import { db } from "@/lib/db"

export const dynamic = "force-dynamic"
import { FocusTimer } from "./focus-timer"

export default async function TimerPage() {
  const [subjects, recentLogs] = await Promise.all([
    db.subject.findMany({
      orderBy: { name: "asc" },
      include: { topics: { orderBy: { order: "asc" } } },
    }),
    db.timerLog.findMany({
      where: { endedAt: { not: null } },
      orderBy: { startedAt: "desc" },
      take: 10,
      include: { subject: true, topic: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Focus Timer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track focused study time with Pomodoro or a custom timer.
        </p>
      </div>
      <FocusTimer subjects={subjects} recentLogs={recentLogs} />
    </div>
  )
}
