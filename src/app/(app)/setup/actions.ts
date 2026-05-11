"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import type { SubjectFormValues } from "@/components/subject-form"

export async function createSubject(
  data: SubjectFormValues
): Promise<{ error?: string; subjectId?: string }> {
  try {
    const subject = await db.subject.create({
      data: {
        name: data.name,
        qualification: data.qualification,
        examBoard: data.examBoard,
        specCode: data.specCode || null,
        tier: data.tier,
        colour: data.colour,
      },
    })

    if (data.hasDisciplines && data.disciplines.length > 0) {
      await db.discipline.createMany({
        data: data.disciplines.map((name, i) => ({
          subjectId: subject.id,
          name,
          order: i,
        })),
      })
    }

    if (data.hasOptionPapers && data.optionPapers.length > 0) {
      await db.topic.createMany({
        data: data.optionPapers.map((name, i) => ({
          subjectId: subject.id,
          name,
          order: i,
        })),
      })
    }

    revalidatePath("/", "layout")
    return { subjectId: subject.id }
  } catch (e) {
    console.error("createSubject error:", e)
    return { error: "Failed to save subject. Please try again." }
  }
}
