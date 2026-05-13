"use client"

import { useState, useCallback } from "react"
import {
  Sparkles, Loader2, Trash2, FileText,
  ChevronRight, BookOpen, Pencil, Check, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  listNotes, generateNote, deleteNote, updateNoteContent,
} from "./notes-actions"
import type { NoteSummary, NoteFull } from "./notes-actions"
import type { Subject, Topic } from "@/generated/prisma/client"

type SubjectWithTopics = Subject & {
  topics: (Topic & { subtopics: { id: string; name: string }[] })[]
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function renderMarkdown(text: string) {
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let listItems: string[] = []
  let listType: "ul" | "ol" | null = null
  let key = 0

  function flushList() {
    if (!listItems.length) return
    const Tag = listType === "ol" ? "ol" : "ul"
    elements.push(
      <Tag key={key++} className={cn("my-2 pl-5 space-y-0.5", listType === "ol" ? "list-decimal" : "list-disc")}>
        {listItems.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed">{inlineFormat(item)}</li>
        ))}
      </Tag>
    )
    listItems = []
    listType = null
  }

  function inlineFormat(line: string): React.ReactNode[] {
    return line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((seg, i) => {
      if (seg.startsWith("**") && seg.endsWith("**"))
        return <strong key={i} className="font-semibold">{seg.slice(2, -2)}</strong>
      if (seg.startsWith("*") && seg.endsWith("*") && seg.length > 2)
        return <em key={i}>{seg.slice(1, -1)}</em>
      if (seg.startsWith("`") && seg.endsWith("`") && seg.length > 2)
        return <code key={i} className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{seg.slice(1, -1)}</code>
      return seg
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block
    if (line.startsWith("```")) {
      flushList()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={key++} className="my-3 rounded-lg bg-muted text-xs p-3 overflow-x-auto font-mono whitespace-pre">
          {codeLines.join("\n")}
        </pre>
      )
      continue
    }

    // Headings
    if (line.startsWith("### ")) {
      flushList()
      elements.push(<h3 key={key++} className="font-bold text-base mt-5 mb-1.5">{line.slice(4)}</h3>)
      continue
    }
    if (line.startsWith("## ")) {
      flushList()
      elements.push(<h2 key={key++} className="font-bold text-lg mt-6 mb-2 text-foreground border-b border-border pb-1">{line.slice(3)}</h2>)
      continue
    }
    if (line.startsWith("# ")) {
      flushList()
      elements.push(<h1 key={key++} className="font-extrabold text-xl mt-4 mb-3 text-primary">{line.slice(2)}</h1>)
      continue
    }

    // Horizontal rule
    if (line.startsWith("---") || line.startsWith("***")) {
      flushList()
      elements.push(<hr key={key++} className="my-4 border-border" />)
      continue
    }

    // Unordered list
    const ulMatch = line.match(/^[-*]\s+(.+)/)
    if (ulMatch) {
      if (listType === "ol") flushList()
      listType = "ul"
      listItems.push(ulMatch[1])
      continue
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+(.+)/)
    if (olMatch) {
      if (listType === "ul") flushList()
      listType = "ol"
      listItems.push(olMatch[1])
      continue
    }

    // Blank line
    if (!line.trim()) {
      flushList()
      elements.push(<div key={key++} className="h-2" />)
      continue
    }

    // Paragraph
    flushList()
    elements.push(
      <p key={key++} className="text-sm leading-relaxed">{inlineFormat(line)}</p>
    )
  }

  flushList()
  return elements
}

// ── Note list item ────────────────────────────────────────────────────────────

function NoteItem({
  note,
  isActive,
  onSelect,
}: {
  note: NoteSummary
  isActive: boolean
  onSelect: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex items-start gap-2.5 rounded-lg px-3 py-2.5 cursor-pointer transition-colors",
        isActive
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      <span className="h-2 w-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: note.subject.colour }} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate leading-tight">{note.title}</p>
        <p className="text-[10px] truncate mt-0.5 opacity-60">
          {note.subject.name}
          {note.topic ? ` · ${note.topic.name}` : ""}
          {note.subtopic ? ` · ${note.subtopic.name}` : ""}
        </p>
      </div>
    </div>
  )
}

// ── Generate form ─────────────────────────────────────────────────────────────

function GenerateForm({
  subjects,
  onGenerated,
}: {
  subjects: SubjectWithTopics[]
  onGenerated: (note: NoteFull) => void
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "")
  const [topicId, setTopicId] = useState("")
  const [subtopicId, setSubtopicId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedSubject = subjects.find((s) => s.id === subjectId)
  const selectedTopic = selectedSubject?.topics.find((t) => t.id === topicId)

  async function handleGenerate() {
    if (!subjectId) return
    setLoading(true)
    setError(null)
    const res = await generateNote({
      subjectId,
      topicId: topicId || undefined,
      subtopicId: subtopicId || undefined,
      subjectName: selectedSubject?.name ?? "",
      topicName: selectedTopic?.name,
      subtopicName: selectedTopic?.subtopics.find((s) => s.id === subtopicId)?.name,
    })
    setLoading(false)
    if (res.error || !res.note) { setError(res.error ?? "Unknown error."); return }
    onGenerated(res.note)
  }

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <BookOpen className="h-10 w-10 text-muted-foreground/40" />
        <div>
          <p className="font-semibold">No subjects yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add a subject in Settings first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8 text-center">
      <div className="space-y-2">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <FileText className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Generate revision notes</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Pick a subject and topic and Rec will write structured GCSE revision notes for you.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {/* Subject */}
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</label>
          <select
            value={subjectId}
            onChange={(e) => { setSubjectId(e.target.value); setTopicId(""); setSubtopicId("") }}
            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Topic */}
        {selectedSubject && selectedSubject.topics.length > 0 && (
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Topic <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <select
              value={topicId}
              onChange={(e) => { setTopicId(e.target.value); setSubtopicId("") }}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All of {selectedSubject.name}</option>
              {selectedSubject.topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Subtopic */}
        {selectedTopic && selectedTopic.subtopics.length > 0 && (
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Subtopic <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <select
              value={subtopicId}
              onChange={(e) => setSubtopicId(e.target.value)}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All of {selectedTopic.name}</option>
              {selectedTopic.subtopics.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="text-sm text-destructive text-left">{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={loading || !subjectId}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" />Rec is writing notes…</>
            : <><Sparkles className="h-4 w-4" />Generate notes</>}
        </button>
      </div>
    </div>
  )
}

// ── Note viewer ───────────────────────────────────────────────────────────────

function NoteViewer({
  note,
  onDelete,
  onRegenerate,
}: {
  note: NoteFull
  onDelete: () => void
  onRegenerate: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(note.content)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave() {
    setSaving(true)
    await updateNoteContent(note.id, editContent)
    setSaving(false)
    setEditing(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await deleteNote(note.id)
    onDelete()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-6 py-4 flex items-start justify-between gap-3 bg-card/60 backdrop-blur-sm">
        <div className="min-w-0">
          <h2 className="font-bold text-lg leading-tight truncate">{note.title}</h2>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full inline-block shrink-0" style={{ backgroundColor: note.subject.colour }} />
            {note.subject.name}
            {note.topic && <><ChevronRight className="h-3 w-3 opacity-40" />{note.topic.name}</>}
            {note.subtopic && <><ChevronRight className="h-3 w-3 opacity-40" />{note.subtopic.name}</>}
            <span className="opacity-40 ml-1">·</span>
            <span className="opacity-40">{new Date(note.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save
              </button>
              <button
                onClick={() => { setEditing(false); setEditContent(note.content) }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />Edit
              </button>
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />New note
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {editing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-full min-h-[400px] rounded-lg border border-input bg-background p-4 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        ) : (
          <div className="prose-sm max-w-none">
            {renderMarkdown(note.content)}
          </div>
        )}
      </div>

      {/* Footer disclaimer */}
      <div className="shrink-0 border-t border-border px-6 py-2 bg-card/40">
        <p className="text-[10px] text-muted-foreground text-center">
          Rec&apos;s responses are for study support — always verify with your textbook and teacher.
        </p>
      </div>
    </div>
  )
}

// ── Main NotesShell ───────────────────────────────────────────────────────────

export function NotesShell({
  subjects,
  initialNotes,
}: {
  subjects: SubjectWithTopics[]
  initialNotes: NoteSummary[]
}) {
  const [notes, setNotes] = useState<NoteSummary[]>(initialNotes)
  const [selectedNote, setSelectedNote] = useState<NoteFull | null>(null)
  const [showGenerate, setShowGenerate] = useState(false)

  // Group notes by subject
  const notesBySubject = notes.reduce<Record<string, { colour: string; name: string; notes: NoteSummary[] }>>((acc, n) => {
    if (!acc[n.subjectId]) acc[n.subjectId] = { colour: n.subject.colour, name: n.subject.name, notes: [] }
    acc[n.subjectId].notes.push(n)
    return acc
  }, {})

  const handleNoteGenerated = useCallback((note: NoteFull) => {
    setNotes((prev) => [note, ...prev])
    setSelectedNote(note)
    setShowGenerate(false)
  }, [])

  const handleSelectNote = useCallback(async (id: string) => {
    // Check if already loaded
    if (selectedNote?.id === id) return
    // Find summary for optimistic title
    const summary = notes.find((n) => n.id === id)
    if (summary) {
      // Load full content
      const { listNotes: _l, generateNote: _g, deleteNote: _d, updateNoteContent } = await import("./notes-actions")
      const { loadNote } = await import("./notes-actions")
      const res = await loadNote(id)
      if (res.note) setSelectedNote(res.note)
    }
  }, [notes, selectedNote])

  const handleDelete = useCallback(async () => {
    if (!selectedNote) return
    setNotes((prev) => prev.filter((n) => n.id !== selectedNote.id))
    setSelectedNote(null)
  }, [selectedNote])

  const isShowingGenerate = showGenerate || (notes.length === 0 && !selectedNote)

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[500px] rounded-2xl border border-border overflow-hidden bg-background">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div className="w-64 shrink-0 border-r border-border flex flex-col bg-sidebar">
        {/* Sidebar header */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-sidebar-border">
          <button
            onClick={() => { setShowGenerate(true); setSelectedNote(null) }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Generate note
          </button>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {notes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center px-4 py-8">
              No notes yet. Generate your first one!
            </p>
          ) : (
            Object.entries(notesBySubject).map(([subjectId, group]) => (
              <div key={subjectId} className="mb-3">
                <p className="px-3 mb-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: group.colour }} />
                  {group.name}
                </p>
                {group.notes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    isActive={selectedNote?.id === note.id}
                    onSelect={() => handleSelectNote(note.id)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Main panel ──────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {isShowingGenerate ? (
          <GenerateForm subjects={subjects} onGenerated={handleNoteGenerated} />
        ) : selectedNote ? (
          <NoteViewer
            note={selectedNote}
            onDelete={handleDelete}
            onRegenerate={() => { setShowGenerate(true); setSelectedNote(null) }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8 text-muted-foreground">
            <FileText className="h-10 w-10 opacity-30" />
            <p className="text-sm">Select a note or generate a new one</p>
          </div>
        )}
      </div>
    </div>
  )
}
