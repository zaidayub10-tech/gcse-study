"use server"

import Anthropic from "@anthropic-ai/sdk"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Flashcard generation ─────────────────────────────────────────────────────

type GeneratedCard = { front: string; back: string }

export async function generateFlashcards(data: {
  notes: string
  subject: string
  topic?: string
  count: number
  instructions?: string
}): Promise<{ cards?: GeneratedCard[]; error?: string }> {
  try {
    const instructionsBlock = data.instructions?.trim()
      ? `\nCustom instructions: ${data.instructions.trim()}`
      : ""
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are a GCSE revision assistant. Generate exactly ${data.count} flashcards from the following notes.

Subject: ${data.subject}${data.topic ? `\nTopic: ${data.topic}` : ""}${instructionsBlock}

Notes:
${data.notes}

Respond with ONLY a JSON array, no other text. Each item must have "front" (question/term) and "back" (answer/definition). Example:
[{"front":"What is...","back":"It is..."}]`,
        },
      ],
    })

    const text = msg.content[0].type === "text" ? msg.content[0].text : ""
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return { error: "AI returned an unexpected response." }

    const cards: GeneratedCard[] = JSON.parse(jsonMatch[0])
    return { cards }
  } catch (e) {
    console.error(e)
    return { error: "Failed to generate flashcards." }
  }
}

export async function saveGeneratedCards(
  deckId: string,
  cards: GeneratedCard[]
): Promise<{ error?: string; saved?: number }> {
  try {
    await db.card.createMany({
      data: cards.map((c) => ({
        deckId,
        front: c.front,
        back: c.back,
        aiGenerated: true,
      })),
    })
    revalidatePath("/flashcards")
    return { saved: cards.length }
  } catch (e) {
    console.error(e)
    return { error: "Failed to save cards." }
  }
}

export async function createDeckAndSaveCards(
  subjectId: string,
  deckName: string,
  cards: GeneratedCard[]
): Promise<{ error?: string; saved?: number }> {
  try {
    const deck = await db.deck.create({
      data: { subjectId, name: deckName, source: "ai_generate" },
    })
    await db.card.createMany({
      data: cards.map((c) => ({
        deckId: deck.id,
        front: c.front,
        back: c.back,
        aiGenerated: true,
      })),
    })
    revalidatePath("/flashcards")
    return { saved: cards.length }
  } catch (e) {
    console.error(e)
    return { error: "Failed to create deck." }
  }
}

// ── AI Tutor chat ────────────────────────────────────────────────────────────

type Message = { role: "user" | "assistant"; content: string }

export async function sendTutorMessage(data: {
  messages: Message[]
  subject: string
  topic?: string
}): Promise<{ reply?: string; error?: string }> {
  try {
    const systemPrompt = `You are a helpful GCSE tutor specialising in ${data.subject}${data.topic ? `, specifically the topic: ${data.topic}` : ""}.
Explain concepts clearly and concisely at GCSE level. Use examples where helpful.
If asked about exam technique, give practical advice. Keep responses focused and not too long.`

    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: data.messages,
    })

    const reply = msg.content[0].type === "text" ? msg.content[0].text : ""
    return { reply }
  } catch (e) {
    console.error(e)
    return { error: "Failed to get a response." }
  }
}
