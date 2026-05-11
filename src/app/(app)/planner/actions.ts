"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

export async function createSession(data: {
  subjectId: string
  topicId?: string
  plannedAt: string
  durationMin: number
  notes?: string
}): Promise<{ error?: string }> {
  try {
    await db.session.create({
      data: {
        subjectId: data.subjectId,
        topicId: data.topicId || null,
        plannedAt: new Date(data.plannedAt),
        durationMin: data.durationMin,
        notes: data.notes?.trim() || null,
        status: "planned",
      },
    })
    revalidatePath("/planner")
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to create session." }
  }
}

export async function updateSessionStatus(
  id: string,
  status: "planned" | "completed" | "skipped"
): Promise<{ error?: string }> {
  try {
    await db.session.update({ where: { id }, data: { status } })
    revalidatePath("/planner")
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to update session." }
  }
}

export async function deleteSession(id: string): Promise<{ error?: string }> {
  try {
    await db.session.delete({ where: { id } })
    revalidatePath("/planner")
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to delete session." }
  }
}
