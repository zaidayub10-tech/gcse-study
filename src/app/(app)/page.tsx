import { db } from "@/lib/db"

export const dynamic = "force-dynamic"
import { SubjectDashboard } from "./subject-dashboard"

export default async function TodayPage() {
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999)


  const subjects = await db.subject.findMany({ orderBy: { name: "asc" } })

  const [subjectStats, reviewedToday, todaySessions] = await Promise.all([
    // Per-subject stats
    Promise.all(
      subjects.map(async (s) => {
        const [topicCount, cardCount] = await Promise.all([
          db.topic.count({ where: { subjectId: s.id } }),
          db.card.count({ where: { deck: { subtopic: { topic: { subjectId: s.id } } } } }),
        ])
        return { ...s, topicCount, cardCount }
      })
    ),
    // Reviews done today
    db.review.count({ where: { reviewedAt: { gte: todayStart } } }),
    // Today's sessions
    db.session.findMany({
      where: { plannedAt: { gte: todayStart, lte: todayEnd } },
      include: { subject: true, topic: true },
      orderBy: { plannedAt: "asc" },
    }),
  ])

  return (
    <SubjectDashboard
      subjects={subjectStats}
      reviewedToday={reviewedToday}
      todaySessions={todaySessions}
    />
  )
}
