"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Layers,
  BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import {
  createTopic,
  updateTopic,
  deleteTopic,
  createSubtopic,
  updateSubtopic,
  deleteSubtopic,
} from "@/app/(app)/subjects/[subjectId]/actions"
import type { Discipline, Topic, Subtopic } from "@/generated/prisma/client"

type SubtopicWithCount = Subtopic & { _count: { decks: number } }
type TopicWithSubtopics = Topic & { subtopics: SubtopicWithCount[] }

type UIState =
  | { mode: "idle" }
  | { mode: "addTopic"; disciplineId?: string; name: string; specRef: string }
  | { mode: "editTopic"; topicId: string; name: string; specRef: string }
  | { mode: "addSubtopic"; topicId: string; name: string; specRef: string }
  | { mode: "editSubtopic"; subtopicId: string; topicId: string; name: string; specRef: string }

export function TopicTree({
  subjectId,
  disciplines,
  topics,
}: {
  subjectId: string
  disciplines: Discipline[]
  topics: TopicWithSubtopics[]
}) {
  const [ui, setUi] = useState<UIState>({ mode: "idle" })
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(topics.map((t) => t.id))
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleExpand(topicId: string) {
    setExpanded((s) => {
      const next = new Set(s)
      if (next.has(topicId)) next.delete(topicId)
      else next.add(topicId)
      return next
    })
  }

  async function submitAddTopic() {
    if (ui.mode !== "addTopic") return
    if (!ui.name.trim()) { setError("Topic name is required"); return }
    setPending(true); setError(null)
    const res = await createTopic(subjectId, {
      name: ui.name,
      disciplineId: ui.disciplineId,
      specRef: ui.specRef,
    })
    setPending(false)
    if (res.error) { setError(res.error); return }
    setUi({ mode: "idle" })
  }

  async function submitEditTopic() {
    if (ui.mode !== "editTopic") return
    if (!ui.name.trim()) { setError("Name is required"); return }
    setPending(true); setError(null)
    const res = await updateTopic(subjectId, ui.topicId, { name: ui.name, specRef: ui.specRef })
    setPending(false)
    if (res.error) { setError(res.error); return }
    setUi({ mode: "idle" })
  }

  async function submitAddSubtopic() {
    if (ui.mode !== "addSubtopic") return
    if (!ui.name.trim()) { setError("Subtopic name is required"); return }
    setPending(true); setError(null)
    const res = await createSubtopic(subjectId, ui.topicId, { name: ui.name, specRef: ui.specRef })
    setPending(false)
    if (res.error) { setError(res.error); return }
    setUi({ mode: "idle" })
    setExpanded((s) => new Set(s).add(ui.topicId))
  }

  async function submitEditSubtopic() {
    if (ui.mode !== "editSubtopic") return
    if (!ui.name.trim()) { setError("Name is required"); return }
    setPending(true); setError(null)
    const res = await updateSubtopic(subjectId, ui.subtopicId, { name: ui.name, specRef: ui.specRef })
    setPending(false)
    if (res.error) { setError(res.error); return }
    setUi({ mode: "idle" })
  }

  async function handleDeleteTopic(topicId: string) {
    setError(null)
    const res = await deleteTopic(subjectId, topicId)
    if (res.error) setError(res.error)
  }

  async function handleDeleteSubtopic(subtopicId: string) {
    setError(null)
    const res = await deleteSubtopic(subjectId, subtopicId)
    if (res.error) setError(res.error)
  }

  function cancelEdit() { setUi({ mode: "idle" }); setError(null) }

  // Group topics by discipline
  const byDiscipline = disciplines.length > 0
    ? disciplines.map((d) => ({
        discipline: d,
        topics: topics.filter((t) => t.disciplineId === d.id),
      }))
    : [{ discipline: null, topics }]

  const noDisciplineTopics = topics.filter((t) => !t.disciplineId)

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Topics grouped by discipline */}
      {disciplines.length > 0 ? (
        <>
          {byDiscipline.map(({ discipline, topics: dtopics }) => (
            <div key={discipline!.id} className="space-y-1">
              <div className="flex items-center gap-2 py-1">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {discipline!.name}
                </span>
              </div>
              <div className="pl-4 space-y-1 border-l border-border">
                {dtopics.map((topic) => (
                  <TopicRow
                    key={topic.id}
                    topic={topic}
                    subjectId={subjectId}
                    ui={ui}
                    expanded={expanded.has(topic.id)}
                    pending={pending}
                    onToggle={() => toggleExpand(topic.id)}
                    onEditTopic={() => setUi({ mode: "editTopic", topicId: topic.id, name: topic.name, specRef: topic.specRef ?? "" })}
                    onAddSubtopic={() => { setUi({ mode: "addSubtopic", topicId: topic.id, name: "", specRef: "" }); setExpanded((s) => new Set(s).add(topic.id)) }}
                    onEditSubtopic={(s) => setUi({ mode: "editSubtopic", subtopicId: s.id, topicId: topic.id, name: s.name, specRef: s.specRef ?? "" })}
                    onDeleteTopic={() => handleDeleteTopic(topic.id)}
                    onDeleteSubtopic={(id) => handleDeleteSubtopic(id)}
                    onSubmitEdit={submitEditTopic}
                    onSubmitAddSubtopic={submitAddSubtopic}
                    onSubmitEditSubtopic={submitEditSubtopic}
                    onCancel={cancelEdit}
                    setUiField={(f) => setUi((prev) => ({ ...prev, ...f } as UIState))}
                  />
                ))}
                {/* Add topic within discipline */}
                {ui.mode === "addTopic" && ui.disciplineId === discipline!.id ? (
                  <InlineForm
                    name={ui.name}
                    specRef={ui.specRef}
                    placeholder="Topic name"
                    onName={(v) => setUi((p) => ({ ...p, name: v } as UIState))}
                    onSpecRef={(v) => setUi((p) => ({ ...p, specRef: v } as UIState))}
                    onSubmit={submitAddTopic}
                    onCancel={cancelEdit}
                    pending={pending}
                  />
                ) : (
                  <button
                    onClick={() => setUi({ mode: "addTopic", disciplineId: discipline!.id, name: "", specRef: "" })}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-1"
                  >
                    <Plus className="h-3 w-3" /> Add topic
                  </button>
                )}
              </div>
            </div>
          ))}
          {/* Topics with no discipline */}
          {noDisciplineTopics.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground px-1">Other topics</span>
              {noDisciplineTopics.map((topic) => (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  subjectId={subjectId}
                  ui={ui}
                  expanded={expanded.has(topic.id)}
                  pending={pending}
                  onToggle={() => toggleExpand(topic.id)}
                  onEditTopic={() => setUi({ mode: "editTopic", topicId: topic.id, name: topic.name, specRef: topic.specRef ?? "" })}
                  onAddSubtopic={() => { setUi({ mode: "addSubtopic", topicId: topic.id, name: "", specRef: "" }); setExpanded((s) => new Set(s).add(topic.id)) }}
                  onEditSubtopic={(s) => setUi({ mode: "editSubtopic", subtopicId: s.id, topicId: topic.id, name: s.name, specRef: s.specRef ?? "" })}
                  onDeleteTopic={() => handleDeleteTopic(topic.id)}
                  onDeleteSubtopic={(id) => handleDeleteSubtopic(id)}
                  onSubmitEdit={submitEditTopic}
                  onSubmitAddSubtopic={submitAddSubtopic}
                  onSubmitEditSubtopic={submitEditSubtopic}
                  onCancel={cancelEdit}
                  setUiField={(f) => setUi((prev) => ({ ...prev, ...f } as UIState))}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        /* No disciplines — flat topic list */
        <div className="space-y-1">
          {topics.map((topic) => (
            <TopicRow
              key={topic.id}
              topic={topic}
              subjectId={subjectId}
              ui={ui}
              expanded={expanded.has(topic.id)}
              pending={pending}
              onToggle={() => toggleExpand(topic.id)}
              onEditTopic={() => setUi({ mode: "editTopic", topicId: topic.id, name: topic.name, specRef: topic.specRef ?? "" })}
              onAddSubtopic={() => { setUi({ mode: "addSubtopic", topicId: topic.id, name: "", specRef: "" }); setExpanded((s) => new Set(s).add(topic.id)) }}
              onEditSubtopic={(s) => setUi({ mode: "editSubtopic", subtopicId: s.id, topicId: topic.id, name: s.name, specRef: s.specRef ?? "" })}
              onDeleteTopic={() => handleDeleteTopic(topic.id)}
              onDeleteSubtopic={(id) => handleDeleteSubtopic(id)}
              onSubmitEdit={submitEditTopic}
              onSubmitAddSubtopic={submitAddSubtopic}
              onSubmitEditSubtopic={submitEditSubtopic}
              onCancel={cancelEdit}
              setUiField={(f) => setUi((prev) => ({ ...prev, ...f } as UIState))}
            />
          ))}
        </div>
      )}

      {/* Add topic at top level (no disciplines, or general) */}
      {disciplines.length === 0 && (
        <div className="pt-1">
          {ui.mode === "addTopic" && !ui.disciplineId ? (
            <div className="space-y-2">
              {/* discipline selector hidden since none exist */}
              <InlineForm
                name={ui.name}
                specRef={ui.specRef}
                placeholder="Topic name"
                onName={(v) => setUi((p) => ({ ...p, name: v } as UIState))}
                onSpecRef={(v) => setUi((p) => ({ ...p, specRef: v } as UIState))}
                onSubmit={submitAddTopic}
                onCancel={cancelEdit}
                pending={pending}
              />
            </div>
          ) : ui.mode !== "addTopic" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUi({ mode: "addTopic", name: "", specRef: "" })}
              className="gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Add topic
            </Button>
          ) : null}
        </div>
      )}

      {topics.length === 0 && disciplines.length === 0 && ui.mode === "idle" && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 gap-3 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="text-sm font-medium">No topics yet</p>
            <p className="text-xs text-muted-foreground">
              Click &ldquo;Add topic&rdquo; to build your revision structure.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── TopicRow ──────────────────────────────────────────────────────────────────

function TopicRow({
  topic,
  subjectId,
  ui,
  expanded,
  pending,
  onToggle,
  onEditTopic,
  onAddSubtopic,
  onEditSubtopic,
  onDeleteTopic,
  onDeleteSubtopic,
  onSubmitEdit,
  onSubmitAddSubtopic,
  onSubmitEditSubtopic,
  onCancel,
  setUiField,
}: {
  topic: TopicWithSubtopics
  subjectId: string
  ui: UIState
  expanded: boolean
  pending: boolean
  onToggle: () => void
  onEditTopic: () => void
  onAddSubtopic: () => void
  onEditSubtopic: (s: SubtopicWithCount) => void
  onDeleteTopic: () => void
  onDeleteSubtopic: (id: string) => void
  onSubmitEdit: () => void
  onSubmitAddSubtopic: () => void
  onSubmitEditSubtopic: () => void
  onCancel: () => void
  setUiField: (f: Partial<UIState>) => void
}) {
  const isEditingThis = ui.mode === "editTopic" && ui.topicId === topic.id

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      {/* Topic header */}
      <div className="flex items-center gap-1 px-3 py-2">
        {isEditingThis ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <Input
              value={ui.name}
              onChange={(e) => setUiField({ name: e.target.value } as Partial<UIState>)}
              className="h-7 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmitEdit()
                if (e.key === "Escape") onCancel()
              }}
            />
            <Input
              value={(ui as { specRef: string }).specRef}
              onChange={(e) => setUiField({ specRef: e.target.value } as Partial<UIState>)}
              className="h-7 text-sm w-28"
              placeholder="Spec ref"
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmitEdit()
                if (e.key === "Escape") onCancel()
              }}
            />
            <Button size="sm" className="h-7" onClick={onSubmitEdit} disabled={pending}>
              Save
            </Button>
            <Button variant="ghost" size="sm" className="h-7" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            onClick={onToggle}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="font-medium text-sm truncate">{topic.name}</span>
            {topic.specRef && (
              <span className="ml-auto text-xs text-muted-foreground shrink-0">
                {topic.specRef}
              </span>
            )}
          </button>
        )}

        {!isEditingThis && (
          <div className="flex items-center gap-0.5 ml-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onAddSubtopic}
              title="Add subtopic"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onEditTopic}
              title="Rename topic"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    title="Delete topic"
                  />
                }
              >
                <Trash2 className="h-3 w-3" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete &ldquo;{topic.name}&rdquo;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete the topic and all its subtopics, decks, and cards. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={onDeleteTopic}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Subtopics */}
      {expanded && (
        <div className="border-t border-border bg-muted/30 px-3 py-2 space-y-1">
          {topic.subtopics.map((sub) => {
            const isEditingSub =
              ui.mode === "editSubtopic" && ui.subtopicId === sub.id
            return (
              <div
                key={sub.id}
                className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/60"
              >
                {isEditingSub ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={ui.name}
                      onChange={(e) => setUiField({ name: e.target.value } as Partial<UIState>)}
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onSubmitEditSubtopic()
                        if (e.key === "Escape") onCancel()
                      }}
                    />
                    <Input
                      value={(ui as { specRef: string }).specRef}
                      onChange={(e) => setUiField({ specRef: e.target.value } as Partial<UIState>)}
                      className="h-7 text-sm w-24"
                      placeholder="Spec ref"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onSubmitEditSubtopic()
                        if (e.key === "Escape") onCancel()
                      }}
                    />
                    <Button size="sm" className="h-7" onClick={onSubmitEditSubtopic} disabled={pending}>
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7" onClick={onCancel}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <Link
                      href={`/subjects/${subjectId}/subtopics/${sub.id}`}
                      className="flex-1 text-sm hover:underline underline-offset-2"
                    >
                      {sub.name}
                    </Link>
                    {sub.specRef && (
                      <span className="text-xs text-muted-foreground">{sub.specRef}</span>
                    )}
                    <span className="text-xs text-muted-foreground shrink-0">
                      {sub._count.decks} deck{sub._count.decks !== 1 ? "s" : ""}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => onEditSubtopic(sub)}
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-destructive hover:text-destructive"
                            />
                          }
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete &ldquo;{sub.name}&rdquo;?</AlertDialogTitle>
                            <AlertDialogDescription>
                              All decks and cards in this subtopic will be permanently deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => onDeleteSubtopic(sub.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {/* Add subtopic inline form */}
          {ui.mode === "addSubtopic" && ui.topicId === topic.id ? (
            <InlineForm
              name={ui.name}
              specRef={ui.specRef}
              placeholder="Subtopic name"
              onName={(v) => setUiField({ name: v } as Partial<UIState>)}
              onSpecRef={(v) => setUiField({ specRef: v } as Partial<UIState>)}
              onSubmit={onSubmitAddSubtopic}
              onCancel={onCancel}
              pending={pending}
            />
          ) : (
            topic.subtopics.length === 0 && ui.mode !== "addSubtopic" && (
              <p className="text-xs text-muted-foreground py-1 px-2">
                No subtopics yet.{" "}
                <button
                  onClick={onAddSubtopic}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Add one
                </button>
              </p>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ── InlineForm ────────────────────────────────────────────────────────────────

function InlineForm({
  name,
  specRef,
  placeholder,
  onName,
  onSpecRef,
  onSubmit,
  onCancel,
  pending,
}: {
  name: string
  specRef: string
  placeholder: string
  onName: (v: string) => void
  onSpecRef: (v: string) => void
  onSubmit: () => void
  onCancel: () => void
  pending: boolean
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <Input
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder={placeholder}
        className="h-7 text-sm flex-1"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit()
          if (e.key === "Escape") onCancel()
        }}
      />
      <Input
        value={specRef}
        onChange={(e) => onSpecRef(e.target.value)}
        placeholder="Spec ref (opt)"
        className="h-7 text-sm w-32"
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit()
          if (e.key === "Escape") onCancel()
        }}
      />
      <Button size="sm" className="h-7 shrink-0" onClick={onSubmit} disabled={pending}>
        {pending ? "…" : "Add"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 shrink-0"
        onClick={onCancel}
        disabled={pending}
      >
        Cancel
      </Button>
    </div>
  )
}
