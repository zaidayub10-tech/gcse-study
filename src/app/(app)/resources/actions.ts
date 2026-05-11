"use server"

import Anthropic from "@anthropic-ai/sdk"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { extractFromUrl } from "@/lib/extract"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Types ────────────────────────────────────────────────────────────────────

export type ExtractionOutput = {
  title: string
  summary: string
  keyPoints: string[]
  flashcards: { front: string; back: string }[]
  questions: { question: string; answer: string }[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isYouTube(url: string) {
  return /youtube\.com|youtu\.be/.test(url)
}

async function getYouTubeTitle(url: string): Promise<string | null> {
  try {
    const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const res = await fetch(oembed, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json() as { title?: string }
    return data.title ?? null
  } catch {
    return null
  }
}

const JSON_SCHEMA_PROMPT = `Respond with ONLY this JSON (no markdown, no code block):
{
  "title": "short descriptive title for this content",
  "summary": "2-3 paragraph summary suitable for a GCSE student",
  "keyPoints": ["key point 1", "key point 2", "..."],
  "flashcards": [
    {"front": "question or term", "back": "answer or definition"}
  ],
  "questions": [
    {"question": "practice exam question", "answer": "model answer"}
  ]
}
Rules: keyPoints 6-10 items, flashcards 8-15 cards, questions 3-6 exam-style with model answers, GCSE level throughout.`

function buildSystem(subjectName: string, topicName?: string) {
  return `You are a GCSE study assistant for ${subjectName}${topicName ? `, topic: ${topicName}` : ""}. Produce structured revision materials. Always respond with ONLY valid JSON — no markdown, no code blocks.`
}

function parseAIOutput(text: string): ExtractionOutput {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("AI returned an unexpected response")
  return JSON.parse(jsonMatch[0]) as ExtractionOutput
}

async function callAI(
  content: string,
  contentType: string,
  subjectName: string,
  topicName?: string,
  instructions?: string
): Promise<ExtractionOutput> {
  const instructionsBlock = instructions?.trim()
    ? `\n\nCustom instructions: ${instructions.trim()}`
    : ""
  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 3000,
    system: buildSystem(subjectName, topicName),
    messages: [{
      role: "user",
      content: `Analyse the following ${contentType} and produce GCSE revision materials.${instructionsBlock}\n\nContent:\n${content.slice(0, 12000)}\n\n${JSON_SCHEMA_PROMPT}`,
    }],
  })
  return parseAIOutput(msg.content[0].type === "text" ? msg.content[0].text : "")
}

async function callAIWithPdf(
  pdfBase64: string,
  subjectName: string,
  topicName?: string,
  instructions?: string
): Promise<ExtractionOutput> {
  const instructionsBlock = instructions?.trim()
    ? `\n\nCustom instructions: ${instructions.trim()}`
    : ""
  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 3000,
    system: buildSystem(subjectName, topicName),
    messages: [{
      role: "user",
      content: [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
        } as never,
        {
          type: "text",
          text: `Analyse this PDF document and produce GCSE revision materials.${instructionsBlock}\n\n${JSON_SCHEMA_PROMPT}`,
        },
      ],
    }],
  })
  return parseAIOutput(msg.content[0].type === "text" ? msg.content[0].text : "")
}

// ── Save resource helper ──────────────────────────────────────────────────────

async function saveResource(params: {
  subjectId: string
  topicId?: string | null
  title: string
  url: string
  type: string
  description: string
  extractedText?: string
  extractionOutput?: string
  confidence: string
}): Promise<string> {
  const resource = await db.resource.create({
    data: {
      subjectId: params.subjectId,
      topicId: params.topicId || null,
      title: params.title,
      url: params.url,
      type: params.type,
      description: params.description,
      extractedText: params.extractedText ?? null,
      extractionOutput: params.extractionOutput ?? null,
      confidence: params.confidence,
      used: false,
    },
  })
  revalidatePath("/resources")
  return resource.id
}

// ── Process a URL ─────────────────────────────────────────────────────────────

export async function processUrl(data: {
  url: string
  subjectId: string
  topicId?: string
  instructions?: string
}): Promise<{ output?: ExtractionOutput; resourceId?: string; error?: string }> {
  try {
    const subject = await db.subject.findUnique({ where: { id: data.subjectId } })
    if (!subject) return { error: "Subject not found." }

    const topic = data.topicId
      ? await db.topic.findUnique({ where: { id: data.topicId } })
      : null

    let content: string
    let contentType: string
    let resourceType: string

    if (isYouTube(data.url)) {
      const title = await getYouTubeTitle(data.url)
      content = title
        ? `YouTube video titled: "${title}"\nURL: ${data.url}\n\nGenerate comprehensive GCSE revision materials for this topic based on the video title and your knowledge of ${subject.name}${topic ? ` (${topic.name})` : ""}.`
        : `YouTube video at: ${data.url}\nGenerate GCSE revision materials for ${subject.name}${topic ? ` (${topic.name})` : ""}.`
      contentType = "YouTube video"
      resourceType = "youtube"
    } else {
      const extraction = await extractFromUrl(data.url)
      if (!extraction.ok) return { error: `Could not extract content: ${extraction.error}` }

      // PDF — send directly to Claude as a document
      if ("pdf" in extraction) {
        const output = await callAIWithPdf(extraction.pdf, subject.name, topic?.name, data.instructions)
        const resourceId = await saveResource({
          subjectId: data.subjectId,
          topicId: data.topicId,
          title: output.title,
          url: data.url,
          type: "pdf",
          description: output.summary,
          extractionOutput: JSON.stringify(output),
          confidence: "ai_extract",
        })
        return { output, resourceId }
      }

      content = extraction.text
      contentType = "web page / article"
      resourceType = "article"
    }

    const output = await callAI(content, contentType, subject.name, topic?.name, data.instructions)
    const resourceId = await saveResource({
      subjectId: data.subjectId,
      topicId: data.topicId,
      title: output.title,
      url: data.url,
      type: resourceType,
      description: output.summary,
      extractedText: content,
      extractionOutput: JSON.stringify(output),
      confidence: "ai_extract",
    })
    return { output, resourceId }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[extraction error]", msg)
    return { error: `Processing failed: ${msg}` }
  }
}

// ── Process pasted text ───────────────────────────────────────────────────────

export async function processText(data: {
  text: string
  contentType: string
  subjectId: string
  topicId?: string
  instructions?: string
}): Promise<{ output?: ExtractionOutput; resourceId?: string; error?: string }> {
  try {
    if (!data.text.trim()) return { error: "No content provided." }

    const subject = await db.subject.findUnique({ where: { id: data.subjectId } })
    if (!subject) return { error: "Subject not found." }

    const topic = data.topicId
      ? await db.topic.findUnique({ where: { id: data.topicId } })
      : null

    const output = await callAI(data.text, data.contentType, subject.name, topic?.name, data.instructions)
    const resourceId = await saveResource({
      subjectId: data.subjectId,
      topicId: data.topicId,
      title: output.title,
      url: "",
      type: data.contentType,
      description: output.summary,
      extractedText: data.text,
      extractionOutput: JSON.stringify(output),
      confidence: "manual",
    })
    return { output, resourceId }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[extraction error]", msg)
    return { error: `Processing failed: ${msg}` }
  }
}

// ── Fetch decks for subject (for save dialog) ─────────────────────────────────

export async function getDecksForSubject(subjectId: string) {
  const decks = await db.deck.findMany({
    where: { subjectId },
    orderBy: { name: "asc" },
  })
  return decks
}

// ── Save flashcards to a deck ─────────────────────────────────────────────────

export async function saveExtractedCards(
  deckId: string,
  cards: { front: string; back: string }[],
  resourceId?: string
): Promise<{ saved?: number; error?: string }> {
  try {
    await db.card.createMany({
      data: cards.map(c => ({
        deckId,
        front: c.front,
        back: c.back,
        aiGenerated: true,
        sourceResourceId: resourceId ?? null,
      })),
    })
    if (resourceId) {
      await db.resource.update({ where: { id: resourceId }, data: { used: true } })
    }
    revalidatePath("/flashcards")
    revalidatePath("/resources")
    return { saved: cards.length }
  } catch (e) {
    console.error(e)
    return { error: "Failed to save cards." }
  }
}

// ── Create new deck + save cards ──────────────────────────────────────────────

export async function createDeckAndSaveCards(
  subjectId: string,
  deckName: string,
  cards: { front: string; back: string }[],
  resourceId?: string
): Promise<{ saved?: number; error?: string }> {
  try {
    const deck = await db.deck.create({
      data: { subjectId, name: deckName, source: "ai_extract" },
    })
    await db.card.createMany({
      data: cards.map(c => ({
        deckId: deck.id,
        front: c.front,
        back: c.back,
        aiGenerated: true,
        sourceResourceId: resourceId ?? null,
      })),
    })
    if (resourceId) {
      await db.resource.update({ where: { id: resourceId }, data: { used: true } })
    }
    revalidatePath("/flashcards")
    revalidatePath("/resources")
    return { saved: cards.length }
  } catch (e) {
    console.error(e)
    return { error: "Failed to create deck." }
  }
}
