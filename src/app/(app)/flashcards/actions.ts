"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

export async function createDeckFromFlashcards(data: {
  subjectId: string
  name: string
}): Promise<{ error?: string }> {
  try {
    await db.deck.create({
      data: {
        subjectId: data.subjectId,
        name: data.name.trim(),
      },
    })
    revalidatePath("/flashcards")
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to create deck." }
  }
}

export async function deleteDeck(deckId: string): Promise<{ error?: string }> {
  try {
    await db.deck.delete({ where: { id: deckId } })
    revalidatePath("/flashcards")
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to delete deck." }
  }
}
