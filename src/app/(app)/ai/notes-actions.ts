"use server"

import Anthropic from "@anthropic-ai/sdk"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Types ─────────────────────────────────────────────────────────────────────

export type NoteSummary = {
  id: string
  title: string
  subjectId: string
  topicId: string | null
  subtopicId: string | null
  createdAt: Date
  updatedAt: Date
  subject: { name: string; colour: string }
  topic: { name: string } | null
  subtopic: { name: string } | null
}

export type NoteFull = NoteSummary & { content: string }

// ── List notes ────────────────────────────────────────────────────────────────

export async function listNotes(): Promise<NoteSummary[]> {
  return db.note.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      subject: { select: { name: true, colour: true } },
      topic:   { select: { name: true } },
      subtopic: { select: { name: true } },
    },
  })
}

// ── Load a single note ────────────────────────────────────────────────────────

export async function loadNote(id: string): Promise<{ note?: NoteFull; error?: string }> {
  try {
    const note = await db.note.findUnique({
      where: { id },
      include: {
        subject: { select: { name: true, colour: true } },
        topic:   { select: { name: true } },
        subtopic: { select: { name: true } },
      },
    })
    if (!note) return { error: "Note not found." }
    return { note }
  } catch {
    return { error: "Failed to load note." }
  }
}

// ── Generate note with Rec ────────────────────────────────────────────────────

export async function generateNote(data: {
  subjectId: string
  topicId?: string
  subtopicId?: string
  subjectName: string
  topicName?: string
  subtopicName?: string
}): Promise<{ note?: NoteFull; error?: string }> {
  const scope = data.subtopicName
    ? `${data.subjectName} → ${data.topicName} → ${data.subtopicName}`
    : data.topicName
    ? `${data.subjectName} → ${data.topicName}`
    : data.subjectName

  const title = data.subtopicName ?? data.topicName ?? data.subjectName

  try {
    const msg = await ai.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 3000,
      system: `You are an expert GCSE revision tutor. Generate clear, concise, well-structured revision notes. Format in markdown. Always use this structure:
# [Topic Title]
## Overview
## Key Definitions
## Core Concepts
## Examples
## Exam Tips

Use **bold** for key terms, bullet points for lists. Keep it GCSE-level appropriate.`,
      messages: [
        {
          role: "user",
          content: `Generate comprehensive GCSE revision notes for: ${scope}

Make them detailed enough to be a complete revision resource but concise enough to review in 10 minutes. Include key definitions with bold formatting, clear explanations of concepts, worked examples where relevant, and specific exam tips tailored to this topic.`,
        },
      ],
    })

    const content = msg.content[0].type === "text" ? msg.content[0].text : ""
    if (!content) return { error: "Rec didn't return any content. Try again." }

    const note = await db.note.create({
      data: {
        subjectId:  data.subjectId,
        topicId:    data.topicId    ?? null,
        subtopicId: data.subtopicId ?? null,
        title,
        content,
      },
      include: {
        subject: { select: { name: true, colour: true } },
        topic:   { select: { name: true } },
        subtopic: { select: { name: true } },
      },
    })

    revalidatePath("/ai")
    return { note }
  } catch (e) {
    console.error("generateNote error:", e)
    return { error: "Failed to generate notes. Please try again." }
  }
}

// ── Update note content (manual edit) ────────────────────────────────────────

export async function updateNoteContent(
  id: string,
  content: string
): Promise<{ error?: string }> {
  try {
    await db.note.update({ where: { id }, data: { content, updatedAt: new Date() } })
    revalidatePath("/ai")
    return {}
  } catch {
    return { error: "Failed to save." }
  }
}

// ── Delete note ───────────────────────────────────────────────────────────────

export async function deleteNote(id: string): Promise<{ error?: string }> {
  try {
    await db.note.delete({ where: { id } })
    revalidatePath("/ai")
    return {}
  } catch {
    return { error: "Failed to delete note." }
  }
}
