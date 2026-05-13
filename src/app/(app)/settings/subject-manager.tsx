"use client"

import { useState } from "react"
import { PlusCircle, Pencil, Trash2, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { SubjectForm, type SubjectFormValues } from "@/components/subject-form"
import {
  createSubjectFromSettings,
  updateSubject,
  deleteSubject,
} from "./actions"
import type { Subject, Discipline, SubjectExam } from "@/generated/prisma/client"

type SubjectWithDisciplines = Subject & { disciplines: Discipline[]; subjectExams: SubjectExam[] }

type View = "list" | "adding" | { editing: SubjectWithDisciplines }

export function SubjectManager({
  subjects,
}: {
  subjects: SubjectWithDisciplines[]
}) {
  const [view, setView] = useState<View>("list")
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleCreate(values: SubjectFormValues): Promise<string | null> {
    const result = await createSubjectFromSettings(values)
    if (result.error) return result.error
    setView("list")
    return null
  }

  async function handleUpdate(
    id: string,
    values: SubjectFormValues
  ): Promise<string | null> {
    const result = await updateSubject(id, values)
    if (result.error) return result.error
    setView("list")
    return null
  }

  async function handleDelete(id: string) {
    setDeleteError(null)
    const result = await deleteSubject(id)
    if (result.error) setDeleteError(result.error)
  }

  if (view === "adding") {
    return (
      <div className="space-y-6 max-w-xl">
        <div>
          <h2 className="text-lg font-semibold">Add subject</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Fill in the details. You can edit everything later.
          </p>
        </div>
        <SubjectForm
          onSubmit={handleCreate}
          submitLabel="Add subject"
          onCancel={() => setView("list")}
        />
      </div>
    )
  }

  if (typeof view === "object" && "editing" in view) {
    const s = view.editing
    const initial: Partial<SubjectFormValues> = {
      name: s.name,
      qualification: s.qualification as "GCSE" | "iGCSE",
      examBoard: s.examBoard,
      specCode: s.specCode ?? "",
      tier: s.tier as "Higher" | "Foundation" | "Both",
      colour: s.colour,
      hasDisciplines: s.disciplines.length > 0,
      disciplines: s.disciplines.length > 0 ? s.disciplines.map((d) => d.name) : [""],
      hasOptionPapers: false,
      optionPapers: [""],
      examDates: s.subjectExams.map((e) => ({
        paper: e.paper,
        date: new Date(e.date).toISOString().slice(0, 10),
      })),
    }
    return (
      <div className="space-y-6 max-w-xl">
        <div>
          <h2 className="text-lg font-semibold">Edit {s.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Note: editing option papers here is not supported — manage them as topics in the subject view.
          </p>
        </div>
        <SubjectForm
          initialValues={initial}
          onSubmit={(values) => handleUpdate(s.id, values)}
          submitLabel="Save changes"
          onCancel={() => setView("list")}
        />
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Your subjects</h2>
          <p className="text-sm text-muted-foreground">
            {subjects.length === 0
              ? "No subjects yet."
              : `${subjects.length} subject${subjects.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={() => setView("adding")} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Add subject
        </Button>
      </div>

      {deleteError && (
        <p className="text-sm text-destructive">{deleteError}</p>
      )}

      {subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 gap-4 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="font-medium">No subjects yet</p>
            <p className="text-sm text-muted-foreground">
              Click &ldquo;Add subject&rdquo; to get started.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {subjects.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3"
            >
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: s.colour }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.qualification} · {s.examBoard}
                  {s.specCode ? ` · ${s.specCode}` : ""} · {s.tier}
                  {s.disciplines.length > 0 &&
                    ` · ${s.disciplines.map((d) => d.name).join(", ")}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Edit ${s.name}`}
                  onClick={() => setView({ editing: s })}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        aria-label={`Delete ${s.name}`}
                      />
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {s.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the subject and all its topics,
                        flashcard decks, cards, resources, and exam history. This
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDelete(s.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
