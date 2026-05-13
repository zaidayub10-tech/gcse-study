"use client"

import {
  useState, useEffect, useRef, useCallback,
} from "react"
import {
  Plus, MessageSquare, Trash2, Pencil, Check, X,
  Send, Loader2, Sparkles, ChevronDown, BookOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  listConversations, loadConversation, sendMessage,
  renameConversation, deleteConversation,
} from "./tutor-actions"
import type { ConvSummary, ConvFull, ConvMessage } from "./tutor-actions"
import type { Subject, Topic } from "@/generated/prisma/client"

type SubjectWithTopics = Subject & { topics: Topic[] }

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByDate(convs: ConvSummary[]) {
  const now = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const week = new Date(today); week.setDate(today.getDate() - 7)

  const groups: { label: string; items: ConvSummary[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ]

  for (const c of convs) {
    const d = new Date(c.updatedAt)
    if (d >= today) groups[0].items.push(c)
    else if (d >= yesterday) groups[1].items.push(c)
    else if (d >= week) groups[2].items.push(c)
    else groups[3].items.push(c)
  }

  return groups.filter((g) => g.items.length > 0)
}

// ── Markdown-lite renderer ────────────────────────────────────────────────────

function renderContent(text: string) {
  // Split on code blocks
  const parts = text.split(/(```[\s\S]*?```)/g)
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const lines = part.slice(3).split("\n")
      const lang = lines[0].trim()
      const code = lines.slice(1).join("\n").replace(/```$/, "").trimEnd()
      return (
        <pre key={i} className="my-2 rounded-lg bg-black/80 text-green-300 text-xs p-3 overflow-x-auto font-mono whitespace-pre">
          {lang && <div className="text-zinc-500 text-[10px] mb-1 uppercase tracking-wider">{lang}</div>}
          {code}
        </pre>
      )
    }
    // Inline formatting pass
    return (
      <span key={i} className="whitespace-pre-wrap">
        {part.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).map((seg, j) => {
          if (seg.startsWith("**") && seg.endsWith("**")) {
            return <strong key={j}>{seg.slice(2, -2)}</strong>
          }
          if (seg.startsWith("*") && seg.endsWith("*") && seg.length > 2) {
            return <em key={j}>{seg.slice(1, -1)}</em>
          }
          if (seg.startsWith("`") && seg.endsWith("`") && seg.length > 2) {
            return (
              <code key={j} className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                {seg.slice(1, -1)}
              </code>
            )
          }
          return seg
        })}
      </span>
    )
  })
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: ConvMessage }) {
  const isUser = msg.role === "user"
  return (
    <div className={cn("flex gap-3 px-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-border rounded-tl-sm"
        )}
      >
        {renderContent(msg.content)}
        <p className={cn(
          "text-[10px] mt-1.5 select-none",
          isUser ? "text-primary-foreground/60" : "text-muted-foreground"
        )}>
          {new Date(msg.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      {isUser && (
        <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1 text-primary-foreground text-[10px] font-bold">
          Me
        </div>
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 px-4 justify-start">
      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3.5">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sidebar conversation item ─────────────────────────────────────────────────

function ConvItem({
  conv,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  conv: ConvSummary
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(conv.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commitRename() {
    if (editVal.trim() && editVal.trim() !== conv.title) {
      onRename(editVal.trim())
    }
    setEditing(false)
  }

  return (
    <div
      onClick={() => !editing && onSelect()}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 cursor-pointer transition-colors",
        isActive
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: conv.subject.colour }}
      />

      {editing ? (
        <input
          ref={inputRef}
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename()
            if (e.key === "Escape") { setEditVal(conv.title); setEditing(false) }
          }}
          onBlur={commitRename}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-0 bg-transparent text-sm outline-none border-b border-primary"
        />
      ) : (
        <span className="flex-1 min-w-0 text-sm truncate">{conv.title}</span>
      )}

      {!editing && (
        <div
          className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setEditVal(conv.title); setEditing(true) }}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/60 transition-colors"
            title="Rename"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/20 hover:text-destructive transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      {editing && (
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button onClick={commitRename} className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/60">
            <Check className="h-3 w-3 text-primary" />
          </button>
          <button onClick={() => { setEditVal(conv.title); setEditing(false) }} className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/60">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── New chat form (subject/topic picker) ─────────────────────────────────────

function NewChatForm({
  subjects,
  onStart,
}: {
  subjects: SubjectWithTopics[]
  onStart: (subjectId: string, topicId: string | undefined) => void
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "")
  const [topicId, setTopicId] = useState("")

  const selectedSubject = subjects.find((s) => s.id === subjectId)

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8 text-center">
      <div className="space-y-2">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Start a conversation</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Ask Rec anything — concepts, exam technique, worked examples, or past paper help.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</label>
          <select
            value={subjectId}
            onChange={(e) => { setSubjectId(e.target.value); setTopicId("") }}
            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {selectedSubject && selectedSubject.topics.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Topic <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">General {selectedSubject.name}</option>
              {selectedSubject.topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={() => onStart(subjectId, topicId || undefined)}
          disabled={!subjectId}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          Start chatting
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
        {[
          "Explain this concept to me",
          "Help me with exam technique",
          "Give me a worked example",
          "Quiz me on this topic",
        ].map((prompt) => (
          <button
            key={prompt}
            onClick={() => onStart(subjectId, topicId || undefined)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-left text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-accent/40 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Chat view ─────────────────────────────────────────────────────────────────

function ChatView({
  conv,
  subjects,
  onNewMessage,
  onNewChat,
}: {
  conv: ConvFull
  subjects: SubjectWithTopics[]
  onNewMessage: (msg: ConvMessage, reply: ConvMessage) => void
  onNewChat: () => void
}) {
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [localMessages, setLocalMessages] = useState<ConvMessage[]>(conv.messages)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync if conv changes (different conversation selected)
  useEffect(() => {
    setLocalMessages(conv.messages)
    setInput("")
    setError("")
  }, [conv.id])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [localMessages, sending])

  // Auto-resize textarea
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 160) + "px"
  }

  const subject = subjects.find((s) => s.id === conv.subjectId)
  const topic = subject?.topics.find((t) => t.id === conv.topicId)

  async function handleSend() {
    const content = input.trim()
    if (!content || sending) return

    setInput("")
    setSending(true)
    setError("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"

    // Optimistic user message
    const userMsg: ConvMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date(),
    }
    setLocalMessages((prev) => [...prev, userMsg])

    const result = await sendMessage({
      conversationId: conv.id,
      subjectId: conv.subjectId,
      topicId: conv.topicId ?? undefined,
      content,
      subjectName: subject?.name ?? "",
      topicName: topic?.name,
    })

    setSending(false)

    if (result.error) {
      setError(result.error)
      // Remove optimistic message on error
      setLocalMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
      return
    }

    const aiMsg: ConvMessage = {
      id: `temp-ai-${Date.now()}`,
      role: "assistant",
      content: result.reply!,
      createdAt: new Date(),
    }
    setLocalMessages((prev) => [...prev, aiMsg])
    onNewMessage(userMsg, aiMsg)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/60 backdrop-blur-sm shrink-0">
        <span
          className="h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: subject?.colour ?? "#888" }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{conv.title}</p>
          <p className="text-xs text-muted-foreground">
            {subject?.name}{topic ? ` · ${topic.name}` : ""}
          </p>
        </div>
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-accent/40 transition-colors shrink-0"
        >
          <Plus className="h-3 w-3" />
          New chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 space-y-5">
        {localMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
            <Sparkles className="h-8 w-8 text-primary/40" />
            <p className="text-sm text-muted-foreground">
              Ask anything about <span className="font-medium text-foreground">{subject?.name}</span>
              {topic ? ` — ${topic.name}` : ""}
            </p>
          </div>
        )}
        {localMessages.map((msg) => (
          <Bubble key={msg.id} msg={msg} />
        ))}
        {sending && <TypingIndicator />}
        {error && (
          <p className="text-center text-sm text-destructive px-4">{error}</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-card/60 backdrop-blur-sm p-4">
        <div className="flex items-end gap-2 rounded-xl border border-input bg-background px-4 py-2 focus-within:ring-2 focus-within:ring-ring focus-within:border-ring transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ask your tutor anything… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground/50 leading-relaxed max-h-40 py-1"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {sending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Send className="h-3.5 w-3.5" />
            }
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">
          Rec's responses are for study support — always verify with your textbook and teacher.
        </p>
      </div>
    </div>
  )
}

// ── Main shell ────────────────────────────────────────────────────────────────

export function TutorShell({
  subjects,
  initialConversations,
}: {
  subjects: SubjectWithTopics[]
  initialConversations: ConvSummary[]
}) {
  const [conversations, setConversations] = useState<ConvSummary[]>(initialConversations)
  const [activeConv, setActiveConv] = useState<ConvFull | null>(null)
  const [loading, setLoading] = useState(false)
  const [newChat, setNewChat] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Draft new conversation state (before first message)
  const [draftSubjectId, setDraftSubjectId] = useState<string | null>(null)
  const [draftTopicId, setDraftTopicId] = useState<string | null>(null)
  const [draftInput, setDraftInput] = useState("")
  const [draftSending, setDraftSending] = useState(false)
  const [draftError, setDraftError] = useState("")
  const draftTextareaRef = useRef<HTMLTextAreaElement>(null)
  const draftMessagesEndRef = useRef<HTMLDivElement>(null)

  async function openConversation(id: string) {
    setNewChat(false)
    setLoading(true)
    const result = await loadConversation(id)
    setLoading(false)
    if (result.conv) setActiveConv(result.conv)
  }

  function goToNewChat() {
    setNewChat(false)
    setActiveConv(null)
    setDraftSubjectId(null)
    setDraftTopicId(null)
    setDraftInput("")
    setDraftError("")
  }

  function startNewChat(subjectId: string, topicId?: string) {
    setNewChat(true)
    setActiveConv(null)
    setDraftSubjectId(subjectId)
    setDraftTopicId(topicId ?? null)
    setDraftInput("")
    setDraftError("")
  }

  // Handle new message within an existing conversation
  function handleNewMessage(_userMsg: ConvMessage, _aiMsg: ConvMessage) {
    // The server already saved them; localMessages in ChatView handles display.
    // Refresh sidebar list to update timestamps/counts.
    listConversations().then(setConversations)
  }

  // Handle sending first message in a draft conversation
  async function handleDraftSend() {
    const content = draftInput.trim()
    if (!content || !draftSubjectId || draftSending) return

    setDraftSending(true)
    setDraftError("")
    const subject = subjects.find((s) => s.id === draftSubjectId)
    const topic = subject?.topics.find((t) => t.id === draftTopicId)

    const result = await sendMessage({
      conversationId: null,
      subjectId: draftSubjectId,
      topicId: draftTopicId ?? undefined,
      content,
      subjectName: subject?.name ?? "",
      topicName: topic?.name,
    })

    setDraftSending(false)

    if (result.error) { setDraftError(result.error); return }

    // Load the newly-created conversation
    const convResult = await loadConversation(result.conversationId!)
    if (convResult.conv) {
      setActiveConv(convResult.conv)
      setNewChat(false)
      setDraftInput("")
    }

    // Refresh sidebar
    listConversations().then(setConversations)
  }

  async function handleDelete(id: string) {
    await deleteConversation(id)
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeConv?.id === id) { setActiveConv(null); setNewChat(false) }
  }

  async function handleRename(id: string, title: string) {
    await renameConversation(id, title)
    setConversations((prev) => prev.map((c) => c.id === id ? { ...c, title } : c))
    if (activeConv?.id === id) setActiveConv((prev) => prev ? { ...prev, title } : prev)
  }

  const groups = groupByDate(conversations)
  const draftSubject = subjects.find((s) => s.id === draftSubjectId)
  const draftTopic = draftSubject?.topics.find((t) => t.id === draftTopicId)

  return (
    <div className="flex h-[calc(100vh-10rem)] rounded-xl border border-border overflow-hidden bg-background">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={cn(
        "flex flex-col border-r border-border bg-muted/30 transition-all duration-200 shrink-0",
        sidebarOpen ? "w-64" : "w-0 overflow-hidden"
      )}>
        {/* Top bar */}
        <div className="flex items-center gap-2 p-3 border-b border-border shrink-0">
          <button
            onClick={goToNewChat}
            disabled={subjects.length === 0}
            className="flex-1 flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="h-3.5 w-3.5" />
            New chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8 px-4">
              No conversations yet. Start a new chat!
            </p>
          )}
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((conv) => (
                  <ConvItem
                    key={conv.id}
                    conv={conv}
                    isActive={activeConv?.id === conv.id}
                    onSelect={() => openConversation(conv.id)}
                    onDelete={() => handleDelete(conv.id)}
                    onRename={(title) => handleRename(conv.id, title)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar footer */}
        <div className="p-3 border-t border-border shrink-0">
          <p className="text-[10px] text-muted-foreground text-center">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          </p>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar with sidebar toggle */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/40 shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <MessageSquare className="h-4 w-4" />
          </button>

          <button
            onClick={goToNewChat}
            disabled={subjects.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={subjects.length === 0 ? "Add a subject in Settings first" : "Start a new conversation"}
          >
            <Plus className="h-3.5 w-3.5" />
            New chat
          </button>

          {activeConv && (
            <span className="text-sm text-muted-foreground truncate ml-1">{activeConv.title}</span>
          )}
          {newChat && !activeConv && (
            <span className="text-sm text-muted-foreground truncate ml-1">New conversation</span>
          )}
        </div>

        {/* Content */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && activeConv && (
          <ChatView
            key={activeConv.id}
            conv={activeConv}
            subjects={subjects}
            onNewMessage={handleNewMessage}
            onNewChat={goToNewChat}
          />
        )}

        {/* Draft new conversation */}
        {!loading && newChat && !activeConv && draftSubjectId && (
          <div className="flex flex-col h-full">
            {/* Subject context bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/60 shrink-0">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: draftSubject?.colour ?? "#888" }}
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={draftSubjectId ?? ""}
                    onChange={(e) => { setDraftSubjectId(e.target.value); setDraftTopicId(null) }}
                    className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {draftSubject && draftSubject.topics.length > 0 && (
                    <select
                      value={draftTopicId ?? ""}
                      onChange={(e) => setDraftTopicId(e.target.value || null)}
                      className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">All topics</option>
                      {draftSubject.topics.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Empty messages area with suggested prompts */}
            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 overflow-y-auto">
              <div className="text-center space-y-2">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium">
                  New conversation — {draftSubject?.name}
                  {draftTopic ? ` · ${draftTopic.name}` : ""}
                </p>
                <p className="text-sm text-muted-foreground">Ask anything to get started.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                {[
                  "Explain the key concepts I need to know",
                  "Help me with exam technique",
                  "Give me a worked example question",
                  "What are the most common mistakes?",
                  "Quiz me on this topic",
                  "Summarise what I need to revise",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => { setDraftInput(prompt); draftTextareaRef.current?.focus() }}
                    className="rounded-lg border border-border bg-card px-3 py-2.5 text-xs text-left text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent/40 transition-colors leading-snug"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div ref={draftMessagesEndRef} />
            </div>

            {draftSending && (
              <div className="px-8 pb-2">
                <TypingIndicator />
              </div>
            )}
            {draftError && (
              <p className="text-center text-sm text-destructive px-4 pb-2">{draftError}</p>
            )}

            {/* Draft input */}
            <div className="shrink-0 border-t border-border bg-card/60 backdrop-blur-sm p-4">
              <div className="flex items-end gap-2 rounded-xl border border-input bg-background px-4 py-2 focus-within:ring-2 focus-within:ring-ring focus-within:border-ring transition-all">
                <textarea
                  ref={draftTextareaRef}
                  value={draftInput}
                  onChange={(e) => {
                    setDraftInput(e.target.value)
                    const el = e.target
                    el.style.height = "auto"
                    el.style.height = Math.min(el.scrollHeight, 160) + "px"
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleDraftSend() }
                  }}
                  placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
                  rows={1}
                  className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground/50 leading-relaxed max-h-40 py-1"
                />
                <button
                  onClick={handleDraftSend}
                  disabled={!draftInput.trim() || draftSending}
                  className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {draftSending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Send className="h-3.5 w-3.5" />
                  }
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">
                Rec's responses are for study support — always verify with your textbook and teacher.
              </p>
            </div>
          </div>
        )}

        {/* Empty state — no conversation open, not drafting */}
        {!loading && !activeConv && !newChat && (
          <NewChatForm subjects={subjects} onStart={startNewChat} />
        )}
      </div>
    </div>
  )
}
