export type {
  Subject,
  Discipline,
  Topic,
  Subtopic,
  Deck,
  Card,
  Review,
  Exam,
  ExamQuestion,
  Session,
  TimerLog,
  Conversation,
  Message,
  Resource,
} from "@/generated/prisma/client"

export type Qualification = "GCSE" | "iGCSE"
export type Tier = "Higher" | "Foundation" | "Both"
export type CardSource = "manual" | "ai" | "import"
export type ResourceType =
  | "notes"
  | "video"
  | "questions"
  | "past_paper"
  | "mark_scheme"
  | "flashcards"
  | "interactive"
  | "other"
export type ResourceConfidence = "auto" | "ai" | "manual"
export type SessionStatus = "planned" | "done" | "skipped"
export type TimerMode = "pomodoro" | "ad-hoc"
export type MessageRole = "user" | "assistant"
export type ExamScopeType =
  | "subject"
  | "discipline"
  | "topic"
  | "subtopic"
  | "deck"
  | "resourceSet"
