/*
  Warnings:

  - Added the required column `clientId` to the `acc_credentials` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientSecret` to the `acc_credentials` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `procore_credentials` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientSecret` to the `procore_credentials` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "syncs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceSystem" TEXT NOT NULL,
    "sourceProjectId" TEXT NOT NULL,
    "sourceProjectName" TEXT NOT NULL,
    "destinationSystem" TEXT NOT NULL,
    "destinationProjectId" TEXT NOT NULL,
    "destinationProjectName" TEXT NOT NULL,
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

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_acc_credentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "baseUrl" TEXT NOT NULL DEFAULT 'https://developer.api.autodesk.com',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "acc_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_acc_credentials" ("accessToken", "baseUrl", "createdAt", "expiresAt", "id", "refreshToken", "updatedAt", "userId") SELECT "accessToken", "baseUrl", "createdAt", "expiresAt", "id", "refreshToken", "updatedAt", "userId" FROM "acc_credentials";
DROP TABLE "acc_credentials";
ALTER TABLE "new_acc_credentials" RENAME TO "acc_credentials";
CREATE UNIQUE INDEX "acc_credentials_userId_key" ON "acc_credentials"("userId");
CREATE TABLE "new_procore_credentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "baseUrl" TEXT NOT NULL DEFAULT 'https://api.procore.com',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "procore_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_procore_credentials" ("accessToken", "baseUrl", "createdAt", "expiresAt", "id", "refreshToken", "updatedAt", "userId") SELECT "accessToken", "baseUrl", "createdAt", "expiresAt", "id", "refreshToken", "updatedAt", "userId" FROM "procore_credentials";
DROP TABLE "procore_credentials";
ALTER TABLE "new_procore_credentials" RENAME TO "procore_credentials";
CREATE UNIQUE INDEX "procore_credentials_userId_key" ON "procore_credentials"("userId");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("createdAt", "email", "id", "name", "updatedAt") SELECT "createdAt", "email", "id", "name", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
