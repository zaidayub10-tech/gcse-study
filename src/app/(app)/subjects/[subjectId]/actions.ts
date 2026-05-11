"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

// ── Topics ───────────────────────────────────────────────────────────────────

export async function createTopic(
  subjectId: string,
  data: { name: string; disciplineId?: string; specRef?: string }
): Promise<{ error?: string }> {
  try {
    const max = await db.topic.aggregate({
      where: { subjectId },
      _max: { order: true },
    })
    await db.topic.create({
      data: {
        subjectId,
        disciplineId: data.disciplineId || null,
        name: data.name.trim(),
        specRef: data.specRef?.trim() || null,
        order: (max._max.order ?? -1) + 1,
      },
    })
    revalidatePath(`/subjects/${subjectId}`)
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to create topic." }
  }
}

export async function updateTopic(
  subjectId: string,
  topicId: string,
  data: { name: string; specRef?: string }
): Promise<{ error?: string }> {
  try {
    await db.topic.update({
      where: { id: topicId },
      data: {
        name: data.name.trim(),
        specRef: data.specRef?.trim() || null,
      },
    })
    revalidatePath(`/subjects/${subjectId}`)
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to update topic." }
  }
}

export async function deleteTopic(
  subjectId: string,
  topicId: string
): Promise<{ error?: string }> {
  try {
    await db.topic.delete({ where: { id: topicId } })
    revalidatePath(`/subjects/${subjectId}`)
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to delete topic." }
  }
}

// ── Subtopics ────────────────────────────────────────────────────────────────

export async function createSubtopic(
  subjectId: string,
  topicId: string,
  data: { name: string; specRef?: string }
): Promise<{ error?: string }> {
  try {
    const max = await db.subtopic.aggregate({
      where: { topicId },
      _max: { order: true },
    })
    await db.subtopic.create({
      data: {
        topicId,
        name: data.name.trim(),
        specRef: data.specRef?.trim() || null,
        order: (max._max.order ?? -1) + 1,
      },
    })
    revalidatePath(`/subjects/${subjectId}`)
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to create subtopic." }
  }
}

export async function updateSubtopic(
  subjectId: string,
  subtopicId: string,
  data: { name: string; specRef?: string }
): Promise<{ error?: string }> {
  try {
    await db.subtopic.update({
      where: { id: subtopicId },
      data: {
        name: data.name.trim(),
        specRef: data.specRef?.trim() || null,
      },
    })
    revalidatePath(`/subjects/${subjectId}`)
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to update subtopic." }
  }
}

export async function deleteSubtopic(
  subjectId: string,
  subtopicId: string
): Promise<{ error?: string }> {
  try {
    await db.subtopic.delete({ where: { id: subtopicId } })
    revalidatePath(`/subjects/${subjectId}`)
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to delete subtopic." }
  }
}
