"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "@/config/nav"
import { ThemeToggle } from "./theme-toggle"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Menu, ChevronDown, LogOut, Settings } from "lucide-react"
import type { Subject } from "@/generated/prisma/client"

const STUDY_ITEMS  = NAV_ITEMS.filter((i) => i.group === "study")
const MANAGE_ITEMS = NAV_ITEMS.filter((i) => i.group === "manage")
const SETTINGS_ITEM = NAV_ITEMS.find((i) => i.href === "/settings")!

export function TopNavClient({
  subjects,
  deckCount = 0,
}: {
  subjects: Subject[]
  deckCount?: number
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href)
  }

  const manageActive = MANAGE_ITEMS.some((i) => isActive(i.href))

  return (
    <header className="sticky top-0 z-40 w-full border-b border-sidebar-border/60 bg-sidebar/80 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-sidebar/70">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:px-6">

        {/* ── Logo ─────────────────────────────────────────────── */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 mr-2 select-none"
        >
          <Image
            src="/logo-icon.png"
            alt="Recapr logo"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
          <span className="font-bold text-sidebar-foreground text-sm tracking-tight hidden sm:block">
            Recapr
          </span>
        </Link>

        {/* ── Desktop: study pills ──────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {STUDY_ITEMS.map((item) => {
            const active = isActive(item.href)
            const showBadge = item.href === "/review" && deckCount > 0
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
                {showBadge && (
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold",
                    active ? "bg-white/25 text-white" : "bg-primary text-primary-foreground"
                  )}>
                    {deckCount > 99 ? "99+" : deckCount}
                  </span>
                )}
                {/* Ping dot on inactive Review */}
                {!active && showBadge && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* ── Desktop: right section ───────────────────────────── */}
        <div className="hidden md:flex items-center gap-1 ml-auto shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                manageActive
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              Manage
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {MANAGE_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <DropdownMenuItem key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 w-full",
                        isActive(item.href) && "text-primary font-semibold"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            href="/settings"
            aria-label="Settings"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
              isActive("/settings")
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <Settings className="h-4 w-4" />
          </Link>

          <ThemeToggle />
        </div>

        {/* ── Mobile: right side ────────────────────────────────── */}
        <div className="flex md:hidden items-center gap-1 ml-auto">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            className="rounded-full"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* ── Mobile Sheet ─────────────────────────────────────────── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border">
          <SheetTitle className="sr-only">Navigation</SheetTitle>

          <div className="flex items-center h-14 px-4 border-b border-sidebar-border gap-2 shrink-0">
            <Image
              src="/logo-icon.png"
              alt="Recapr logo"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <span className="font-bold text-sidebar-foreground">Recapr</span>
          </div>

          <ScrollArea className="h-[calc(100vh-7rem)]">
            {/* Study group */}
            <div className="px-3 pt-4 pb-2">
              <p className="px-2 mb-1.5 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest">
                Study
              </p>
              <div className="space-y-0.5">
                {STUDY_ITEMS.map((item) => {
                  const active = isActive(item.href)
                  const showBadge = item.href === "/review" && deckCount > 0
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-60")} />
                      <span className="flex-1">{item.label}</span>
                      {showBadge && (
                        <span className={cn(
                          "rounded-full px-1.5 py-0.5 text-xs font-bold min-w-[1.25rem] text-center leading-none",
                          active ? "bg-white/25 text-white" : "bg-primary text-primary-foreground"
                        )}>
                          {deckCount > 99 ? "99+" : deckCount}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>

            <Separator className="my-2 bg-sidebar-border" />

            {/* Manage group */}
            <div className="px-3 pb-2">
              <p className="px-2 mb-1.5 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest">
                Manage
              </p>
              <div className="space-y-0.5">
                {MANAGE_ITEMS.map((item) => {
                  const active = isActive(item.href)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-60")} />
                      {item.label}
                    </Link>
                  )
                })}
                {/* Settings */}
                {(() => {
                  const active = isActive("/settings")
                  const Icon = SETTINGS_ITEM.icon
                  return (
                    <Link
                      href="/settings"
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-60")} />
                      Settings
                    </Link>
                  )
                })()}
              </div>
            </div>

            <Separator className="my-2 bg-sidebar-border" />

            {/* Subjects */}
            <div className="px-3 pb-4">
              <p className="px-2 mb-1.5 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest">
                Subjects
              </p>
              {subjects.length === 0 ? (
                <p className="px-3 py-2 text-xs text-sidebar-foreground/50">
                  No subjects yet.{" "}
                  <Link
                    href="/settings"
                    onClick={() => setMobileOpen(false)}
                    className="underline underline-offset-2"
                  >
                    Add one in Settings.
                  </Link>
                </p>
              ) : (
                <div className="space-y-0.5">
                  {subjects.map((subject) => (
                    <Link
                      key={subject.id}
                      href={`/subjects/${subject.id}`}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: subject.colour }}
                      />
                      <span className="truncate flex-1">{subject.name}</span>
                      <span className="text-xs text-sidebar-foreground/40 shrink-0">
                        {subject.qualification}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-3 bg-sidebar">
            <form method="POST" action="/api/auth/logout">
              <button
                type="submit"
                className="w-full flex items-center gap-2 text-left text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground px-3 py-1.5 rounded-xl hover:bg-sidebar-accent/50 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                Sign out
              </button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
