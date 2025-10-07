/*
  Warnings:

  - You are about to drop the column `tenantId` on the `PromptGroupMapping` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PromptGroupMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromptGroupMapping_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PromptGroupMapping_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PromptGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PromptGroupMapping" ("createdAt", "groupId", "id", "promptId", "updatedAt") SELECT "createdAt", "groupId", "id", "promptId", "updatedAt" FROM "PromptGroupMapping";
DROP TABLE "PromptGroupMapping";
ALTER TABLE "new_PromptGroupMapping" RENAME TO "PromptGroupMapping";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
