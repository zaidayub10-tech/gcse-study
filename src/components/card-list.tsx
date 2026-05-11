"use client"

import { useState, useRef, useCallback } from "react"
import { PlusCircle, Pencil, Trash2, CreditCard, Check, X, ImagePlus, ImageOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { createCard, updateCard, deleteCard } from "@/app/(app)/subjects/[subjectId]/subtopics/[subtopicId]/decks/[deckId]/actions"
import { cn } from "@/lib/utils"
import type { Card } from "@/generated/prisma/client"

const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2 MB

type CardFields = {
  front: string
  back: string
  frontImage?: string | null
  backImage?: string | null
}
type EditState = { id: string } & CardFields | null

// ── Image upload control ──────────────────────────────────────────────────────

function ImageUpload({
  value,
  onChange,
  label,
}: {
  value: string | null | undefined
  onChange: (dataUrl: string | null) => void
  label: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [sizeError, setSizeError] = useState(false)

  const processFile = useCallback(
    (file: File) => {
      setSizeError(false)
      if (file.size > MAX_IMAGE_BYTES) {
        setSizeError(true)
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => onChange(e.target?.result as string)
      reader.readAsDataURL(file)
    },
    [onChange]
  )

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ""
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("image/")) processFile(file)
  }

  if (value) {
    return (
      <div className="relative group rounded-lg overflow-hidden border border-border bg-muted/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value}
          alt={`${label} image`}
          className="w-full max-h-48 object-contain"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <button
            type="button"
            onClick={() => onChange(null)}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 rounded-md bg-destructive text-destructive-foreground text-xs font-medium px-2.5 py-1.5"
          >
            <ImageOff className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleInputChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "w-full flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-4 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
          dragOver && "border-primary/60 bg-primary/10 text-primary"
        )}
      >
        <ImagePlus className="h-4 w-4" />
        <span>Add image</span>
        <span className="opacity-60">drag & drop or click · max 2 MB</span>
      </button>
      {sizeError && (
        <p className="mt-1 text-xs text-destructive">Image is too large (max 2 MB).</p>
      )}
    </div>
  )
}

// ── Card side display (text + optional image) ─────────────────────────────────

function CardSideDisplay({
  label,
  text,
  image,
}: {
  label: string
  text: string
  image?: string | null
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
        {label}
      </p>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={`${label} image`}
          className="mb-1.5 rounded-md max-h-32 object-contain border border-border"
        />
      )}
      <p className="text-sm whitespace-pre-wrap">{text}</p>
    </div>
  )
}

// ── Card form (shared between add + edit) ─────────────────────────────────────

function CardForm({
  fields,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
  saveLabel = "Save card",
}: {
  fields: CardFields
  onChange: (patch: Partial<CardFields>) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  error: string | null
  saveLabel?: string
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Front */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Front
          </label>
          <Textarea
            autoFocus
            placeholder="Question or term"
            value={fields.front}
            onChange={(e) => onChange({ front: e.target.value })}
            rows={3}
            className="resize-none text-sm"
          />
          <ImageUpload
            label="Front"
            value={fields.frontImage}
            onChange={(v) => onChange({ frontImage: v })}
          />
        </div>

        {/* Back */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Back
          </label>
          <Textarea
            placeholder="Answer or definition"
            value={fields.back}
            onChange={(e) => onChange({ back: e.target.value })}
            rows={3}
            className="resize-none text-sm"
          />
          <ImageUpload
            label="Back"
            value={fields.backImage}
            onChange={(v) => onChange({ backImage: v })}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onSave} disabled={saving}>
          <Check className="h-3.5 w-3.5 mr-1.5" />
          {saveLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3.5 w-3.5 mr-1.5" />
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function CardList({
  subjectId,
  subtopicId,
  deckId,
  cards,
}: {
  subjectId: string
  subtopicId: string
  deckId: string
  cards: Card[]
}) {
  const [adding, setAdding] = useState(false)
  const [newCard, setNewCard] = useState<CardFields>({ front: "", back: "", frontImage: null, backImage: null })
  const [addError, setAddError] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!newCard.front.trim() || !newCard.back.trim()) return
    setSaving(true)
    setAddError(null)
    const result = await createCard(subjectId, subtopicId, deckId, {
      front: newCard.front,
      back: newCard.back,
      frontImage: newCard.frontImage ?? undefined,
      backImage: newCard.backImage ?? undefined,
    })
    setSaving(false)
    if (result.error) { setAddError(result.error); return }
    setAdding(false)
    setNewCard({ front: "", back: "", frontImage: null, backImage: null })
  }

  async function handleEdit() {
    if (!editState || !editState.front.trim() || !editState.back.trim()) return
    setSaving(true)
    setEditError(null)
    const result = await updateCard(subjectId, subtopicId, deckId, editState.id, editState)
    setSaving(false)
    if (result.error) { setEditError(result.error); return }
    setEditState(null)
  }

  async function handleDelete(cardId: string) {
    setDeleteError(null)
    const result = await deleteCard(subjectId, subtopicId, deckId, cardId)
    if (result.error) setDeleteError(result.error)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Cards</h2>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => { setAdding(true); setAddError(null) }}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Add card
        </Button>
      </div>

      {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}

      {adding && (
        <div className="rounded-lg border border-border bg-card p-4">
          <CardForm
            fields={newCard}
            onChange={(p) => setNewCard((prev) => ({ ...prev, ...p }))}
            onSave={handleAdd}
            onCancel={() => { setAdding(false); setNewCard({ front: "", back: "", frontImage: null, backImage: null }) }}
            saving={saving}
            error={addError}
          />
        </div>
      )}

      {cards.length === 0 && !adding ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 gap-3 text-center">
          <CreditCard className="h-8 w-8 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="font-medium text-sm">No cards yet</p>
            <p className="text-xs text-muted-foreground">
              Add cards manually, or generate them with AI in Resources.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map((card, i) => (
            <div key={card.id} className="rounded-lg border border-border bg-card">
              {editState?.id === card.id ? (
                <div className="p-4">
                  <CardForm
                    fields={editState}
                    onChange={(p) => setEditState((s) => s ? { ...s, ...p } : s)}
                    onSave={handleEdit}
                    onCancel={() => setEditState(null)}
                    saving={saving}
                    error={editError}
                    saveLabel="Save"
                  />
                </div>
              ) : (
                <div className="flex items-start gap-4 px-4 py-3">
                  <span className="text-xs text-muted-foreground font-mono mt-0.5 shrink-0 w-6 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <CardSideDisplay label="Front" text={card.front} image={card.frontImage} />
                    <CardSideDisplay label="Back" text={card.back} image={card.backImage} />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        setEditState({
                          id: card.id,
                          front: card.front,
                          back: card.back,
                          frontImage: card.frontImage,
                          backImage: card.backImage,
                        })
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                          />
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this card?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the card and its review history. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(card.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
