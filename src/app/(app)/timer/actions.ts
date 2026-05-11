"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

export async function startTimer(data: {
  subjectId: string
  topicId?: string
  mode: string
}): Promise<{ id?: string; error?: string }> {
  try {
    const log = await db.timerLog.create({
      data: {
        subjectId: data.subjectId,
        topicId: data.topicId || null,
        mode: data.mode,
        startedAt: new Date(),
      },
    })
    return { id: log.id }
  } catch (e) {
    console.error(e)
    return { error: "Failed to start timer." }
  }
}

export async function stopTimer(id: string): Promise<{ error?: string }> {
  try {
    await db.timerLog.update({
      where: { id },
      data: { endedAt: new Date() },
    })
    revalidatePath("/timer")
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to stop timer." }
  }
}
