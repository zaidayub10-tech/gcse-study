import { redirect } from "next/navigation"
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
