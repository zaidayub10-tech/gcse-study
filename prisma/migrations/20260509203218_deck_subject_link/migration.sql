-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Deck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subjectId" TEXT,
    "subtopicId" TEXT,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    CONSTRAINT "Deck_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Deck_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Deck" ("id", "name", "source", "subtopicId") SELECT "id", "name", "source", "subtopicId" FROM "Deck";

-- Backfill subjectId from subtopic -> topic -> subject chain
UPDATE "new_Deck"
SET "subjectId" = (
  SELECT t."subjectId"
  FROM "Subtopic" st
  JOIN "Topic" t ON st."topicId" = t."id"
  WHERE st."id" = "new_Deck"."subtopicId"
)
WHERE "subtopicId" IS NOT NULL;

DROP TABLE "Deck";
ALTER TABLE "new_Deck" RENAME TO "Deck";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
