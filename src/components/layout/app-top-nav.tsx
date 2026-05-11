import { TopNavClient } from "./top-nav-client"
import type { Subject } from "@/generated/prisma/client"

export function AppTopNav({
  subjects,
  deckCount = 0,
}: {
  subjects: Subject[]
  deckCount?: number
}) {
  return <TopNavClient subjects={subjects} deckCount={deckCount} />
}
