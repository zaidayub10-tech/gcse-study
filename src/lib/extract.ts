export type ExtractionResult =
  | { ok: true; text: string; confidence: "high" | "medium" | "low" }
  | { ok: true; pdf: string }   // base64-encoded PDF for Claude document API
  | { ok: false; error: string }

const STRIP_TAGS = /<(script|style|nav|header|footer|aside|noscript)[^>]*>[\s\S]*?<\/\1>/gi
const STRIP_HTML = /<[^>]+>/g
const COLLAPSE_WS = /\s{2,}/g

function htmlToText(html: string): string {
  return html
    .replace(STRIP_TAGS, " ")
    .replace(STRIP_HTML, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(COLLAPSE_WS, " ")
    .trim()
}

function scoreConfidence(text: string): "high" | "medium" | "low" {
  const words = text.split(/\s+/).length
  if (words > 300) return "high"
  if (words > 80) return "medium"
  return "low"
}

export async function extractFromUrl(url: string): Promise<ExtractionResult> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; GCSEStudyBot/1.0; educational use)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` }
    }

    const contentType = res.headers.get("content-type") ?? ""
    if (contentType.includes("application/pdf") || url.match(/\.pdf(\?|#|$)/i)) {
      const buffer = await res.arrayBuffer()
      const base64 = Buffer.from(buffer).toString("base64")
      return { ok: true, pdf: base64 }
    }
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return { ok: false, error: `Unsupported content type: ${contentType}` }
    }

    const html = await res.text()

    // Try to extract main content area first
    const mainMatch =
      html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
      html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
      html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i)

    const source = mainMatch ? mainMatch[1] : html
    const text = htmlToText(source).slice(0, 20_000)

    if (text.length < 50) {
      return { ok: false, error: "Could not extract readable text from this page." }
    }

    return { ok: true, text, confidence: scoreConfidence(text) }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("timeout") || msg.includes("abort")) {
      return { ok: false, error: "Request timed out." }
    }
    return { ok: false, error: "Failed to fetch the page." }
  }
}
