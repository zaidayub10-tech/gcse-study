import { db } from "@/lib/db"

export const dynamic = "force-dynamic"
import { SubjectDashboard } from "./subject-dashboard"

// ── Streak helper ─────────────────────────────────────────────────────────────
function calcStreak(reviewDates: Date[]): number {
  if (reviewDates.length === 0) return 0

  // Build a set of distinct YYYY-MM-DD strings (UTC)
  const daySet = new Set<string>()
  for (const d of reviewDates) {
    daySet.add(d.toISOString().slice(0, 10))
  }

  const todayUTC = new Date().toISOString().slice(0, 10)
  const yesterdayUTC = (() => {
    const d = new Date(); d.setUTCDate(d.getUTCDate() - 1)
    return d.toISOString().slice(0, 10)
  })()

  // Start counting from today if studied today, otherwise from yesterday
  let cursor = daySet.has(todayUTC) ? new Date(todayUTC) : new Date(yesterdayUTC)
  if (!daySet.has(cursor.toISOString().slice(0, 10))) return 0

  let streak = 0
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak++
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}

export default async function TodayPage() {
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999)

  const subjects = await db.subject.findMany({ orderBy: { name: "asc" } })

  const [subjectStats, reviewedToday, todaySessions, allReviewDates, upcomingExams] = await Promise.all([
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
    // All review dates for streak calculation
    db.review.findMany({ select: { reviewedAt: true } }),
    // Upcoming exams
    db.subjectExam.findMany({
      where: { date: { gte: todayStart } },
      include: { subject: { select: { name: true, colour: true } } },
      orderBy: { date: "asc" },
      take: 8,
    }),
  ])

  const streak = calcStreak(allReviewDates.map((r) => r.reviewedAt))

  return (
    <SubjectDashboard
      subjects={subjectStats}
      reviewedToday={reviewedToday}
      todaySessions={todaySessions}
      streak={streak}
      upcomingExams={upcomingExams.map((e) => ({
        id: e.id,
        subjectName: e.subject.name,
        subjectColour: e.subject.colour,
        paper: e.paper,
        date: e.date,
      }))}
    />
  )
}
