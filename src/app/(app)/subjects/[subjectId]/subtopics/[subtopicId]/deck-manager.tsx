"use client"

import { useState } from "react"
import Link from "next/link"
import { PlusCircle, Pencil, Trash2, Layers, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { createDeck, updateDeck, deleteDeck } from "./actions"

type DeckWithCount = {
  id: string
  name: string
  source: string
  _count: { cards: number }
}

type EditState = { id: string; name: string } | null

export function DeckManager({
  subjectId,
  subtopicId,
  decks,
}: {
  subjectId: string
  subtopicId: string
  decks: DeckWithCount[]
}) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [addError, setAddError] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true)
    setAddError(null)
    const result = await createDeck(subjectId, subtopicId, { name: newName })
    setSaving(false)
    if (result.error) {
      setAddError(result.error)
      return
    }
    setAdding(false)
    setNewName("")
  }

  async function handleEdit() {
    if (!editState || !editState.name.trim()) return
    setSaving(true)
    setEditError(null)
    const result = await updateDeck(subjectId, subtopicId, editState.id, {
      name: editState.name,
    })
    setSaving(false)
    if (result.error) {
      setEditError(result.error)
      return
    }
    setEditState(null)
  }

  async function handleDelete(deckId: string) {
    setDeleteError(null)
    const result = await deleteDeck(subjectId, subtopicId, deckId)
    if (result.error) setDeleteError(result.error)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Flashcard decks</h2>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => {
            setAdding(true)
            setAddError(null)
          }}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          New deck
        </Button>
      </div>

      {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}

      {adding && (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            placeholder="Deck name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd()
              if (e.key === "Escape") {
                setAdding(false)
                setNewName("")
              }
            }}
            className="h-8 text-sm"
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={handleAdd}
            disabled={saving}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => {
              setAdding(false)
              setNewName("")
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          {addError && <p className="text-sm text-destructive">{addError}</p>}
        </div>
      )}

      {decks.length === 0 && !adding ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 gap-3 text-center">
          <Layers className="h-8 w-8 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="font-medium text-sm">No decks yet</p>
            <p className="text-xs text-muted-foreground">
              Create a deck to start adding flashcards.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              {editState?.id === deck.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    autoFocus
                    value={editState.name}
                    onChange={(e) =>
                      setEditState({ ...editState, name: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEdit()
                      if (e.key === "Escape") setEditState(null)
                    }}
                    className="h-7 text-sm"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={handleEdit}
                    disabled={saving}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setEditState(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  {editError && (
                    <p className="text-xs text-destructive">{editError}</p>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href={`/subjects/${subjectId}/subtopics/${subtopicId}/decks/${deck.id}`}
                    className="flex-1 min-w-0 hover:underline underline-offset-2"
                  >
                    <p className="font-medium truncate">{deck.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {deck._count.cards} card
                      {deck._count.cards !== 1 ? "s" : ""}
                      {deck.source !== "manual" && ` · ${deck.source}`}
                    </p>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setEditState({ id: deck.id, name: deck.name })
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
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          />
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete &ldquo;{deck.name}&rdquo;?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the deck and all its
                            cards and review history. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(deck.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
