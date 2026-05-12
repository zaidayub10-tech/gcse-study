"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, CheckCircle2, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SubjectForm, type SubjectFormValues } from "@/components/subject-form"
import { createSubject } from "./actions"

type Step = "welcome" | "adding" | "added"

type SavedSubject = {
  id: string
  name: string
  colour: string
  qualification: string
}

export function SetupWizard() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("welcome")
  const [saved, setSaved] = useState<SavedSubject[]>([])

  async function handleSave(values: SubjectFormValues): Promise<string | null> {
    const result = await createSubject(values)
    if (result.error) return result.error
    setSaved((prev) => [
      ...prev,
      {
        id: result.subjectId!,
        name: values.name,
        colour: values.colour,
        qualification: values.qualification,
      },
    ])
    setStep("added")
    return null
  }

  if (step === "welcome") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="text-2xl font-semibold">Welcome to Recapr</h1>
          <p className="text-muted-foreground">
            Let&apos;s set up your subjects. You can add as many as you need — each one
            gets its own colour, exam board, and revision space.
          </p>
        </div>
        <Button size="lg" onClick={() => setStep("adding")}>
          Add your first subject
        </Button>
      </div>
    )
  }

  if (step === "adding") {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold">
            {saved.length === 0 ? "Add your first subject" : "Add another subject"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fill in the details below. You can edit everything later in Settings.
          </p>
        </div>
        <SubjectForm
          onSubmit={handleSave}
          submitLabel="Save subject"
          onCancel={saved.length > 0 ? () => setStep("added") : undefined}
        />
      </div>
    )
  }

  // step === "added"
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span>
          {saved.length} subject{saved.length !== 1 ? "s" : ""} added
        </span>
      </div>

      <div className="space-y-2">
        {saved.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
          >
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: s.colour }}
            />
            <span className="font-medium">{s.name}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {s.qualification}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          onClick={() => setStep("adding")}
          className="gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Add another subject
        </Button>
        <Button onClick={() => router.push("/")}>
          Done — go to app
        </Button>
      </div>
    </div>
  )
}
