"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

export type GoalsData = {
  studyMinutesPerDay: number
  sessionLengthMinutes: number
  flashcardsPerDay: number
  weeklyStudyDays: number
  focusSubjectId: string | null
}

export async function getGoals() {
  return db.goals.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
    include: { focusSubject: true },
  })
}

export async function saveGoals(data: GoalsData): Promise<{ error?: string }> {
  try {
    await db.goals.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        studyMinutesPerDay: data.studyMinutesPerDay,
        sessionLengthMinutes: data.sessionLengthMinutes,
        flashcardsPerDay: data.flashcardsPerDay,
        weeklyStudyDays: data.weeklyStudyDays,
        focusSubjectId: data.focusSubjectId || null,
      },
      update: {
        studyMinutesPerDay: data.studyMinutesPerDay,
        sessionLengthMinutes: data.sessionLengthMinutes,
        flashcardsPerDay: data.flashcardsPerDay,
        weeklyStudyDays: data.weeklyStudyDays,
        focusSubjectId: data.focusSubjectId || null,
      },
    })
    revalidatePath("/settings")
    revalidatePath("/")
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to save goals." }
  }
}

export async function getTodayProgress() {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const [flashcardsToday, timerLogsToday, goals] = await Promise.all([
    db.review.count({ where: { reviewedAt: { gte: todayStart } } }),
    db.timerLog.findMany({
      where: { startedAt: { gte: todayStart }, endedAt: { not: null } },
      select: { startedAt: true, endedAt: true },
    }),
    db.goals.findUnique({ where: { id: "singleton" } }),
  ])

  const studyMinutesToday = timerLogsToday.reduce((sum, log) => {
    if (!log.endedAt) return sum
    return sum + (log.endedAt.getTime() - log.startedAt.getTime()) / 60000
  }, 0)

  // Streak: count consecutive days (including today) that had at least 1 review
  const reviews = await db.review.findMany({
    orderBy: { reviewedAt: "desc" },
    select: { reviewedAt: true },
    take: 200,
  })

  let streak = 0
  const checkDate = new Date(now)
  checkDate.setHours(0, 0, 0, 0)

  while (true) {
    const dayEnd = new Date(checkDate)
    dayEnd.setHours(23, 59, 59, 999)
    const hasReview = reviews.some(r =>
      r.reviewedAt >= checkDate && r.reviewedAt <= dayEnd
    )
    if (!hasReview && checkDate.getTime() < now.getTime()) break
    if (hasReview) streak++
    checkDate.setDate(checkDate.getDate() - 1)
    if (streak > 365) break
  }

  // All-time stats
  const [totalCards, totalReviews] = await Promise.all([
    db.card.count(),
    db.review.count(),
  ])

  const allTimerLogs = await db.timerLog.findMany({
    where: { endedAt: { not: null } },
    select: { startedAt: true, endedAt: true },
  })
  const totalStudyMinutes = allTimerLogs.reduce((sum, log) => {
    if (!log.endedAt) return sum
    return sum + (log.endedAt.getTime() - log.startedAt.getTime()) / 60000
  }, 0)

  return {
    flashcardsToday,
    studyMinutesToday: Math.round(studyMinutesToday),
    streak,
    totalCards,
    totalReviews,
    totalStudyHours: Math.round(totalStudyMinutes / 60),
    goals,
  }
}
