-- CreateTable
CREATE TABLE "Storyboard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL DEFAULT 0,
    "shotNumber" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "cameraAngle" TEXT,
    "cameraMove" TEXT,
    "duration" INTEGER,
    "dialogueScript" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Storyboard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoryboardComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "author" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "storyboardId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoryboardComment_storyboardId_fkey" FOREIGN KEY ("storyboardId") REFERENCES "Storyboard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'image',
    "url" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "notes" TEXT,
    "assetId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetVersion_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "content" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromptTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'event',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimelineEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'movie',
    "phase" TEXT NOT NULL DEFAULT 'development',
    "genre" TEXT,
    "director" TEXT,
    "producer" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "totalBudget" REAL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Project" ("color", "createdAt", "description", "id", "name", "updatedAt") SELECT "color", "createdAt", "description", "id", "name", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
