"use client"

import { useState, useEffect, useRef } from "react"
import { Sparkles, Lightbulb, AlertTriangle, Brain, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { submitRating, explainCard } from "@/app/(app)/review/actions"
import type { Rating } from "@/lib/sm2"
import type { CardExplanation } from "@/app/(app)/review/actions"

type ReviewCard = {
  id: string
  front: string
  back: string
  frontImage?: string | null
  backImage?: string | null
  deckName: string
  subtopicName: string
  subjectName: string
  subjectColour: string
}

const RATINGS: { label: string; value: Rating; description: string; className: string }[] = [
  { label: "Again", value: "again", description: "Forgot", className: "border-red-500 text-red-500 hover:bg-red-500/10" },
  { label: "Hard",  value: "hard",  description: "Struggled", className: "border-orange-500 text-orange-500 hover:bg-orange-500/10" },
  { label: "Good",  value: "good",  description: "Recalled", className: "border-blue-500 text-blue-500 hover:bg-blue-500/10" },
  { label: "Easy",  value: "easy",  description: "Instant", className: "border-green-500 text-green-500 hover:bg-green-500/10" },
]

// ── AI explanation panel ──────────────────────────────────────────────────────

function ExplanationPanel({
  explanation,
  loading,
  error,
  onClose,
}: {
  explanation: CardExplanation | null
  loading: boolean
  error: string | null
  onClose: () => void
}) {
  if (!loading && !explanation && !error) return null

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary/10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">AI Explanation</span>
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-4 py-4">
        {loading && (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Thinking through this for you…
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {explanation && (
          <div className="space-y-4">
            {/* Main explanation */}
            <div className="flex gap-3">
              <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Brain className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Explanation</p>
                <p className="text-sm leading-relaxed">{explanation.explanation}</p>
              </div>
            </div>

            {/* Memory tip */}
            <div className="flex gap-3">
              <div className="mt-0.5 h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Memory Tip</p>
                <p className="text-sm leading-relaxed">{explanation.memoryTip}</p>
              </div>
            </div>

            {/* Common mistakes */}
            <div className="flex gap-3">
              <div className="mt-0.5 h-6 w-6 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-1">Common Mistake</p>
                <p className="text-sm leading-relaxed">{explanation.commonMistakes}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main reviewer ─────────────────────────────────────────────────────────────

export function CardReviewer({ cards }: { cards: ReviewCard[] }) {
  // Queue-based: "Again" pushes to end, others remove from front
  const [queue, setQueue] = useState<ReviewCard[]>(() => {
    const arr = [...cards]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  })
  const [repeatIds, setRepeatIds] = useState<Set<string>>(new Set())
  const [doneCount, setDoneCount] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rateError, setRateError] = useState<string | null>(null)

  // AI explanation state
  const [explanationOpen, setExplanationOpen] = useState(false)
  const [explanationLoading, setExplanationLoading] = useState(false)
  const [explanation, setExplanation] = useState<CardExplanation | null>(null)
  const [explanationError, setExplanationError] = useState<string | null>(null)
  const pendingRating = useRef<Rating | null>(null)

  const card = queue[0]
  const done = queue.length === 0
  const originalTotal = cards.length
  const repeatsLeft = repeatIds.size
  // Progress based on cards fully graduated (answered non-Again)
  const progress = Math.round((doneCount / originalTotal) * 100)
  const isRepeat = card ? repeatIds.has(card.id) : false

  const startedAt = useRef<number>(Date.now())

  useEffect(() => {
    setRevealed(false)
    setExplanationOpen(false)
    setExplanation(null)
    setExplanationError(null)
    pendingRating.current = null
    startedAt.current = Date.now()
  }, [queue.length, card?.id])

  async function fetchExplanation() {
    setExplanationOpen(true)
    setExplanationLoading(true)
    setExplanationError(null)
    setExplanation(null)
    const res = await explainCard({
      front: card.front,
      back: card.back,
      subjectName: card.subjectName,
      subtopicName: card.subtopicName,
    })
    setExplanationLoading(false)
    if (res.error) setExplanationError(res.error)
    else setExplanation(res.result ?? null)
  }

  function nextCard(rating: Rating) {
    if (rating === "again") {
      // Move to end of queue and mark as repeat
      setQueue((q) => [...q.slice(1), q[0]])
      setRepeatIds((s) => new Set([...s, card.id]))
    } else {
      // Graduate — remove from front
      setQueue((q) => q.slice(1))
      setRepeatIds((s) => {
        const next = new Set(s)
        next.delete(card.id)
        return next
      })
      setDoneCount((n) => n + 1)
    }
  }

  async function advance() {
    const rating = pendingRating.current
    if (rating === null) return
    setSaving(true)
    setRateError(null)
    const durationMs = Date.now() - startedAt.current
    const result = await submitRating(card.id, rating, durationMs)
    setSaving(false)
    if (result.error) { setRateError(result.error); return }
    pendingRating.current = null
    nextCard(rating)
  }

  async function handleRate(rating: Rating) {
    if (rating === "again" || rating === "hard") {
      pendingRating.current = rating
      await fetchExplanation()
      return
    }
    setSaving(true)
    setRateError(null)
    const durationMs = Date.now() - startedAt.current
    const result = await submitRating(card.id, rating, durationMs)
    setSaving(false)
    if (result.error) { setRateError(result.error); return }
    nextCard(rating)
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="text-5xl">🎉</div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">All done!</h2>
          <p className="text-muted-foreground text-sm">
            You reviewed all {originalTotal} card{originalTotal !== 1 ? "s" : ""} in this deck.
          </p>
        </div>
      </div>
    )
  }

  if (!card) return null

  const showNextButton = explanationOpen && pendingRating.current !== null

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <span>{doneCount} / {originalTotal} done</span>
            {repeatsLeft > 0 && (
              <span className="rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 text-[10px] font-semibold px-2 py-0.5">
                {repeatsLeft} to repeat
              </span>
            )}
          </span>
          {isRepeat && (
            <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wide">Repeating</span>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card meta */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: card.subjectColour }}
        />
        <span className="text-xs text-muted-foreground">{card.subjectName}</span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">{card.subtopicName}</span>
        <span className="text-xs text-muted-foreground">·</span>
        <Badge variant="outline" className="text-xs px-1.5 py-0">{card.deckName}</Badge>
      </div>

      {/* Flashcard */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Front */}
        <div className="px-6 py-8 min-h-40 flex flex-col justify-center gap-4">
          {card.frontImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.frontImage}
              alt="Front image"
              className="max-h-56 w-full object-contain rounded-lg border border-border"
            />
          )}
          {card.front && <p className="text-base whitespace-pre-wrap">{card.front}</p>}
        </div>

        {revealed ? (
          <div className="border-t border-border px-6 py-8 min-h-40 flex flex-col justify-center gap-4 bg-muted/30">
            {card.backImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.backImage}
                alt="Back image"
                className="max-h-56 w-full object-contain rounded-lg border border-border"
              />
            )}
            {card.back && <p className="text-base whitespace-pre-wrap">{card.back}</p>}
          </div>
        ) : (
          <div className="border-t border-border px-6 py-4 flex justify-center bg-muted/10">
            <Button onClick={() => setRevealed(true)} className="w-full max-w-xs">
              Show answer
            </Button>
          </div>
        )}
      </div>

      {/* Rating buttons + Explain button */}
      {revealed && !explanationOpen && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground text-center">How well did you remember?</p>
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                onClick={() => handleRate(r.value)}
                disabled={saving}
                className={`rounded-lg border px-3 py-3 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${r.className}`}
              >
                <div>{r.label}</div>
                <div className="text-xs font-normal opacity-70 mt-0.5">{r.description}</div>
              </button>
            ))}
          </div>

          {/* Manual explain button */}
          <div className="flex justify-center pt-1">
            <button
              onClick={fetchExplanation}
              className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Explain this with AI
            </button>
          </div>

          {rateError && <p className="text-sm text-destructive text-center">{rateError}</p>}
        </div>
      )}

      {/* AI Explanation panel */}
      {explanationOpen && (
        <div className="space-y-3">
          <ExplanationPanel
            explanation={explanation}
            loading={explanationLoading}
            error={explanationError}
            onClose={() => {
              setExplanationOpen(false)
              setExplanation(null)
              pendingRating.current = null
            }}
          />

          {/* Action row below explanation */}
          {!explanationLoading && (
            <div className="flex items-center gap-2 flex-wrap">
              {showNextButton && (
                <Button
                  onClick={advance}
                  disabled={saving}
                  size="sm"
                  className="flex-1"
                >
                  {saving ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving…</>
                  ) : (
                    "Got it — next card →"
                  )}
                </Button>
              )}
              {/* If they opened explain manually (not via Again/Hard), still show ratings */}
              {!showNextButton && (
                <div className="w-full space-y-2">
                  <p className="text-xs text-muted-foreground text-center">How well did you remember?</p>
                  <div className="grid grid-cols-4 gap-2">
                    {RATINGS.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => handleRate(r.value)}
                        disabled={saving}
                        className={`rounded-lg border px-3 py-3 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${r.className}`}
                      >
                        <div>{r.label}</div>
                        <div className="text-xs font-normal opacity-70 mt-0.5">{r.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {rateError && <p className="text-sm text-destructive w-full text-center">{rateError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
