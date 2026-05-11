import { db } from "@/lib/db"
import { ProgressDashboard } from "./progress-dashboard"

export default async function ProgressPage() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [subjects, reviews, timerLogs, sessions, cardCounts] = await Promise.all([
    db.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        topics: {
          include: {
            subtopics: {
              include: {
                decks: {
                  include: { _count: { select: { cards: true } } },
                },
              },
            },
          },
        },
      },
    }),
    db.review.findMany({
      where: { reviewedAt: { gte: thirtyDaysAgo } },
      orderBy: { reviewedAt: "asc" },
      include: { card: { include: { deck: { include: { subject: true, subtopic: { include: { topic: { include: { subject: true } } } } } } } } },
    }),
    db.timerLog.findMany({
      where: { endedAt: { not: null }, startedAt: { gte: thirtyDaysAgo } },
      include: { subject: true },
    }),
    db.session.findMany({
      where: { plannedAt: { gte: thirtyDaysAgo } },
      include: { subject: true },
    }),
    db.card.groupBy({
      by: ["deckId"],
      _count: { id: true },
    }),
  ])

  const totalCards = await db.card.count()
  const dueToday = await db.card.count({ where: { dueAt: { lte: now } } })
  const totalDecks = await db.deck.count()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Progress</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your revision stats for the last 30 days.
        </p>
      </div>
      <ProgressDashboard
        subjects={subjects}
        reviews={reviews}
        timerLogs={timerLogs}
        sessions={sessions}
        totalCards={totalCards}
        dueToday={dueToday}
        totalDecks={totalDecks}
      />
    </div>
  )
}
