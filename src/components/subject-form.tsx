"use client"

import { useState } from "react"
import { Sparkles, Loader2, ChevronDown, ChevronRight, Check, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { generateSubjectSpec } from "@/app/(app)/settings/actions"
import type { AiTopic } from "@/app/(app)/settings/actions"

const EXAM_BOARDS = [
  "AQA",
  "Edexcel",
  "Pearson Edexcel",
  "OCR",
  "WJEC",
  "Eduqas",
  "CCEA",
  "Cambridge International",
]

const PRESET_COLOURS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1",
  "#a855f7", "#ec4899", "#64748b", "#78716c",
]

// ── Types ─────────────────────────────────────────────────────────────────────

type AiSubtopicRow = { name: string; specRef?: string; selected: boolean }
type AiTopicRow = {
  name: string
  specRef?: string
  paper?: string
  selected: boolean
  expanded: boolean
  subtopics: AiSubtopicRow[]
}

export type SubjectFormValues = {
  name: string
  qualification: "GCSE" | "iGCSE"
  examBoard: string
  specCode: string
  tier: "Higher" | "Foundation" | "Both"
  scienceType: "none" | "combined" | "triple"
  colour: string
  hasDisciplines: boolean
  disciplines: string[]
  hasOptionPapers: boolean
  optionPapers: string[]
  // AI-generated topics (only populated when user uses the spec builder)
  aiTopics?: { name: string; specRef?: string; paper?: string; subtopics: { name: string; specRef?: string }[] }[]
}

const DEFAULT_VALUES: SubjectFormValues = {
  name: "",
  qualification: "GCSE",
  examBoard: "",
  specCode: "",
  tier: "Higher",
  scienceType: "none",
  colour: "#6366f1",
  hasDisciplines: false,
  disciplines: [""],
  hasOptionPapers: false,
  optionPapers: [""],
}

const SCIENCE_SUBJECTS = ["science", "biology", "chemistry", "physics", "combined science", "triple science"]
function isScience(name: string) {
  return SCIENCE_SUBJECTS.some(s => name.toLowerCase().includes(s))
}

type Props = {
  initialValues?: Partial<SubjectFormValues>
  onSubmit: (values: SubjectFormValues) => Promise<string | null>
  submitLabel?: string
  onCancel?: () => void
}

// ── AI Spec Builder component ─────────────────────────────────────────────────

function SpecBuilder({
  subjectName,
  qualification,
  examBoard,
  specCode,
  tier,
  scienceType,
  onSpecGenerated,
  onSpecCodeSuggested,
}: {
  subjectName: string
  qualification: string
  examBoard: string
  specCode: string
  tier: string
  scienceType: string
  onSpecGenerated: (topics: AiTopicRow[]) => void
  onSpecCodeSuggested: (code: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [topics, setTopics] = useState<AiTopicRow[] | null>(null)

  async function generate() {
    if (!subjectName.trim() || !examBoard.trim()) {
      setError("Fill in subject name and exam board first.")
      return
    }
    setLoading(true)
    setError(null)
    const res = await generateSubjectSpec({ name: subjectName, qualification, examBoard, specCode, tier, scienceType })
    setLoading(false)
    if (res.error || !res.result) {
      setError(res.error ?? "Unknown error.")
      return
    }
    // Suggest spec code if field is empty
    if (!specCode.trim() && res.result.specCode) {
      onSpecCodeSuggested(res.result.specCode)
    }
    const rows: AiTopicRow[] = res.result.topics.map((t) => ({
      ...t,
      paper: t.paper,
      selected: true,
      expanded: false,
      subtopics: t.subtopics.map((s) => ({ ...s, selected: true })),
    }))
    setTopics(rows)
    onSpecGenerated(rows)
  }

  function toggleAll(checked: boolean) {
    if (!topics) return
    const next = topics.map((t) => ({
      ...t,
      selected: checked,
      subtopics: t.subtopics.map((s) => ({ ...s, selected: checked })),
    }))
    setTopics(next)
    onSpecGenerated(next)
  }

  function toggleTopic(i: number) {
    if (!topics) return
    const next = topics.map((t, idx) => {
      if (idx !== i) return t
      const sel = !t.selected
      return { ...t, selected: sel, subtopics: t.subtopics.map((s) => ({ ...s, selected: sel })) }
    })
    setTopics(next)
    onSpecGenerated(next)
  }

  function toggleSubtopic(topicIdx: number, subIdx: number) {
    if (!topics) return
    const next = topics.map((t, i) => {
      if (i !== topicIdx) return t
      const subs = t.subtopics.map((s, j) => j === subIdx ? { ...s, selected: !s.selected } : s)
      const anySelected = subs.some((s) => s.selected)
      return { ...t, selected: anySelected, subtopics: subs }
    })
    setTopics(next)
    onSpecGenerated(next)
  }

  function toggleExpand(i: number) {
    if (!topics) return
    setTopics(topics.map((t, idx) => idx === i ? { ...t, expanded: !t.expanded } : t))
  }

  const selectedTopics = topics?.filter((t) => t.selected).length ?? 0
  const selectedSubtopics = topics?.flatMap((t) => t.subtopics).filter((s) => s.selected).length ?? 0
  const allSelected = topics?.every((t) => t.selected && t.subtopics.every((s) => s.selected)) ?? false

  // Group topics by paper
  const paperGroups: { paper: string; indices: number[] }[] = []
  if (topics) {
    for (let i = 0; i < topics.length; i++) {
      const paper = topics[i].paper ?? "All Papers"
      const existing = paperGroups.find((g) => g.paper === paper)
      if (existing) existing.indices.push(i)
      else paperGroups.push({ paper, indices: [i] })
    }
  }

  const hasPapers = paperGroups.length > 1 || (paperGroups.length === 1 && paperGroups[0].paper !== "All Papers")

  // Pastel colours for paper badges
  const PAPER_COLOURS = [
    { bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
    { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
    { bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
    { bg: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800" },
    { bg: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", border: "border-violet-200 dark:border-violet-800" },
  ]

  function togglePaperGroup(indices: number[], checked: boolean) {
    if (!topics) return
    const next = topics.map((t, i) => {
      if (!indices.includes(i)) return t
      return { ...t, selected: checked, subtopics: t.subtopics.map((s) => ({ ...s, selected: checked })) }
    })
    setTopics(next)
    onSpecGenerated(next)
  }

  return (
    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-primary">AI Spec Finder</span>
        <span className="ml-auto text-xs text-muted-foreground">Powered by Claude</span>
      </div>

      {!topics && (
        <>
          <p className="text-xs text-muted-foreground">
            Auto-generate the full topic and subtopic list from the official {examBoard || "exam board"} specification, including which topics are on each paper.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            type="button"
            size="sm"
            onClick={generate}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Generating spec…</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Generate topic list</>
            )}
          </Button>
        </>
      )}

      {topics && (
        <div className="space-y-2">
          {/* Summary + controls */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{selectedTopics}</span> topics,{" "}
              <span className="font-medium text-foreground">{selectedSubtopics}</span> subtopics selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleAll(!allSelected)}
                className="text-xs text-primary hover:underline"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
              <button
                type="button"
                onClick={() => { setTopics(null); onSpecGenerated([]) }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Topic list — grouped by paper */}
          <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-border bg-background">
            {hasPapers ? (
              paperGroups.map(({ paper, indices }, groupIdx) => {
                const colour = PAPER_COLOURS[groupIdx % PAPER_COLOURS.length]
                const groupTopics = indices.map((i) => topics![i])
                const allGroupSelected = groupTopics.every((t) => t.selected && t.subtopics.every((s) => s.selected))
                const selectedInGroup = groupTopics.filter((t) => t.selected).length
                return (
                  <div key={paper} className="border-b border-border last:border-0">
                    {/* Paper header */}
                    <div className={cn("flex items-center gap-2 px-3 py-2.5 sticky top-0 z-10", colour.bg)}>
                      <div className={cn("h-2 w-2 rounded-full shrink-0", colour.bg.includes("blue") ? "bg-blue-500" : colour.bg.includes("emerald") ? "bg-emerald-500" : colour.bg.includes("amber") ? "bg-amber-500" : colour.bg.includes("rose") ? "bg-rose-500" : "bg-violet-500")} />
                      <span className="text-xs font-bold flex-1">{paper}</span>
                      <span className="text-[10px] opacity-60 font-medium">{selectedInGroup}/{indices.length} topics</span>
                      <button
                        type="button"
                        onClick={() => togglePaperGroup(indices, !allGroupSelected)}
                        className="text-[10px] font-semibold opacity-70 hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded border border-current"
                      >
                        {allGroupSelected ? "Deselect" : "Select all"}
                      </button>
                    </div>

                    {/* Topics in this paper */}
                    {indices.map((i) => {
                      const topic = topics![i]
                      return (
                        <div key={i} className="border-t border-border/50">
                          <div className={cn("flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors", !topic.selected && "opacity-40")}>
                            <button type="button" onClick={() => toggleExpand(i)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                              {topic.expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </button>
                            <div onClick={() => toggleTopic(i)} className={cn("h-4 w-4 shrink-0 rounded border-2 border-primary flex items-center justify-center cursor-pointer transition-all", topic.selected ? "bg-primary" : "bg-transparent")}>
                              {topic.selected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                            </div>
                            <span className="text-xs font-semibold flex-1">{topic.name}</span>
                            {topic.specRef && <span className="text-[10px] text-muted-foreground font-mono shrink-0 bg-muted px-1 rounded">{topic.specRef}</span>}
                            <span className="text-[10px] text-muted-foreground shrink-0">{topic.subtopics.filter(s => s.selected).length}/{topic.subtopics.length}</span>
                          </div>
                          {topic.expanded && (
                            <div className="pb-1">
                              {topic.subtopics.map((sub, j) => (
                                <div key={j} className={cn("flex items-center gap-2 pl-10 pr-3 py-1.5 hover:bg-muted/30 transition-colors cursor-pointer", !sub.selected && "opacity-40")} onClick={() => toggleSubtopic(i, j)}>
                                  <div className={cn("h-3 w-3 shrink-0 rounded border border-primary/60 flex items-center justify-center transition-all", sub.selected ? "bg-primary/60" : "bg-transparent")}>
                                    {sub.selected && <Check className="h-2 w-2 text-primary-foreground" />}
                                  </div>
                                  <span className="text-xs flex-1 text-muted-foreground">{sub.name}</span>
                                  {sub.specRef && <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">{sub.specRef}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })
            ) : (
              // No paper split — flat list
              topics.map((topic, i) => (
                <div key={i} className="border-b border-border last:border-0">
                  <div className={cn("flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors", !topic.selected && "opacity-50")}>
                    <button type="button" onClick={() => toggleExpand(i)} className="shrink-0 text-muted-foreground hover:text-foreground">
                      {topic.expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                    <div onClick={() => toggleTopic(i)} className={cn("h-4 w-4 shrink-0 rounded border border-primary flex items-center justify-center cursor-pointer transition-colors", topic.selected ? "bg-primary" : "bg-transparent")}>
                      {topic.selected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </div>
                    <span className="text-xs font-medium flex-1">{topic.name}</span>
                    {topic.specRef && <span className="text-xs text-muted-foreground font-mono shrink-0">{topic.specRef}</span>}
                    <span className="text-xs text-muted-foreground shrink-0">{topic.subtopics.length} sub</span>
                  </div>
                  {topic.expanded && topic.subtopics.map((sub, j) => (
                    <div key={j} className={cn("flex items-center gap-2 pl-9 pr-3 py-1.5 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer", !sub.selected && "opacity-50")} onClick={() => toggleSubtopic(i, j)}>
                      <div className={cn("h-3.5 w-3.5 shrink-0 rounded border border-primary/70 flex items-center justify-center transition-colors", sub.selected ? "bg-primary/70" : "bg-transparent")}>
                        {sub.selected && <Check className="h-2 w-2 text-primary-foreground" />}
                      </div>
                      <span className="text-xs flex-1">{sub.name}</span>
                      {sub.specRef && <span className="text-xs text-muted-foreground font-mono shrink-0">{sub.specRef}</span>}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Regenerate */}
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {loading
              ? <><Loader2 className="h-3 w-3 animate-spin" />Regenerating…</>
              : <><Sparkles className="h-3 w-3" />Regenerate</>}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function SubjectForm({
  initialValues,
  onSubmit,
  submitLabel = "Save subject",
  onCancel,
}: Props) {
  const [values, setValues] = useState<SubjectFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [aiTopicRows, setAiTopicRows] = useState<AiTopicRow[]>([])

  function set<K extends keyof SubjectFormValues>(key: K, value: SubjectFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function setListItem(key: "disciplines" | "optionPapers", index: number, value: string) {
    setValues((v) => {
      const list = [...v[key]]
      list[index] = value
      return { ...v, [key]: list }
    })
  }

  function addListItem(key: "disciplines" | "optionPapers") {
    setValues((v) => ({ ...v, [key]: [...v[key], ""] }))
  }

  function removeListItem(key: "disciplines" | "optionPapers", index: number) {
    setValues((v) => {
      const list = v[key].filter((_, i) => i !== index)
      return { ...v, [key]: list.length ? list : [""] }
    })
  }

  function handleSpecGenerated(rows: AiTopicRow[]) {
    setAiTopicRows(rows)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!values.name.trim()) { setError("Subject name is required"); return }
    if (!values.examBoard.trim()) { setError("Exam board is required"); return }
    if (values.hasDisciplines && values.disciplines.every((d) => !d.trim())) {
      setError("Add at least one discipline name, or uncheck the option"); return
    }
    if (values.hasOptionPapers && values.optionPapers.every((o) => !o.trim())) {
      setError("Add at least one option paper, or uncheck the option"); return
    }
    setPending(true)

    // Strip UI-only fields from aiTopicRows before sending
    const aiTopics = aiTopicRows.length > 0
      ? aiTopicRows
          .filter((t) => t.selected)
          .map((t) => ({
            name: t.name,
            specRef: t.specRef,
            paper: t.paper,
            subtopics: t.subtopics
              .filter((s) => s.selected)
              .map((s) => ({ name: s.name, specRef: s.specRef })),
          }))
      : undefined

    const err = await onSubmit({
      ...values,
      name: values.name.trim(),
      examBoard: values.examBoard.trim(),
      specCode: values.specCode.trim(),
      disciplines: values.disciplines.filter((d) => d.trim()),
      optionPapers: values.optionPapers.filter((o) => o.trim()),
      aiTopics,
    })
    setPending(false)
    if (err) setError(err)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="sf-name">Subject name</Label>
        <Input
          id="sf-name"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Mathematics, English Language"
          autoFocus
        />
      </div>

      {/* Qualification + Tier */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Qualification</Label>
          <Select
            value={values.qualification}
            onValueChange={(v) => set("qualification", v as "GCSE" | "iGCSE")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GCSE">GCSE</SelectItem>
              <SelectItem value="iGCSE">iGCSE</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Tier</Label>
          <Select
            value={values.tier}
            onValueChange={(v) => set("tier", v as "Higher" | "Foundation" | "Both")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Higher">Higher</SelectItem>
              <SelectItem value="Foundation">Foundation</SelectItem>
              <SelectItem value="Both">Higher + Foundation</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Science type — only shown for science subjects */}
      {isScience(values.name) && (
        <div className="space-y-1.5">
          <Label>Science pathway</Label>
          <Select
            value={values.scienceType}
            onValueChange={(v) => set("scienceType", v as "none" | "combined" | "triple")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Single science (Biology / Chemistry / Physics)</SelectItem>
              <SelectItem value="combined">Combined Science (Double Award / Trilogy)</SelectItem>
              <SelectItem value="triple">Triple Science (Separate Sciences)</SelectItem>
            </SelectContent>
          </Select>
          {values.scienceType === "combined" && (
            <p className="text-xs text-muted-foreground mt-1">
              Combined Science covers Biology, Chemistry and Physics in one double award (2 GCSEs).
            </p>
          )}
          {values.scienceType === "triple" && (
            <p className="text-xs text-muted-foreground mt-1">
              Triple Science: Biology, Chemistry and Physics are each separate GCSEs (3 in total).
            </p>
          )}
        </div>
      )}

      {/* Exam board */}
      <div className="space-y-1.5">
        <Label htmlFor="sf-board">Exam board</Label>
        <Input
          id="sf-board"
          list="exam-boards-list"
          value={values.examBoard}
          onChange={(e) => set("examBoard", e.target.value)}
          placeholder="e.g. AQA, Edexcel, OCR…"
        />
        <datalist id="exam-boards-list">
          {EXAM_BOARDS.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
      </div>

      {/* Spec code */}
      <div className="space-y-1.5">
        <Label htmlFor="sf-spec">
          Specification code <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="sf-spec"
          value={values.specCode}
          onChange={(e) => set("specCode", e.target.value)}
          placeholder="e.g. 8700, 4MA1"
          className="max-w-[12rem]"
        />
      </div>

      {/* Accent colour */}
      <div className="space-y-2">
        <Label>Accent colour</Label>
        <div className="flex items-center gap-3 flex-wrap">
          {PRESET_COLOURS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => set("colour", c)}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                values.colour === c ? "border-foreground scale-110" : "border-transparent"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="relative">
            <input
              type="color"
              value={values.colour}
              onChange={(e) => set("colour", e.target.value)}
              className="sr-only"
              id="sf-colour-custom"
              aria-label="Custom colour"
            />
            <label
              htmlFor="sf-colour-custom"
              className={cn(
                "h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs cursor-pointer hover:scale-110 transition-transform",
                !PRESET_COLOURS.includes(values.colour)
                  ? "border-foreground scale-110"
                  : "border-dashed border-muted-foreground"
              )}
              style={{
                backgroundColor: !PRESET_COLOURS.includes(values.colour)
                  ? values.colour
                  : "transparent",
              }}
              title="Custom colour"
            >
              {PRESET_COLOURS.includes(values.colour) && (
                <span className="text-muted-foreground">+</span>
              )}
            </label>
          </div>
        </div>
      </div>

      {/* Disciplines */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="sf-has-disciplines"
            checked={values.hasDisciplines}
            onCheckedChange={(v) => set("hasDisciplines", !!v)}
          />
          <Label htmlFor="sf-has-disciplines" className="cursor-pointer">
            This subject has disciplines
            <span className="ml-1 text-xs text-muted-foreground font-normal">
              (e.g. Biology / Chemistry / Physics for Combined Science)
            </span>
          </Label>
        </div>
        {values.hasDisciplines && (
          <div className="space-y-2 pl-6">
            {values.disciplines.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={d}
                  onChange={(e) => setListItem("disciplines", i, e.target.value)}
                  placeholder={`Discipline ${i + 1}`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeListItem("disciplines", i)}
                  disabled={values.disciplines.length === 1}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => addListItem("disciplines")}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add discipline
            </Button>
          </div>
        )}
      </div>

      {/* Option papers / set texts */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="sf-has-options"
            checked={values.hasOptionPapers}
            onCheckedChange={(v) => set("hasOptionPapers", !!v)}
          />
          <Label htmlFor="sf-has-options" className="cursor-pointer">
            This subject has option papers or set texts
            <span className="ml-1 text-xs text-muted-foreground font-normal">
              (e.g. Macbeth, Medicine in Britain…)
            </span>
          </Label>
        </div>
        {values.hasOptionPapers && (
          <div className="space-y-2 pl-6">
            {values.optionPapers.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={o}
                  onChange={(e) => setListItem("optionPapers", i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeListItem("optionPapers", i)}
                  disabled={values.optionPapers.length === 1}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => addListItem("optionPapers")}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add option
            </Button>
          </div>
        )}
      </div>

      {/* AI Spec Builder */}
      <SpecBuilder
        subjectName={values.name}
        qualification={values.qualification}
        examBoard={values.examBoard}
        specCode={values.specCode}
        tier={values.tier}
        scienceType={values.scienceType}
        onSpecGenerated={handleSpecGenerated}
        onSpecCodeSuggested={(code) => {
          if (!values.specCode.trim()) set("specCode", code)
        }}
      />

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
