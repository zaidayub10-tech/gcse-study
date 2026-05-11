import { db } from "@/lib/db"
import { SubjectManager } from "./subject-manager"
import { GoalsManager } from "./goals-manager"
import { getGoals, getTodayProgress } from "./goals-actions"

export default async function SettingsPage() {
  const [subjects, goals, progress] = await Promise.all([
    db.subject.findMany({
      orderBy: { name: "asc" },
      include: { disciplines: { orderBy: { order: "asc" } } },
    }),
    getGoals(),
    getTodayProgress(),
  ])

  return (
    <div className="space-y-10 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your subjects, goals and app configuration.
        </p>
      </div>

      {/* Goals & Achievements */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Goals & Achievements</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track your progress and set daily study targets.
          </p>
        </div>
        <GoalsManager
          initialGoals={{
            studyMinutesPerDay: goals.studyMinutesPerDay,
            sessionLengthMinutes: goals.sessionLengthMinutes,
            flashcardsPerDay: goals.flashcardsPerDay,
            weeklyStudyDays: goals.weeklyStudyDays,
            focusSubjectId: goals.focusSubjectId,
          }}
          progress={progress}
          subjects={subjects}
        />
      </section>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Subjects */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Subjects</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Add, edit or remove your GCSE subjects.
          </p>
        </div>
        <SubjectManager subjects={subjects} />
      </section>
    </div>
  )
}
