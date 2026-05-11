import { AppTopNav } from "@/components/layout/app-top-nav"
import { db } from "@/lib/db"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [subjects, deckCount] = await Promise.all([
    db.subject.findMany({ orderBy: { name: "asc" } }),
    db.deck.count({ where: { cards: { some: {} } } }),
  ])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppTopNav subjects={subjects} deckCount={deckCount} />
      <main className="flex-1 w-full">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          {children}
        </div>
      </main>
    </div>
  )
}
