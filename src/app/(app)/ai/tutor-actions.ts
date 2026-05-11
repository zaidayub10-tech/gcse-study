"use server"

import Anthropic from "@anthropic-ai/sdk"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Types ────────────────────────────────────────────────────────────────────

export type ConvSummary = {
  id: string
  title: string
  subjectId: string
  topicId: string | null
  createdAt: Date
  updatedAt: Date
  subject: { name: string; colour: string }
  topic: { name: string } | null
  _count: { messages: number }
}

export type ConvMessage = {
  id: string
  role: string
  content: string
  createdAt: Date
}

export type ConvFull = {
  id: string
  title: string
  subjectId: string
  topicId: string | null
  subject: { name: string; colour: string }
  topic: { name: string } | null
  messages: ConvMessage[]
}

// ── List conversations ────────────────────────────────────────────────────────

export async function listConversations(): Promise<ConvSummary[]> {
  return db.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      subject: { select: { name: true, colour: true } },
      topic: { select: { name: true } },
      _count: { select: { messages: true } },
    },
  })
}

// ── Load a single conversation with messages ──────────────────────────────────

export async function loadConversation(
  id: string
): Promise<{ conv?: ConvFull; error?: string }> {
  try {
    const conv = await db.conversation.findUnique({
      where: { id },
      include: {
        subject: { select: { name: true, colour: true } },
        topic: { select: { name: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    })
    if (!conv) return { error: "Conversation not found." }
    return { conv }
  } catch {
    return { error: "Failed to load." }
  }
}

// ── Send a message (creates conversation on first send) ───────────────────────

export async function sendMessage(data: {
  conversationId: string | null   // null = brand new conversation
  subjectId: string
  topicId?: string
  content: string
  subjectName: string
  topicName?: string
}): Promise<{ reply?: string; conversationId?: string; error?: string }> {
  try {
    let convId = data.conversationId

    // Create conversation record on the first message
    if (!convId) {
      const shortTitle =
        data.content.slice(0, 60).trim() + (data.content.length > 60 ? "…" : "")
      const conv = await db.conversation.create({
        data: {
          subjectId: data.subjectId,
          topicId: data.topicId ?? null,
          title: shortTitle,
        },
      })
      convId = conv.id
    }

    // Load existing messages to build full context
    const existing = await db.message.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "asc" },
    })

    // Save user message first
    await db.message.create({
      data: { conversationId: convId, role: "user", content: data.content },
    })

    // Build context for Claude
    const history = existing.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))
    history.push({ role: "user", content: data.content })

    // Call Claude
    const msg = await ai.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      system: `You are a friendly, expert GCSE tutor specialising in ${data.subjectName}${
        data.topicName ? `, specifically the topic: ${data.topicName}` : ""
      }. You help students understand concepts clearly at GCSE level. Be encouraging, use examples, and explain step-by-step where needed. If asked about exam technique, give practical advice tailored to GCSE exams.`,
      messages: history,
    })

    const reply = msg.content[0].type === "text" ? msg.content[0].text : ""

    // Save AI reply
    await db.message.create({
      data: { conversationId: convId, role: "assistant", content: reply },
    })

    // Auto-title after first exchange if title was never customised
    if (existing.length === 0) {
      // already titled from content above — no update needed
    }

    // Bump updatedAt
    await db.conversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() },
    })

    revalidatePath("/ai")
    return { reply, conversationId: convId }
  } catch (e) {
    console.error(e)
    return { error: "Failed to get a response. Check your API key." }
  }
}

// ── Rename conversation ───────────────────────────────────────────────────────

export async function renameConversation(
  id: string,
  title: string
): Promise<{ error?: string }> {
  try {
    await db.conversation.update({ where: { id }, data: { title: title.trim() } })
    revalidatePath("/ai")
    return {}
  } catch {
    return { error: "Failed to rename." }
  }
}

// ── Delete conversation ───────────────────────────────────────────────────────

export async function deleteConversation(id: string): Promise<{ error?: string }> {
  try {
    await db.conversation.delete({ where: { id } })
    revalidatePath("/ai")
    return {}
  } catch {
    return { error: "Failed to delete." }
  }
}
