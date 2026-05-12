import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
import { db } from "@/lib/db"
import { SetupWizard } from "./wizard"

export default async function SetupPage() {
  const count = await db.subject.count()
  if (count > 0) redirect("/")
  return (
    <div className="py-4">
      <SetupWizard />
    </div>
  )
}
