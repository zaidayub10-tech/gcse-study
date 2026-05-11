"use client"

import { useState, useMemo } from "react"
import {
  PlayCircle, FileText, Globe, BookOpen, File,
  Trash2, ExternalLink, Search, Filter, BookMarked,
  ChevronDown, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { deleteResource, reanalyseResource } from "./library-actions"
import { ExtractionView } from "./extraction-panels"
import type { ExtractionOutput } from "./actions"
import type { Subject, Topic, Resource } from "@/generated/prisma/client"

type ResourceWithRefs = Resource & {
  subject: Subject
  topic: Topic | null
  _count: { cards: number }
}

// ── Type metadata ─────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; icon: React.ElementType; colour: string }> = {
  youtube:      { label: "YouTube",   icon: PlayCircle, colour: "text-red-500 bg-red-50 dark:bg-red-950/40" },
  article:      { label: "Article",   icon: Globe,      colour: "text-blue-500 bg-blue-50 dark:bg-blue-950/40" },
  pdf:          { label: "PDF",       icon: File,       colour: "text-orange-500 bg-orange-50 dark:bg-orange-950/40" },
  notes:        { label: "Notes",     icon: FileText,   colour: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" },
  "past paper": { label: "Past paper",icon: BookOpen,   colour: "text-purple-500 bg-purple-50 dark:bg-purple-950/40" },
  textbook:     { label: "Textbook",  icon: BookOpen,   colour: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" },
  "lesson notes":{ label: "Lesson notes", icon: FileText, colour: "text-teal-500 bg-teal-50 dark:bg-teal-950/40" },
  essay:        { label: "Essay",     icon: FileText,   colour: "text-pink-500 bg-pink-50 dark:bg-pink-950/40" },
}

function getTypeMeta(type: string) {
  return TYPE_META[type.toLowerCase()] ?? { label: type, icon: File, colour: "text-muted-foreground bg-muted" }
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

// ── Resource card ─────────────────────────────────────────────────────────────

function ResourceCard({
  resource,
  onDelete,
  autoExpand = false,
}: {
  resource: ResourceWithRefs
  onDelete: (id: string) => void
  autoExpand?: boolean
}) {
  const [deleting, setDeleting]   = useState(false)
  const [expanded, setExpanded]   = useState(autoExpand)
  const [reanalysing, setReanalysing] = useState(false)
  const [reanalyseError, setReanalyseError] = useState("")
  const [liveOutput, setLiveOutput] = useState<ExtractionOutput | null>(null)

  const meta = getTypeMeta(resource.type)
  const Icon = meta.icon
  const hasUrl = resource.url && resource.url !== ""

  // Stored extraction (from DB) or freshly re-analysed
  const storedExtraction: ExtractionOutput | null = resource.extractionOutput
    ? JSON.parse(resource.extractionOutput) as ExtractionOutput
    : null
  const extraction = liveOutput ?? storedExtraction
  const hasExtraction = !!extraction

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Delete "${resource.title}"? This cannot be undone.`)) return
    setDeleting(true)
    await deleteResource(resource.id)
    onDelete(resource.id)
  }

  async function handleToggle() {
    // Already have data — just toggle open/closed
    if (hasExtraction) { setExpanded(v => !v); return }

    // No stored data — re-analyse with AI
    setExpanded(true)
    setReanalysing(true)
    setReanalyseError("")
    const result = await reanalyseResource(resource.id)
    setReanalysing(false)
    if (result.error) { setReanalyseError(result.error); return }
    setLiveOutput(result.output!)
  }

  return (
    <div className={cn(
      "group rounded-xl border border-border bg-card transition-shadow hover:shadow-md overflow-hidden",
      deleting && "opacity-50 pointer-events-none"
    )}>
      {/* Clickable header — div not button to avoid nested-button violation */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleToggle() } }}
        className="w-full p-4 flex gap-4 text-left hover:bg-accent/20 transition-colors cursor-pointer"
      >
        {/* Type icon */}
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", meta.colour)}>
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold leading-snug flex-1 truncate">{resource.title}</p>
            {resource.used && (
              <span className="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold px-2 py-0.5">
                Used
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium" style={{ color: resource.subject.colour }}>
              {resource.subject.name}
            </span>
            {resource.topic && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{resource.topic.name}</span>
              </>
            )}
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{meta.label}</span>
            {resource._count.cards > 0 && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{resource._count.cards} card{resource._count.cards !== 1 ? "s" : ""}</span>
              </>
            )}
          </div>

          {resource.description && !expanded && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {resource.description}
            </p>
          )}

          <p className="text-[11px] text-muted-foreground/60">{formatDate(resource.createdAt)}</p>
        </div>

        {/* Right-side actions — stopPropagation so they don't toggle the card */}
        <div className="flex flex-col items-end gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          {/* Expand chevron */}
          <div className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground transition-colors",
            expanded ? "text-primary" : "group-hover:bg-accent"
          )}>
            {reanalysing
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
            }
          </div>

          {hasUrl && (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Open source"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            onClick={handleDelete}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete resource"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-border px-5 pb-6 pt-5 bg-muted/20">
          {reanalysing ? (
            <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Analysing with AI — this takes a few seconds…
            </div>
          ) : reanalyseError ? (
            <p className="text-sm text-destructive">{reanalyseError}</p>
          ) : extraction ? (
            <ExtractionView output={extraction} subjectId={resource.subjectId} resourceId={resource.id} />
          ) : null}
        </div>
      )}
    </div>
  )
}

// ── Main library component ────────────────────────────────────────────────────

export function ResourceLibrary({
  resources: initial,
  subjects,
  expandId,
}: {
  resources: ResourceWithRefs[]
  subjects: Subject[]
  expandId?: string | null
}) {
  const [resources, setResources] = useState(initial)
  const [search, setSearch] = useState("")
  const [filterSubject, setFilterSubject] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterUsed, setFilterUsed] = useState<"all" | "used" | "unused">("all")

  const allTypes = useMemo(() => {
    const types = new Set(resources.map(r => r.type))
    return Array.from(types).sort()
  }, [resources])

  const filtered = useMemo(() => {
    return resources.filter(r => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) &&
          !r.description?.toLowerCase().includes(search.toLowerCase()) &&
          !r.subject.name.toLowerCase().includes(search.toLowerCase())) return false
      if (filterSubject && r.subjectId !== filterSubject) return false
      if (filterType && r.type !== filterType) return false
      if (filterUsed === "used" && !r.used) return false
      if (filterUsed === "unused" && r.used) return false
      return true
    })
  }, [resources, search, filterSubject, filterType, filterUsed])

  function handleDelete(id: string) {
    setResources(r => r.filter(x => x.id !== id))
  }

  const hasFilters = search || filterSubject || filterType || filterUsed !== "all"

  return (
    <div className="space-y-5">
      {/* Search + filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search resources…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        {/* Subject filter */}
        <select
          value={filterSubject}
          onChange={e => setFilterSubject(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
        >
          <option value="">All subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {/* Type filter */}
        {allTypes.length > 1 && (
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring"
          >
            <option value="">All types</option>
            {allTypes.map(t => (
              <option key={t} value={t}>{getTypeMeta(t).label}</option>
            ))}
          </select>
        )}

        {/* Used filter */}
        <div className="flex rounded-lg border border-input overflow-hidden text-sm">
          {(["all", "unused", "used"] as const).map(v => (
            <button
              key={v}
              onClick={() => setFilterUsed(v)}
              className={cn(
                "px-3 py-1.5 capitalize transition-colors",
                filterUsed === v
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {v}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setFilterSubject(""); setFilterType(""); setFilterUsed("all") }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Filter className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span><span className="font-semibold text-foreground">{filtered.length}</span> resource{filtered.length !== 1 ? "s" : ""}</span>
        <span><span className="font-semibold text-foreground">{filtered.filter(r => r.used).length}</span> used</span>
        <span><span className="font-semibold text-foreground">{filtered.reduce((n, r) => n + r._count.cards, 0)}</span> cards generated</span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center rounded-xl border border-dashed border-border">
          <BookMarked className="h-10 w-10 text-muted-foreground/30" />
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">
              {resources.length === 0 ? "No resources yet" : "No resources match your filters"}
            </p>
            <p className="text-sm text-muted-foreground/60">
              {resources.length === 0
                ? "Use the Extract tab to analyse URLs, PDFs, or notes — they'll be saved here automatically."
                : "Try adjusting your search or filters."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <ResourceCard key={r.id} resource={r} onDelete={handleDelete} autoExpand={r.id === expandId} />
          ))}
        </div>
      )}
    </div>
  )
}
