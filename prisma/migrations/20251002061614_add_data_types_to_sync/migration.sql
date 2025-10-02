/*
  Warnings:

  - Added the required column `destinationDataTypes` to the `syncs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourceDataTypes` to the `syncs` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_syncs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceSystem" TEXT NOT NULL,
    "sourceProjectId" TEXT NOT NULL,
    "sourceProjectName" TEXT NOT NULL,
    "sourceDataTypes" JSONB NOT NULL,
    "destinationSystem" TEXT NOT NULL,
    "destinationProjectId" TEXT NOT NULL,
    "destinationProjectName" TEXT NOT NULL,
    "destinationDataTypes" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduleType" TEXT NOT NULL DEFAULT 'manual',
    "scheduleValue" TEXT,
    "lastRunAt" DATETIME,
    "lastRunStatus" TEXT,
    "nextRunAt" DATETIME,
    "fieldMappings" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "syncs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_syncs" ("createdAt", "description", "destinationProjectId", "destinationProjectName", "destinationSystem", "fieldMappings", "id", "lastRunAt", "lastRunStatus", "name", "nextRunAt", "scheduleType", "scheduleValue", "sourceProjectId", "sourceProjectName", "sourceSystem", "status", "updatedAt", "userId") SELECT "createdAt", "description", "destinationProjectId", "destinationProjectName", "destinationSystem", "fieldMappings", "id", "lastRunAt", "lastRunStatus", "name", "nextRunAt", "scheduleType", "scheduleValue", "sourceProjectId", "sourceProjectName", "sourceSystem", "status", "updatedAt", "userId" FROM "syncs";
DROP TABLE "syncs";
ALTER TABLE "new_syncs" RENAME TO "syncs";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
