"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

function deckPath(subjectId: string, deckId: string) {
  return `/subjects/${subjectId}/decks/${deckId}`
}

export async function createCard(
  subjectId: string,
  deckId: string,
  data: { front: string; back: string; frontImage?: string | null; backImage?: string | null }
): Promise<{ error?: string }> {
  try {
    await db.card.create({
      data: {
        deckId,
        front: data.front.trim(),
        back: data.back.trim(),
        frontImage: data.frontImage ?? null,
        backImage: data.backImage ?? null,
      },
    })
    revalidatePath(deckPath(subjectId, deckId))
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to create card." }
  }
}

export async function updateCard(
  subjectId: string,
  deckId: string,
  cardId: string,
  data: { front: string; back: string; frontImage?: string | null; backImage?: string | null }
): Promise<{ error?: string }> {
  try {
    await db.card.update({
      where: { id: cardId },
      data: {
        front: data.front.trim(),
        back: data.back.trim(),
        frontImage: data.frontImage ?? null,
        backImage: data.backImage ?? null,
      },
    })
    revalidatePath(deckPath(subjectId, deckId))
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to update card." }
  }
}

export async function deleteCard(
  subjectId: string,
  deckId: string,
  cardId: string
): Promise<{ error?: string }> {
  try {
    await db.card.delete({ where: { id: cardId } })
    revalidatePath(deckPath(subjectId, deckId))
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to delete card." }
  }
}
