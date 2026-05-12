"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import Anthropic from "@anthropic-ai/sdk"
import { extractFromUrl } from "@/lib/extract"
import type { ExtractionOutput } from "./actions"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function deleteResource(id: string): Promise<{ error?: string }> {
  try {
    await db.resource.delete({ where: { id } })
    revalidatePath("/resources")
    return {}
  } catch (e) {
    console.error(e)
    return { error: "Failed to delete resource." }
  }
}

// ── Re-analyse a previously saved resource ────────────────────────────────────

const JSON_SCHEMA_PROMPT = `Respond with ONLY this JSON (no markdown, no code block):
{
  "title": "short descriptive title for this content",
  "summary": "2-3 paragraph summary suitable for a GCSE student",
  "keyPoints": ["key point 1", "key point 2", "..."],
  "flashcards": [{"front": "question or term", "back": "answer or definition"}],
  "questions": [{"question": "practice exam question", "answer": "model answer"}]
}
Rules: keyPoints 6-10 items, flashcards 8-15 cards, questions 3-6 exam-style with model answers, GCSE level throughout.`

export async function reanalyseResource(
  resourceId: string
): Promise<{ output?: ExtractionOutput; error?: string }> {
  try {
    const resource = await db.resource.findUnique({
      where: { id: resourceId },
      include: { subject: true, topic: true },
    })
    if (!resource) return { error: "Resource not found." }

    const subjectName = resource.subject.name
    const topicName   = resource.topic?.name
    const system = `You are a Recapr assistant for ${subjectName}${topicName ? `, topic: ${topicName}` : ""}. Produce structured revision materials. Always respond with ONLY valid JSON — no markdown, no code blocks.`

    let output: ExtractionOutput

    // If we have stored extracted text — use it directly (fastest, no refetch)
    if (resource.extractedText) {
      const msg = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 3000,
        system,
        messages: [{
          role: "user",
          content: `Analyse the following content and produce GCSE revision materials.\n\nContent:\n${resource.extractedText.slice(0, 12000)}\n\n${JSON_SCHEMA_PROMPT}`,
        }],
      })
      const text = msg.content[0].type === "text" ? msg.content[0].text : ""
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) return { error: "AI returned an unexpected response." }
      output = JSON.parse(match[0]) as ExtractionOutput

    // PDF — re-fetch and send as document
    } else if (resource.type === "pdf" && resource.url) {
      const extraction = await extractFromUrl(resource.url)
      if (!extraction.ok || !("pdf" in extraction)) return { error: "Could not re-fetch PDF." }
      const msg = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 3000,
        system,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: extraction.pdf } } as never,
            { type: "text", text: `Analyse this PDF and produce GCSE revision materials.\n\n${JSON_SCHEMA_PROMPT}` },
          ],
        }],
      })
      const text = msg.content[0].type === "text" ? msg.content[0].text : ""
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) return { error: "AI returned an unexpected response." }
      output = JSON.parse(match[0]) as ExtractionOutput

    // YouTube or URL with no stored text — generate from metadata
    } else if (resource.url) {
      const msg = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 3000,
        system,
        messages: [{
          role: "user",
          content: `Generate comprehensive GCSE revision materials for a resource titled "${resource.title}"${resource.description ? ` described as: ${resource.description}` : ""} in ${subjectName}${topicName ? ` (${topicName})` : ""}.\n\n${JSON_SCHEMA_PROMPT}`,
        }],
      })
      const text = msg.content[0].type === "text" ? msg.content[0].text : ""
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) return { error: "AI returned an unexpected response." }
      output = JSON.parse(match[0]) as ExtractionOutput

    } else {
      return { error: "No content available to re-analyse." }
    }

    // Persist the output so future views are instant
    await db.resource.update({
      where: { id: resourceId },
      data: { extractionOutput: JSON.stringify(output) },
    })
    revalidatePath("/resources")

    return { output }
  } catch (e) {
    console.error(e)
    return { error: "Re-analysis failed. Check your API key and credits." }
  }
}
