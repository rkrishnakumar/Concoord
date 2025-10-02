/*
  Warnings:

  - Added the required column `clientId` to the `acc_credentials` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientSecret` to the `acc_credentials` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `procore_credentials` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientSecret` to the `procore_credentials` table without a default value. This is not possible if the table is not empty.

*/
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
    "baseUrl" TEXT DEFAULT 'https://developer.api.autodesk.com',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "acc_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_acc_credentials" ("accessToken", "createdAt", "expiresAt", "id", "refreshToken", "updatedAt", "userId") SELECT "accessToken", "createdAt", "expiresAt", "id", "refreshToken", "updatedAt", "userId" FROM "acc_credentials";
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
    "baseUrl" TEXT DEFAULT 'https://api.procore.com',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "procore_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_procore_credentials" ("accessToken", "createdAt", "expiresAt", "id", "refreshToken", "updatedAt", "userId") SELECT "accessToken", "createdAt", "expiresAt", "id", "refreshToken", "updatedAt", "userId" FROM "procore_credentials";
DROP TABLE "procore_credentials";
ALTER TABLE "new_procore_credentials" RENAME TO "procore_credentials";
CREATE UNIQUE INDEX "procore_credentials_userId_key" ON "procore_credentials"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
