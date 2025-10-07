/*
  Warnings:

  - Added the required column `tenantId` to the `Prompt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `PromptGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `PromptGroupMapping` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `PromptSetting` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Prompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Prompt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Prompt" ("content", "createdAt", "description", "id", "name", "updatedAt", "variables") SELECT "content", "createdAt", "description", "id", "name", "updatedAt", "variables" FROM "Prompt";
DROP TABLE "Prompt";
ALTER TABLE "new_Prompt" RENAME TO "Prompt";
CREATE TABLE "new_PromptGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromptGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PromptGroup" ("createdAt", "description", "id", "name", "updatedAt") SELECT "createdAt", "description", "id", "name", "updatedAt" FROM "PromptGroup";
DROP TABLE "PromptGroup";
ALTER TABLE "new_PromptGroup" RENAME TO "PromptGroup";
CREATE TABLE "new_PromptGroupMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromptGroupMapping_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PromptGroupMapping_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PromptGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PromptGroupMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PromptGroupMapping" ("createdAt", "groupId", "id", "promptId", "updatedAt") SELECT "createdAt", "groupId", "id", "promptId", "updatedAt" FROM "PromptGroupMapping";
DROP TABLE "PromptGroupMapping";
ALTER TABLE "new_PromptGroupMapping" RENAME TO "PromptGroupMapping";
CREATE TABLE "new_PromptSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tenantId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromptSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PromptSetting" ("createdAt", "description", "id", "items", "name", "updatedAt") SELECT "createdAt", "description", "id", "items", "name", "updatedAt" FROM "PromptSetting";
DROP TABLE "PromptSetting";
ALTER TABLE "new_PromptSetting" RENAME TO "PromptSetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
