-- AlterTable
ALTER TABLE "teams" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- UpdateExistingRows: Set version = 1 for all existing teams
UPDATE "teams" SET "version" = 1 WHERE "version" IS NULL;

-- Comment: This migration adds optimistic locking support to the teams table
-- Version column enables concurrent edit detection (Story 2-1-3)
