"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { signToken, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/auth"

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const password = formData.get("password") as string

  if (!password || password !== process.env.APP_PASSWORD) {
    return { error: "Incorrect password" }
  }

  const token = await signToken({ authenticated: true })
  const cookieStore = await cookies()

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  })

  redirect("/")
}
