"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

export async function createDeck(
  subjectId: string,
  subtopicId: string,
  data: { name: string }
): Promise<{ error?: string }> {
  try {
    await db.deck.create({
      data: {
        subtopicId,
        name: data.name.trim(),
      },
    })
    revalidatePath(`/subjects/${subjectId}/subtopics/${subtopicId}`)
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to create deck." }
  }
}

export async function updateDeck(
  subjectId: string,
  subtopicId: string,
  deckId: string,
  data: { name: string }
): Promise<{ error?: string }> {
  try {
    await db.deck.update({
      where: { id: deckId },
      data: { name: data.name.trim() },
    })
    revalidatePath(`/subjects/${subjectId}/subtopics/${subtopicId}`)
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to update deck." }
  }
}

export async function deleteDeck(
  subjectId: string,
  subtopicId: string,
  deckId: string
): Promise<{ error?: string }> {
  try {
    await db.deck.delete({ where: { id: deckId } })
    revalidatePath(`/subjects/${subjectId}/subtopics/${subtopicId}`)
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to delete deck." }
  }
}
