"use server"

import Anthropic from "@anthropic-ai/sdk"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { applyReview, type Rating } from "@/lib/sm2"

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── AI explanation ────────────────────────────────────────────────────────────

export type CardExplanation = {
  explanation: string
  memoryTip: string
  commonMistakes: string
}

export async function explainCard(data: {
  front: string
  back: string
  subjectName: string
  subtopicName: string
}): Promise<{ result?: CardExplanation; error?: string }> {
  try {
    const msg = await ai.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      system: `You are a friendly GCSE tutor for ${data.subjectName}. A student is struggling with a flashcard. Give a clear, encouraging explanation suitable for a GCSE student. Always respond with ONLY valid JSON — no markdown, no code blocks.`,
      messages: [
        {
          role: "user",
          content: `The student got this flashcard wrong.

Question: ${data.front}
Correct answer: ${data.back}
Topic: ${data.subtopicName}

Respond with ONLY this JSON:
{
  "explanation": "2-3 sentences clearly explaining WHY this is the answer, with any useful context",
  "memoryTip": "a short, memorable mnemonic, rhyme, or trick to help remember this",
  "commonMistakes": "one sentence on what students often confuse or get wrong here"
}`,
        },
      ],
    })

    const text = msg.content[0].type === "text" ? msg.content[0].text : ""
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { error: "Unexpected AI response." }
    return { result: JSON.parse(match[0]) as CardExplanation }
  } catch (e) {
    console.error(e)
    return { error: "AI explanation failed." }
  }
}

// ── Load cards for a specific deck (for "browse all" mode) ───────────────────

export type DeckCard = {
  id: string
  front: string
  back: string
  frontImage: string | null
  backImage: string | null
  deckName: string
  subtopicName: string
  subjectName: string
  subjectColour: string
}

export async function getCardsForDeck(
  deckId: string
): Promise<{ cards?: DeckCard[]; error?: string }> {
  try {
    const deck = await db.deck.findUnique({
      where: { id: deckId },
      include: {
        subject: true,
        subtopic: { include: { topic: { include: { subject: true } } } },
        cards: { orderBy: { createdAt: "asc" } },
      },
    })
    if (!deck) return { error: "Deck not found." }
    const subject = deck.subtopic?.topic.subject ?? deck.subject
    const cards: DeckCard[] = deck.cards.map((c) => ({
      id: c.id,
      front: c.front,
      back: c.back,
      frontImage: c.frontImage,
      backImage: c.backImage,
      deckName: deck.name,
      subtopicName: deck.subtopic?.name ?? "",
      subjectName: subject?.name ?? "Unknown",
      subjectColour: subject?.colour ?? "#888",
    }))
    return { cards }
  } catch (e) {
    console.error(e)
    return { error: "Failed to load cards." }
  }
}

export async function submitRating(
  cardId: string,
  rating: Rating,
  durationMs: number
): Promise<{ error?: string }> {
  try {
    const card = await db.card.findUnique({ where: { id: cardId } })
    if (!card) return { error: "Card not found." }

    const { ease, interval, dueAt } = applyReview(card, rating)

    await db.$transaction([
      db.card.update({
        where: { id: cardId },
        data: { ease, interval, dueAt, lastReviewedAt: new Date() },
      }),
      db.review.create({
        data: {
          cardId,
          rating: ["again", "hard", "good", "easy"].indexOf(rating),
          durationMs,
        },
      }),
    ])

    revalidatePath("/review")
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to save review." }
  }
}
