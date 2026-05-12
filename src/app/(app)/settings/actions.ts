"use server"

import Anthropic from "@anthropic-ai/sdk"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import type { SubjectFormValues } from "@/components/subject-form"

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── AI spec generation ────────────────────────────────────────────────────────

export type AiSubtopic = { name: string; specRef?: string }
export type AiTopic = { name: string; specRef?: string; paper?: string; subtopics: AiSubtopic[] }
export type SpecResult = { specCode: string; topics: AiTopic[] }

export async function generateSubjectSpec(data: {
  name: string
  qualification: string
  examBoard: string
  specCode?: string
  tier: string
  scienceType?: string
}): Promise<{ result?: SpecResult; error?: string }> {
  const scienceLabel =
    data.scienceType === "combined" ? " Combined Science (Double Award / Trilogy)" :
    data.scienceType === "triple"   ? " Triple Science (Separate Sciences)" :
    ""

  try {
    const msg = await ai.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2500,
      system: `You are an expert on UK GCSE and iGCSE specifications. You know the exact topic structures, paper splits, and spec references for all major exam boards (AQA, Edexcel, OCR, WJEC, Eduqas, CCEA, Cambridge International). Always respond with ONLY valid JSON — no markdown, no code blocks, no extra text.`,
      messages: [
        {
          role: "user",
          content: `Generate the complete topic list for ${data.qualification}${scienceLabel} ${data.name} (${data.examBoard}${data.specCode ? `, spec code: ${data.specCode}` : ""}), ${data.tier} tier.${data.scienceType === "combined" ? "\nIMPORTANT: This is Combined Science (Double Award / Trilogy). Include all Biology, Chemistry and Physics topics. Use paper names like \"Biology Paper 1\", \"Biology Paper 2\", \"Chemistry Paper 1\", \"Chemistry Paper 2\", \"Physics Paper 1\", \"Physics Paper 2\"." : ""}${data.scienceType === "triple" ? "\nIMPORTANT: This is Triple/Separate Science. Generate topics only for the specific science named (e.g. Biology only, Chemistry only, or Physics only). Use \"Paper 1\" and \"Paper 2\" as paper names." : ""}

Respond with ONLY this JSON:
{
  "specCode": "the official specification code (e.g. 8461, 1BI0, J247)",
  "topics": [
    {
      "name": "Topic name exactly as in the specification",
      "specRef": "e.g. 4.1 or Section A",
      "paper": "Paper 1",
      "subtopics": [
        { "name": "Subtopic name", "specRef": "e.g. 4.1.1" }
      ]
    }
  ]
}

CRITICAL RULES — follow these exactly:
1. The "paper" field is REQUIRED for every topic — never omit it
2. Use the REAL paper split from the actual ${data.examBoard} specification. Examples:
   - AQA Biology: Topics 1-4 → "Paper 1", Topics 5-7 → "Paper 2"
   - AQA Chemistry: Topics 1-5 → "Paper 1", Topics 6-10 → "Paper 2"
   - AQA Physics: Topics 1-4 → "Paper 1", Topics 5-8 → "Paper 2"
   - Edexcel subjects often have "Paper 1" and "Paper 2" splits
   - If a topic genuinely appears on both papers, use "Both Papers"
   - If the subject has no paper split (e.g. purely coursework), use "Non-exam"
3. Match the real ${data.examBoard} specification structure as closely as possible
4. specRef values must follow the real specification numbering
5. For Higher tier: mark Higher-only subtopics with "(H)" at the end
6. Aim for 6-16 topics total, each with 3-8 subtopics
7. Keep names concise but accurate to the specification`,
        },
      ],
    })

    const text = msg.content[0].type === "text" ? msg.content[0].text : ""
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { error: "AI returned an unexpected response." }
    const result = JSON.parse(match[0]) as SpecResult
    return { result }
  } catch (e) {
    console.error("generateSubjectSpec error:", e)
    return { error: "AI spec generation failed. Please try again." }
  }
}

export async function createSubjectFromSettings(
  data: SubjectFormValues
): Promise<{ error?: string; subjectId?: string }> {
  try {
    const subject = await db.subject.create({
      data: {
        name: data.name,
        qualification: data.qualification,
        examBoard: data.examBoard,
        specCode: data.specCode || null,
        tier: data.tier,
        colour: data.colour,
      },
    })

    if (data.hasDisciplines && data.disciplines.length > 0) {
      await db.discipline.createMany({
        data: data.disciplines.map((name, i) => ({
          subjectId: subject.id,
          name,
          order: i,
        })),
      })
    }

    if (data.hasOptionPapers && data.optionPapers.length > 0) {
      await db.topic.createMany({
        data: data.optionPapers.map((name, i) => ({
          subjectId: subject.id,
          name,
          order: i,
        })),
      })
    }

    // AI-generated topics + subtopics
    if (data.aiTopics && data.aiTopics.length > 0) {
      for (const [i, t] of data.aiTopics.entries()) {
        const topic = await db.topic.create({
          data: {
            subjectId: subject.id,
            name: t.name,
            specRef: t.specRef || null,
            order: i,
          },
        })
        if (t.subtopics.length > 0) {
          await db.subtopic.createMany({
            data: t.subtopics.map((s, j) => ({
              topicId: topic.id,
              name: s.name,
              specRef: s.specRef || null,
              order: j,
            })),
          })
        }
      }
    }

    revalidatePath("/", "layout")
    return { subjectId: subject.id }
  } catch (e) {
    console.error("createSubjectFromSettings error:", e)
    return { error: "Failed to save subject. Please try again." }
  }
}

export async function updateSubject(
  id: string,
  data: SubjectFormValues
): Promise<{ error?: string }> {
  try {
    await db.subject.update({
      where: { id },
      data: {
        name: data.name,
        qualification: data.qualification,
        examBoard: data.examBoard,
        specCode: data.specCode || null,
        tier: data.tier,
        colour: data.colour,
      },
    })

    // Sync disciplines: delete all, re-create from form data
    await db.discipline.deleteMany({ where: { subjectId: id } })
    if (data.hasDisciplines && data.disciplines.length > 0) {
      await db.discipline.createMany({
        data: data.disciplines.map((name, i) => ({
          subjectId: id,
          name,
          order: i,
        })),
      })
    }

    // Note: we do NOT touch existing topics (they may have subtopics/cards).
    // Option papers from wizard are regular topics; we can't distinguish them
    // from topics added later. The user manages topics in the subject pages.

    revalidatePath("/", "layout")
    return {}
  } catch (e) {
    console.error("updateSubject error:", e)
    return { error: "Failed to update subject. Please try again." }
  }
}

export async function deleteSubject(id: string): Promise<{ error?: string }> {
  try {
    await db.subject.delete({ where: { id } })
    revalidatePath("/", "layout")
    return {}
  } catch (e) {
    console.error("deleteSubject error:", e)
    return { error: "Failed to delete subject." }
  }
}
