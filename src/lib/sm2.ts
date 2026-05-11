export type Rating = "again" | "hard" | "good" | "easy"

const QUALITY: Record<Rating, number> = {
  again: 0,
  hard: 2,
  good: 4,
  easy: 5,
}

export function applyReview(
  card: { ease: number; interval: number },
  rating: Rating
): { ease: number; interval: number; dueAt: Date } {
  const q = QUALITY[rating]
  let { ease, interval } = card

  if (q < 3) {
    interval = 0
  } else {
    ease = Math.max(1.3, ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    if (interval === 0) interval = 1
    else if (interval === 1) interval = 6
    else interval = Math.round(interval * ease)
  }

  const dueAt = new Date()
  dueAt.setDate(dueAt.getDate() + interval)
  if (interval === 0) dueAt.setTime(Date.now()) // due immediately

  return { ease, interval, dueAt }
}
