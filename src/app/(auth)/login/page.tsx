"use client"

import { useActionState } from "react"
import { loginAction } from "./actions"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-3 text-center">
          <div className="flex justify-center">
            <Image src="/logo.png" alt="Recapr" width={200} height={110} className="h-20 w-auto object-contain" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-muted-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Enter your password to continue</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              placeholder="••••••••"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  )
}
