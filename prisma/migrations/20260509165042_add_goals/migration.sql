-- CreateTable
CREATE TABLE "Goals" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "studyMinutesPerDay" INTEGER NOT NULL DEFAULT 60,
    "sessionLengthMinutes" INTEGER NOT NULL DEFAULT 25,
    "flashcardsPerDay" INTEGER NOT NULL DEFAULT 20,
    "weeklyStudyDays" INTEGER NOT NULL DEFAULT 5,
    "focusSubjectId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Goals_focusSubjectId_fkey" FOREIGN KEY ("focusSubjectId") REFERENCES "Subject" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
