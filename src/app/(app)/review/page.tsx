import { db } from "@/lib/db"
import { ReviewShell } from "./review-shell"

export default async function ReviewPage() {
  const [subjects, resources] = await Promise.all([
    // All subjects with their decks (for deck browser)
    db.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        decks: {
          where: { subtopicId: null },
          include: { _count: { select: { cards: true } } },
          orderBy: { name: "asc" },
        },
        topics: {
          orderBy: { order: "asc" },
          include: {
            subtopics: {
              orderBy: { order: "asc" },
              include: {
                decks: {
                  include: { _count: { select: { cards: true } } },
                  orderBy: { name: "asc" },
                },
              },
            },
          },
        },
      },
    }),

    // All resources for the library tab
    db.resource.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subject: true,
        topic: true,
        _count: { select: { cards: true } },
      },
    }),
  ])

  return (
    <ReviewShell
      subjects={subjects}
      resources={resources}
    />
  )
}
