"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, BookMarked } from "lucide-react"
import { Extractor } from "./extractor"
import { ResourceLibrary } from "./library"
import type { Subject, Topic, Resource } from "@/generated/prisma/client"

type SubjectWithTopics = Subject & { topics: Topic[] }
type ResourceWithRefs = Resource & {
  subject: Subject
  topic: Topic | null
  _count: { cards: number }
}

type Tab = "extract" | "library"

export function ResourcesShell({
  subjects,
  resources,
}: {
  subjects: SubjectWithTopics[]
  resources: ResourceWithRefs[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("extract")
  const [expandId, setExpandId] = useState<string | null>(null)
  // Bump this key whenever we want ResourceLibrary to remount with fresh server data
  const [libraryKey, setLibraryKey] = useState(0)

  function handleExtractionSaved(resourceId: string) {
    setExpandId(resourceId)
    // Refresh server data so the new resource appears in the resources prop
    router.refresh()
    // Bump key so ResourceLibrary remounts and picks up the updated prop
    setLibraryKey(k => k + 1)
    setTab("library")
  }

  function handleTabClick(t: Tab) {
    if (t === "library" && tab !== "library") {
      // Refresh server data when switching to library manually too
      router.refresh()
      setLibraryKey(k => k + 1)
    }
    setTab(t)
    if (t === "extract") setExpandId(null)
  }

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => handleTabClick("extract")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === "extract"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Extractor
        </button>
        <button
          onClick={() => handleTabClick("library")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === "library"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookMarked className="h-3.5 w-3.5" />
          Library
          {resources.length > 0 && (
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {resources.length}
            </span>
          )}
        </button>
      </div>

      {tab === "extract" ? (
        <Extractor subjects={subjects} onSaved={handleExtractionSaved} />
      ) : (
        <ResourceLibrary
          key={libraryKey}
          resources={resources}
          subjects={subjects}
          expandId={expandId}
        />
      )}
    </div>
  )
}
